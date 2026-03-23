import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/server/apiAuth';
import { createServerSupabase } from '@/lib/supabase/server';
import { getPostBySlug, updatePost } from '@/lib/server/supabaseBlogStore';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!await validateApiKey(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug } = await params;
  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const post = await getPostBySlug(supabase, slug);
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(post);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!await validateApiKey(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug } = await params;
  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const post = await getPostBySlug(supabase, slug);
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const { status, title, slug: newSlug, body_markdown, tags, cover_image_url, excerpt, source_urls, publish_at } = body;

  if (status === 'scheduled' && !publish_at && !post.publishAt) {
    return NextResponse.json({ error: 'publish_at is required when status is scheduled' }, { status: 400 });
  }

  const patch: Parameters<typeof updatePost>[2] = {};
  if (title !== undefined) patch.title = title;
  if (newSlug !== undefined) patch.slug = newSlug;
  if (body_markdown !== undefined) patch.content = body_markdown;
  if (tags !== undefined) patch.tags = tags;
  if (cover_image_url !== undefined) patch.coverImageUrl = cover_image_url;
  if (excerpt !== undefined) patch.excerpt = excerpt;
  if (source_urls !== undefined) patch.sourceUrls = source_urls;
  if (publish_at !== undefined) patch.publishAt = publish_at;

  if (status !== undefined) {
    patch.status = status;
    if (status === 'published' && !post.publishedAt) {
      patch.publishedAt = new Date().toISOString();
    }
  }

  try {
    const updated = await updatePost(supabase, post.id, patch);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!await validateApiKey(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug } = await params;
  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const post = await getPostBySlug(supabase, slug);
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await updatePost(supabase, post.id, { status: 'archived', published: false });
  return NextResponse.json({ ok: true });
}
