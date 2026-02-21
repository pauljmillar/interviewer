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
  }
): Promise<{ instance: InterviewInstanceRecord; shareableToken: string }> {
  const id = generateId();
  const shareableToken = generateToken();
  const instance: InterviewInstanceRecord = {
    id,
    orgId,
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
    org_id: orgId,
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
    elapsedSeconds: 0,
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
    elapsed_seconds: 0,
  });
  if (sessErr) throw sessErr;

  return { instance, shareableToken };
}

/** If orgId is provided, only return instance when it belongs to that org (admin). */
export async function getInstanceById(
  supabase: SupabaseClient,
  id: string,
  orgId?: string
): Promise<InterviewInstanceRecord | undefined> {
  let q = supabase.from('interview_instances').select('*').eq('id', id);
  if (orgId != null) q = q.eq('org_id', orgId);
  const { data, error } = await q.single();
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
  orgId: string,
  positionId?: string
): Promise<(InterviewInstanceRecord & { status: InstanceStatus })[]> {
  let q = supabase
    .from('interview_instances')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
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
  const sessions = await getSessions(supabase, instanceId);
  if (sessions.length === 0) return undefined;

  // Return the session with the most messages so we never show an empty session
  // when a session with progress exists (avoids duplicate-session + replica lag issues).
  const byMessageCount = [...sessions].sort(
    (a, b) => (b.messages?.length ?? 0) - (a.messages?.length ?? 0)
  );
  const chosen = byMessageCount[0];
  console.log('[supabase getLatestSession]', {
    instanceId,
    sessionCount: sessions.length,
    chosenSessionId: chosen.id,
    chosenMessageCount: chosen.messages?.length ?? 0,
    allCounts: sessions.map((s) => ({ id: s.id.slice(-8), n: s.messages?.length ?? 0 })),
  });
  return chosen;
}

export async function saveSession(
  supabase: SupabaseClient,
  session: SessionRecord
): Promise<void> {
  // Use update().eq() so all columns (including JSONB messages) are written.
  // Ensure messages is an array; JSONB can reject or mis-store if sent as string.
  const messages = Array.isArray(session.messages) ? session.messages : [];
  const row = {
    interview_instance_id: session.interviewInstanceId,
    started_at: session.startedAt,
    messages,
    current_question_index: session.currentQuestionIndex,
    covered_sub_topics: session.coveredSubTopics,
    current_question_word_count: session.currentQuestionWordCount,
    user_replies_for_current_question: session.userRepliesForCurrentQuestion,
    discovery_context: session.discoveryContext,
    all_questions_covered: session.allQuestionsCovered,
    reminder_already_shown: session.reminderAlreadyShown ?? false,
    elapsed_seconds: session.elapsedSeconds ?? 0,
  };
  const { data: updated, error } = await supabase
    .from('sessions')
    .update(row)
    .eq('id', session.id)
    .select('id, messages')
    .single();
  if (error) throw error;
  const msgCount = Array.isArray(updated?.messages) ? (updated as { messages: unknown[] }).messages.length : 0;
  console.log('[supabase saveSession] after update', {
    sessionId: session.id,
    rowsReturned: updated ? 1 : 0,
    messagesLength: msgCount,
  });
  if (!updated) {
    console.warn('[supabase saveSession] update matched 0 rows – session may not exist or RLS blocked');
  }
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
    elapsedSeconds: 0,
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
    elapsed_seconds: 0,
  });
  if (error) throw error;
  return session;
}

function rowToInstance(row: Record<string, unknown>): InterviewInstanceRecord {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
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

/** JSONB can come back as a string from Postgres/PostgREST in some cases; normalize to array. */
function parseMessages(raw: unknown): SessionRecord['messages'] {
  const out =
    Array.isArray(raw)
      ? (raw as SessionRecord['messages'])
      : typeof raw === 'string'
        ? (() => {
            try {
              const parsed = JSON.parse(raw) as unknown;
              return Array.isArray(parsed) ? (parsed as SessionRecord['messages']) : [];
            } catch (e) {
              console.warn('[supabase parseMessages] JSON.parse failed', e);
              return [];
            }
          })()
        : [];
  console.log('[supabase parseMessages]', {
    rawType: typeof raw,
    rawIsArray: Array.isArray(raw),
    rawLength: typeof raw === 'string' ? raw.length : Array.isArray(raw) ? raw.length : 'n/a',
    parsedLength: out.length,
    rawPreview:
      typeof raw === 'string' ? raw.slice(0, 80) + (raw.length > 80 ? '...' : '') : undefined,
  });
  return out;
}

function rowToSession(row: Record<string, unknown>): SessionRecord {
  return {
    id: row.id as string,
    interviewInstanceId: row.interview_instance_id as string,
    startedAt: (row.started_at as string) ?? new Date().toISOString(),
    messages: parseMessages(row.messages),
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
    elapsedSeconds: (row.elapsed_seconds as number) ?? 0,
  };
}
