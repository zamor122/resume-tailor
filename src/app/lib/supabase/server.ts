import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseAdminInstance: SupabaseClient | null = null;

/**
 * Get or create the Supabase admin client
 * Lazy-loaded to ensure environment variables are available when Next.js loads them
 */
function getSupabaseAdmin(): SupabaseClient {
  if (supabaseAdminInstance) {
    return supabaseAdminInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    const missing = [];
    if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseSecretKey) missing.push('SUPABASE_SECRET_KEY');
    
    throw new Error(
      `Missing Supabase environment variables: ${missing.join(', ')}\n` +
      `Please ensure these are set in your .env.local file and restart your dev server.\n` +
      `Current values: URL=${supabaseUrl ? 'SET' : 'MISSING'}, Secret=${supabaseSecretKey ? 'SET' : 'MISSING'}`
    );
  }

  supabaseAdminInstance = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdminInstance;
}

/**
 * Server-side Supabase client
 * Uses the secret key - bypasses RLS, use only in API routes
 * NEVER expose this client to the client-side
 * 
 * Lazy-loaded to ensure environment variables are available
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseAdmin();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

