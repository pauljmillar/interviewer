import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/server/apiAuth';
import { createInstance } from '@/lib/server/instanceStoreAdapter';
import { getTemplateById } from '@/constants/templates';
import { createServerSupabase } from '@/lib/supabase/server';
import { getPosition } from '@/lib/server/supabasePositions';
import * as templatesStore from '@/lib/server/supabaseTemplates';

const FALLBACK_TEMPLATE_ID = 'demo-walkthrough';

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

  try {
    // Resolve template from the position's current templateId, falling back to demo-walkthrough.
    let templateId = FALLBACK_TEMPLATE_ID;
    let template = getTemplateById(templateId);

    if (campaignPositionId) {
      const supabase = createServerSupabase();
      if (supabase) {
        const position = await getPosition(supabase, campaignPositionId, internalOrgId);
        if (position?.templateId) {
          const builtIn = getTemplateById(position.templateId);
          if (builtIn) {
            templateId = position.templateId;
            template = builtIn;
          } else {
            const custom = await templatesStore.getTemplate(supabase, position.templateId, internalOrgId);
            if (custom) {
              templateId = position.templateId;
              template = custom;
            }
          }
        }
      }
    }

    if (!template) {
      return NextResponse.json({ error: 'Demo template not found' }, { status: 500 });
    }

    const { shareableToken } = await createInstance(internalOrgId, {
      name: 'Marketing Demo',
      templateId,
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
