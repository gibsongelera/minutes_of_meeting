/**
 * Folds provider word-level ASR output into speaker-turn segments.
 *
 * Scribe (and most ASR providers) return one entry per word, not per
 * sentence or turn. transcripts.segments expects a
 * { speakerId, speaker, t, text } shape per turn — this is the one function
 * that bridges the two, and the piece most likely to silently mangle a
 * transcript if it drifts: the failure looks like "the AI is bad" rather
 * than "the fold is off by one". Keep this pure and unit-tested (fold.test.ts).
 *
 * Sentence-boundary detection depends on how the provider tokenizes trailing
 * punctuation (attached to the word vs. its own "spacing" token); this was
 * written against the documented word shape, not a live sample, so re-check
 * it against a real ElevenLabs response once one is available.
 */
import type { AsrWord } from './types';

export interface FoldedSegment {
  speakerId: string | null;
  speaker: string;
  t: number;
  text: string;
}

/** New segment when the silence between two words exceeds this, even for the same speaker. */
const PAUSE_BREAK_SEC = 1.5;
/** Soft cap; only takes effect at a sentence boundary, never mid-sentence. */
const MAX_SEGMENT_CHARS = 400;

const SENTENCE_END = /[.!?]["')\]]?$/;

function displayNameFor(speakerId: string | null, order: Map<string, number>): string {
  if (speakerId === null) return 'Unknown Speaker';
  if (!order.has(speakerId)) order.set(speakerId, order.size + 1);
  return `Speaker ${order.get(speakerId)}`;
}

/**
 * Joins one uninterrupted turn's words into text. "spacing" words contribute
 * their literal text (usually a single space) verbatim; "audio_event" words
 * render as a bracketed inline marker rather than being dropped, since the
 * transcript is meant to be a fuller record than the minutes drafted from it.
 */
function joinWords(words: AsrWord[]): string {
  let out = '';
  for (const w of words) {
    if (w.type === 'spacing') {
      out += w.text;
      continue;
    }
    if (out && !/\s$/.test(out)) out += ' ';
    out += w.type === 'audio_event' ? `[${w.text}]` : w.text;
  }
  return out.trim();
}

export function foldWordsToSegments(words: AsrWord[]): FoldedSegment[] {
  if (!words.length) return [];

  const order = new Map<string, number>();
  const segments: FoldedSegment[] = [];
  let current: AsrWord[] = [];
  let currentChars = 0;

  const flush = () => {
    if (!current.length) return;
    const text = joinWords(current);
    if (text) {
      segments.push({
        speakerId: current[0].speakerId,
        speaker: displayNameFor(current[0].speakerId, order),
        t: current[0].start,
        text,
      });
    }
    current = [];
    currentChars = 0;
  };

  for (const w of words) {
    const isContent = w.type !== 'spacing';
    const prevContent = [...current].reverse().find((x) => x.type !== 'spacing');

    const speakerChanged = isContent && current.length > 0 && w.speakerId !== current[0].speakerId;
    const pauseBroke = isContent && prevContent !== undefined && w.start - prevContent.end > PAUSE_BREAK_SEC;

    if (speakerChanged || pauseBroke) {
      flush();
    }

    current.push(w);
    currentChars += w.text.length + 1;

    const atSentenceBoundary = isContent && SENTENCE_END.test(w.text);
    if (currentChars >= MAX_SEGMENT_CHARS && atSentenceBoundary) {
      flush();
    }
  }
  flush();

  return segments;
}
