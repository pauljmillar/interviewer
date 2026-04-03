import { NextRequest, NextResponse } from 'next/server';
import { createInstance } from '@/lib/server/instanceStoreAdapter';
import { getTemplateById } from '@/constants/templates';
import { INTERNAL_ORG_ID, DEMO_POSITION_ID } from '@/lib/constants/demo';

const DEMO_TEMPLATE_ID = 'demo-walkthrough';

export async function POST(request: NextRequest) {
  try {
    const template = getTemplateById(DEMO_TEMPLATE_ID);
    if (!template) {
      return NextResponse.json({ error: 'Demo template not found' }, { status: 500 });
    }

    const { instance, shareableToken } = await createInstance(INTERNAL_ORG_ID, {
      name: 'Demo',
      templateId: DEMO_TEMPLATE_ID,
      positionId: DEMO_POSITION_ID,
      recipientName: 'Demo user',
      questions: template.questions,
      intro: template.intro,
      conclusion: template.conclusion,
      reminder: template.reminder,
      voice: template.voice,
    });

    const origin = request.headers.get('origin') || request.nextUrl.origin;
    const shareableUrl = `${origin}/interview/${shareableToken}`;

    return NextResponse.json({
      shareableUrl,
      shareableToken,
      instance,
    });
  } catch (error) {
    console.error('POST /api/demo/try-interview error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
