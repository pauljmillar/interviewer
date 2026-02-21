import { createClient } from '@supabase/supabase-js';

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Server-side Supabase URL. For consistent reads (no stale session after refresh):
 * - Set SUPABASE_PRIMARY_URL to your project's Primary API URL so all server-side traffic
 *   goes to the primary DB. With one URL today, use the same as NEXT_PUBLIC_SUPABASE_URL.
 * - When you add Read Replicas, Supabase will show a dedicated Primary URL in
 *   Dashboard → Project Settings → API (Source: Primary). Set SUPABASE_PRIMARY_URL to that;
 *   then all API instances get fresh reads without an in-memory cache.
 */
const supabaseUrl =
  process.env.SUPABASE_PRIMARY_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

/** Server-side Supabase client (service role). Returns null if env is not set. */
export function createServerSupabase() {
  return getSupabase();
}
