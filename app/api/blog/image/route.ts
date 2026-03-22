import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
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

/** Public: proxy a blog image from S3. */
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key');
  if (!key) return new NextResponse(null, { status: 400 });
  if (!key.startsWith('blog/')) return new NextResponse(null, { status: 400 });

  const s3 = getS3Client();
  if (!s3) return new NextResponse(null, { status: 503 });

  try {
    const result = await s3.send(new GetObjectCommand({
      Bucket: process.env.S3_RECORDING_BUCKET!,
      Key: key,
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
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
