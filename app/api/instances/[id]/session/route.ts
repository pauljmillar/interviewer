import { NextRequest, NextResponse } from 'next/server';
import { getInstanceById, getSessions, saveSession } from '@/lib/server/instanceStoreAdapter';
import { getEffectiveOrgId } from '@/lib/server/getEffectiveOrgId';
import type { SessionRecord } from '@/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await getEffectiveOrgId(request);
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Instance id required' }, { status: 400 });
    }

    // Allow unauthenticated (interviewee) updates: look up by id only. Authenticated admins use orgId.
    const instance = await getInstanceById(id, orgId ?? undefined);
    if (!instance) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    }

    const body: SessionRecord = await request.json();
    if (body.interviewInstanceId !== id) {
      return NextResponse.json(
        { error: 'interviewInstanceId must match route id' },
        { status: 400 }
      );
    }

    const sessions = await getSessions(id);
    const existing = sessions.some((s) => s.id === body.id);
    if (!existing) {
      return NextResponse.json(
        { error: 'Session not found for this instance' },
        { status: 400 }
      );
    }

    await saveSession(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH /api/instances/[id]/session error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
