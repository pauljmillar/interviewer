import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/server/apiAuth';
import { createInstance } from '@/lib/server/instanceStoreAdapter';
import { getTemplateById } from '@/constants/templates';

const DEMO_TEMPLATE_ID = 'demo-walkthrough';

export async function POST(request: NextRequest) {
  const authResult = await validateApiKey(request);
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as {
    recipientName?: string;
    recipientEmail?: string;
  };

  // Read at request time (not module init) so Vercel env vars are always current.
  const internalOrgId = process.env['INTERNAL_ORG_ID'] ?? 'org_demo';
  const campaignPositionId = process.env['CAMPAIGN_POSITION_ID'] ?? undefined;

  console.log('[demo/link] creating instance', { internalOrgId, campaignPositionId, recipientName: body.recipientName, recipientEmail: body.recipientEmail });

  try {
    const template = getTemplateById(DEMO_TEMPLATE_ID);
    if (!template) {
      return NextResponse.json({ error: 'Demo template not found' }, { status: 500 });
    }

    const { shareableToken } = await createInstance(internalOrgId, {
      name: 'Marketing Demo',
      templateId: DEMO_TEMPLATE_ID,
      positionId: campaignPositionId,
      recipientName: body.recipientName || 'Guest',
      recipientEmail: body.recipientEmail || undefined,
      questions: template.questions,
      intro: template.intro,
      conclusion: template.conclusion,
      reminder: template.reminder,
      voice: template.voice,
    });

    const origin = request.nextUrl.origin;
    const interviewUrl = `${origin}/interview/${shareableToken}`;

    return NextResponse.json({ interviewUrl, token: shareableToken });
  } catch (error) {
    console.error('POST /api/v1/demo/link error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
