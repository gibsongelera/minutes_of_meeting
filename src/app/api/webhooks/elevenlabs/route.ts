/**
 * ElevenLabs speech-to-text webhook.
 *
 * Unauthenticated by necessity - ElevenLabs calls this with no Supabase
 * session, so the HMAC signature (provider.verifyWebhook) is the only thing
 * standing between the database and the open internet. Uses the
 * service-role client because there is no user to act as.
 *
 * Once the transcript lands, drafts minutes and extracts action items
 * automatically (see the try/catch near the bottom) so the secretary opens
 * an already-drafted document instead of clicking "AI Generate". maxDuration
 * matches /api/ai/draft-minutes's own 300s allowance - this handler now does
 * the same drafting work, off the same 90-minute-transcript worst case.
 */
import { NextResponse } from 'next/server';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getProvider } from '@/lib/asr';
import { foldWordsToSegments } from '@/lib/asr/fold';
import { MAX_TOKENS_JSON, MAX_TOKENS_STREAM, MODEL, getClaude } from '@/lib/ai/claude';
import { docTitleFor } from '@/lib/ai/doc-title';
import {
  ACTION_ITEMS_SYSTEM,
  MINUTES_SYSTEM,
  cachedUserTurn,
  formatTranscript,
  meetingContext,
  systemBlocks,
} from '@/lib/ai/prompts';
import { actionItemsOutput, minutesOutput } from '@/lib/ai/schemas';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: Request) {
  const rawBody = await request.text();

  const provider = getProvider('elevenlabs');
  if (!provider.verifyWebhook(rawBody, request.headers)) {
    return new NextResponse('Invalid signature', { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 });
  }

  let result;
  try {
    result = await provider.parseWebhook(payload);
  } catch (err) {
    console.error('elevenlabs webhook: failed to parse payload', err);
    // 200 so ElevenLabs stops retrying a payload we can never parse.
    return NextResponse.json({ ok: true, warning: 'unparseable payload' });
  }

  const supabase = createAdminClient();

  const jobQuery = result.webhookRef
    ? supabase.from('transcription_jobs').select('*').eq('id', result.webhookRef)
    : supabase
        .from('transcription_jobs')
        .select('*')
        .eq('provider', provider.name)
        .eq('provider_job_id', result.providerJobId);

  const { data: job, error: jobError } = await jobQuery.maybeSingle();

  if (jobError || !job) {
    console.warn('elevenlabs webhook: no matching transcription_jobs row', {
      webhookRef: result.webhookRef,
      providerJobId: result.providerJobId,
    });
    // 200 so the provider stops retrying — the job genuinely does not exist on our side.
    return NextResponse.json({ ok: true, warning: 'unknown job' });
  }

  // Idempotency: webhooks are delivered at-least-once.
  if (job.status === 'completed') {
    return NextResponse.json({ ok: true, note: 'already processed' });
  }

  // Store the raw payload before folding, so a folding bug never costs a
  // re-transcription — it can be re-folded from this column later.
  await supabase.from('transcription_jobs').update({ raw_response: payload }).eq('id', job.id);

  const folded = foldWordsToSegments(result.words);

  const { data: transcript, error: transcriptError } = await supabase
    .from('transcripts')
    .insert({
      meeting_id: job.meeting_id,
      language: result.languageCode,
      segments: folded,
      source_audio_id: job.audio_id,
      ai_model: job.model,
      provider: provider.name,
      detected_language: result.languageCode,
      diarized: job.diarize,
    })
    .select('id')
    .single();

  if (transcriptError || !transcript) {
    await supabase
      .from('transcription_jobs')
      .update({
        status: 'failed',
        error_code: 'transcript_insert_failed',
        error_detail: transcriptError?.message ?? 'unknown',
      })
      .eq('id', job.id);
    console.error('elevenlabs webhook: failed to insert transcript', transcriptError);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // Diarization emits speaker_0, speaker_1... — seed one row per label so a
  // secretary can rename them later without inventing the mapping from scratch.
  const distinctSpeakers = [...new Map(folded.map((s) => [s.speakerId, s.speaker] as const)).entries()].filter(
    (entry): entry is [string, string] => entry[0] !== null,
  );
  if (distinctSpeakers.length) {
    await supabase.from('transcript_speakers').insert(
      distinctSpeakers.map(([speaker_label, display_name]) => ({
        transcript_id: transcript.id,
        speaker_label,
        display_name,
      })),
    );
  }

  await supabase
    .from('transcription_jobs')
    .update({
      status: 'completed',
      transcript_id: transcript.id,
      detected_language: result.languageCode,
      language_probability: result.languageProbability,
      completed_at: new Date().toISOString(),
    })
    .eq('id', job.id);

  await supabase.from('meetings').update({ status: 'transcribed', ai_processed: true }).eq('id', job.meeting_id);

  await supabase.rpc('log_audit', {
    p_action: 'transcript_completed',
    p_detail: `Transcript ${transcript.id} created via ${provider.name} for meeting ${job.meeting_id}`,
  });

  // Draft minutes and extract action items now that the transcript exists.
  // Best-effort: a failure here does not fail the webhook or trigger a
  // retry - the transcript is already saved and usable on its own, and
  // idempotency above means a retried delivery just returns "already
  // processed" rather than trying this again. When this hasn't run (Claude
  // unavailable, refusal, unexpected shape), there is simply no minutes row
  // yet and the secretary drafts one manually - an honest gap, not a
  // silently wrong one.
  try {
    const { data: meeting } = await supabase
      .from('meetings')
      .select(
        'title, starts_at, venue, meeting_type, sub_type, project_title, agenda, language, chair_id, secretary_id, chairperson_id, adviser_id, panel_member_ids',
      )
      .eq('id', job.meeting_id)
      .single();

    if (meeting) {
      const roleIds = [
        meeting.chair_id,
        meeting.secretary_id,
        meeting.chairperson_id,
        meeting.adviser_id,
        ...(meeting.panel_member_ids ?? []),
      ].filter((id: string | null): id is string => Boolean(id));

      const { data: roleProfiles } = roleIds.length
        ? await supabase.from('profiles').select('id, name').in('id', roleIds)
        : { data: [] as { id: string; name: string }[] };

      const nameOf = (id: string | null | undefined) => roleProfiles?.find((p) => p.id === id)?.name;

      const context = meetingContext(
        {
          title: meeting.title,
          starts_at: meeting.starts_at,
          venue: meeting.venue,
          meeting_type: meeting.meeting_type,
          sub_type: meeting.sub_type,
          project_title: meeting.project_title,
          agenda: meeting.agenda ?? [],
          language: meeting.language,
        },
        {
          chair: nameOf(meeting.chair_id ?? meeting.chairperson_id),
          secretary: nameOf(meeting.secretary_id),
          adviser: nameOf(meeting.adviser_id),
          panel: (meeting.panel_member_ids ?? [])
            .map((id: string) => nameOf(id))
            .filter((n: string | undefined): n is string => Boolean(n)),
        },
      );
      const transcriptText = formatTranscript(folded);
      const claude = getClaude();

      const minutesStream = claude.messages.stream({
        model: MODEL,
        max_tokens: MAX_TOKENS_STREAM,
        system: systemBlocks(MINUTES_SYSTEM),
        messages: cachedUserTurn(context, transcriptText, 'Draft the Minutes of the Meeting for this session.'),
        output_config: { format: zodOutputFormat(minutesOutput) },
      });
      const minutesMessage = await minutesStream.finalMessage();

      let draftedMinutes: ReturnType<typeof minutesOutput.parse> | null = null;
      if (minutesMessage.stop_reason !== 'refusal') {
        const text = minutesMessage.content.find((b) => b.type === 'text');
        if (text && text.type === 'text') {
          const validated = minutesOutput.safeParse(JSON.parse(text.text));
          if (validated.success) draftedMinutes = validated.data;
        }
      }

      const actionItemsMessage = await claude.messages.parse({
        model: MODEL,
        max_tokens: MAX_TOKENS_JSON,
        system: systemBlocks(ACTION_ITEMS_SYSTEM),
        messages: cachedUserTurn(context, transcriptText, 'Extract the action items from this meeting.'),
        output_config: { format: zodOutputFormat(actionItemsOutput) },
      });
      const extractedItems =
        actionItemsMessage.stop_reason !== 'refusal' ? (actionItemsMessage.parsed_output?.items ?? []) : [];

      if (draftedMinutes) {
        await supabase.from('minutes').insert({
          meeting_id: job.meeting_id,
          document_title: docTitleFor({
            title: meeting.title,
            meeting_type: meeting.meeting_type,
            sub_type: meeting.sub_type,
            project_title: meeting.project_title,
          }),
          call_to_order: draftedMinutes.callToOrder,
          previous_minutes: draftedMinutes.previousMinutes,
          agenda_items: draftedMinutes.agendaItems,
          adjournment: draftedMinutes.adjournment,
          ai_action_items: extractedItems,
          status: 'draft',
        });
      }
    }
  } catch (err) {
    console.error('elevenlabs webhook: draft-minutes/action-items chain failed', err);
  }

  return NextResponse.json({ ok: true, transcriptId: transcript.id });
}
