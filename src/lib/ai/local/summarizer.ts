/**
 * Local extractive summariser and action-item extractor.
 *
 * Direct port of assets/js/summarizer.js. This is no longer the primary
 * summariser — Claude handles that through /api/ai/* — but it stays as the
 * offline fallback so the airplane-mode walkthrough still produces real output
 * when the API route is unreachable. It runs entirely in the browser and needs
 * no key.
 */
import type { ExtractedActionItem, TranscriptSegment } from '@/lib/types/domain';

const STOPWORDS = new Set(
  (
    'a,an,the,and,or,but,if,then,else,when,while,for,to,of,in,on,at,by,with,as,is,are,was,were,' +
    'be,been,being,have,has,had,do,does,did,will,would,can,could,should,may,might,must,shall,' +
    'this,that,these,those,it,its,he,she,they,them,his,her,their,i,me,my,we,us,our,you,your,' +
    'from,about,into,over,under,again,more,most,less,not,no,yes,so,also,just'
  ).split(','),
);

const ACTION_KEYWORDS = [
  'will',
  'shall',
  'must',
  'should',
  'to draft',
  'to compile',
  'to submit',
  'deadline',
  'by next',
  'by july',
  'by august',
  'by september',
  'before',
  'i will',
  'we will',
  "i'll",
  "we'll",
  'please',
  'kindly',
  'action item',
  'action-item',
  'to-do',
  'todo',
  'follow up',
  'follow-up',
  'coordinate',
  'review',
  'finalize',
  'prepare',
  'send',
  'distribute',
  'endorse',
];

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w) && w.length > 2);
}

/** TextRank-flavoured extractive summary: frequency, position and action bias. */
export function summarize(text: string, maxSentences = 4): string {
  if (!text) return '';
  const sentences = text.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+/g) ?? [text];
  if (sentences.length <= maxSentences) return sentences.join(' ').trim();

  const wordFreq: Record<string, number> = {};
  sentences.forEach((s) => {
    tokenize(s).forEach((w) => {
      wordFreq[w] = (wordFreq[w] ?? 0) + 1;
    });
  });

  const scored = sentences.map((s, i) => {
    const words = tokenize(s);
    const freqScore = words.reduce((sum, w) => sum + (wordFreq[w] ?? 0), 0) / (words.length || 1);
    const positionBoost = 1 - (i / sentences.length) * 0.25;
    const lower = s.toLowerCase();
    const actionBoost = ACTION_KEYWORDS.some((k) => lower.includes(k)) ? 1.25 : 1;
    return { s: s.trim(), score: freqScore * positionBoost * actionBoost, i };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.s)
    .join(' ');
}

/**
 * Honorifics that must not be treated as sentence boundaries. Without this,
 * "Engr. Gomez said..." splits after "Engr." and the summary can surface a
 * two-word fragment as if it were a sentence.
 */
const HONORIFIC = /\b(?:Prof|Dr|Engr|Atty|Mr|Mrs|Ms|Sr|Jr|St)\.\s/g;
const HONORIFIC_GUARD = '';

export function summarizeSegments(segments: TranscriptSegment[], maxSentences = 4): string {
  /*
   * Join the spoken text only. The legacy version prefixed every segment with
   * its speaker and then stripped just the first label (a non-global anchored
   * regex), so every later "Name:" stayed in the corpus and could be selected
   * as summary text.
   */
  const full = segments.map((s) => s.text.trim()).join(' ');

  const guarded = full.replace(HONORIFIC, (m) => m.replace('. ', `${HONORIFIC_GUARD} `));
  return summarize(guarded, maxSentences).replaceAll(`${HONORIFIC_GUARD} `, '. ');
}

function extractDeadline(s: string): string {
  const months =
    '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
  const monthDay = new RegExp(`\\b${months}\\s+\\d{1,2}(?:,\\s*\\d{4})?\\b`, 'i');
  const m = s.match(monthDay);
  if (m) return m[0];

  const nextWeek = s.match(/by\s+(next\s+(?:week|month|monday|tuesday|wednesday|thursday|friday))/i);
  if (nextWeek) return nextWeek[1];

  const thisWeek = s.match(/by\s+(this\s+(?:week|friday|thursday|monday))/i);
  if (thisWeek) return thisWeek[1];

  return '';
}

function extractAssignee(s: string): string {
  const honorific =
    /(?:Prof\.|Dr\.|Engr\.|Atty\.|Mr\.|Mrs\.|Ms\.)\s+[A-Z][a-zA-Z.\-]+(?:\s+[A-Z][a-zA-Z.\-]+)?/;
  const m = s.match(honorific);
  if (m) return m[0];
  const direct = s.match(/\b([A-Z][a-z]+),\s*(please|can you|kindly|will you)/);
  if (direct) return direct[1];
  return '';
}

function dedupe(items: ExtractedActionItem[]): ExtractedActionItem[] {
  const seen = new Set<string>();
  return items.filter((it) => {
    const key = it.text.toLowerCase().slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function extractActionItems(segments: TranscriptSegment[]): ExtractedActionItem[] {
  const items: ExtractedActionItem[] = [];

  segments.forEach((seg) => {
    // Same honorific guard as the summariser: splitting on "Engr. " would cut
    // an action item in half and lose its assignee.
    const guarded = (seg.text ?? '').replace(HONORIFIC, (m) => m.replace('. ', `${HONORIFIC_GUARD} `));
    const sentences = guarded
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.replaceAll(`${HONORIFIC_GUARD} `, '. '));
    sentences.forEach((s) => {
      const lower = s.toLowerCase();
      if (!ACTION_KEYWORDS.some((k) => lower.includes(k))) return;
      items.push({
        text: s.trim(),
        assignee: extractAssignee(s) || seg.speaker || '',
        deadline: extractDeadline(s),
        // Deterministic, unlike the legacy version's Math.random() jitter:
        // a fabricated confidence that changes per run is worse than no signal.
        confidence: 0.85,
      });
    });
  });

  return dedupe(items);
}

/** Builds a CHED-shaped draft locally. Used when /api/ai/draft-minutes fails. */
export function draftMinutesFromTranscript(
  segments: TranscriptSegment[],
  agenda: string[],
): {
  callToOrder: string;
  previousMinutes: string;
  agendaItems: { title: string; notes: string }[];
  adjournment: string;
  aiSummary: string;
  actionItems: ExtractedActionItem[];
} {
  const opening = segments
    .slice(0, 2)
    .map((s) => s.text)
    .join(' ');
  const closing = segments
    .slice(-2)
    .map((s) => s.text)
    .join(' ');
  const aiSummary = summarizeSegments(segments, 5);

  const agendaItems = agenda.map((title) => {
    const firstWord = title.toLowerCase().split(' ')[0];
    const related = segments.filter((s) => s.text.toLowerCase().includes(firstWord));
    return {
      title,
      notes: related.length
        ? summarizeSegments(related, 2)
        : 'Discussed during the session. Refer to transcript for verbatim record.',
    };
  });

  return {
    callToOrder: opening || 'Meeting was called to order.',
    previousMinutes: 'Reviewed and noted.',
    agendaItems: agendaItems.length ? agendaItems : [{ title: 'General Discussion', notes: aiSummary }],
    adjournment: closing || 'There being no further business, the meeting was adjourned.',
    aiSummary,
    actionItems: extractActionItems(segments),
  };
}
