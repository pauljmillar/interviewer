import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getInstanceById,
  getLatestSession,
  getInstanceStatus,
} from '@/lib/server/instanceStoreAdapter';
import { getTemplateById } from '@/constants/templates';
import { createServerSupabase } from '@/lib/supabase/server';
import * as templatesStore from '@/lib/server/supabaseTemplates';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Instance id required' }, { status: 400 });
    }

    const instance = await getInstanceById(id);
    if (!instance) {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    }

    const session = await getLatestSession(id);
    const status = await getInstanceStatus(id);

    let templateName: string | null = null;
    if (instance.templateId) {
      const builtIn = getTemplateById(instance.templateId);
      if (builtIn) {
        templateName = builtIn.name;
      } else {
        const supabase = createServerSupabase();
        if (supabase) {
          const custom = await templatesStore.getTemplate(supabase, instance.templateId);
          if (custom) templateName = custom.name;
        }
      }
    }

    const positionName: string | null = instance.name ?? null;

    return NextResponse.json({
      instance,
      session,
      status,
      templateName,
      positionName,
    });
  } catch (error) {
    console.error('GET /api/instances/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
