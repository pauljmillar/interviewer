import { NextRequest, NextResponse } from 'next/server';
import {
  getInstanceById,
  getLatestSession,
  getInstanceStatus,
} from '@/lib/server/instanceStoreAdapter';
import { getEffectiveOrgId } from '@/lib/server/getEffectiveOrgId';
import { getTemplateById } from '@/constants/templates';
import { createServerSupabase } from '@/lib/supabase/server';
import * as templatesStore from '@/lib/server/supabaseTemplates';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await getEffectiveOrgId(request);
  if (!orgId) {
    return NextResponse.json(
      { error: 'Organization required. Create or select an organization.' },
      { status: 403 }
    );
  }
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Instance id required' }, { status: 400 });
    }

    const instance = await getInstanceById(id, orgId);
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
          const custom = await templatesStore.getTemplate(
            supabase,
            instance.templateId,
            orgId
          );
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
