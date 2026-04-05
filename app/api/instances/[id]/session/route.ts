import { NextRequest, NextResponse } from 'next/server';
import { getInstanceById, getLatestSession, getSessions, saveSession } from '@/lib/server/instanceStoreAdapter';
import { getEffectiveOrgId } from '@/lib/server/getEffectiveOrgId';
import { createServerSupabase } from '@/lib/supabase/server';
import { activateInterview } from '@/lib/billing/activation';
import type { SessionRecord } from '@/types';

/** Return latest session for this instance. Used by interviewee to re-fetch before starting (avoids overwriting). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Instance id required' }, { status: 400 });
    }
    const instance = await getInstanceById(id, undefined);
    if (!instance) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    }
    const session = await getLatestSession(id);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    return NextResponse.json({ session });
  } catch (error) {
    console.error('GET /api/instances/[id]/session error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

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
      console.log('[session PATCH] session not found for instance', {
        instanceId: id,
        sessionId: body.id,
        existingSessionIds: sessions.map((s) => s.id),
      });
      return NextResponse.json(
        { error: 'Session not found for this instance' },
        { status: 400 }
      );
    }

    const msgCount = body.messages?.length ?? 0;
    console.log('[session PATCH] saving', {
      instanceId: id,
      sessionId: body.id,
      messageCount: msgCount,
      currentQuestionIndex: body.currentQuestionIndex,
    });
    await saveSession(body);
    console.log('[session PATCH] save ok');

    // Billing activation: fire-and-forget on first candidate message.
    const hasUserMessage = body.messages?.some((m) => m.role === 'user');
    if (hasUserMessage && !instance.activatedAt) {
      const sb = createServerSupabase();
      if (sb) {
        activateInterview(id, instance.orgId, sb).catch((err) =>
          console.error('[session PATCH] activateInterview error', err)
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH /api/instances/[id]/session error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
