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
  // v1 API fields
  status: string;            // 'draft' | 'published' | 'scheduled' | 'archived'
  tags: string[];
  coverImageUrl: string | null;
  excerpt: string | null;
  sourceUrls: string[];
  publishAt: string | null;  // scheduled publish time
}

function rowToPost(row: Record<string, unknown>): BlogPost {
  const publishedBool = (row.published as boolean) ?? false;
  const status = (row.status as string) ?? (publishedBool ? 'published' : 'draft');
  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    summary: (row.summary as string | null) ?? null,
    content: (row.content as string) ?? '',
    thumbnailKey: (row.thumbnail_key as string | null) ?? null,
    published: publishedBool,
    publishedAt: (row.published_at as string | null) ?? null,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    status,
    tags: (row.tags as string[]) ?? [],
    coverImageUrl: (row.cover_image_url as string | null) ?? null,
    excerpt: (row.excerpt as string | null) ?? null,
    sourceUrls: (row.source_urls as string[]) ?? [],
    publishAt: (row.publish_at as string | null) ?? null,
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
  if (error) {
    console.error('[getPostBySlug] Supabase error for slug "%s":', slug, error);
    return null;
  }
  if (!data) return null;
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
    status?: string;
    tags?: string[];
    coverImageUrl?: string | null;
    excerpt?: string | null;
    sourceUrls?: string[];
    publishAt?: string | null;
  }
): Promise<BlogPost> {
  const id = generateId();
  const now = new Date().toISOString();
  const status = params.status ?? 'draft';
  const { error } = await supabase.from('blog_posts').insert({
    id,
    slug: params.slug,
    title: params.title,
    summary: params.summary ?? null,
    content: params.content ?? '',
    thumbnail_key: params.thumbnailKey ?? null,
    published: status === 'published',
    published_at: status === 'published' ? now : null,
    created_at: now,
    updated_at: now,
    status,
    tags: params.tags ?? [],
    cover_image_url: params.coverImageUrl ?? null,
    excerpt: params.excerpt ?? null,
    source_urls: params.sourceUrls ?? [],
    publish_at: params.publishAt ?? null,
  });
  if (error) throw error;
  return {
    id,
    slug: params.slug,
    title: params.title,
    summary: params.summary ?? null,
    content: params.content ?? '',
    thumbnailKey: params.thumbnailKey ?? null,
    published: status === 'published',
    publishedAt: status === 'published' ? now : null,
    createdAt: now,
    updatedAt: now,
    status,
    tags: params.tags ?? [],
    coverImageUrl: params.coverImageUrl ?? null,
    excerpt: params.excerpt ?? null,
    sourceUrls: params.sourceUrls ?? [],
    publishAt: params.publishAt ?? null,
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
    status: string;
    tags: string[];
    coverImageUrl: string | null;
    excerpt: string | null;
    sourceUrls: string[];
    publishAt: string | null;
  }>
): Promise<BlogPost> {
  const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.slug !== undefined) dbPatch.slug = patch.slug;
  if (patch.summary !== undefined) dbPatch.summary = patch.summary;
  if (patch.content !== undefined) dbPatch.content = patch.content;
  if (patch.thumbnailKey !== undefined) dbPatch.thumbnail_key = patch.thumbnailKey;
  if (patch.status !== undefined) {
    dbPatch.status = patch.status;
    dbPatch.published = patch.status === 'published';
  }
  if (patch.published !== undefined) {
    dbPatch.published = patch.published;
    if (!patch.status) dbPatch.status = patch.published ? 'published' : 'draft';
  }
  if (patch.publishedAt !== undefined) dbPatch.published_at = patch.publishedAt;
  if (patch.tags !== undefined) dbPatch.tags = patch.tags;
  if (patch.coverImageUrl !== undefined) dbPatch.cover_image_url = patch.coverImageUrl;
  if (patch.excerpt !== undefined) dbPatch.excerpt = patch.excerpt;
  if (patch.sourceUrls !== undefined) dbPatch.source_urls = patch.sourceUrls;
  if (patch.publishAt !== undefined) dbPatch.publish_at = patch.publishAt;

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

/** List posts scoped to an org with optional filters (for v1 API). */
export async function listPostsByOrg(
  supabase: SupabaseClient,
  orgId: string,
  filters?: {
    status?: string;
    tag?: string;
    from?: string;
    to?: string;
  }
): Promise<BlogPost[]> {
  let query = supabase
    .from('blog_posts')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.tag) query = query.contains('tags', [filters.tag]);
  if (filters?.from) query = query.gte('created_at', filters.from);
  if (filters?.to) query = query.lte('created_at', filters.to);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(rowToPost);
}

/** Get a post by slug scoped to an org (for v1 API). */
export async function getPostBySlugAndOrg(
  supabase: SupabaseClient,
  slug: string,
  orgId: string
): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('org_id', orgId)
    .single();
  if (error || !data) return null;
  return rowToPost(data);
}
