import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import * as positionsStore from '@/lib/server/supabasePositions';
import * as templatesStore from '@/lib/server/supabaseTemplates';
import { DEMO_ORG_ID, DEMO_CLAIM_COOKIE, DEMO_CLAIM_COOKIE_MAX_AGE } from '@/lib/constants/demo';
import type { Question } from '@/types';

const SCREENING_INTRO =
  "Thanks for your time. This is a short screening — I'll ask you a few questions to see if we should move to the next round.";
const SCREENING_CONCLUSION =
  "That's all for this round. We'll review and be in touch about next steps.";
const SCREENING_REMINDER =
  'This is a real interview. Your answers will be reviewed by the hiring team. Please answer the question so we can continue.';

type Body = {
  positionName: string;
  questions: Question[];
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
    const {
      positionName,
      questions,
      intro = SCREENING_INTRO,
      conclusion = SCREENING_CONCLUSION,
      reminder = SCREENING_REMINDER,
      voice,
    } = body;

    if (!positionName || typeof positionName !== 'string' || !positionName.trim()) {
      return NextResponse.json({ error: 'positionName is required' }, { status: 400 });
    }
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'questions array is required and must not be empty' }, { status: 400 });
    }

    const name = positionName.trim();
    const templateId = `demo-${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now()}`;
    const template = {
      id: templateId,
      name: `${name} screening`,
      questions,
      intro,
      conclusion,
      reminder,
      voice,
    };

    await templatesStore.saveCustomTemplate(supabase, DEMO_ORG_ID, template);
    const position = await positionsStore.createPosition(supabase, DEMO_ORG_ID, {
      name,
      type: 'screening',
      templateId,
    });

    const response = NextResponse.json({
      positionId: position.id,
      templateId,
      positionName: position.name,
    });

    response.cookies.set(DEMO_CLAIM_COOKIE, position.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: DEMO_CLAIM_COOKIE_MAX_AGE,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('POST /api/demo/create error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
