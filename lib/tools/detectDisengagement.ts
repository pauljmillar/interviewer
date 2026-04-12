import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface DetectDisengagementRequest {
  userResponse: string;
  /** Optional: the question that was asked, to avoid flagging legitimate short answers. */
  questionContext?: string;
}

export interface DetectDisengagementResult {
  disengaged: boolean;
}

// Only phrases that clearly indicate vulgarity or frustration with the AI interview itself
const DISENGAGED_PHRASES = [
  'this is stupid',
  'this is dumb',
  "it's just a bot",
  'just a bot',
  "i'm not answering a bot",
  'not answering a bot',
  'waste of time',
  'talking to a bot',
  'interviewing with ai',
  'stupid bot',
];

/**
 * Returns true only if the user's response contains vulgarity or expresses explicit
 * frustration/refusal about being interviewed by AI.
 * Short answers, incomplete sentences, and "I don't know" responses are NOT flagged.
 */
export async function detectDisengagement(
  request: DetectDisengagementRequest
): Promise<DetectDisengagementResult> {
  const { userResponse, questionContext } = request;

  if (!userResponse?.trim()) {
    return { disengaged: false };
  }

  const contextLine = questionContext
    ? `The question that was asked: "${questionContext}"\n\n`
    : '';

  const prompt = `You are evaluating whether an interviewee's response contains vulgarity or expresses explicit frustration/refusal about being interviewed by AI.

${contextLine}The interviewee's response: "${userResponse.trim()}"

Flag as DISENGAGED only if the response clearly:
- Contains vulgar or offensive language
- Expresses frustration or refusal specifically about the AI/bot interview format (e.g. "this is stupid", "it's just a bot", "I'm not answering a bot", "waste of time")
- Is an outright refusal to participate in the interview

Do NOT flag as disengaged:
- Any answer to the question, even if brief, a few words, or not a complete sentence
- Short or informal replies that address the question at all
- "I don't know" or "idk" as a genuine attempt to answer
- One-word or partial-sentence responses that are on-topic

Does the response clearly contain vulgarity or express frustration/refusal about the AI interview? Answer with exactly one word: Yes or No.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 10,
    });

    const text = (completion.choices[0]?.message?.content || '').trim().toLowerCase();
    return { disengaged: text.startsWith('yes') };
  } catch (error) {
    console.error('detectDisengagement error:', error);
    // Fallback: only trigger on clearly problematic phrases
    const normalized = userResponse.trim().toLowerCase();
    return { disengaged: DISENGAGED_PHRASES.some((p) => normalized.includes(p)) };
  }
}
