import { NextRequest, NextResponse } from 'next/server';
import { reviewHistorical, ReviewHistoricalRequest } from '@/lib/openai/reviewHistorical';

export async function POST(request: NextRequest) {
  try {
    const body: ReviewHistoricalRequest = await request.json();
    const { messages, questions, currentQuestionIndex } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json(
        { error: 'Questions array is required' },
        { status: 400 }
      );
    }

    if (typeof currentQuestionIndex !== 'number') {
      return NextResponse.json(
        { error: 'currentQuestionIndex is required' },
        { status: 400 }
      );
    }

    const result = await reviewHistorical({
      messages,
      questions,
      currentQuestionIndex,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Review historical API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
