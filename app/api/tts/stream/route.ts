import { NextRequest, NextResponse } from 'next/server';

const OPENAI_TTS_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;

/**
 * POST /api/tts/stream — body: { text: string, voice?: string }.
 * Returns streaming audio (audio/mpeg) so the client can start playback as bytes arrive.
 * Uses OpenAI API with stream_format to reduce time-to-first-audio.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    const requestedVoice = typeof body?.voice === 'string' ? body.voice.trim() : '';
    const voice = OPENAI_TTS_VOICES.includes(requestedVoice as (typeof OPENAI_TTS_VOICES)[number])
      ? requestedVoice
      : 'nova';

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    if (text.length > 4096) {
      return NextResponse.json(
        { error: 'text must be 4096 characters or less' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 503 }
      );
    }

    const openaiRes = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice,
        input: text,
        response_format: 'mp3',
        stream_format: 'audio',
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error('OpenAI TTS stream error:', openaiRes.status, errText);
      return NextResponse.json(
        { error: 'TTS stream failed' },
        { status: 502 }
      );
    }

    const stream = openaiRes.body;
    if (!stream) {
      return NextResponse.json({ error: 'No stream body' }, { status: 502 });
    }

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('TTS stream API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'TTS stream failed' },
      { status: 500 }
    );
  }
}
