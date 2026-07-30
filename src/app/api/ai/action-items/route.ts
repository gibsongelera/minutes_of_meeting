import { NextResponse } from 'next/server';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { MAX_TOKENS_JSON, MODEL, aiErrorResponse, cacheStats, getClaude, RefusalError } from '@/lib/ai/claude';
import { requireSession } from '@/lib/ai/guard';
import {
  ACTION_ITEMS_SYSTEM,
  cachedUserTurn,
  formatTranscript,
  meetingContext,
  systemBlocks,
} from '@/lib/ai/prompts';
import { actionItemsOutput, actionItemsRequest } from '@/lib/ai/schemas';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'Not signed in', code: 'unauthenticated' }, { status: 401 });
  }

  const parsed = actionItemsRequest.safeParse(await request.json().catch(() => null));
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
     * messages.parse + zodOutputFormat constrains the model to the schema and
     * validates the reply, so what comes back drops straight into task rows.
     * The legacy extractor had to regex prose for assignees and dates.
     *
     * Structured outputs and the server-side `fallbacks` parameter live on
     * different endpoints, so this route handles refusals directly instead.
     */
    const message = await claude.messages.parse({
      model: MODEL,
      max_tokens: MAX_TOKENS_JSON,
      system: systemBlocks(ACTION_ITEMS_SYSTEM),
      messages: cachedUserTurn(
        meetingContext(meeting, people),
        formatTranscript(segments),
        'Extract the action items from this meeting.',
      ),
      output_config: { format: zodOutputFormat(actionItemsOutput) },
    });

    if (message.stop_reason === 'refusal') {
      throw new RefusalError(message.stop_details?.category ?? null);
    }

    // parsed_output is null when the model hit max_tokens mid-JSON.
    if (!message.parsed_output) {
      return NextResponse.json(
        {
          error: 'Claude returned an incomplete response. Try again, or shorten the transcript.',
          code: 'incomplete',
          stopReason: message.stop_reason,
          fallback: 'local',
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      items: message.parsed_output.items,
      model: message.model,
      usage: cacheStats(message),
    });
  } catch (err) {
    const { status, body } = aiErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
