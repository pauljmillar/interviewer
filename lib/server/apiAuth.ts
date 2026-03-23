import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * Validates a Bearer token from the Authorization header.
 * Checks: token exists in api_keys and is not revoked.
 * Updates last_used_at on success.
 * Returns { keyId } on success, or null on failure.
 */
export async function validateApiKey(
  request: NextRequest
): Promise<{ keyId: string } | null> {
  const authHeader = request.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const raw = authHeader.slice(7).trim();
  if (!raw) return null;

  const hash = crypto.createHash('sha256').update(raw).digest('hex');

  const supabase = createServerSupabase();
  if (!supabase) return null;

  const { data: key, error } = await supabase
    .from('api_keys')
    .select('id, revoked_at')
    .eq('key_hash', hash)
    .single();

  if (error || !key) return null;
  if (key.revoked_at) return null;

  // Update last_used_at (fire-and-forget, don't block response)
  supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', key.id)
    .then(() => {});

  return { keyId: key.id as string };
}
