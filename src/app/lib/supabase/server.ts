import { createClient, SupabaseClient } from '@supabase/supabase-js';

function getValidSupabaseUrl(url?: string): string {
  if (!url) return 'https://placeholder.supabase.co';
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed;
    }
  } catch {
    // fallback
  }
  return 'https://placeholder.supabase.co';
}

function getValidKey(key?: string): string {
  if (!key || !key.trim()) return 'placeholder_secret';
  return key.trim();
}

const supabaseUrl = getValidSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseSecretKey = getValidKey(process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

/**
 * Server-side Supabase client
 * Uses the secret key - bypasses RLS, use only in API routes
 * NEVER expose this client to the client-side
 */
export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
