import { NextRequest } from 'next/server';
import { validateApiKey } from '@/lib/server/apiAuth';
import { createServerSupabase } from '@/lib/supabase/server';
import { DEFAULT_CONFIG, type ArtConfig } from '@/lib/art/config';
import { composePNG, composeGIF } from '@/lib/art/compose';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { type?: string; seed?: number; bgIndex?: number };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const type = body.type ?? 'png';
  if (type !== 'png' && type !== 'gif') {
    return new Response(JSON.stringify({ error: 'type must be "png" or "gif"' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const seed = typeof body.seed === 'number' ? body.seed >>> 0 : Math.floor(Math.random() * 2 ** 32);
  const bgIndex = typeof body.bgIndex === 'number' ? body.bgIndex : 0;

  // Load config from Supabase, fall back to DEFAULT_CONFIG
  let config: ArtConfig = DEFAULT_CONFIG;
  const supabase = createServerSupabase();
  if (supabase) {
    const { data } = await supabase.from('art_config').select('config').eq('id', 1).single();
    if (data?.config) config = data.config as ArtConfig;
  }

  if (type === 'png') {
    const buffer = composePNG(seed, bgIndex, config);
    return new Response(buffer as unknown as BodyInit, {
      headers: { 'Content-Type': 'image/png' },
    });
  } else {
    const gif = composeGIF(seed, bgIndex, config);
    return new Response(gif as unknown as BodyInit, {
      headers: { 'Content-Type': 'image/gif' },
    });
  }
}
