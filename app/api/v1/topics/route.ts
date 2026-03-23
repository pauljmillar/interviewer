import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/server/apiAuth';
import { createServerSupabase } from '@/lib/supabase/server';
import { listPosts } from '@/lib/server/supabaseBlogStore';

/**
 * Returns published posts for deduplication and sequencing.
 * { total: number, posts: [{ slug, title }] }
 * `total` lets the pipeline rotate image type (GIF every 4th post) and
 * background palette (cycles through all 6 colours via total % 6).
 */
export async function GET(request: NextRequest) {
  if (!await validateApiKey(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const posts = await listPosts(supabase, true);
  return NextResponse.json({
    total: posts.length,
    posts: posts.map((p) => ({ slug: p.slug, title: p.title })),
  });
}
