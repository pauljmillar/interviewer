import { NextRequest, NextResponse } from 'next/server';
import { generateBiography, BiographyRequest } from '@/lib/openai/biography';

export async function POST(request: NextRequest) {
  try {
    const body: BiographyRequest = await request.json();
    
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    if (messages.length === 0) {
      return NextResponse.json(
        { error: 'At least one message is required' },
        { status: 400 }
      );
    }

    const result = await generateBiography({
      messages,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Biography API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

