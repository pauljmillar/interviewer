import type { SupabaseClient } from '@supabase/supabase-js';
import type { PositionRecord, PositionType } from '@/types';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function rowToPosition(row: Record<string, unknown>): PositionRecord {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    name: row.name as string,
    type: row.type as PositionType | undefined,
    templateId: row.template_id as string | undefined,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
  };
}

export async function getPositions(
  supabase: SupabaseClient,
  orgId: string
): Promise<PositionRecord[]> {
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []).map(rowToPosition);
}

export async function getPosition(
  supabase: SupabaseClient,
  id: string,
  orgId: string
): Promise<PositionRecord | undefined> {
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId)
    .single();
  if (error || !data) return undefined;
  return rowToPosition(data);
}

export async function createPosition(
  supabase: SupabaseClient,
  orgId: string,
  params: { name: string; type?: PositionType; templateId?: string }
): Promise<PositionRecord> {
  const id = generateId();
  const record: PositionRecord = {
    id,
    orgId,
    name: params.name,
    type: params.type,
    templateId: params.templateId,
    createdAt: new Date().toISOString(),
  };
  const { error } = await supabase.from('positions').insert({
    id: record.id,
    org_id: orgId,
    name: record.name,
    type: record.type,
    template_id: record.templateId,
  });
  if (error) throw error;
  return record;
}

export async function updatePosition(
  supabase: SupabaseClient,
  position: PositionRecord
): Promise<void> {
  const { error } = await supabase
    .from('positions')
    .update({
      name: position.name,
      type: position.type,
      template_id: position.templateId,
    })
    .eq('id', position.id)
    .eq('org_id', position.orgId);
  if (error) throw error;
}

export async function deletePosition(
  supabase: SupabaseClient,
  id: string,
  orgId: string
): Promise<void> {
  const { error } = await supabase.from('positions').delete().eq('id', id).eq('org_id', orgId);
  if (error) throw error;
}
