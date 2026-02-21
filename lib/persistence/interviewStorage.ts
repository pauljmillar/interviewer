import {
  InterviewInstanceRecord,
  SessionRecord,
  PositionRecord,
  PositionType,
  Question,
  DiscoveryContext,
  StoredMessage,
} from '@/types';
import { DEFAULT_ENTITY_SCHEMAS } from '@/lib/entities/schemas';

const INSTANCES_KEY = 'interviewer_interviews';
const SESSIONS_KEY_PREFIX = 'interviewer_sessions_';
const POSITIONS_KEY = 'interviewer_positions';

function safeParse<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch (e) {
    console.warn('interviewStorage: failed to write', key, e);
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function normalizeSession(s: SessionRecord & { interviewId?: string }): SessionRecord {
  return {
    ...s,
    interviewInstanceId: s.interviewInstanceId ?? s.interviewId ?? '',
  };
}

// --- Positions ---
export function getPositions(): PositionRecord[] {
  return safeParse<PositionRecord[]>(POSITIONS_KEY, []);
}

export function getPosition(id: string): PositionRecord | undefined {
  return getPositions().find((p) => p.id === id);
}

export function savePosition(position: PositionRecord): void {
  const list = getPositions();
  const idx = list.findIndex((p) => p.id === position.id);
  const next = idx >= 0 ? list.map((p, i) => (i === idx ? position : p)) : [...list, position];
  safeSet(POSITIONS_KEY, JSON.stringify(next));
}

export function createPosition(params: {
  name: string;
  type?: PositionType;
  templateId?: string;
}): PositionRecord {
  const position: PositionRecord = {
    id: generateId(),
    name: params.name,
    type: params.type,
    templateId: params.templateId,
    createdAt: new Date().toISOString(),
  };
  savePosition(position);
  return position;
}

export function deletePosition(id: string): void {
  const list = getPositions().filter((p) => p.id !== id);
  safeSet(POSITIONS_KEY, JSON.stringify(list));
}

// --- Interview instances ---
export function getInterviewInstances(): InterviewInstanceRecord[] {
  return safeParse<InterviewInstanceRecord[]>(INSTANCES_KEY, []);
}

export function getInterviewInstance(id: string): InterviewInstanceRecord | undefined {
  return getInterviewInstances().find((i) => i.id === id);
}

export function saveInterviewInstance(instance: InterviewInstanceRecord): void {
  const list = getInterviewInstances();
  const idx = list.findIndex((i) => i.id === instance.id);
  const next = idx >= 0 ? list.map((item, i) => (i === idx ? instance : item)) : [...list, instance];
  safeSet(INSTANCES_KEY, JSON.stringify(next));
}

export function createInterviewInstance(params: {
  name: string;
  templateId?: string;
  positionId?: string;
  questions: Question[];
  intro?: string;
  conclusion?: string;
  reminder?: string;
}): InterviewInstanceRecord {
  const instance: InterviewInstanceRecord = {
    id: generateId(),
    name: params.name,
    templateId: params.templateId,
    positionId: params.positionId,
    questions: params.questions,
    createdAt: new Date().toISOString(),
    intro: params.intro,
    conclusion: params.conclusion,
    reminder: params.reminder,
  };
  saveInterviewInstance(instance);
  return instance;
}

export function deleteInterviewInstance(id: string): void {
  const list = getInterviewInstances().filter((i) => i.id !== id);
  safeSet(INSTANCES_KEY, JSON.stringify(list));
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(SESSIONS_KEY_PREFIX + id);
  }
}

export function getSessions(interviewInstanceId: string): SessionRecord[] {
  const raw = safeParse<(SessionRecord & { interviewId?: string })[]>(
    SESSIONS_KEY_PREFIX + interviewInstanceId,
    []
  );
  return raw.map(normalizeSession);
}

export function getSession(interviewInstanceId: string, sessionId: string): SessionRecord | undefined {
  return getSessions(interviewInstanceId).find((s) => s.id === sessionId);
}

export function getLatestSession(interviewInstanceId: string): SessionRecord | undefined {
  const sessions = getSessions(interviewInstanceId);
  return sessions.length > 0 ? sessions[sessions.length - 1] : undefined;
}

export function saveSession(session: SessionRecord): void {
  const list = getSessions(session.interviewInstanceId);
  const idx = list.findIndex((s) => s.id === session.id);
  const next = idx >= 0 ? list.map((s, i) => (i === idx ? session : s)) : [...list, session];
  safeSet(SESSIONS_KEY_PREFIX + session.interviewInstanceId, JSON.stringify(next));
}

export function createSession(
  interviewInstanceId: string,
  initialState: {
    messages?: StoredMessage[];
    currentQuestionIndex?: number;
    coveredSubTopics?: Array<{ questionIndex: number; subTopicIndex: number }>;
    currentQuestionWordCount?: number;
    userRepliesForCurrentQuestion?: number;
    discoveryContext?: DiscoveryContext;
    allQuestionsCovered?: boolean;
    reminderAlreadyShown?: boolean;
  } = {}
): SessionRecord {
  const session: SessionRecord = {
    id: generateId(),
    interviewInstanceId,
    startedAt: new Date().toISOString(),
    messages: initialState.messages ?? [],
    currentQuestionIndex: initialState.currentQuestionIndex ?? 0,
    coveredSubTopics: initialState.coveredSubTopics ?? [],
    currentQuestionWordCount: initialState.currentQuestionWordCount ?? 0,
    userRepliesForCurrentQuestion: initialState.userRepliesForCurrentQuestion ?? 0,
    discoveryContext: initialState.discoveryContext ?? {
      entities: [],
      timeline: [],
      entitySchemas: DEFAULT_ENTITY_SCHEMAS,
    },
    allQuestionsCovered: initialState.allQuestionsCovered ?? false,
    reminderAlreadyShown: initialState.reminderAlreadyShown ?? false,
  };
  saveSession(session);
  return session;
}
