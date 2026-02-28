import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabase } from '@/lib/supabase/server';
import { getEffectiveOrgId } from '@/lib/server/getEffectiveOrgId';
import * as positionsStore from '@/lib/server/supabasePositions';
import { DEMO_ORG_ID, DEMO_CLAIM_COOKIE } from '@/lib/constants/demo';

type Body = { positionId?: string };

export async function POST(request: NextRequest) {
  const { orgId } = await getEffectiveOrgId(request);
  if (!orgId) {
    return NextResponse.json(
      { error: 'Sign in and create or select an organization to claim your demo.' },
      { status: 401 }
    );
  }

  const supabase = createServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Body;
    const cookieStore = await cookies();
    const positionId = body?.positionId?.trim() || cookieStore.get(DEMO_CLAIM_COOKIE)?.value?.trim();

    if (!positionId) {
      return NextResponse.json(
        { error: 'No demo to claim. Complete a demo first, then sign up.' },
        { status: 400 }
      );
    }

    const position = await positionsStore.getPosition(supabase, positionId, DEMO_ORG_ID);
    if (!position) {
      return NextResponse.json(
        { error: 'Demo not found or already claimed.' },
        { status: 404 }
      );
    }

    const templateId = position.templateId;
    if (!templateId) {
      return NextResponse.json({ error: 'Position has no template' }, { status: 400 });
    }

    const { error: posErr } = await supabase
      .from('positions')
      .update({ org_id: orgId })
      .eq('id', positionId)
      .eq('org_id', DEMO_ORG_ID);
    if (posErr) throw posErr;

    const { error: tplErr } = await supabase
      .from('interview_templates')
      .update({ org_id: orgId })
      .eq('id', templateId)
      .eq('org_id', DEMO_ORG_ID);
    if (tplErr) throw tplErr;

    const { error: instErr } = await supabase
      .from('interview_instances')
      .update({ org_id: orgId })
      .eq('position_id', positionId)
      .eq('org_id', DEMO_ORG_ID);
    if (instErr) throw instErr;

    const response = NextResponse.json({
      claimed: true,
      positionId,
      templateId,
    });

    response.cookies.set(DEMO_CLAIM_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('POST /api/demo/claim error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
