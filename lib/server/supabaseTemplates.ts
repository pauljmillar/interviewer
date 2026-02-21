import type { SupabaseClient } from '@supabase/supabase-js';
import type { InterviewTemplate, Question } from '@/types';

function rowToTemplate(row: Record<string, unknown>): InterviewTemplate {
  return {
    id: row.id as string,
    name: row.name as string,
    questions: (row.questions as Question[]) ?? [],
    intro: row.intro as string | undefined,
    conclusion: row.conclusion as string | undefined,
    reminder: row.reminder as string | undefined,
  };
}

export async function getCustomTemplates(
  supabase: SupabaseClient
): Promise<InterviewTemplate[]> {
  const { data, error } = await supabase
    .from('interview_templates')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []).map(rowToTemplate);
}

export async function getTemplate(
  supabase: SupabaseClient,
  id: string
): Promise<InterviewTemplate | undefined> {
  const { data, error } = await supabase
    .from('interview_templates')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return undefined;
  return rowToTemplate(data);
}

export async function saveCustomTemplate(
  supabase: SupabaseClient,
  template: InterviewTemplate
): Promise<void> {
  const row = {
    id: template.id,
    name: template.name,
    questions: template.questions,
    intro: template.intro,
    conclusion: template.conclusion,
    reminder: template.reminder,
  };
  const { error } = await supabase.from('interview_templates').upsert(row, {
    onConflict: 'id',
  });
  if (error) throw error;
}

export async function deleteCustomTemplate(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from('interview_templates').delete().eq('id', id);
  if (error) throw error;
}
