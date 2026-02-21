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

export async function createInstance(params: {
  name: string;
  templateId?: string;
  positionId?: string;
  recipientName?: string;
  questions: Question[];
  intro?: string;
  conclusion?: string;
  reminder?: string;
}): Promise<{ instance: InterviewInstanceRecord; shareableToken: string }> {
  const sb = useSupabase();
  if (sb) return supabaseStore.createInstance(sb, params);
  return Promise.resolve(fileStore.createInstance(params));
}

export async function getInstanceById(id: string): Promise<InterviewInstanceRecord | undefined> {
  const sb = useSupabase();
  if (sb) return supabaseStore.getInstanceById(sb, id);
  return Promise.resolve(fileStore.getInstanceById(id));
}

export async function getInstanceByToken(token: string): Promise<InterviewInstanceRecord | undefined> {
  const sb = useSupabase();
  if (sb) return supabaseStore.getInstanceByToken(sb, token);
  return Promise.resolve(fileStore.getInstanceByToken(token));
}

export async function getAllInstances(
  positionId?: string
): Promise<(InterviewInstanceRecord & { status: InstanceStatus })[]> {
  const sb = useSupabase();
  if (sb) return supabaseStore.getAllInstances(sb, positionId);
  const list = fileStore.getAllInstances();
  if (positionId) return list.filter((i) => i.positionId === positionId);
  return list;
}

export async function getSessions(instanceId: string): Promise<SessionRecord[]> {
  const sb = useSupabase();
  if (sb) return supabaseStore.getSessions(sb, instanceId);
  return Promise.resolve(fileStore.getSessions(instanceId));
}

export async function getLatestSession(instanceId: string): Promise<SessionRecord | undefined> {
  const sb = useSupabase();
  if (sb) return supabaseStore.getLatestSession(sb, instanceId);
  return Promise.resolve(fileStore.getLatestSession(instanceId));
}

export async function saveSession(session: SessionRecord): Promise<void> {
  const sb = useSupabase();
  if (sb) return supabaseStore.saveSession(sb, session);
  fileStore.saveSession(session);
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
