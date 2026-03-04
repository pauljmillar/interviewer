import { NextRequest, NextResponse } from 'next/server';
import { generateChatResponse, ChatRequest } from '@/lib/openai/chat';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ChatRequest & { stream?: boolean };
    const {
      messages,
      currentQuestionIndex,
      questions,
      coveredSubTopics,
      currentQuestionWordCount,
      discoveryContext,
      userRepliesForCurrentQuestion,
      includeDebug,
      intro,
      conclusion,
      reminder,
      reminderAlreadyShown,
      stream: wantStream,
    } = body;

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

    const chatRequest: ChatRequest = {
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
    };

    if (wantStream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const streamSink = (delta: string) => {
              controller.enqueue(encoder.encode(JSON.stringify({ type: 'delta', text: delta }) + '\n'));
            };
            const result = await generateChatResponse(chatRequest, { streamSink });
            controller.enqueue(encoder.encode(JSON.stringify({ type: 'done', result }) + '\n'));
          } catch (err) {
            console.error('Chat stream error:', err);
            controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', error: err instanceof Error ? err.message : 'Internal server error' }) + '\n'));
          } finally {
            controller.close();
          }
        },
      });
      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'Cache-Control': 'no-store',
        },
      });
    }

    const result = await generateChatResponse(chatRequest);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

