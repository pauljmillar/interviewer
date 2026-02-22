/**
 * Unified instance store: uses Supabase when env is set, otherwise file store.
 * All exports are async so API routes can await consistently.
 */
import type { Question } from '@/types';
import type { InterviewInstanceRecord, SessionRecord } from '@/types';
import { createServerSupabase } from '@/lib/supabase/server';
import * as fileStore from '@/lib/server/instanceStore';
import * as supabaseStore from '@/lib/server/supabaseInstanceStore';

export type InstanceStatus = 'not_started' | 'started' | 'completed';

function useSupabase() {
  return createServerSupabase();
}

export async function createInstance(
  orgId: string,
  params: {
    name: string;
    templateId?: string;
    positionId?: string;
    recipientName?: string;
    questions: Question[];
    intro?: string;
    conclusion?: string;
    reminder?: string;
    voice?: string;
  }
): Promise<{ instance: InterviewInstanceRecord; shareableToken: string }> {
  const sb = useSupabase();
  if (sb) return supabaseStore.createInstance(sb, orgId, params);
  const { instance, shareableToken } = fileStore.createInstance(orgId, params);
  return Promise.resolve({ instance, shareableToken });
}

/** When orgId is provided (admin), only return if instance belongs to that org. */
export async function getInstanceById(
  id: string,
  orgId?: string
): Promise<InterviewInstanceRecord | undefined> {
  const sb = useSupabase();
  if (sb) return supabaseStore.getInstanceById(sb, id, orgId);
  const instance = await fileStore.getInstanceById(id);
  if (!instance) return undefined;
  return { ...instance, orgId: (instance as InterviewInstanceRecord).orgId ?? orgId ?? '' };
}

export async function getInstanceByToken(token: string): Promise<InterviewInstanceRecord | undefined> {
  const sb = useSupabase();
  if (sb) return supabaseStore.getInstanceByToken(sb, token);
  return Promise.resolve(fileStore.getInstanceByToken(token));
}

export async function getAllInstances(
  orgId: string,
  positionId?: string
): Promise<(InterviewInstanceRecord & { status: InstanceStatus })[]> {
  const sb = useSupabase();
  if (sb) return supabaseStore.getAllInstances(sb, orgId, positionId);
  const list = fileStore.getAllInstances();
  let out = list.filter((i) => (i as InterviewInstanceRecord).orgId === orgId);
  if (positionId) out = out.filter((i) => i.positionId === positionId);
  return out;
}

export async function getSessions(instanceId: string): Promise<SessionRecord[]> {
  const sb = useSupabase();
  if (sb) return supabaseStore.getSessions(sb, instanceId);
  return Promise.resolve(fileStore.getSessions(instanceId));
}

export async function getLatestSession(instanceId: string): Promise<SessionRecord | undefined> {
  const sb = useSupabase();
  const session = sb
    ? await supabaseStore.getLatestSession(sb, instanceId)
    : fileStore.getLatestSession(instanceId);
  console.log('[instanceStore] getLatestSession', {
    instanceId,
    backend: sb ? 'supabase' : 'file',
    found: !!session,
    messageCount: session?.messages?.length ?? 0,
  });
  return session;
}

export async function saveSession(session: SessionRecord): Promise<void> {
  const sb = useSupabase();
  console.log('[instanceStore] saveSession', {
    instanceId: session.interviewInstanceId,
    sessionId: session.id,
    backend: sb ? 'supabase' : 'file',
    messageCount: session.messages?.length ?? 0,
  });
  if (sb) await supabaseStore.saveSession(sb, session);
  else fileStore.saveSession(session);
}

export async function getInstanceStatus(instanceId: string): Promise<InstanceStatus> {
  const sb = useSupabase();
  if (sb) return supabaseStore.getInstanceStatus(sb, instanceId);
  return Promise.resolve(fileStore.getInstanceStatus(instanceId));
}

export async function createSession(instanceId: string): Promise<SessionRecord> {
  const sb = useSupabase();
  if (sb) return supabaseStore.createSession(sb, instanceId);
  return Promise.resolve(fileStore.createSession(instanceId));
}
