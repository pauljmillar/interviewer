import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createServerSupabase } from '@/lib/supabase/server';
import { getOrgSettings } from '@/lib/server/supabaseOrgSettings';
import type { Readable } from 'stream';

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

/** Public: serve company logo by orgId. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  if (!orgId) return new NextResponse(null, { status: 404 });

  const supabase = createServerSupabase();
  if (!supabase) return new NextResponse(null, { status: 503 });

  const settings = await getOrgSettings(supabase, orgId).catch(() => null);
  if (!settings?.logoKey) return new NextResponse(null, { status: 404 });

  const s3 = getS3Client();
  if (!s3) return new NextResponse(null, { status: 503 });

  try {
    const result = await s3.send(new GetObjectCommand({
      Bucket: process.env.S3_RECORDING_BUCKET!,
      Key: settings.logoKey,
    }));

    const contentType = result.ContentType ?? 'image/png';
    const body = result.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
    }
    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
