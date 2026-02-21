import {
  InterviewInstanceRecord,
  SessionRecord,
  Question,
} from '@/types';
import { DEFAULT_ENTITY_SCHEMAS } from '@/lib/entities/schemas';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export type InstanceStatus = 'not_started' | 'started' | 'completed';

// In-memory server store for shareable instances and their sessions.
// Persisted to a JSON file so data survives server restarts.
const instancesById = new Map<string, InterviewInstanceRecord>();
const instancesByToken = new Map<string, string>(); // token -> instanceId
const sessionsByInstanceId = new Map<string, SessionRecord[]>();

const DATA_DIR = path.join(process.cwd(), '.data');
const STORE_FILE = path.join(DATA_DIR, 'instances.json');

type StoreSnapshot = {
  instances: InterviewInstanceRecord[];
  sessions: Record<string, SessionRecord[]>;
};

function load(): void {
  try {
    const raw = fs.readFileSync(STORE_FILE, 'utf-8');
    const data = JSON.parse(raw) as StoreSnapshot;
    instancesById.clear();
    instancesByToken.clear();
    sessionsByInstanceId.clear();
    (data.instances ?? []).forEach((inst) => {
      instancesById.set(inst.id, inst);
      if (inst.shareableToken) instancesByToken.set(inst.shareableToken, inst.id);
    });
    Object.entries(data.sessions ?? {}).forEach(([instanceId, list]) => {
      sessionsByInstanceId.set(instanceId, Array.isArray(list) ? list : []);
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      console.warn('instanceStore: load failed', err);
    }
  }
}

function persist(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const instances = Array.from(instancesById.values());
    const sessions: Record<string, SessionRecord[]> = {};
    sessionsByInstanceId.forEach((list, id) => {
      sessions[id] = list;
    });
    fs.writeFileSync(STORE_FILE, JSON.stringify({ instances, sessions }, null, 2), 'utf-8');
  } catch (err) {
    console.warn('instanceStore: persist failed', err);
  }
}

// Load from disk when this module is first used (API route runs in Node)
load();

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function generateToken(): string {
  return crypto.randomBytes(10).toString('base64url');
}

function deriveStatus(instanceId: string): InstanceStatus {
  const sessions = sessionsByInstanceId.get(instanceId) ?? [];
  const latest = sessions.length > 0 ? sessions[sessions.length - 1] : undefined;
  if (!latest || latest.messages.length === 0) return 'not_started';
  if (latest.allQuestionsCovered) return 'completed';
  return 'started';
}

export function createInstance(
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
): { instance: InterviewInstanceRecord; shareableToken: string } {
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
  instancesById.set(id, instance);
  instancesByToken.set(shareableToken, id);
  sessionsByInstanceId.set(id, []);
  persist();
  return { instance, shareableToken };
}

export function getInstanceById(id: string): InterviewInstanceRecord | undefined {
  return instancesById.get(id);
}

export function getInstanceByToken(token: string): InterviewInstanceRecord | undefined {
  const id = instancesByToken.get(token);
  return id ? instancesById.get(id) : undefined;
}

export function getAllInstances(): (InterviewInstanceRecord & { status: InstanceStatus })[] {
  const list = Array.from(instancesById.values());
  return list.map((inst) => ({ ...inst, status: deriveStatus(inst.id) }));
}

export function getSessions(instanceId: string): SessionRecord[] {
  return sessionsByInstanceId.get(instanceId) ?? [];
}

export function getLatestSession(instanceId: string): SessionRecord | undefined {
  const sessions = getSessions(instanceId);
  return sessions.length > 0 ? sessions[sessions.length - 1] : undefined;
}

export function saveSession(session: SessionRecord): void {
  const list = getSessions(session.interviewInstanceId);
  const idx = list.findIndex((s) => s.id === session.id);
  const next =
    idx >= 0 ? list.map((s, i) => (i === idx ? session : s)) : [...list, session];
  sessionsByInstanceId.set(session.interviewInstanceId, next);
  persist();
}

export function getInstanceStatus(instanceId: string): InstanceStatus {
  return deriveStatus(instanceId);
}

/** Create a new empty session for an instance. Caller should then saveSession after filling. */
export function createSession(instanceId: string): SessionRecord {
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
  saveSession(session);
  return session;
}
