import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ApiKey {
  id: string;
  orgId: string;
  name: string;
  keyPrefix: string;
  createdBy: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = 'cai_' + crypto.randomBytes(32).toString('base64url');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const prefix = raw.slice(0, 12);
  return { raw, hash, prefix };
}

function rowToKey(row: Record<string, unknown>): ApiKey {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    name: row.name as string,
    keyPrefix: row.key_prefix as string,
    createdBy: row.created_by as string,
    lastUsedAt: (row.last_used_at as string | null) ?? null,
    revokedAt: (row.revoked_at as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function createApiKey(
  supabase: SupabaseClient,
  params: { orgId: string; name: string; createdBy: string }
): Promise<{ id: string; raw: string; prefix: string }> {
  const id = `key_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const { raw, hash, prefix } = generateApiKey();
  const { error } = await supabase.from('api_keys').insert({
    id,
    org_id: params.orgId,
    name: params.name,
    key_hash: hash,
    key_prefix: prefix,
    created_by: params.createdBy,
    created_at: new Date().toISOString(),
  });
  if (error) throw error;
  return { id, raw, prefix };
}

export async function listApiKeys(
  supabase: SupabaseClient,
  orgId?: string
): Promise<ApiKey[]> {
  let query = supabase.from('api_keys').select('*').order('created_at', { ascending: false });
  if (orgId) query = query.eq('org_id', orgId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(rowToKey);
}

export async function revokeApiKey(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
