import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getInstanceById, getLatestSession, saveSession } from '@/lib/server/instanceStoreAdapter';
import { getEffectiveOrgId } from '@/lib/server/getEffectiveOrgId';

const bucket = process.env.S3_RECORDING_BUCKET;
const region = process.env.AWS_REGION;

function getS3Client(): S3Client | null {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !region || !bucket) {
    return null;
  }
  return new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

/** Admin only: redirect to a presigned URL for the session recording. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await getEffectiveOrgId(request);
  if (!orgId) {
    return NextResponse.json(
      { error: 'Organization required' },
      { status: 403 }
    );
  }
  try {
    const { id: instanceId } = await params;
    if (!instanceId) {
      return NextResponse.json({ error: 'Instance id required' }, { status: 400 });
    }

    const instance = await getInstanceById(instanceId, orgId);
    if (!instance) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    }

    const session = await getLatestSession(instanceId);
    const key = session?.recordingKey;
    if (!key) {
      return NextResponse.json({ error: 'No recording for this interview' }, { status: 404 });
    }

    const s3 = getS3Client();
    if (!s3) {
      return NextResponse.json(
        { error: 'Recording storage not configured' },
        { status: 503 }
      );
    }

    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: 3600 }
    );
    return NextResponse.redirect(url);
  } catch (error) {
    console.error('GET /api/instances/[id]/recording error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/** Accept recording blob from candidate and upload to S3. No auth required (candidate upload). */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: instanceId } = await params;
  const contentLength = request.headers.get('content-length');

  console.log('[recording] POST received', { instanceId, contentLength: contentLength ?? 'unknown' });

  try {
    if (!instanceId) {
      return NextResponse.json({ error: 'Instance id required' }, { status: 400 });
    }

    const instance = await getInstanceById(instanceId, undefined);
    if (!instance) {
      console.warn('[recording] instance not found', { instanceId });
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    }

    const s3 = getS3Client();
    if (!s3) {
      console.error('[recording] S3 not configured: set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_RECORDING_BUCKET');
      return NextResponse.json(
        { error: 'Recording storage not configured' },
        { status: 503 }
      );
    }

    const contentType = request.headers.get('content-type') || 'video/webm';
    const buffer = await request.arrayBuffer();
    const byteLength = buffer.byteLength;

    if (byteLength === 0) {
      console.warn('[recording] empty body', { instanceId });
      return NextResponse.json({ error: 'Empty body' }, { status: 400 });
    }

    const sessionId = request.headers.get('x-recording-session-id');
    const ext = contentType.includes('webm') ? 'webm' : 'mp4';
    const key = sessionId
      ? `recordings/${instanceId}/${sessionId}.${ext}`
      : `recordings/${instanceId}/${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`;

    console.log('[recording] uploading to S3', { instanceId, key, byteLength, contentType });

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: new Uint8Array(buffer),
        ContentType: contentType,
      })
    );

    console.log('[recording] S3 upload ok', { instanceId, key });

    const session = await getLatestSession(instanceId);
    if (session) {
      await saveSession({ ...session, recordingKey: key });
      console.log('[recording] session updated with recordingKey', { instanceId, sessionId: session.id, key });
    } else {
      console.warn('[recording] no session found to update', { instanceId });
    }

    return NextResponse.json({ ok: true, key });
  } catch (error) {
    const err = error as Error & { code?: string; name?: string };
    console.error('[recording] POST error', {
      instanceId,
      message: err.message,
      name: err.name,
      code: err.code,
      stack: err.stack,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
