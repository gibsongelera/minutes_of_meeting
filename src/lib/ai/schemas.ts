/**
 * Request and response schemas for the AI routes.
 *
 * The response schemas are handed to Claude via zodOutputFormat, so the model is
 * constrained to emit exactly this shape — the alternative is regex-scraping
 * prose, which is what the legacy extractor had to do.
 *
 * Structured outputs reject several JSON Schema keywords (min/max, minLength,
 * pattern), so bounds are validated client-side by zod after parsing rather than
 * declared in the schema sent to the API.
 */
import * as z from 'zod';

const segment = z.object({
  speakerId: z.string().nullable().optional(),
  speaker: z.string(),
  t: z.number(),
  text: z.string(),
});

const meetingContextInput = z.object({
  title: z.string(),
  starts_at: z.string(),
  venue: z.string().nullable().optional(),
  meeting_type: z.enum(['regular', 'capstone', 'research']),
  sub_type: z.string().nullable().optional(),
  project_title: z.string().nullable().optional(),
  agenda: z.array(z.string()).default([]),
  language: z.string().default('en-US'),
});

const people = z
  .object({
    chair: z.string().optional(),
    secretary: z.string().optional(),
    adviser: z.string().optional(),
    panel: z.array(z.string()).optional(),
  })
  .default({});

/** POST /api/ai/summarize */
export const summarizeRequest = z.object({
  meeting: meetingContextInput,
  segments: z.array(segment).min(1, 'A transcript with at least one segment is required'),
  people: people,
  maxSentences: z.number().int().min(1).max(12).default(5),
});

/** POST /api/ai/action-items */
export const actionItemsRequest = z.object({
  meeting: meetingContextInput,
  segments: z.array(segment).min(1, 'A transcript with at least one segment is required'),
  people: people,
});

/** POST /api/ai/draft-minutes */
export const draftMinutesRequest = z.object({
  meeting: meetingContextInput,
  segments: z.array(segment).min(1, 'A transcript with at least one segment is required'),
  people: people,
});

// ---------------------------------------------------------------------------
// Model output shapes
// ---------------------------------------------------------------------------

export const actionItemsOutput = z.object({
  items: z.array(
    z.object({
      text: z.string(),
      assignee: z.string(),
      deadline: z.string(),
      confidence: z.number(),
    }),
  ),
});

export const minutesOutput = z.object({
  callToOrder: z.string(),
  previousMinutes: z.string(),
  agendaItems: z.array(
    z.object({
      title: z.string(),
      notes: z.string(),
    }),
  ),
  adjournment: z.string(),
});

export type ActionItemsOutput = z.infer<typeof actionItemsOutput>;
export type MinutesOutput = z.infer<typeof minutesOutput>;
