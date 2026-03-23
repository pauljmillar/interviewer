import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/server/apiAuth';
import { createServerSupabase } from '@/lib/supabase/server';
import { listPosts, createPost } from '@/lib/server/supabaseBlogStore';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { marked } from 'marked';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

function getS3Client(): S3Client | null {
  if (
    !process.env.AWS_ACCESS_KEY_ID ||
    !process.env.AWS_SECRET_ACCESS_KEY ||
    !process.env.AWS_REGION ||
    !process.env.S3_RECORDING_BUCKET
  ) return null;
  return new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

const ALLOWED_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

async function uploadInlineImage(
  s3: S3Client,
  { filename, data_base64, mime_type }: { filename: string; data_base64: string; mime_type: string }
): Promise<string> {
  const ext = ALLOWED_MIME[mime_type] ?? 'bin';
  const random = Math.random().toString(36).slice(2, 9);
  const key = `blog/images/${Date.now()}-${random}.${ext}`;
  const buffer = Buffer.from(data_base64, 'base64');
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_RECORDING_BUCKET!,
    Key: key,
    Body: buffer,
    ContentType: mime_type,
  }));
  return `/api/blog/image?key=${encodeURIComponent(key)}`;
}

export async function GET(request: NextRequest) {
  if (!await validateApiKey(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status');
  const onlyPublished = statusFilter === 'published';

  let posts = await listPosts(supabase, onlyPublished || undefined);

  // Additional client-side filters for non-published statuses
  if (statusFilter && !onlyPublished) {
    posts = posts.filter((p) => p.status === statusFilter);
  }
  const tag = searchParams.get('tag');
  if (tag) posts = posts.filter((p) => p.tags.includes(tag));
  const from = searchParams.get('from');
  if (from) posts = posts.filter((p) => p.createdAt >= from);
  const to = searchParams.get('to');
  if (to) posts = posts.filter((p) => p.createdAt <= to);

  return NextResponse.json({ data: posts, total: posts.length });
}

export async function POST(request: NextRequest) {
  if (!await validateApiKey(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const { title, slug, body_markdown, status, publish_at, tags, cover_image_url, images, excerpt, source_urls } = body;

  if (!title || typeof title !== 'string') {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }
  if (!body_markdown || typeof body_markdown !== 'string') {
    return NextResponse.json({ error: 'body_markdown is required' }, { status: 400 });
  }

  const resolvedStatus: string = status ?? 'draft';
  if (resolvedStatus === 'scheduled' && !publish_at) {
    return NextResponse.json({ error: 'publish_at is required when status is scheduled' }, { status: 400 });
  }

  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

  // Convert Markdown → HTML so the blog page can render it with dangerouslySetInnerHTML
  let content = await marked(body_markdown as string, { gfm: true, breaks: false });
  if (Array.isArray(images) && images.length > 0) {
    const s3 = getS3Client();
    if (s3) {
      for (const img of images) {
        if (img.filename && img.data_base64 && img.mime_type) {
          try {
            const url = await uploadInlineImage(s3, img);
            content = content.replace(new RegExp(img.filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), url);
          } catch {
            // skip failed uploads
          }
        }
      }
    }
  }

  const resolvedSlug = (typeof slug === 'string' && slug.trim())
    ? slug.trim()
    : slugify(title) + '-' + Date.now().toString(36);

  try {
    const post = await createPost(supabase, {
      title,
      slug: resolvedSlug,
      content,
      status: resolvedStatus,
      publishAt: publish_at ?? null,
      tags: Array.isArray(tags) ? tags : [],
      coverImageUrl: typeof cover_image_url === 'string' ? cover_image_url : null,
      excerpt: typeof excerpt === 'string' ? excerpt : null,
      sourceUrls: Array.isArray(source_urls) ? source_urls : [],
    });
    return NextResponse.json(post, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    if (msg.includes('duplicate') || msg.includes('unique')) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
