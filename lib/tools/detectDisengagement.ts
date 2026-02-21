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

const DISENGAGED_PHRASES = [
  'this is stupid',
  'idk',
  "i don't know",
  "don't care",
  'who cares',
  "it's just a bot",
  'just a bot',
  'waste of time',
  'pointless',
  'whatever',
  'doesn\'t matter',
  'does not matter',
];

/**
 * Returns true if the user's response indicates they are dismissing the interview,
 * not taking it seriously, or refusing to engage (e.g. "idk this is stupid", "it's just a bot").
 */
export async function detectDisengagement(
  request: DetectDisengagementRequest
): Promise<DetectDisengagementResult> {
  const { userResponse, questionContext } = request;

  if (!userResponse?.trim()) {
    return { disengaged: false };
  }

  const prompt = questionContext
    ? `You are evaluating whether an interviewee's response indicates they are dismissing the interview or not taking it seriously.

The question that was asked: "${questionContext}"

The interviewee's response: "${userResponse.trim()}"

Consider as DISENGAGED: explicit dismissal ("this is stupid", "idk", "who cares"), saying it's just a bot, sarcasm, refusal to engage, or indicating their answers don't matter.
Do NOT consider as disengaged: short but genuine answers (e.g. "16", "Yes", "No"), "I don't know" when it's a real attempt to answer, or brief legitimate responses.

Does the response indicate the interviewee is dismissing the interview or not taking it seriously? Answer with exactly one word: Yes or No.`
    : `You are evaluating whether an interviewee's response indicates they are dismissing the interview or not taking it seriously.

The interviewee's response: "${userResponse.trim()}"

Consider as DISENGAGED: explicit dismissal ("this is stupid", "idk", "who cares"), saying it's just a bot, sarcasm, refusal to engage, or indicating their answers don't matter.
Do NOT consider as disengaged: short but genuine answers, "I don't know" when it's a real attempt to answer, or brief legitimate responses.

Does the response indicate the interviewee is dismissing the interview or not taking it seriously? Answer with exactly one word: Yes or No.`;

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
    // Fallback: simple heuristic to avoid over-triggering
    const normalized = userResponse.trim().toLowerCase();
    const isShortAndNegative =
      normalized.split(/\s+/).length <= 6 &&
      DISENGAGED_PHRASES.some((p) => normalized.includes(p));
    return { disengaged: isShortAndNegative };
  }
}
