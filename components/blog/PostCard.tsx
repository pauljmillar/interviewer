import Link from 'next/link';
import type { BlogPost } from '@/lib/server/supabaseBlogStore';

interface PostCardProps {
  post: BlogPost;
}

export default function PostCard({ post }: PostCardProps) {
  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-[#3ECF8E]/20 to-[#3ECF8E]/5">
        {post.thumbnailKey ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/blog/image?key=${encodeURIComponent(post.thumbnailKey)}`}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-[#3ECF8E]/30"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-4">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-[#3ECF8E] transition-colors">
          {post.title}
        </h2>
        {post.summary && (
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 line-clamp-3">
            {post.summary}
          </p>
        )}
        {date && (
          <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">{date}</p>
        )}
      </div>
    </Link>
  );
}
