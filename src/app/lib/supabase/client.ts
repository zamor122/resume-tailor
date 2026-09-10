import { createClient } from '@supabase/supabase-js';

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
  if (!key || !key.trim()) return 'placeholder_key';
  return key.trim();
}

const supabaseUrl = getValidSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabasePublishableKey = getValidKey(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

/**
 * Client-side Supabase client
 * Direct concrete instance with fallback to prevent build-time and runtime hydration crashes.
 */
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
