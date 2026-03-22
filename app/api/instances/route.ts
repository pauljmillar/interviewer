import { NextRequest, NextResponse } from 'next/server';
import { createInstance, getAllInstances } from '@/lib/server/instanceStoreAdapter';
import { getEffectiveOrgId } from '@/lib/server/getEffectiveOrgId';
import { createServerSupabase } from '@/lib/supabase/server';
import * as templatesStore from '@/lib/server/supabaseTemplates';
import { getTemplateById } from '@/constants/templates';
import type { Question } from '@/types';

type CreateBody = {
  name: string;
  positionId?: string;
  templateId?: string;
  recipientName?: string;
  recipientEmail?: string;
  questions: Question[];
  intro?: string;
  conclusion?: string;
  reminder?: string;
  voice?: string;
};

export async function POST(request: NextRequest) {
  const { orgId } = await getEffectiveOrgId(request);
  if (!orgId) {
    return NextResponse.json(
      { error: 'Organization required. Create or select an organization.' },
      { status: 403 }
    );
  }
  try {
    const body: CreateBody = await request.json();
    const {
      name,
      positionId,
      templateId,
      recipientName,
      recipientEmail,
      questions,
      intro,
      conclusion,
      reminder,
      voice: bodyVoice,
    } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json({ error: 'questions array is required' }, { status: 400 });
    }

    let voice = bodyVoice;
    if (voice == null && templateId) {
      const builtIn = getTemplateById(templateId);
      if (builtIn?.voice) voice = builtIn.voice;
      else {
        const supabase = createServerSupabase();
        if (supabase) {
          const custom = await templatesStore.getTemplate(supabase, templateId, orgId);
          if (custom?.voice) voice = custom.voice;
        }
      }
    }

    const { instance, shareableToken } = await createInstance(orgId, {
      name,
      positionId,
      templateId,
      recipientName,
      recipientEmail,
      questions,
      intro,
      conclusion,
      reminder,
      voice,
    });

    const origin = request.headers.get('origin') || request.nextUrl.origin;
    const shareableUrl = `${origin}/interview/${shareableToken}`;

    return NextResponse.json({
      instance,
      shareableToken,
      shareableUrl,
    });
  } catch (error) {
    console.error('POST /api/instances error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { orgId } = await getEffectiveOrgId(request);
  if (!orgId) {
    return NextResponse.json(
      { error: 'Organization required. Create or select an organization.' },
      { status: 403 }
    );
  }
  try {
    const positionId = request.nextUrl.searchParams.get('positionId') ?? undefined;
    const list = await getAllInstances(orgId, positionId);
    return NextResponse.json(list);
  } catch (error) {
    console.error('GET /api/instances error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
