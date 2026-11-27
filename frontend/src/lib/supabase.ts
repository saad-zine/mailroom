import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

/** Auth is only enabled when both Vite env vars are set. Local dev and the
 *  bundled demo keep working without them. */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export const authEnabled = supabase !== null;

export function storeToken(token: string | null): void {
  if (token) localStorage.setItem('mailroom_token', token);
  else localStorage.removeItem('mailroom_token');
}

export function currentToken(): string | null {
  return localStorage.getItem('mailroom_token');
}
