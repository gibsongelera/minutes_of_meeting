/**
 * ASR provider registry.
 *
 * Swap or add a provider by editing this file only — nothing else in the app
 * should import elevenlabs.ts or assemblyai.ts directly.
 */
import { elevenLabsProvider } from './elevenlabs';
import { assemblyAiProvider } from './assemblyai';
import type { AsrLanguage, AsrProvider } from './types';

const PROVIDERS: Record<string, AsrProvider> = {
  elevenlabs: elevenLabsProvider,
  assemblyai: assemblyAiProvider,
};

const DEFAULT_PROVIDER = 'elevenlabs';

export function getProvider(name: string = DEFAULT_PROVIDER): AsrProvider {
  const provider = PROVIDERS[name];
  if (!provider) throw new Error(`Unknown ASR provider: ${name}`);
  return provider;
}

/**
 * Picks a provider that actually supports the requested language — Cebuano
 * only has one real answer today. Falls back to scanning the whole registry
 * only when the preferred provider can't do it, so the caller still gets a
 * clear rejection rather than a silently wrong transcription when nothing
 * supports the language at all.
 */
export function selectProvider(language: AsrLanguage, preferred: string = DEFAULT_PROVIDER): AsrProvider {
  const first = PROVIDERS[preferred];
  if (first?.supportedLanguages.includes(language)) return first;

  const fallback = Object.values(PROVIDERS).find((p) => p.supportedLanguages.includes(language));
  if (fallback) return fallback;

  throw new Error(`No registered ASR provider supports language "${language}"`);
}

export * from './types';
export { buildKeyterms } from './keyterms';
export type { KeytermSource } from './keyterms';
