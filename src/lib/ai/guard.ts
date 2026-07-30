/**
 * Auth guard for the AI routes.
 *
 * These endpoints spend money on every call. Without a session check they are an
 * open proxy to our Anthropic key for anyone who finds the URL, so each route
 * verifies a signed-in Supabase session before doing any work.
 */
import { createClient } from '@/lib/supabase/server';

export async function requireSession(): Promise<{ userId: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (error || typeof sub !== 'string') return null;
  return { userId: sub };
}
