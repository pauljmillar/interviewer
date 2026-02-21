import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface BiographyRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface BiographyResponse {
  biography: string;
}

export async function generateBiography(
  request: BiographyRequest
): Promise<BiographyResponse> {
  const { messages } = request;

  // Extract conversation text
  const conversationText = messages
    .map(msg => `${msg.role === 'assistant' ? 'Interviewer' : 'Interviewee'}: ${msg.content}`)
    .join('\n\n');

  const biographyPrompt = `Based on the following interview conversation, create a well-written biographical narrative that captures the person's memories and experiences. Organize it chronologically and thematically where appropriate. Write in third person, past tense, as if telling their story.

Make it engaging, personal, and capture the essence of their experiences. Include specific details they mentioned.

Conversation:
${conversationText}

Generate a biography that flows naturally and captures the essence of their experiences.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a skilled biographer who transforms interview conversations into engaging narrative biographies.' },
        { role: 'user', content: biographyPrompt },
      ],
      temperature: 0.8,
      max_tokens: 1500,
    });

    const biography = completion.choices[0]?.message?.content || 'Unable to generate biography. Please try again.';

    return {
      biography,
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to generate biography. Please try again.');
  }
}

