import type { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import type {
  InterviewInstanceRecord,
  SessionRecord,
  Question,
} from '@/types';
import { DEFAULT_ENTITY_SCHEMAS } from '@/lib/entities/schemas';

export type InstanceStatus = 'not_started' | 'started' | 'completed';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function generateToken(): string {
  return crypto.randomBytes(10).toString('base64url');
}

function deriveStatus(latestSession: SessionRecord | null | undefined): InstanceStatus {
  if (!latestSession || !Array.isArray(latestSession.messages) || latestSession.messages.length === 0) {
    return 'not_started';
  }
  if (latestSession.allQuestionsCovered) return 'completed';
  return 'started';
}

export async function createInstance(
  supabase: SupabaseClient,
  params: {
    name: string;
    templateId?: string;
    positionId?: string;
    recipientName?: string;
    questions: Question[];
    intro?: string;
    conclusion?: string;
    reminder?: string;
  }
): Promise<{ instance: InterviewInstanceRecord; shareableToken: string }> {
  const id = generateId();
  const shareableToken = generateToken();
  const instance: InterviewInstanceRecord = {
    id,
    name: params.name,
    templateId: params.templateId,
    positionId: params.positionId,
    recipientName: params.recipientName,
    shareableToken,
    questions: params.questions,
    createdAt: new Date().toISOString(),
    intro: params.intro,
    conclusion: params.conclusion,
    reminder: params.reminder,
  };
  const { error: instErr } = await supabase.from('interview_instances').insert({
    id: instance.id,
    name: instance.name,
    template_id: instance.templateId,
    position_id: instance.positionId,
    recipient_name: instance.recipientName,
    shareable_token: instance.shareableToken,
    questions: instance.questions,
    intro: instance.intro,
    conclusion: instance.conclusion,
    reminder: instance.reminder,
  });
  if (instErr) throw instErr;

  const session: SessionRecord = {
    id: generateId(),
    interviewInstanceId: id,
    startedAt: new Date().toISOString(),
    messages: [],
    currentQuestionIndex: 0,
    coveredSubTopics: [],
    currentQuestionWordCount: 0,
    userRepliesForCurrentQuestion: 0,
    discoveryContext: {
      entities: [],
      timeline: [],
      entitySchemas: DEFAULT_ENTITY_SCHEMAS,
    },
    allQuestionsCovered: false,
    reminderAlreadyShown: false,
  };
  const { error: sessErr } = await supabase.from('sessions').insert({
    id: session.id,
    interview_instance_id: session.interviewInstanceId,
    started_at: session.startedAt,
    messages: session.messages,
    current_question_index: session.currentQuestionIndex,
    covered_sub_topics: session.coveredSubTopics,
    current_question_word_count: session.currentQuestionWordCount,
    user_replies_for_current_question: session.userRepliesForCurrentQuestion,
    discovery_context: session.discoveryContext,
    all_questions_covered: session.allQuestionsCovered,
    reminder_already_shown: session.reminderAlreadyShown,
  });
  if (sessErr) throw sessErr;

  return { instance, shareableToken };
}

export async function getInstanceById(
  supabase: SupabaseClient,
  id: string
): Promise<InterviewInstanceRecord | undefined> {
  const { data, error } = await supabase
    .from('interview_instances')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return undefined;
  return rowToInstance(data);
}

export async function getInstanceByToken(
  supabase: SupabaseClient,
  token: string
): Promise<InterviewInstanceRecord | undefined> {
  const { data, error } = await supabase
    .from('interview_instances')
    .select('*')
    .eq('shareable_token', token)
    .single();
  if (error || !data) return undefined;
  return rowToInstance(data);
}

export async function getAllInstances(
  supabase: SupabaseClient,
  positionId?: string
): Promise<(InterviewInstanceRecord & { status: InstanceStatus })[]> {
  let q = supabase.from('interview_instances').select('*').order('created_at', { ascending: false });
  if (positionId) q = q.eq('position_id', positionId);
  const { data: rows, error } = await q;
  if (error) return [];
  const out: (InterviewInstanceRecord & { status: InstanceStatus })[] = [];
  for (const row of rows ?? []) {
    const instance = rowToInstance(row);
    const latest = await getLatestSession(supabase, instance.id);
    out.push({ ...instance, status: deriveStatus(latest ?? null) });
  }
  return out;
}

export async function getSessions(
  supabase: SupabaseClient,
  instanceId: string
): Promise<SessionRecord[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('interview_instance_id', instanceId)
    .order('started_at', { ascending: true });
  if (error) return [];
  return (data ?? []).map(rowToSession);
}

export async function getLatestSession(
  supabase: SupabaseClient,
  instanceId: string
): Promise<SessionRecord | undefined> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('interview_instance_id', instanceId)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();
  if (error || !data) return undefined;
  return rowToSession(data);
}

