'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Youtube from '@tiptap/extension-youtube';
import type { BlogPost } from '@/lib/server/supabaseBlogStore';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

export default function BlogEditorPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id as string;
  const isNew = rawId === 'new';

  const [post, setPost] = useState<BlogPost | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [thumbnailKey, setThumbnailKey] = useState<string | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Image.configure({ inline: false }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Write your post here…' }),
      Youtube.configure({ controls: true }),
    ],
    content: '',
  });

  // Load existing post
  useEffect(() => {
    if (isNew || !rawId) return;
    setLoading(true);
    fetch(`/api/blog/posts/${rawId}`)
      .then((r) => r.json())
      .then((data) => {
        const p: BlogPost = data.post;
        setPost(p);
        setTitle(p.title);
        setSlug(p.slug);
        setSummary(p.summary ?? '');
        setPublished(p.published);
        setThumbnailKey(p.thumbnailKey);
        if (p.thumbnailKey) {
          setThumbnailPreview(`/api/blog/image?key=${encodeURIComponent(p.thumbnailKey)}`);
        }
        editor?.commands.setContent(p.content || '');
        setSlugManuallyEdited(true);
      })
      .catch(() => setError('Failed to load post'))
      .finally(() => setLoading(false));
  }, [rawId, isNew, editor]);

  // Auto-generate slug from title when not manually edited
  useEffect(() => {
    if (!slugManuallyEdited) {
      setSlug(slugify(title));
    }
  }, [title, slugManuallyEdited]);

  // Cmd+S auto-save
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, slug, summary, thumbnailKey, published]);

  async function uploadImage(file: File): Promise<string> {
    const fd = new FormData();
    fd.append('image', file);
    const res = await fetch('/api/blog/image-upload', { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Image upload failed');
    const data = await res.json();
    return data.url as string;
  }

  async function handleInlineImageUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const url = await uploadImage(file);
        editor?.chain().focus().setImage({ src: url }).run();
      } catch {
        alert('Image upload failed');
      }
    };
    input.click();
  }

  async function handleThumbnailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file);
      // Extract key from url: /api/blog/image?key=...
      const key = decodeURIComponent(url.split('?key=')[1]);
      setThumbnailKey(key);
      setThumbnailPreview(url);
    } catch {
      alert('Thumbnail upload failed');
    }
  }

  async function handleYouTube() {
    const url = prompt('YouTube URL:');
    if (!url) return;
    editor?.chain().focus().setYoutubeVideo({ src: url }).run();
  }

  const handleSave = useCallback(async (publish?: boolean) => {
    if (!title.trim() || !slug.trim()) {
      alert('Title and slug are required');
      return;
    }
    setSaving(true);
    try {
      const content = editor?.getHTML() ?? '';
      const publishedValue = publish !== undefined ? publish : published;

      if (isNew || !post) {
        // Create
        const res = await fetch('/api/blog/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, slug, summary: summary || null, content, thumbnailKey }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const newPost: BlogPost = data.post;
        setPost(newPost);

        if (publishedValue) {
          await fetch(`/api/blog/posts/${newPost.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ published: true }),
          });
          setPublished(true);
        }
        router.replace(`/admin/blog/${newPost.id}`);
      } else {
        // Update
        const patch: Record<string, unknown> = { title, slug, summary: summary || null, content, thumbnailKey };
        if (publish !== undefined) {
          patch.published = publish;
          setPublished(publish);
        }
        const res = await fetch(`/api/blog/posts/${post.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setPost(data.post);
        setPublished(data.post.published);
      }
    } catch (err) {
      alert(`Save failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }, [title, slug, summary, thumbnailKey, published, editor, isNew, post, router]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#3ECF8E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Editor column */}
        <div className="flex-1 min-w-0 flex flex-col overflow-auto p-6">
          {/* Toolbar */}
          <div className="flex flex-wrap gap-1 mb-3 p-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-lg sticky top-0 z-10">
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBold().run()}
              active={editor?.isActive('bold')}
              title="Bold"
            >
              <strong>B</strong>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              active={editor?.isActive('italic')}
              title="Italic"
            >
              <em>I</em>
            </ToolbarButton>
            <div className="w-px h-6 bg-gray-200 dark:bg-[#3a3a3a] self-center mx-0.5" />
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
              active={editor?.isActive('heading', { level: 1 })}
              title="Heading 1"
            >
              H1
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              active={editor?.isActive('heading', { level: 2 })}
              title="Heading 2"
            >
              H2
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
              active={editor?.isActive('heading', { level: 3 })}
              title="Heading 3"
            >
              H3
            </ToolbarButton>
            <div className="w-px h-6 bg-gray-200 dark:bg-[#3a3a3a] self-center mx-0.5" />
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              active={editor?.isActive('bulletList')}
              title="Bullet list"
            >
              ≡
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              active={editor?.isActive('orderedList')}
              title="Ordered list"
            >
              1.
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              active={editor?.isActive('blockquote')}
              title="Blockquote"
            >
              ❝
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
              active={editor?.isActive('codeBlock')}
              title="Code block"
            >
              {'</>'}
            </ToolbarButton>
            <div className="w-px h-6 bg-gray-200 dark:bg-[#3a3a3a] self-center mx-0.5" />
            <ToolbarButton onClick={handleInlineImageUpload} title="Insert image">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </ToolbarButton>
            <ToolbarButton onClick={handleYouTube} title="Insert YouTube">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M21.8 8s-.2-1.4-.8-2c-.8-.8-1.6-.8-2-.9C16.7 5 12 5 12 5s-4.7 0-7 .1c-.4.1-1.2.1-2 .9-.6.6-.8 2-.8 2S2 9.6 2 11.2v1.5c0 1.6.2 3.2.2 3.2s.2 1.4.8 2c.8.8 1.8.8 2.3.9C6.6 19 12 19 12 19s4.7 0 7-.1c.4-.1 1.2-.1 2-.9.6-.6.8-2 .8-2s.2-1.6.2-3.2v-1.5C22 9.6 21.8 8 21.8 8zM9.7 14.7V9.3l5.5 2.7-5.5 2.7z" />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => {
                const url = prompt('Link URL:');
                if (url) editor?.chain().focus().setLink({ href: url }).run();
                else editor?.chain().focus().unsetLink().run();
              }}
              active={editor?.isActive('link')}
              title="Link"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </ToolbarButton>
          </div>

          {/* Editor area */}
          <EditorContent
            editor={editor}
            className="flex-1 min-h-[400px] bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-lg p-4 prose prose-gray dark:prose-invert max-w-none focus-within:ring-2 focus-within:ring-[#3ECF8E]/30"
          />
        </div>

        {/* Sidebar */}
        <aside className="w-72 flex-shrink-0 border-l border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] flex flex-col overflow-auto">
          <div className="p-4 border-b border-gray-100 dark:border-[#2a2a2a] flex items-center justify-between">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                published
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-[#2a2a2a] dark:text-gray-400'
              }`}
            >
              {published ? 'Published' : 'Draft'}
            </span>
            <button
              type="button"
              onClick={() => router.push('/admin/blog')}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ← All posts
            </button>
          </div>

          <div className="flex-1 p-4 space-y-4 overflow-auto">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Post title"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#3a3a3a] rounded-lg bg-white dark:bg-[#0f0f0f] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3ECF8E]/30"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => { setSlug(e.target.value); setSlugManuallyEdited(true); }}
                placeholder="post-slug"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#3a3a3a] rounded-lg bg-white dark:bg-[#0f0f0f] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3ECF8E]/30 font-mono"
              />
            </div>

            {/* Summary */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Summary</label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Short description for listing cards"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[#3a3a3a] rounded-lg bg-white dark:bg-[#0f0f0f] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3ECF8E]/30 resize-none"
              />
            </div>

            {/* Thumbnail */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Thumbnail</label>
              {thumbnailPreview ? (
                <div className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 dark:border-[#2a2a2a] mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumbnailPreview} alt="Thumbnail" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setThumbnailKey(null); setThumbnailPreview(null); }}
                    className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-black/50 text-white text-xs hover:bg-black/70"
                    aria-label="Remove thumbnail"
                  >
                    ×
                  </button>
                </div>
              ) : null}
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleThumbnailChange}
              />
              <button
                type="button"
                onClick={() => thumbnailInputRef.current?.click()}
                className="w-full px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 border border-dashed border-gray-300 dark:border-[#3a3a3a] rounded-lg hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors"
              >
                {thumbnailPreview ? 'Replace thumbnail' : 'Upload thumbnail'}
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="p-4 border-t border-gray-100 dark:border-[#2a2a2a] space-y-2">
            <button
              type="button"
              onClick={() => handleSave(undefined)}
              disabled={saving}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-[#3a3a3a] rounded-lg hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save draft'}
            </button>
            <button
              type="button"
              onClick={() => handleSave(!published)}
              disabled={saving}
              className={`w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                published
                  ? 'text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-900/20'
                  : 'text-white bg-[#3ECF8E] hover:bg-[#2dbe7e]'
              }`}
            >
              {saving ? 'Saving…' : published ? 'Unpublish' : 'Publish'}
            </button>
          </div>
        </aside>
      </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`px-2 py-1 text-sm rounded transition-colors ${
        active
          ? 'bg-[#3ECF8E]/15 text-[#2dbe7e] dark:text-[#3ECF8E]'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a]'
      }`}
    >
      {children}
    </button>
  );
}
