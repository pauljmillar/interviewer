import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveOrgId } from '@/lib/server/getEffectiveOrgId';
import { createServerSupabase } from '@/lib/supabase/server';
import { DEFAULT_CONFIG, type ArtConfig } from '@/lib/art/config';

export async function GET() {
  const { isSuperadmin } = await getEffectiveOrgId();
  if (!isSuperadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const { data } = await supabase.from('art_config').select('config').eq('id', 1).single();
  return NextResponse.json(data?.config ?? DEFAULT_CONFIG);
}

export async function PUT(request: NextRequest) {
  const { isSuperadmin } = await getEffectiveOrgId();
  if (!isSuperadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  let config: ArtConfig;
  try {
    config = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Validate all [min, max] pairs
  const pairs: [string, [number, number]][] = [
    ['still.circleCount',     config.still?.circleCount],
    ['still.circleSize',      config.still?.circleSize],
    ['still.lineCount',       config.still?.lineCount],
    ['still.lineWeight',      config.still?.lineWeight],
    ['still.arcCount',        config.still?.arcCount],
    ['still.arcWeight',       config.still?.arcWeight],
    ['gif.lineLength',        config.gif?.lineLength],
    ['gif.lineWeight',        config.gif?.lineWeight],
    ['gif.lineAmplitude',     config.gif?.lineAmplitude],
    ['gif.circleRadius',      config.gif?.circleRadius],
    ['gif.circleAmplitude',   config.gif?.circleAmplitude],
    ['gif.staticLineWeight',  config.gif?.staticLineWeight],
  ];

  for (const [name, pair] of pairs) {
    if (!Array.isArray(pair) || pair.length !== 2) {
      return NextResponse.json({ error: `${name} must be a [min, max] array` }, { status: 400 });
    }
    if (pair[0] >= pair[1]) {
      return NextResponse.json({ error: `${name}: min must be less than max` }, { status: 400 });
    }
  }

  const { error } = await supabase.from('art_config').upsert({ id: 1, config, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
