import { NextRequest, NextResponse } from 'next/server';
import { analyzeWordCounts, WordCountRequest } from '@/lib/openai/wordCount';

export async function POST(request: NextRequest) {
  try {
    const body: WordCountRequest = await request.json();
    
    const { messages, questions } = body;

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

    const result = await analyzeWordCounts({
      messages,
      questions,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Word count API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

