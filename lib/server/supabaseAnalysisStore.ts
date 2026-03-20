import type { SupabaseClient } from '@supabase/supabase-js';
import type { QuestionScore } from '@/lib/openai/scoreCandidate';

export interface CandidateScore {
  id: string;
  positionId: string;
  instanceId: string;
  orgId: string;
  overallScore: number;
  questionScores: QuestionScore[];
  impressionScore?: number;
  impressionNotes?: string;
  notes: string;
  analyzedAt: string;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export async function getScoresForPosition(
  supabase: SupabaseClient,
  positionId: string,
  orgId: string
): Promise<CandidateScore[]> {
  const { data, error } = await supabase
    .from('candidate_scores')
    .select('*')
    .eq('position_id', positionId)
    .eq('org_id', orgId);
  if (error) throw error;
  return (data ?? []).map(rowToScore);
}

export async function saveScore(
  supabase: SupabaseClient,
  score: Omit<CandidateScore, 'id' | 'analyzedAt'>
): Promise<CandidateScore> {
  const id = generateId();
  const analyzedAt = new Date().toISOString();
  const row = {
    id,
    position_id: score.positionId,
    instance_id: score.instanceId,
    org_id: score.orgId,
    overall_score: score.overallScore,
    question_scores: score.questionScores,
    notes: score.notes ?? null,
    analyzed_at: analyzedAt,
  };
  const { error } = await supabase
    .from('candidate_scores')
    .upsert(row, { onConflict: 'instance_id' });
  if (error) throw error;
  return { ...score, id, analyzedAt };
}

export async function getSettings(
  supabase: SupabaseClient,
  positionId: string,
  orgId: string
): Promise<{ scoringPrompt: string } | null> {
  const { data, error } = await supabase
    .from('position_analysis_settings')
    .select('scoring_prompt')
    .eq('position_id', positionId)
    .eq('org_id', orgId)
    .single();
  if (error || !data) return null;
  return { scoringPrompt: data.scoring_prompt as string };
}

export async function saveSettings(
  supabase: SupabaseClient,
  positionId: string,
  orgId: string,
  scoringPrompt: string
): Promise<void> {
  const { error } = await supabase
    .from('position_analysis_settings')
    .upsert(
      {
        position_id: positionId,
        org_id: orgId,
        scoring_prompt: scoringPrompt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'position_id' }
    );
  if (error) throw error;
}

function rowToScore(row: Record<string, unknown>): CandidateScore {
  return {
    id: row.id as string,
    positionId: row.position_id as string,
    instanceId: row.instance_id as string,
    orgId: row.org_id as string,
    overallScore: row.overall_score as number,
    questionScores: (row.question_scores as QuestionScore[]) ?? [],
    notes: (row.notes as string) ?? '',
    analyzedAt: (row.analyzed_at as string) ?? new Date().toISOString(),
  };
}
