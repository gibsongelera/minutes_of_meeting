import { NextResponse } from 'next/server';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { MAX_TOKENS_STREAM, MODEL, aiErrorResponse, cacheStats, getClaude, RefusalError } from '@/lib/ai/claude';
import { requireSession } from '@/lib/ai/guard';
import {
  MINUTES_SYSTEM,
  cachedUserTurn,
  formatTranscript,
  meetingContext,
  systemBlocks,
} from '@/lib/ai/prompts';
import { draftMinutesRequest, minutesOutput } from '@/lib/ai/schemas';

export const runtime = 'nodejs';
/** A full CHED draft off a 90-minute transcript is the slowest call we make. */
export const maxDuration = 300;

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'Not signed in', code: 'unauthenticated' }, { status: 401 });
  }

  const parsed = draftMinutesRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'bad_request', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { meeting, segments, people } = parsed.data;

  try {
    const claude = getClaude();

    /*
     * Streamed, then collected with finalMessage(). This is the longest
     * generation in the app — a full multi-section document — and a
     * non-streaming request at this max_tokens risks an idle-connection timeout
     * before the first byte arrives. The client waits for the whole document
     * anyway (it populates a form), so there is no partial rendering to do; the
     * stream is purely timeout protection.
     */
    const stream = claude.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS_STREAM,
      system: systemBlocks(MINUTES_SYSTEM),
      messages: cachedUserTurn(
        meetingContext(meeting, people),
        formatTranscript(segments),
        'Draft the Minutes of the Meeting for this session.',
      ),
      output_config: { format: zodOutputFormat(minutesOutput) },
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === 'refusal') {
      throw new RefusalError(message.stop_details?.category ?? null);
    }

    const text = message.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') {
      return NextResponse.json(
        { error: 'Claude returned no document.', code: 'incomplete', fallback: 'local' },
        { status: 502 },
      );
    }

    // The stream helper does not populate parsed_output, so validate here — the
    // schema constrained generation, this confirms what actually arrived.
    const validated = minutesOutput.safeParse(JSON.parse(text.text));
    if (!validated.success) {
      return NextResponse.json(
        {
          error: 'Claude returned a document in an unexpected shape.',
          code: 'invalid_shape',
          issues: validated.error.issues,
          fallback: 'local',
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      minutes: validated.data,
      model: message.model,
      usage: cacheStats(message),
    });
  } catch (err) {
    const { status, body } = aiErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
