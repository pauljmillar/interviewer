import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/server/apiAuth';
import { createInstance } from '@/lib/server/instanceStoreAdapter';
import { getTemplateById } from '@/constants/templates';
import { INTERNAL_ORG_ID, CAMPAIGN_POSITION_ID } from '@/lib/constants/demo';

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

  try {
    const template = getTemplateById(DEMO_TEMPLATE_ID);
    if (!template) {
      return NextResponse.json({ error: 'Demo template not found' }, { status: 500 });
    }

    const { shareableToken } = await createInstance(INTERNAL_ORG_ID, {
      name: 'Marketing Demo',
      templateId: DEMO_TEMPLATE_ID,
      positionId: CAMPAIGN_POSITION_ID,
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
