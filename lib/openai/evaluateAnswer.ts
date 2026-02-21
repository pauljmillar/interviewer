import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface EvaluateAnswerOptions {
  /** When provided, the evaluator considers whether the response correctly answers this question, including supporting reasons and common-sense implications (e.g. "born in Chicago" implies US citizenship and thus work authorization). */
  question?: string;
}

/**
 * Returns true if the user's response is correct or equivalent to any of the acceptable answers.
 * When `question` is provided, uses reasoning: affirms the correct answer and any supporting reason
 * must be consistent with the right answer (e.g. "Yes I was born in Chicago" for work authorization).
 */
export async function evaluateAnswer(
  userResponse: string,
  acceptableAnswers: string[],
  options: EvaluateAnswerOptions = {}
): Promise<boolean> {
  if (!userResponse?.trim()) return false;
  if (!acceptableAnswers?.length) return false;

  const { question } = options;

  const prompt = question
    ? `You are evaluating whether a user's response correctly answers an interview question.

Question that was asked: "${question}"

Acceptable answers (the response should affirm one of these, or imply it with supporting reason):
${acceptableAnswers.map((a) => `- ${a}`).join('\n')}

User's response: "${userResponse.trim()}"

Rules:
- If the user affirms the correct answer (e.g. says yes or equivalent) and adds a supporting reason, count it as CORRECT if the reason is consistent with the right answer (e.g. "Yes I was born in Chicago" for "Are you authorized to work in the US?" — born in the US implies citizenship implies authorization).
- Use common knowledge: e.g. birth in the United States means US citizenship; US citizens are authorized to work in the United States.
- Only answer No if the response clearly contradicts the correct answer or is irrelevant/off-topic.

Is the user's response correct? Answer with exactly one word: Yes or No.`
    : `You are evaluating whether a user's response is correct or equivalent to an acceptable answer.

Acceptable answers (any equivalent meaning counts):
${acceptableAnswers.map((a) => `- ${a}`).join('\n')}

User's response: "${userResponse.trim()}"

Is the user's response correct or equivalent to at least one of the acceptable answers? Answer with exactly one word: Yes or No.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 10,
    });

    const text = (completion.choices[0]?.message?.content || '').trim().toLowerCase();
    return text.startsWith('yes');
  } catch (error) {
    console.error('evaluateAnswer error:', error);
    // Fallback: simple substring match
    const normalized = userResponse.trim().toLowerCase();
    return acceptableAnswers.some(
      (a) => a.trim().toLowerCase() && normalized.includes(a.trim().toLowerCase())
    );
  }
}
