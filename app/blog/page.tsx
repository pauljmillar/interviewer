import { createServerSupabase } from '@/lib/supabase/server';
import { listPosts } from '@/lib/server/supabaseBlogStore';
import PostCard from '@/components/blog/PostCard';

export const metadata = {
  title: 'Blog | Candice AI',
  description: 'Articles and updates from the Candice AI team.',
};

export default async function BlogPage() {
  const supabase = createServerSupabase();
  const posts = supabase ? await listPosts(supabase, true) : [];
  const recent = posts.slice(0, 15);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Blog</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-10">Thoughts, updates, and insights from the Candice AI team.</p>

      {recent.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-400 dark:text-gray-500 text-sm">No posts yet. Check back soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {recent.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </main>
  );
}
