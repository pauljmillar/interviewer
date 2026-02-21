import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ReviewForContradictionRequest {
  priorStatements: string[];
  latestResponse: string;
}

export interface ReviewForContradictionResult {
  hasContradiction: boolean;
  summary?: string;
  suggestedClarification?: string;
}

/**
 * Tool for mode 5: compare latest response to prior statements and surface contradictions.
 */
export async function reviewForContradiction(
  request: ReviewForContradictionRequest
): Promise<ReviewForContradictionResult> {
  const { priorStatements, latestResponse } = request;

  if (priorStatements.length === 0) {
    return { hasContradiction: false };
  }

  const prompt = `You are checking for contradictions in an interview.

Prior statements from the interviewee:
${priorStatements.map((s, i) => `${i + 1}. "${s}"`).join('\n')}

Latest response: "${latestResponse}"

Does the latest response contradict any of the prior statements? Consider exact facts (dates, names, numbers) and clear logical contradictions. Minor rephrasing or adding detail is not a contradiction.

Reply with a JSON object only, no other text:
{
  "hasContradiction": true or false,
  "summary": "One sentence describing the contradiction if any, or omit",
  "suggestedClarification": "A short question to ask for clarification, or omit"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 150,
    });

    const text = completion.choices[0]?.message?.content?.trim() || '{}';
    let parsed: { hasContradiction?: boolean; summary?: string; suggestedClarification?: string };
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : '{}');
    } catch {
      return { hasContradiction: false };
    }

    return {
      hasContradiction: !!parsed.hasContradiction,
      summary: parsed.summary,
      suggestedClarification: parsed.suggestedClarification,
    };
  } catch (error) {
    console.error('reviewForContradiction error:', error);
    return { hasContradiction: false };
  }
}
