import OpenAI from 'openai';
import type { Question, StoredMessage } from '@/types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface QuestionScore {
  questionIndex: number;
  score: number;   // 0–10
  notes: string;
}

export interface ScoreCandidateOutput {
  questionScores: QuestionScore[];
  impressionScore: number;      // 0–10
  impressionNotes: string;
  overallScore: number;         // 0–100
  notes: string;                // 2–3 sentence summary
}

export interface ScoreCandidateInput {
  questions: Question[];
  messages: StoredMessage[];
  scoringPrompt: string;
  calibrationHint?: string;
}

function buildTranscript(messages: StoredMessage[]): string {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`)
    .join('\n');
}

export async function scoreCandidate(input: ScoreCandidateInput): Promise<ScoreCandidateOutput> {
  const { questions, messages, scoringPrompt, calibrationHint } = input;

  const transcript = buildTranscript(messages);

  const questionsText = questions
    .map((q, i) => `Q${i + 1}: ${q.mainQuestion}`)
    .join('\n');

  const calibrationLine = calibrationHint
    ? `\nCalibration: ${calibrationHint}\n`
    : '';

  const prompt = `You are evaluating a candidate interview transcript. Score each answer using the rubric below.

SCORING RUBRIC:
${scoringPrompt}
${calibrationLine}
INTERVIEW QUESTIONS:
${questionsText}

INTERVIEW TRANSCRIPT:
${transcript}

Return a JSON object with this exact shape (no markdown, no code fences):
{
  "questionScores": [
    { "questionIndex": 0, "score": <0-10>, "notes": "<brief reason>" },
    ...one entry per question above...
  ],
  "impressionScore": <0-10>,
  "impressionNotes": "<what stood out about enthusiasm, communication, reliability, etc.>",
  "notes": "<2-3 sentence overall candidate summary>"
}

Rules:
- questionScores must have exactly ${questions.length} entries, indexed 0 to ${questions.length - 1}.
- If a question was not answered, score it 0.
- impressionScore assesses overall impression across all dimensions described in the rubric.
- Be consistent — a 7 should mean the same quality regardless of candidate.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? '{}';
  let parsed: {
    questionScores?: Array<{ questionIndex: number; score: number; notes: string }>;
    impressionScore?: number;
    impressionNotes?: string;
    notes?: string;
  };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('scoreCandidate: failed to parse LLM response as JSON');
  }

  const questionScores: QuestionScore[] = (parsed.questionScores ?? []).map((qs, i) => ({
    questionIndex: typeof qs.questionIndex === 'number' ? qs.questionIndex : i,
    score: Math.max(0, Math.min(10, typeof qs.score === 'number' ? qs.score : 0)),
    notes: typeof qs.notes === 'string' ? qs.notes : '',
  }));

  // Ensure we have an entry for every question
  const filledScores: QuestionScore[] = questions.map((_, i) => {
    const found = questionScores.find((qs) => qs.questionIndex === i);
    return found ?? { questionIndex: i, score: 0, notes: 'Not answered' };
  });

  const impressionScore = Math.max(
    0,
    Math.min(10, typeof parsed.impressionScore === 'number' ? parsed.impressionScore : 0)
  );

  // overall = mean of all (N question scores + 1 impression score) × 10
  const allScores = [...filledScores.map((qs) => qs.score), impressionScore];
  const mean = allScores.reduce((sum, s) => sum + s, 0) / allScores.length;
  const overallScore = Math.round(mean * 10);

  return {
    questionScores: filledScores,
    impressionScore,
    impressionNotes: typeof parsed.impressionNotes === 'string' ? parsed.impressionNotes : '',
    overallScore,
    notes: typeof parsed.notes === 'string' ? parsed.notes : '',
  };
}