export async function saveSession(
  supabase: SupabaseClient,
  session: SessionRecord
): Promise<void> {
  const row = {
    id: session.id,
    interview_instance_id: session.interviewInstanceId,
    started_at: session.startedAt,
    messages: session.messages,
    current_question_index: session.currentQuestionIndex,
    covered_sub_topics: session.coveredSubTopics,
    current_question_word_count: session.currentQuestionWordCount,
    user_replies_for_current_question: session.userRepliesForCurrentQuestion,
    discovery_context: session.discoveryContext,
    all_questions_covered: session.allQuestionsCovered,
    reminder_already_shown: session.reminderAlreadyShown ?? false,
  };
  const { error } = await supabase.from('sessions').upsert(row, {
    onConflict: 'id',
  });
  if (error) throw error;
}

export async function getInstanceStatus(
  supabase: SupabaseClient,
  instanceId: string
): Promise<InstanceStatus> {
  const latest = await getLatestSession(supabase, instanceId);
  return deriveStatus(latest);
}

export async function createSession(
  supabase: SupabaseClient,
  instanceId: string
): Promise<SessionRecord> {
  const session: SessionRecord = {
    id: generateId(),
    interviewInstanceId: instanceId,
    startedAt: new Date().toISOString(),
    messages: [],
    currentQuestionIndex: 0,
    coveredSubTopics: [],
    currentQuestionWordCount: 0,
    userRepliesForCurrentQuestion: 0,
    discoveryContext: {
      entities: [],
      timeline: [],
      entitySchemas: DEFAULT_ENTITY_SCHEMAS,
    },
    allQuestionsCovered: false,
    reminderAlreadyShown: false,
  };
  const { error } = await supabase.from('sessions').insert({
    id: session.id,
    interview_instance_id: session.interviewInstanceId,
    started_at: session.startedAt,
    messages: session.messages,
    current_question_index: session.currentQuestionIndex,
    covered_sub_topics: session.coveredSubTopics,
    current_question_word_count: session.currentQuestionWordCount,
    user_replies_for_current_question: session.userRepliesForCurrentQuestion,
    discovery_context: session.discoveryContext,
    all_questions_covered: session.allQuestionsCovered,
    reminder_already_shown: session.reminderAlreadyShown,
  });
  if (error) throw error;
  return session;
}

function rowToInstance(row: Record<string, unknown>): InterviewInstanceRecord {
  return {
    id: row.id as string,
    name: row.name as string,
    templateId: row.template_id as string | undefined,
    positionId: row.position_id as string | undefined,
    recipientName: row.recipient_name as string | undefined,
    shareableToken: row.shareable_token as string | undefined,
    questions: (row.questions as Question[]) ?? [],
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    intro: row.intro as string | undefined,
    conclusion: row.conclusion as string | undefined,
    reminder: row.reminder as string | undefined,
  };
}

function rowToSession(row: Record<string, unknown>): SessionRecord {
  return {
    id: row.id as string,
    interviewInstanceId: row.interview_instance_id as string,
    startedAt: (row.started_at as string) ?? new Date().toISOString(),
    messages: (row.messages as SessionRecord['messages']) ?? [],
    currentQuestionIndex: (row.current_question_index as number) ?? 0,
    coveredSubTopics: (row.covered_sub_topics as SessionRecord['coveredSubTopics']) ?? [],
    currentQuestionWordCount: (row.current_question_word_count as number) ?? 0,
    userRepliesForCurrentQuestion: (row.user_replies_for_current_question as number) ?? 0,
    discoveryContext: (row.discovery_context as SessionRecord['discoveryContext']) ?? {
      entities: [],
      timeline: [],
      entitySchemas: DEFAULT_ENTITY_SCHEMAS,
    },
    allQuestionsCovered: (row.all_questions_covered as boolean) ?? false,
    reminderAlreadyShown: (row.reminder_already_shown as boolean) ?? false,
  };
}
