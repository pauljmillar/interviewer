import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveOrgId } from '@/lib/server/getEffectiveOrgId';
import { getAllInstances, getLatestSession } from '@/lib/server/instanceStoreAdapter';
import {
  getScoresForPosition,
  saveScore,
  getSettings,
  type CandidateScore,
} from '@/lib/server/analysisStoreAdapter';
import { scoreCandidate } from '@/lib/openai/scoreCandidate';
import { DEFAULT_SCORING_PROMPT } from '@/lib/constants/analysisDefaults';

export interface QuestionDetail {
  questionIndex: number;
  question: string;
  score: number;   // 0–10
  notes: string;
}

export interface RankedCandidate {
  instanceId: string;
  recipientName?: string;
  status: 'not_started' | 'started' | 'completed';
  rank: number | null;
  overallScore: number | null;
  impressionScore: number | null;
  impressionNotes: string | null;
  questionDetails: QuestionDetail[] | null;
  notes: string | null;
  analyzedAt: string | null;
}

export interface AnalysisResult {
  summary: {
    notStarted: number;
    started: number;
    completed: number;
    alreadyScored: number;
    newlyScored: number;
    scoringErrors: number;
    lastAnalyzedAt: string | null;
  };
  candidates: RankedCandidate[];
  warning?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await getEffectiveOrgId(request);
  if (!orgId) return NextResponse.json({ error: 'Organization required' }, { status: 403 });

  const { id: positionId } = await params;

