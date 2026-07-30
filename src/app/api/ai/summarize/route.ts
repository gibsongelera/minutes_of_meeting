import { NextResponse } from 'next/server';
import {
  FALLBACK_BETA,
  MAX_TOKENS_JSON,
  MODEL,
  aiErrorResponse,
  cacheStats,
  getClaude,
  textFrom,
} from '@/lib/ai/claude';
import { requireSession } from '@/lib/ai/guard';
import { cachedUserTurn, formatTranscript, meetingContext, SUMMARY_SYSTEM, systemBlocks } from '@/lib/ai/prompts';
import { summarizeRequest } from '@/lib/ai/schemas';

export const runtime = 'nodejs';
/** Long transcripts take real time; well under Vercel's Pro ceiling. */
export const maxDuration = 120;

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'Not signed in', code: 'unauthenticated' }, { status: 401 });
  }

  const parsed = summarizeRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'bad_request', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { meeting, segments, people, maxSentences } = parsed.data;

  try {
    const claude = getClaude();

    const message = await claude.beta.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS_JSON,
      betas: [FALLBACK_BETA],
      fallbacks: 'default',
      system: systemBlocks(SUMMARY_SYSTEM),
      messages: cachedUserTurn(
        meetingContext(meeting, people),
        formatTranscript(segments),
        `Summarise this meeting in at most ${maxSentences} sentences.`,
      ),
    });

    return NextResponse.json({
      summary: textFrom(message),
      model: message.model,
      usage: cacheStats(message),
    });
  } catch (err) {
    const { status, body } = aiErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
