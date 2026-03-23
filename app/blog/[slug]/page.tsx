export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createServerSupabase } from '@/lib/supabase/server';
import { getPostBySlug } from '@/lib/server/supabaseBlogStore';
import ThumbnailImage from '@/components/blog/ThumbnailImage';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createServerSupabase();
  if (!supabase) return {};
  const post = await getPostBySlug(supabase, slug);
  if (!post || !post.published) return {};
  return {
    title: `${post.title} | Candice AI Blog`,
    description: post.excerpt ?? post.summary ?? undefined,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const supabase = createServerSupabase();
  if (!supabase) notFound();
  const post = await getPostBySlug(supabase!, slug);
  if (!post || !post.published) notFound();

  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <article>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">{post.title}</h1>
        {date && <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">{date}</p>}
        {(post.thumbnailKey || post.coverImageUrl) && (
          <div className="mb-8 rounded-lg overflow-hidden aspect-video bg-gradient-to-br from-[#3ECF8E]/20 to-[#3ECF8E]/5">
            <ThumbnailImage
              thumbnailKey={post.thumbnailKey}
              src={post.coverImageUrl}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div
          className="prose prose-gray dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>
    </main>
  );
}
