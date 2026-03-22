'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import type { BlogPost } from '@/lib/server/supabaseBlogStore';

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/blog/posts?all=1');
      if (res.status === 403) { setError('403'); return; }
      if (!res.ok) throw new Error('Failed to load posts');
      const data = await res.json();
      setPosts(data.posts ?? []);
    } catch {
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/blog/posts/${id}`, { method: 'DELETE' });
    if (res.ok) setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  if (error === '403') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">403</p>
          <p className="text-gray-500 dark:text-gray-400">Superadmin access required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Blog Posts</h1>
          <Link
            href="/admin/blog/new"
            className="px-4 py-2 text-sm font-medium text-white bg-[#3ECF8E] hover:bg-[#2dbe7e] rounded-lg transition-colors"
          >
            New post
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-[#3ECF8E] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <p className="text-red-500 text-sm">{error}</p>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500 text-sm">
            No posts yet.{' '}
            <Link href="/admin/blog/new" className="text-[#3ECF8E] hover:underline">
              Create the first one.
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-[#2a2a2a] text-left">
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Title</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Published</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr
                    key={post.id}
                    className="border-b border-gray-100 dark:border-[#2a2a2a] last:border-0 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]/40"
                  >
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium max-w-xs truncate">
                      {post.title}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          post.published
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-[#2a2a2a] dark:text-gray-400'
                        }`}
                      >
                        {post.published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/blog/${post.id}`}
                          className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-[#3a3a3a] rounded hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors"
                        >
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(post.id, post.title)}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
