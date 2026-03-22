import { NextRequest, NextResponse } from 'next/server';
import {
  getInstanceByToken,
  getLatestSession,
  createSession,
} from '@/lib/server/instanceStoreAdapter';
import { createServerSupabase } from '@/lib/supabase/server';
import { getOrgSettings } from '@/lib/server/supabaseOrgSettings';

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
      console.log('[by-token] no instance for token', { tokenPrefix: token.slice(0, 8) });
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
    }

    let session = await getLatestSession(instance.id);
    const createdNew = !session;
    if (!session) {
      console.log('[by-token] no session for instance, creating', { instanceId: instance.id });
      session = await createSession(instance.id);
    }

    const msgCount = session.messages?.length ?? 0;
    console.log('[by-token] returning', {
      instanceId: instance.id,
      sessionId: session.id,
      messageCount: msgCount,
      messagesType: Array.isArray(session.messages) ? 'array' : typeof session.messages,
      currentQuestionIndex: session.currentQuestionIndex,
      createdNewSession: createdNew,
    });

    // Fetch org settings for branding (non-fatal if unavailable)
    let orgSettings: { companyName: string | null; hasLogo: boolean; privacyPolicyUrl: string | null } = {
      companyName: null,
      hasLogo: false,
      privacyPolicyUrl: null,
    };
    try {
      const supabase = createServerSupabase();
      if (supabase && instance.orgId) {
        const settings = await getOrgSettings(supabase, instance.orgId);
        orgSettings = {
          companyName: settings?.companyName ?? null,
          hasLogo: !!settings?.logoKey,
          privacyPolicyUrl: settings?.privacyPolicyUrl ?? null,
        };
      }
    } catch {
      // Silently degrade — branding is non-critical
    }

    return NextResponse.json({ instance, session, orgSettings });
  } catch (error) {
    console.error('GET /api/instances/by-token error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
