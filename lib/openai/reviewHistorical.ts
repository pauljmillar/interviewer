import OpenAI from 'openai';
import { Question } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ReviewHistoricalRequest {
  /** All prior messages from previous sessions (and current session so far). */
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  questions: Question[];
  /** Current question index (0-based) so the briefing knows where we are. */
  currentQuestionIndex: number;
}

export interface ReviewHistoricalResponse {
  briefing: string;
}

/**
 * Produces a short briefing for the interviewer at session start: what has been covered,
 * what's next, and any notable people/events so the interviewer has context (e.g. for
 * multi-session biography interviews).
 */
export async function reviewHistorical(
  request: ReviewHistoricalRequest
): Promise<ReviewHistoricalResponse> {
  const { messages, questions, currentQuestionIndex } = request;

  if (!messages.length) {
    return {
      briefing: 'No prior conversation yet. Start with the first question.',
    };
  }

  const questionList = questions
    .map((q, i) => `${i + 1}. ${q.mainQuestion}${i === currentQuestionIndex ? ' (current)' : ''}`)
    .join('\n');

  const prompt = `You are briefing an interviewer at the start of a new session. They have the following question list and prior conversation.

Question list:
${questionList}

Prior conversation (most recent last):
${messages.map((m) => `${m.role}: ${m.content}`).join('\n\n')}

Write a short internal briefing (2-4 sentences) for the interviewer: what has been covered so far, which question we're on or moving to, and any notable people, places, or events mentioned that are worth remembering. Be concise. Do not address the interviewee; this is for the interviewer's context only.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 200,
  });

  const briefing = completion.choices[0]?.message?.content?.trim() ?? 'No briefing generated.';
  return { briefing };
}
