import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveOrgId } from '@/lib/server/getEffectiveOrgId';
import { createServerSupabase } from '@/lib/supabase/server';
import { DEFAULT_CONFIG, type ArtConfig } from '@/lib/art/config';
import { composePNG, composeGIF } from '@/lib/art/compose';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const { isSuperadmin } = await getEffectiveOrgId();
  if (!isSuperadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: { type?: string; seed?: number; bgIndex?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const type = body.type ?? 'png';
  if (type !== 'png' && type !== 'gif') {
    return NextResponse.json({ error: 'type must be "png" or "gif"' }, { status: 400 });
  }

  const seed = typeof body.seed === 'number' ? body.seed >>> 0 : Math.floor(Math.random() * 2 ** 32);
  const bgIndex = typeof body.bgIndex === 'number' ? body.bgIndex : 0;

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
