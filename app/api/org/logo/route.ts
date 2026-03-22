import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getEffectiveOrgId } from '@/lib/server/getEffectiveOrgId';
import { createServerSupabase } from '@/lib/supabase/server';
import { getOrgSettings, saveOrgSettings } from '@/lib/server/supabaseOrgSettings';

const ALLOWED_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

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

/** Admin: upload logo via multipart/form-data with field name "logo". */
export async function POST(request: NextRequest) {
  const { orgId } = await getEffectiveOrgId(request);
  if (!orgId) return NextResponse.json({ error: 'Organization required' }, { status: 403 });

  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const s3 = getS3Client();
  if (!s3) return NextResponse.json({ error: 'Logo storage not configured' }, { status: 503 });

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });

  const file = formData.get('logo');
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'No logo file provided' }, { status: 400 });
  }

  const mimeType = file.type || 'image/png';
  const ext = ALLOWED_TYPES[mimeType];
  if (!ext) {
    return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 });
  }

  const key = `logos/${orgId}/logo.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_RECORDING_BUCKET!,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }));

  // Delete any previous logo with a different extension
  const existing = await getOrgSettings(supabase, orgId);
  if (existing?.logoKey && existing.logoKey !== key) {
    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.S3_RECORDING_BUCKET!,
      Key: existing.logoKey,
    })).catch(() => {});
  }

  await saveOrgSettings(supabase, orgId, { logoKey: key });

  return NextResponse.json({ ok: true });
}

/** Admin: remove logo. */
export async function DELETE(request: NextRequest) {
  const { orgId } = await getEffectiveOrgId(request);
  if (!orgId) return NextResponse.json({ error: 'Organization required' }, { status: 403 });

  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const settings = await getOrgSettings(supabase, orgId);
  if (settings?.logoKey) {
    const s3 = getS3Client();
    if (s3) {
      await s3.send(new DeleteObjectCommand({
        Bucket: process.env.S3_RECORDING_BUCKET!,
        Key: settings.logoKey,
      })).catch(() => {});
    }
  }

  await saveOrgSettings(supabase, orgId, { logoKey: null });
  return NextResponse.json({ ok: true });
}
