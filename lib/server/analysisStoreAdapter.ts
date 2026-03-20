/**
 * Unified analysis store: uses Supabase when env is set, otherwise file store.
 */
import { createServerSupabase } from '@/lib/supabase/server';
import * as supabaseStore from '@/lib/server/supabaseAnalysisStore';
import type { CandidateScore } from '@/lib/server/supabaseAnalysisStore';
import type { QuestionScore } from '@/lib/openai/scoreCandidate';
import fs from 'fs';
import path from 'path';

export type { CandidateScore };

// ─── File-based fallback ──────────────────────────────────────────────────────

const DATA_DIR = path.join(process.cwd(), '.data');

function analysisFilePath(positionId: string): string {
  return path.join(DATA_DIR, `analysis-${positionId}.json`);
}

type FileAnalysisStore = {
  scores: CandidateScore[];
  scoringPrompt?: string;
};

function loadFile(positionId: string): FileAnalysisStore {
  try {
    const raw = fs.readFileSync(analysisFilePath(positionId), 'utf-8');
    return JSON.parse(raw) as FileAnalysisStore;
  } catch {
    return { scores: [] };
  }
}

function saveFile(positionId: string, data: FileAnalysisStore): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(analysisFilePath(positionId), JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[analysisStore] file persist failed', err);
  }
}

// ─── Adapter exports ──────────────────────────────────────────────────────────

export async function getScoresForPosition(
  positionId: string,
  orgId: string
): Promise<CandidateScore[]> {
  const sb = createServerSupabase();
  if (sb) return supabaseStore.getScoresForPosition(sb, positionId, orgId);
  return loadFile(positionId).scores;
}

export async function saveScore(
  score: Omit<CandidateScore, 'id' | 'analyzedAt'>
): Promise<CandidateScore> {
  const sb = createServerSupabase();
  if (sb) return supabaseStore.saveScore(sb, score);

  // File fallback: upsert by instanceId
  const data = loadFile(score.positionId);
  const idx = data.scores.findIndex((s) => s.instanceId === score.instanceId);
  const saved: CandidateScore = {
    ...score,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    analyzedAt: new Date().toISOString(),
  };
  if (idx >= 0) {
    data.scores[idx] = saved;
  } else {
    data.scores.push(saved);
  }
  saveFile(score.positionId, data);
  return saved;
}

export async function getSettings(
  positionId: string,
  orgId: string
): Promise<{ scoringPrompt: string } | null> {
  const sb = createServerSupabase();
  if (sb) return supabaseStore.getSettings(sb, positionId, orgId);
  const prompt = loadFile(positionId).scoringPrompt;
  return prompt ? { scoringPrompt: prompt } : null;
}

export async function saveSettings(
  positionId: string,
  orgId: string,
  scoringPrompt: string
): Promise<void> {
  const sb = createServerSupabase();
  if (sb) return supabaseStore.saveSettings(sb, positionId, orgId, scoringPrompt);
  const data = loadFile(positionId);
  data.scoringPrompt = scoringPrompt;
  saveFile(positionId, data);
}

export { QuestionScore };
