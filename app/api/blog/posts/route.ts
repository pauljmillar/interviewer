import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveOrgId } from '@/lib/server/getEffectiveOrgId';
import { createServerSupabase } from '@/lib/supabase/server';
import { listPosts, createPost } from '@/lib/server/supabaseBlogStore';

/** Public: list published posts (up to 20, newest first). Superadmin with ?all=1: all posts. */
export async function GET(request: NextRequest) {
  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const all = request.nextUrl.searchParams.get('all') === '1';

  if (all) {
    const { isSuperadmin } = await getEffectiveOrgId(request);
    if (!isSuperadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const posts = await listPosts(supabase, false);
    return NextResponse.json({ posts });
  }

  const posts = await listPosts(supabase, true);
  return NextResponse.json({ posts: posts.slice(0, 20) });
}

/** Superadmin only: create a new post. */
export async function POST(request: NextRequest) {
  const { isSuperadmin } = await getEffectiveOrgId(request);
  if (!isSuperadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const body = await request.json().catch(() => null);
  if (!body?.title || !body?.slug) {
    return NextResponse.json({ error: 'title and slug are required' }, { status: 400 });
  }

  const post = await createPost(supabase, {
    title: body.title,
    slug: body.slug,
    summary: body.summary ?? null,
    content: body.content ?? '',
    thumbnailKey: body.thumbnailKey ?? null,
    excerpt: body.excerpt ?? null,
    coverImageUrl: body.coverImageUrl ?? null,
  });

  return NextResponse.json({ post }, { status: 201 });
}
