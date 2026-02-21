import { evaluateAnswer } from '@/lib/openai/evaluateAnswer';

export interface CheckAnswerRequest {
  userResponse: string;
  acceptableAnswers: string[];
  /** When provided, evaluation is question-aware: responses that affirm the answer with supporting reason (e.g. "Yes I was born in Chicago") are accepted if the reason implies the correct answer. */
  question?: string;
  /** Mode 2 can return a hint when incorrect. */
  hint?: string;
}

export interface CheckAnswerResult {
  correct: boolean;
  hint?: string;
}

/**
 * Tool for modes 1 & 2: compare user response to acceptable answers.
 * Returns correct/incorrect and optional hint (mode 2) for the interviewer to use.
 */
export async function checkAnswer(request: CheckAnswerRequest): Promise<CheckAnswerResult> {
  const { userResponse, acceptableAnswers, question, hint } = request;

  if (!acceptableAnswers?.length) {
    return { correct: false, hint };
  }

  const correct = await evaluateAnswer(userResponse, acceptableAnswers, { question });
  return {
    correct,
    hint: correct ? undefined : hint,
  };
}
