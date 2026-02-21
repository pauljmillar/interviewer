import { NextRequest, NextResponse } from 'next/server';
import { generateChatResponse, ChatRequest } from '@/lib/openai/chat';

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    
    const { messages, currentQuestionIndex, questions, coveredSubTopics, currentQuestionWordCount, discoveryContext, userRepliesForCurrentQuestion, includeDebug, intro, conclusion, reminder, reminderAlreadyShown } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    if (typeof currentQuestionIndex !== 'number') {
      return NextResponse.json(
        { error: 'currentQuestionIndex is required' },
        { status: 400 }
      );
    }

    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json(
        { error: 'questions array is required' },
        { status: 400 }
      );
    }

    const result = await generateChatResponse({
      messages,
      currentQuestionIndex,
      questions,
      coveredSubTopics,
      currentQuestionWordCount,
      discoveryContext,
      userRepliesForCurrentQuestion,
      includeDebug: !!includeDebug,
      intro,
      conclusion,
      reminder,
      reminderAlreadyShown: !!reminderAlreadyShown,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

