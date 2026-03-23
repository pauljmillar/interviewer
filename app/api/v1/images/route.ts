import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { validateApiKey } from '@/lib/server/apiAuth';

const ALLOWED_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
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

export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const s3 = getS3Client();
  if (!s3) return NextResponse.json({ error: 'Image storage not configured' }, { status: 503 });

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });

  const file = formData.get('file');
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const mimeType = file.type || 'image/png';
  const ext = ALLOWED_TYPES[mimeType];
  if (!ext) {
    return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 });
  }

  const random = Math.random().toString(36).slice(2, 9);
  const key = `blog/images/${Date.now()}-${random}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_RECORDING_BUCKET!,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }));

  const url = `/api/blog/image?key=${encodeURIComponent(key)}`;
  return NextResponse.json({ url });
}
