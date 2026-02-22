import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const OPENAI_TTS_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;

/** POST /api/tts — body: { text: string, voice?: string }. Returns audio/mpeg for use with wawa-lipsync. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    const requestedVoice = typeof body?.voice === 'string' ? body.voice.trim() : '';
    const voice = OPENAI_TTS_VOICES.includes(requestedVoice as (typeof OPENAI_TTS_VOICES)[number])
      ? requestedVoice
      : 'alloy';

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    if (text.length > 4096) {
      return NextResponse.json(
        { error: 'text must be 4096 characters or less' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 503 }
      );
    }

    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
      input: text,
      response_format: 'mp3',
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(buffer.length),
      },
    });
  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'TTS failed' },
      { status: 500 }
    );
  }
}
