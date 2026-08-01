import { describe, expect, it } from 'vitest';
import { foldWordsToSegments } from './fold';
import type { AsrWord } from './types';

function w(text: string, start: number, end: number, opts: Partial<AsrWord> = {}): AsrWord {
  return { text, start, end, type: 'word', speakerId: 'speaker_0', ...opts };
}
function space(start: number, end: number, speakerId: string | null = 'speaker_0'): AsrWord {
  return { text: ' ', start, end, type: 'spacing', speakerId };
}

describe('foldWordsToSegments', () => {
  it('returns nothing for an empty transcript', () => {
    expect(foldWordsToSegments([])).toEqual([]);
  });

  it('starts a new segment when the speaker changes', () => {
    const words: AsrWord[] = [
      w('Good', 0, 0.2),
      space(0.2, 0.3),
      w('morning.', 0.3, 0.6),
      w('Thanks', 1.0, 1.2, { speakerId: 'speaker_1' }),
      space(1.2, 1.3, 'speaker_1'),
      w('everyone.', 1.3, 1.6, { speakerId: 'speaker_1' }),
    ];

    const segments = foldWordsToSegments(words);

    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({
      speakerId: 'speaker_0',
      speaker: 'Speaker 1',
      t: 0,
      text: 'Good morning.',
    });
    expect(segments[1]).toMatchObject({
      speakerId: 'speaker_1',
      speaker: 'Speaker 2',
      t: 1.0,
      text: 'Thanks everyone.',
    });
  });

  it('breaks on a long pause even when the speaker does not change', () => {
    const words: AsrWord[] = [w('Okay.', 0, 0.3), w('So', 5.0, 5.2), space(5.2, 5.3), w('anyway.', 5.3, 5.6)];

    const segments = foldWordsToSegments(words);

    expect(segments).toHaveLength(2);
    expect(segments[0].text).toBe('Okay.');
    expect(segments[1].text).toBe('So anyway.');
    expect(segments[1].t).toBe(5.0);
  });

  it('does not break on a short pause', () => {
    const words: AsrWord[] = [w('Hello', 0, 0.3), space(0.3, 0.9), w('there.', 0.9, 1.1)];
    expect(foldWordsToSegments(words)).toHaveLength(1);
  });

  it('renders an audio_event as a bracketed marker instead of dropping it', () => {
    const words: AsrWord[] = [
      w('Right', 0, 0.2),
      space(0.2, 0.3),
      { text: 'laughter', start: 0.3, end: 1.0, type: 'audio_event', speakerId: 'speaker_0' },
      space(1.0, 1.1),
      w('so.', 1.1, 1.3),
    ];
    const segments = foldWordsToSegments(words);
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe('Right [laughter] so.');
  });

  it('breaks a long monologue only at a sentence boundary near the soft cap, without losing content', () => {
    const words: AsrWord[] = [];
    let t = 0;
    for (let i = 0; i < 40; i++) {
      const sentence = `Item number ${i} was discussed.`;
      sentence.split(' ').forEach((token, wi) => {
        if (wi > 0) {
          words.push(space(t, t + 0.05));
          t += 0.05;
        }
        words.push(w(token, t, t + 0.2));
        t += 0.2;
      });
      words.push(space(t, t + 0.1));
      t += 0.1;
    }

    const segments = foldWordsToSegments(words);

    expect(segments.length).toBeGreaterThan(1);
    for (const seg of segments.slice(0, -1)) {
      expect(seg.text).toMatch(/[.!?]$/);
    }

    const rejoined = segments.map((s) => s.text).join(' ');
    for (let i = 0; i < 40; i++) {
      expect(rejoined).toContain(`Item number ${i} was discussed.`);
    }
  });

  it('assigns stable per-transcript speaker numbers in first-seen order, not by label content', () => {
    const words: AsrWord[] = [
      w('A', 0, 0.2, { speakerId: 'speaker_3' }),
      w('B', 1.0, 1.2, { speakerId: 'speaker_1' }),
      w('C', 2.0, 2.2, { speakerId: 'speaker_3' }),
    ];
    const segments = foldWordsToSegments(words);
    expect(segments.map((s) => s.speaker)).toEqual(['Speaker 1', 'Speaker 2', 'Speaker 1']);
  });
});
