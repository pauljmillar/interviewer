import { NextRequest, NextResponse } from 'next/server';
import {
  getInstanceByToken,
  getLatestSession,
  createSession,
} from '@/lib/server/instanceStoreAdapter';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const instance = await getInstanceByToken(token);
    if (!instance) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
    }

    let session = await getLatestSession(instance.id);
    if (!session) {
      session = await createSession(instance.id);
    }

    return NextResponse.json({ instance, session });
  } catch (error) {
    console.error('GET /api/instances/by-token error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
