import type { SupabaseClient } from '@supabase/supabase-js';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  content: string;
  thumbnailKey: string | null;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function rowToPost(row: Record<string, unknown>): BlogPost {
  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    summary: (row.summary as string | null) ?? null,
    content: (row.content as string) ?? '',
    thumbnailKey: (row.thumbnail_key as string | null) ?? null,
    published: (row.published as boolean) ?? false,
    publishedAt: (row.published_at as string | null) ?? null,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
  };
}

export async function listPosts(
  supabase: SupabaseClient,
  onlyPublished?: boolean
): Promise<BlogPost[]> {
  let query = supabase.from('blog_posts').select('*');
  if (onlyPublished) {
    query = query.eq('published', true).order('published_at', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []).map(rowToPost);
}

export async function getPostById(
  supabase: SupabaseClient,
  id: string
): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return rowToPost(data);
}

export async function getPostBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .single();
  if (error || !data) return null;
  return rowToPost(data);
}

export async function createPost(
  supabase: SupabaseClient,
  params: {
    title: string;
    slug: string;
    summary?: string | null;
    content?: string;
    thumbnailKey?: string | null;
  }
): Promise<BlogPost> {
  const id = generateId();
  const now = new Date().toISOString();
  const { error } = await supabase.from('blog_posts').insert({
    id,
    slug: params.slug,
    title: params.title,
    summary: params.summary ?? null,
    content: params.content ?? '',
    thumbnail_key: params.thumbnailKey ?? null,
    published: false,
    published_at: null,
    created_at: now,
    updated_at: now,
  });
  if (error) throw error;
  return {
    id,
    slug: params.slug,
    title: params.title,
    summary: params.summary ?? null,
    content: params.content ?? '',
    thumbnailKey: params.thumbnailKey ?? null,
    published: false,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updatePost(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<{
    title: string;
    slug: string;
    summary: string | null;
    content: string;
    thumbnailKey: string | null;
    published: boolean;
    publishedAt: string | null;
  }>
): Promise<BlogPost> {
  const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.slug !== undefined) dbPatch.slug = patch.slug;
  if (patch.summary !== undefined) dbPatch.summary = patch.summary;
  if (patch.content !== undefined) dbPatch.content = patch.content;
  if (patch.thumbnailKey !== undefined) dbPatch.thumbnail_key = patch.thumbnailKey;
  if (patch.published !== undefined) dbPatch.published = patch.published;
  if (patch.publishedAt !== undefined) dbPatch.published_at = patch.publishedAt;

  const { data, error } = await supabase
    .from('blog_posts')
    .update(dbPatch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return rowToPost(data);
}

export async function deletePost(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from('blog_posts').delete().eq('id', id);
  if (error) throw error;
}
