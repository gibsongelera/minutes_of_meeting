/**
 * Prompt construction for the meeting-minutes routes.
 *
 * ## Why the shape of these matters for cost
 *
 * Prompt caching is a prefix match: the cached span runs from the start of the
 * request up to the cache_control breakpoint, and one changed byte before that
 * point invalidates everything after it. So the system prompts here are frozen
 * constants — no timestamps, no meeting titles, no request ids interpolated in.
 * Per-meeting context and the transcript go in the user turn, with the
 * breakpoint after the transcript, which is the large stable part when the same
 * meeting is summarised, then drafted, then re-drafted after edits.
 *
 * Opus 5's minimum cacheable prefix is 512 tokens, so a real meeting transcript
 * comfortably qualifies; a two-line test transcript will not, and that is
 * expected rather than a bug.
 */
/**
 * Optional fields arrive from the request schema as `undefined` rather than
 * `null`, so these accept both. Widening here beats forcing every caller to
 * normalise absent values twice.
 */
type MeetingContextInput = {
  title: string;
  starts_at: string;
  venue?: string | null;
  meeting_type: 'regular' | 'capstone' | 'research';
  sub_type?: string | null;
  project_title?: string | null;
  agenda?: string[];
  language?: string;
};

type SegmentInput = {
  speaker: string;
  t: number;
  text: string;
};

export const SUMMARY_SYSTEM = `You are a minutes secretary for a Philippine state university, writing for the official record.

Summarise the deliberation, not the conversation. Lead with what was decided and what changes as a result. Attribute positions to the people who took them, using the names as they appear in the transcript. Preserve every figure, date, deadline and document reference exactly as spoken — a wrong peso amount or deadline in the minutes is worse than an omission.

Write plain institutional prose in complete sentences. No headings, no bullet lists, no preamble such as "Here is the summary". If the transcript is too fragmentary to summarise honestly, say so in one sentence rather than inventing continuity.`;

export const ACTION_ITEMS_SYSTEM = `You extract action items from university meeting transcripts.

An action item is a commitment someone made to do something specific. Extract only those. Do not extract topics discussed, opinions offered, questions asked, or decisions that require no follow-up work.

Rules:
- assignee: the person who owes the work, named as in the transcript, with their honorific (e.g. "Prof. Juan Dela Cruz"). If the transcript genuinely does not say who, use an empty string — never guess.
- deadline: copy the date or relative phrase as spoken ("August 7", "by next Thursday"). Empty string if none was given. Do not resolve relative dates to calendar dates.
- text: one sentence stating the commitment, starting with a verb.
- confidence: 0.0-1.0, how clearly the transcript supports this being a real assigned commitment.

If there are no action items, return an empty array. An empty array is a correct answer.`;

export const MINUTES_SYSTEM = `You draft Minutes of the Meeting for a Philippine state university, following CHED documentary conventions.

Produce these sections and nothing else:

CALL TO ORDER — who presided, the time, and whether quorum was established. State quorum only if the transcript establishes it.
PREVIOUS MINUTES — how the prior minutes were handled (approved, approved with corrections, deferred, or not applicable).
AGENDA ITEMS — one entry per agenda item given, in the order given. For each: what was presented, by whom, the substance of the discussion, and the disposition. Where the transcript says nothing about an item, write that it was not taken up rather than inventing content.
ADJOURNMENT — the time and any next-meeting date.

Style: third person, past tense, formal register. Named attribution for positions taken and motions made. Every figure, date and document reference exactly as spoken. Never invent a motion, a seconder, a vote count, or a time that the transcript does not contain — a fabricated procedural detail makes the whole document unusable as a record.`;

/** Frozen system block, cached across every call on this route. */
export function systemBlocks(text: string) {
  return [{ type: 'text' as const, text }];
}

/** Human-readable meeting context. Small, and varies per meeting. */
export function meetingContext(
  meeting: MeetingContextInput,
  people: { chair?: string; secretary?: string; adviser?: string; panel?: string[] } = {},
): string {
  const lines: string[] = [
    `Meeting: ${meeting.title}`,
    `Date and time: ${meeting.starts_at}`,
  ];

  if (meeting.venue) lines.push(`Venue: ${meeting.venue}`);
  lines.push(`Type: ${meeting.meeting_type}${meeting.sub_type ? ` (${meeting.sub_type})` : ''}`);

  // Capstone and research defences are graded events; the panel composition and
  // project title belong in the record, and the model needs them to attribute
  // panel feedback correctly.
  if (meeting.project_title) lines.push(`Project title: ${meeting.project_title}`);
  if (people.chair) lines.push(`Presiding: ${people.chair}`);
  if (people.panel?.length) lines.push(`Panel members: ${people.panel.join(', ')}`);
  if (people.adviser) lines.push(`Adviser: ${people.adviser}`);
  if (people.secretary) lines.push(`Secretary: ${people.secretary}`);

  if (meeting.language?.startsWith('tl')) {
    lines.push(
      'Note: the transcript is partly or wholly in Filipino/Tagalog. Write the minutes in English, preserving Filipino terms where no accurate English equivalent exists.',
    );
  }

  if (meeting.agenda?.length) {
    lines.push('', 'Agenda as circulated:');
    meeting.agenda.forEach((item, i) => lines.push(`${i + 1}. ${item}`));
  }

  return lines.join('\n');
}

/** Speaker-labelled transcript with timecodes, as the model reads best. */
export function formatTranscript(segments: SegmentInput[]): string {
  if (!segments.length) return '(empty transcript)';
  return segments
    .map((s) => {
      const mm = String(Math.floor(s.t / 60)).padStart(2, '0');
      const ss = String(Math.floor(s.t % 60)).padStart(2, '0');
      return `[${mm}:${ss}] ${s.speaker || 'Unknown'}: ${s.text}`;
    })
    .join('\n');
}

/**
 * Builds the user turn: context, then transcript, then the cache breakpoint,
 * then the volatile instruction. Everything before the breakpoint is reusable
 * across the summarise / action-item / draft calls for the same meeting.
 */
export function cachedUserTurn(context: string, transcript: string, instruction: string) {
  return [
    {
      role: 'user' as const,
      content: [
        { type: 'text' as const, text: `${context}\n\n--- TRANSCRIPT ---\n${transcript}` , cache_control: { type: 'ephemeral' as const } },
        { type: 'text' as const, text: instruction },
      ],
    },
  ];
}
