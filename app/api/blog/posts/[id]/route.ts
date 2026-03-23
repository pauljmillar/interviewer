import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveOrgId } from '@/lib/server/getEffectiveOrgId';
import { createServerSupabase } from '@/lib/supabase/server';
import { getPostById, updatePost, deletePost } from '@/lib/server/supabaseBlogStore';

/** Superadmin only: get any post by id. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isSuperadmin } = await getEffectiveOrgId(request);
  if (!isSuperadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const { id } = await params;
  const post = await getPostById(supabase, id);
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ post });
}

/** Superadmin only: update any field; sets publishedAt on first publish. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isSuperadmin } = await getEffectiveOrgId(request);
  if (!isSuperadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  // If publishing for the first time, set publishedAt
  const existing = await getPostById(supabase, id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const patch: Parameters<typeof updatePost>[2] = {};
  if (body.title !== undefined) patch.title = body.title;
  if (body.slug !== undefined) patch.slug = body.slug;
  if (body.summary !== undefined) patch.summary = body.summary;
  if (body.content !== undefined) patch.content = body.content;
  if (body.thumbnailKey !== undefined) patch.thumbnailKey = body.thumbnailKey;
  if (body.excerpt !== undefined) patch.excerpt = body.excerpt;
  if (body.coverImageUrl !== undefined) patch.coverImageUrl = body.coverImageUrl;
  if (body.published !== undefined) {
    patch.published = body.published;
    if (body.published && !existing.publishedAt) {
      patch.publishedAt = new Date().toISOString();
    }
    if (!body.published) {
      patch.publishedAt = null;
    }
  }

  const post = await updatePost(supabase, id, patch);
  return NextResponse.json({ post });
}

/** Superadmin only: hard delete. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { isSuperadmin } = await getEffectiveOrgId(request);
  if (!isSuperadmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const { id } = await params;
  await deletePost(supabase, id);
  return NextResponse.json({ ok: true });
}
