import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveOrgId } from '@/lib/server/getEffectiveOrgId';
import { createServerSupabase } from '@/lib/supabase/server';
import { DEFAULT_CONTENT_CONFIG } from '@/lib/content/defaultConfig';

export async function GET() {
  const { isSuperadmin } = await getEffectiveOrgId();
  if (!isSuperadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const { data } = await supabase.from('content_config').select('content').eq('id', 1).single();
  return NextResponse.json({ content: data?.content ?? DEFAULT_CONTENT_CONFIG });
}

export async function PUT(request: NextRequest) {
  const { isSuperadmin } = await getEffectiveOrgId();
  if (!isSuperadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  let content: string;
  try {
    const body = await request.json();
    if (typeof body.content !== 'string') throw new Error();
    content = body.content;
  } catch {
    return NextResponse.json({ error: 'Invalid body — expected { content: string }' }, { status: 400 });
  }

  const { error } = await supabase
    .from('content_config')
    .upsert({ id: 1, content, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
