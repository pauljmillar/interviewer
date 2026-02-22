import type { SupabaseClient } from '@supabase/supabase-js';
import type { InterviewTemplate, Question } from '@/types';

function rowToTemplate(row: Record<string, unknown>): InterviewTemplate {
  return {
    id: row.id as string,
    orgId: (row.org_id as string | null) ?? undefined,
    name: row.name as string,
    questions: (row.questions as Question[]) ?? [],
    intro: row.intro as string | undefined,
    conclusion: row.conclusion as string | undefined,
    reminder: row.reminder as string | undefined,
    voice: row.tts_voice as string | undefined,
  };
}

/** Returns standard (org_id IS NULL) + custom (org_id = orgId) templates. */
export async function getTemplatesForOrg(
  supabase: SupabaseClient,
  orgId: string
): Promise<InterviewTemplate[]> {
  const { data, error } = await supabase
    .from('interview_templates')
    .select('*')
    .or(`org_id.is.null,org_id.eq.${orgId}`)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []).map(rowToTemplate);
}

/** Only custom templates (org_id = orgId). Kept for compatibility if needed. */
export async function getCustomTemplates(
  supabase: SupabaseClient,
  orgId: string
): Promise<InterviewTemplate[]> {
  const { data, error } = await supabase
    .from('interview_templates')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []).map(rowToTemplate);
}

/** Get template by id; allowed if standard (org_id IS NULL) or org_id = orgId. */
export async function getTemplate(
  supabase: SupabaseClient,
  id: string,
  orgId: string
): Promise<InterviewTemplate | undefined> {
  const { data, error } = await supabase
    .from('interview_templates')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return undefined;
  const org_id = data.org_id as string | null;
  if (org_id != null && org_id !== orgId) return undefined;
  return rowToTemplate(data);
}

export async function saveCustomTemplate(
  supabase: SupabaseClient,
  orgId: string,
  template: InterviewTemplate
): Promise<void> {
  const row = {
    id: template.id,
    org_id: orgId,
    name: template.name,
    questions: template.questions,
    intro: template.intro,
    conclusion: template.conclusion,
    reminder: template.reminder,
    tts_voice: template.voice ?? null,
  };
  const { error } = await supabase.from('interview_templates').upsert(row, {
    onConflict: 'id',
  });
  if (error) throw error;
}

export async function deleteCustomTemplate(
  supabase: SupabaseClient,
  id: string,
  orgId: string
): Promise<void> {
  const { error } = await supabase
    .from('interview_templates')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId);
  if (error) throw error;
}
