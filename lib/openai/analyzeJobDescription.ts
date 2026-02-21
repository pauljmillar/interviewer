import OpenAI from 'openai';
import type { Question } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analyzes a job description and returns 5-10 screening questions to help
 * determine if a candidate is worthy of a next-round interview.
 */
export async function analyzeJobDescription(jobDescription: string): Promise<Question[]> {
  const prompt = `You are an expert recruiter. Given the following job description, generate between 5 and 10 screening interview questions. These questions should help discern whether a candidate is worthy of advancing to a next-round interview. Focus on:
- Role-specific skills and experience
- Eligibility and logistics (e.g. work authorization, start date) when relevant
- Motivation and fit
- Key requirements mentioned in the JD

Job description:
"""
${jobDescription.trim()}
"""

Output a JSON array of questions only. Each item must have:
- "mainQuestion": string (the question to ask, clear and concise)
- "mode": number (1 = screening with yes/no or short answer, 2 = right answer with hints, 3 = open-ended/list, 4 = conversational. Use 1 for eligibility/yes-no, 3 for experience/skills/open-ended)

Do not include any other fields. Do not include markdown or code fences, only the raw JSON array.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 2000,
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? '[]';
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  let parsed: Array<{ mainQuestion: string; mode?: number }>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse LLM response as JSON');
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('LLM did not return a non-empty array of questions');
  }

  const questions: Question[] = parsed.slice(0, 10).map((q) => ({
    mainQuestion: typeof q.mainQuestion === 'string' ? q.mainQuestion.trim() : String(q.mainQuestion),
    subTopics: [],
    mode: typeof q.mode === 'number' && q.mode >= 1 && q.mode <= 5 ? (q.mode as 1 | 2 | 3 | 4 | 5) : 3,
  }));

  return questions.filter((q) => q.mainQuestion.length > 0);
}
