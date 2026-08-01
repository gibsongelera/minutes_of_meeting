/**
 * AssemblyAI Universal-2 fallback provider.
 *
 * Registered but not selected by default — see index.ts's selectProvider().
 * Universal-2 does not support Cebuano at all, so this provider declares only
 * "eng" | "fil" | "auto"; the registry must never route "ceb" here.
 *
 * Structural note: unlike ElevenLabs, AssemblyAI's webhook is a thin
 * notification ({ transcript_id, status }), not the transcript itself — the
 * full result needs a follow-up GET. That is why AsrProvider.parseWebhook
 * returns a Promise.
 *
 * Webhook auth here is a shared header, not HMAC: whatever value is set as
 * webhook_auth_header_value at submit time is echoed back verbatim on the
 * callback request, and verifyWebhook just compares it.
 *
 * The matching /api/webhooks/assemblyai route is not built in this pass —
 * this file makes the provider swappable in principle, but AssemblyAI is the
 * registered fallback, not the active path. Build the route before actually
 * relying on this provider.
 */
import type { AsrLanguage, AsrProvider, AsrRequest, AsrResult, AsrSubmission, AsrWord } from './types';
import { AsrProviderError } from './types';

const API_BASE = 'https://api.assemblyai.com/v2';
const WEBHOOK_HEADER_NAME = 'x-smartmin-webhook-secret';

function apiKey(): string {
  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) throw new AsrProviderError('assemblyai', 'ASSEMBLYAI_API_KEY is not set');
  return key;
}

function webhookSecret(): string {
  const secret = process.env.ASSEMBLYAI_WEBHOOK_SECRET;
  if (!secret) throw new AsrProviderError('assemblyai', 'ASSEMBLYAI_WEBHOOK_SECRET is not set');
  return secret;
}

function languageCode(lang: AsrLanguage): string | undefined {
  if (lang === 'auto' || lang === 'ceb') return undefined;
  if (lang === 'fil') return 'tl';
  return 'en';
}

async function submit(req: AsrRequest): Promise<AsrSubmission> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new AsrProviderError('assemblyai', 'NEXT_PUBLIC_APP_URL is not set');

  const res = await fetch(`${API_BASE}/transcript`, {
    method: 'POST',
    headers: { authorization: apiKey(), 'content-type': 'application/json' },
    body: JSON.stringify({
      audio_url: req.audioUrl,
      language_code: languageCode(req.language),
      language_detection: req.language === 'auto' || req.language === 'ceb',
      speaker_labels: req.diarize,
      webhook_url: `${appUrl}/api/webhooks/assemblyai?ref=${encodeURIComponent(req.webhookRef)}`,
      webhook_auth_header_name: WEBHOOK_HEADER_NAME,
      webhook_auth_header_value: webhookSecret(),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new AsrProviderError('assemblyai', `submit failed: ${detail || res.statusText}`, res.status);
  }

  const body = (await res.json()) as { id?: string };
  if (!body.id) throw new AsrProviderError('assemblyai', 'submit response had no id');
  return { providerJobId: body.id, model: 'universal-2' };
}

function verifyWebhook(_rawBody: string, headers: Headers): boolean {
  const provided = headers.get(WEBHOOK_HEADER_NAME);
  if (!provided) return false;
  return provided === webhookSecret();
}

async function parseWebhook(payload: unknown): Promise<AsrResult> {
  const body = payload as { transcript_id?: string; status?: string };
  if (!body.transcript_id) {
    throw new AsrProviderError('assemblyai', 'webhook payload missing transcript_id');
  }
  if (body.status === 'error') {
    throw new AsrProviderError('assemblyai', `provider reported a failed transcription (${body.transcript_id})`);
  }

  const res = await fetch(`${API_BASE}/transcript/${body.transcript_id}`, {
    headers: { authorization: apiKey() },
  });
  if (!res.ok) {
    throw new AsrProviderError(
      'assemblyai',
      `failed to fetch completed transcript ${body.transcript_id}`,
      res.status,
    );
  }

  const full = (await res.json()) as {
    id: string;
    language_code?: string;
    text?: string;
    words?: { text: string; start: number; end: number; speaker?: string | null }[];
  };

  const words: AsrWord[] = (full.words ?? []).map((w) => ({
    text: w.text,
    start: w.start / 1000,
    end: w.end / 1000,
    type: 'word',
    speakerId: w.speaker ? `speaker_${w.speaker.toLowerCase()}` : null,
  }));

  return {
    providerJobId: full.id,
    webhookRef: null,
    languageCode: full.language_code ?? 'unknown',
    languageProbability: null,
    text: full.text ?? '',
    words,
  };
}

export const assemblyAiProvider: AsrProvider = {
  name: 'assemblyai',
  supportedLanguages: ['eng', 'fil', 'auto'],
  submit,
  verifyWebhook,
  parseWebhook,
};
