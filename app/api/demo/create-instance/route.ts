import { NextRequest, NextResponse } from 'next/server';
import { createInstance } from '@/lib/server/instanceStoreAdapter';
import { createServerSupabase } from '@/lib/supabase/server';
import * as positionsStore from '@/lib/server/supabasePositions';
import * as templatesStore from '@/lib/server/supabaseTemplates';
import { DEMO_ORG_ID } from '@/lib/constants/demo';

type Body = {
  positionId: string;
  recipientName?: string;
  intro?: string;
  conclusion?: string;
  reminder?: string;
  voice?: string;
};

export async function POST(request: NextRequest) {
  const supabase = createServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }
  try {
    const body = (await request.json()) as Body;
    const { positionId, recipientName, intro, conclusion, reminder, voice } = body;

    if (!positionId || typeof positionId !== 'string') {
      return NextResponse.json({ error: 'positionId is required' }, { status: 400 });
    }

    const position = await positionsStore.getPosition(supabase, positionId, DEMO_ORG_ID);
    if (!position) {
      return NextResponse.json({ error: 'Position not found or not a demo position' }, { status: 404 });
    }

    const templateId = position.templateId;
    if (!templateId) {
      return NextResponse.json({ error: 'Position has no template' }, { status: 400 });
    }

    const template = await templatesStore.getTemplate(supabase, templateId, DEMO_ORG_ID);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const name = recipientName?.trim() || 'Demo candidate';
    const { instance, shareableToken } = await createInstance(DEMO_ORG_ID, {
      name,
      positionId,
      templateId,
      recipientName: recipientName?.trim(),
      questions: template.questions,
      intro: intro ?? template.intro,
      conclusion: conclusion ?? template.conclusion,
      reminder: reminder ?? template.reminder,
      voice: voice ?? template.voice,
    });

    const origin = request.headers.get('origin') || request.nextUrl.origin;
    const shareableUrl = `${origin}/interview/${shareableToken}`;

    return NextResponse.json({
      instance,
      shareableToken,
      shareableUrl,
    });
  } catch (error) {
    console.error('POST /api/demo/create-instance error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
