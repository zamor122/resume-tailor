import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || 'placeholder_secret';

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
