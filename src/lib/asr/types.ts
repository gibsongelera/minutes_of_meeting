/**
 * Provider-agnostic ASR interface.
 *
 * ElevenLabs (elevenlabs.ts) is the primary implementation; AssemblyAI
 * (assemblyai.ts) is registered as a fallback for when a provider is
 * unavailable or does not support a requested language. Nothing outside this
 * directory should import a provider file directly — go through index.ts's
 * registry, so the rest of the app never has to know which vendor answered.
 *
 * parseWebhook returns a Promise rather than a plain value because not every
 * provider's webhook carries the full transcript: ElevenLabs' does, but
 * AssemblyAI's is a thin notification that requires a follow-up GET.
 */

export type AsrLanguage = 'eng' | 'fil' | 'ceb' | 'auto';

export interface AsrRequest {
  audioUrl: string; // signed Supabase Storage URL; the provider fetches it directly
  language: AsrLanguage;
  diarize: boolean;
  keyterms: string[]; // already capped/truncated by keyterms.ts before this point
  noVerbatim: boolean;
  webhookRef: string; // our transcription_jobs.id, threaded back via provider metadata
}

export interface AsrSubmission {
  providerJobId: string;
  model: string;
}

export interface AsrWord {
  text: string;
  start: number; // seconds
  end: number; // seconds
  type: 'word' | 'spacing' | 'audio_event';
  speakerId: string | null;
}

export interface AsrResult {
  providerJobId: string;
  webhookRef: string | null; // echoed back from submit; null if a provider can't carry it
  languageCode: string;
  languageProbability: number | null;
  text: string;
  words: AsrWord[];
}

/** A provider rejected the request outright (bad language, bad audio, quota, ...). */
export class AsrProviderError extends Error {
  constructor(
    public provider: string,
    message: string,
    public status?: number,
  ) {
    super(`[${provider}] ${message}`);
    this.name = 'AsrProviderError';
  }
}

export interface AsrProvider {
  readonly name: string;
  readonly supportedLanguages: readonly AsrLanguage[];
  submit(req: AsrRequest): Promise<AsrSubmission>;
  /** Verifies a raw (unparsed) webhook body against provider-specific signing. */
  verifyWebhook(rawBody: string, headers: Headers): boolean;
  parseWebhook(payload: unknown): Promise<AsrResult>;
}
