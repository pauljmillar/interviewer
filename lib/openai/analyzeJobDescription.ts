import OpenAI from 'openai';
import type { Question } from '@/types';
import { MAX_JD_CHARS_FOR_ANALYSIS } from '@/lib/constants/jdExtract';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface AnalyzeJobDescriptionResult {
  suggestedTitle: string;
  questions: Question[];
}

/**
 * Analyzes a job description and returns a suggested job title (from the JD) and
 * 5-10 screening questions. JD text is truncated to MAX_JD_CHARS_FOR_ANALYSIS to stay within model context.
 */
export async function analyzeJobDescription(jobDescription: string): Promise<AnalyzeJobDescriptionResult> {
  const trimmed = jobDescription.trim();
  const capped =
    trimmed.length > MAX_JD_CHARS_FOR_ANALYSIS
      ? trimmed.slice(0, MAX_JD_CHARS_FOR_ANALYSIS) + '\n\n[Content truncated for length.]'
      : trimmed;

  const prompt = `You are an expert recruiter. Given the following job description:

1) Extract a short job title (e.g. "Senior Software Engineer", "Product Manager") that appears in or is clearly implied by the JD. Use the employer's wording when possible.
2) Generate between 8 and 10 conversational screening interview questions that help a recruiter understand the candidate as a person and assess fit. Every question must be open-ended and conversational — there is no right or wrong answer. The goal is to get the candidate talking naturally about their background, experience, and motivations.

Rules for every question:
- Never ask yes/no questions (e.g. not "Do you have experience with X?")
- Never ask questions with a factually correct answer (e.g. not "What is the time complexity of a binary search?")
- Always invite the candidate to share a story, opinion, or personal experience (e.g. "Tell me about...", "Walk me through...", "How have you approached...", "What drew you to...", "Describe a time when...")
- Cover a mix of: relevant background and experience, motivation and fit for this specific role, how they work with others, and what they're looking for next

Job description:
"""
${capped}
"""

Output a single JSON object with exactly two keys:
- "suggestedTitle": string (the job title, concise, from or implied by the JD)
- "questions": array of objects, each with:
  - "mainQuestion": string (the conversational question to ask)

Do not include any other fields. Do not include markdown or code fences, only the raw JSON object.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 2000,
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? '{}';
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  let parsed: { suggestedTitle?: string; questions?: Array<{ mainQuestion: string; mode?: number }> };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse LLM response as JSON');
  }

  const questionsRaw = Array.isArray(parsed?.questions) ? parsed.questions : [];
  if (questionsRaw.length === 0) {
    throw new Error('LLM did not return a non-empty array of questions');
  }

  const suggestedTitle =
    typeof parsed.suggestedTitle === 'string' && parsed.suggestedTitle.trim()
      ? parsed.suggestedTitle.trim()
      : '';

  const questions: Question[] = questionsRaw.slice(0, 10).map((q) => ({
    mainQuestion: typeof q.mainQuestion === 'string' ? q.mainQuestion.trim() : String(q.mainQuestion),
    subTopics: [],
    mode: 4, // always conversational — no right/wrong answers
  }));

  return {
    suggestedTitle,
    questions: questions.filter((q) => q.mainQuestion.length > 0),
  };
}