  try {
    const [instances, scores] = await Promise.all([
      getAllInstances(orgId, positionId),
      getScoresForPosition(positionId, orgId),
    ]);
    return NextResponse.json(buildResult(instances, scores, 0, 0));
  } catch (err) {
    console.error('[analyze GET] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load analysis' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await getEffectiveOrgId(request);
  if (!orgId) return NextResponse.json({ error: 'Organization required' }, { status: 403 });

  const { id: positionId } = await params;

  let instances: Awaited<ReturnType<typeof getAllInstances>>;
  let existingScores: CandidateScore[];
  let settings: { scoringPrompt: string } | null;

  try {
    [instances, existingScores, settings] = await Promise.all([
      getAllInstances(orgId, positionId),
      getScoresForPosition(positionId, orgId),
      getSettings(positionId, orgId),
    ]);
  } catch (err) {
    console.error('[analyze POST] setup error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load data for analysis' },
      { status: 500 }
    );
  }

  const scoringPrompt = settings?.scoringPrompt ?? DEFAULT_SCORING_PROMPT;
  const scoredInstanceIds = new Set(existingScores.map((s) => s.instanceId));

  const completedInstances = instances.filter((i) => i.status === 'completed');
  const toScore = completedInstances.filter((i) => !scoredInstanceIds.has(i.id));

  console.log('[analyze POST]', {
    positionId,
    totalCompleted: completedInstances.length,
    alreadyScored: existingScores.length,
    toScore: toScore.length,
  });

  if (toScore.length === 0 && existingScores.length === 0) {
    // Nothing to do and nothing scored yet — return current state with a hint
    const result = buildResult(instances, existingScores, 0, 0);
    return NextResponse.json({
      ...result,
      warning:
        completedInstances.length === 0
          ? 'No completed interviews to analyse yet.'
          : 'All completed interviews are already scored.',
    });
  }

  // Calibration hint from existing scores
  let calibrationHint: string | undefined;
  if (existingScores.length > 0) {
    const sorted = existingScores.map((s) => s.overallScore).sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const median = sorted[Math.floor(sorted.length / 2)];
    calibrationHint = `Existing ${existingScores.length} candidates score ${min}–${max}, median ${median}/100. Use consistent standards.`;
  }

  // Score each new completed instance
  const newScores: CandidateScore[] = [];
  let scoringErrors = 0;
  let lastError: string | undefined;

  for (const instance of toScore) {
    try {
      const session = await getLatestSession(instance.id);
      if (!session || session.messages.length === 0) {
        console.log('[analyze POST] skipping instance with no messages:', instance.id);
        continue;
      }

      const output = await scoreCandidate({
        questions: instance.questions,
        messages: session.messages,
        scoringPrompt,
        calibrationHint,
      });

      const saved = await saveScore({
        positionId,
        instanceId: instance.id,
        orgId,
        overallScore: output.overallScore,
        questionScores: output.questionScores,
        notes: output.notes,
      });

      newScores.push({
        ...saved,
        impressionScore: output.impressionScore,
        impressionNotes: output.impressionNotes,
      } as CandidateScore & { impressionScore: number; impressionNotes: string });

      console.log('[analyze POST] scored instance', instance.id, '→', output.overallScore);
    } catch (err) {
      scoringErrors++;
      lastError = err instanceof Error ? err.message : String(err);
      console.error('[analyze POST] scoring failed for instance', instance.id, err);
    }
  }

  // If every attempt failed, surface the error rather than silently doing nothing
  if (toScore.length > 0 && newScores.length === 0 && scoringErrors > 0) {
    return NextResponse.json(
      { error: `Scoring failed for all candidates. Last error: ${lastError}` },
      { status: 500 }
    );
  }

  const allScores = [...existingScores, ...newScores];
  const result = buildResult(instances, allScores, newScores.length, scoringErrors);

  if (scoringErrors > 0) {
    return NextResponse.json({
      ...result,
      warning: `${scoringErrors} candidate(s) could not be scored and were skipped.`,
    });
  }

  return NextResponse.json(result);
}

function buildResult(
  instances: Awaited<ReturnType<typeof getAllInstances>>,
  scores: CandidateScore[],
  newlyScored: number,
  scoringErrors: number
): AnalysisResult {
  const scoreByInstanceId = new Map(scores.map((s) => [s.instanceId, s]));

  const scoredCompleted = scores.slice().sort((a, b) => b.overallScore - a.overallScore);
  const rankByInstanceId = new Map<string, number>();
  scoredCompleted.forEach((s, i) => rankByInstanceId.set(s.instanceId, i + 1));

  const summary = {
    notStarted: instances.filter((i) => i.status === 'not_started').length,
    started: instances.filter((i) => i.status === 'started').length,
    completed: instances.filter((i) => i.status === 'completed').length,
    alreadyScored: scores.length - newlyScored,
    newlyScored,
    scoringErrors,
    lastAnalyzedAt:
      scores.length > 0
        ? scores.reduce(
            (latest, s) => (s.analyzedAt > latest ? s.analyzedAt : latest),
            scores[0].analyzedAt
          )
        : null,
  };

  const toCandidate = (inst: (typeof instances)[0]): RankedCandidate => {
    const score = scoreByInstanceId.get(inst.id);
    const s = score as
      | (CandidateScore & { impressionScore?: number; impressionNotes?: string })
      | undefined;

    const questionDetails: QuestionDetail[] | null = s?.questionScores
      ? s.questionScores.map((qs) => ({
          questionIndex: qs.questionIndex,
          question: inst.questions[qs.questionIndex]?.mainQuestion ?? `Question ${qs.questionIndex + 1}`,
          score: qs.score,
          notes: qs.notes,
        }))
      : null;

    return {
      instanceId: inst.id,
      recipientName: inst.recipientName,
      status: inst.status,
      rank: rankByInstanceId.get(inst.id) ?? null,
      overallScore: s?.overallScore ?? null,
      impressionScore: s?.impressionScore ?? null,
      impressionNotes: s?.impressionNotes ?? null,
      questionDetails,
      notes: s?.notes ?? null,
      analyzedAt: s?.analyzedAt ?? null,
    };
  };

  const completed = instances.filter((i) => i.status === 'completed');
  const started = instances.filter((i) => i.status === 'started');
  const notStarted = instances.filter((i) => i.status === 'not_started');

  const completedCandidates = completed.map(toCandidate).sort((a, b) => {
    if (a.rank !== null && b.rank !== null) return a.rank - b.rank;
    if (a.rank !== null) return -1;
    if (b.rank !== null) return 1;
    return 0;
  });

  return {
    summary,
    candidates: [...completedCandidates, ...started.map(toCandidate), ...notStarted.map(toCandidate)],
  };
}
