export type MessageRole = 'user' | 'assistant';

export interface Message {
  role: MessageRole;
  content: string;
  timestamp?: Date;
}

export interface ChatResponse {
  response: string;
  questionCovered: boolean;
  allQuestionsCovered: boolean;
}

export interface BiographyResponse {
  biography: string;
}

export type InterviewMode = 1 | 2 | 3 | 4 | 5;

export interface SubTopic {
  name: string;
  required: boolean;
}

export interface Question {
  mainQuestion: string;
  subTopics: SubTopic[];
  wordCountThreshold?: number; // For optional sub-topics
  /** 1=screening, 2=hints, 3=list only, 4=biographer, 5=contradiction check. Default 4. */
  mode?: InterviewMode;
  /** Mode 1 & 2: valid answers (e.g. ["yes", "yeah"]). */
  acceptableAnswers?: string[];
  /** Mode 2 & 3: optional hint or single follow-up (e.g. "Where, when and how long?"). */
  followUpPrompt?: string;
  /** Mode 1 & 2: when answer is correct, use this instead of "That's correct" (e.g. "Great, because this job does not offer visa sponsorships. Let's move on."). */
  correctReply?: string;
  /** Mode 1 & 2: when answer is wrong, use this instead of "That's not quite right" (optional). */
  incorrectReply?: string;
}

export interface QuestionConfig {
  questions: Question[];
}

export interface InterviewTemplate {
  id: string;
  /** Clerk org id; undefined/null = standard (shared) template. */
  orgId?: string;
  name: string;
  questions: Question[];
  /** Optional intro before the first question (e.g. screening). */
  intro?: string;
  /** Optional conclusion after all questions (e.g. "We'll be in touch by X date"). */
  conclusion?: string;
  /** Optional reminder shown once when interviewee dismisses the interview (e.g. "idk this is stupid"). */
  reminder?: string;
  /** TTS voice id (e.g. OpenAI: alloy, echo, fable, onyx, nova, shimmer). Used for /api/tts and browser TTS mapping. */
  voice?: string;
}

// Persistence: interview instances and sessions (localStorage-friendly; dates as ISO strings)
export interface StoredMessage {
  role: MessageRole;
  content: string;
  timestamp?: string;
}

/** Position: job opening or project (e.g. "Janitor at Company X", "Biography for Grandma Betty"). */
export type PositionType = 'job' | 'biography' | 'screening';

export interface PositionRecord {
  id: string;
  orgId: string;
  name: string;
  type?: PositionType;
  /** Links to the interview definition (template) used for this position. */
  templateId?: string;
  createdAt: string; // ISO
}

/** One candidate's or person's run (one interview instance). */
export interface InterviewInstanceRecord {
  id: string;
  orgId: string;
  name: string;
  templateId?: string;
  /** Optional link to a position (e.g. job opening or biography project). */
  positionId?: string;
  /** Name of the candidate/person this instance is for (set when admin generates for recipient). */
  recipientName?: string;
  /** Unique token for the candidate URL; used in /interview/[token]. */
  shareableToken?: string;
  questions: Question[];
  createdAt: string; // ISO
  intro?: string;
  conclusion?: string;
  reminder?: string;
  /** TTS voice id (e.g. OpenAI: alloy, echo, fable, onyx, nova, shimmer). Copied from template on create; optional override. */
  voice?: string;
}

/** One sitting / one continuous conversation. */
export interface SessionRecord {
  id: string;
  interviewInstanceId: string;
  startedAt: string; // ISO
  messages: StoredMessage[];
  currentQuestionIndex: number;
  coveredSubTopics: Array<{ questionIndex: number; subTopicIndex: number }>;
  currentQuestionWordCount: number;
  userRepliesForCurrentQuestion: number;
  discoveryContext: DiscoveryContext;
  allQuestionsCovered: boolean;
  /** True after the disengagement reminder has been shown once this session. */
  reminderAlreadyShown?: boolean;
  /** Total elapsed seconds in this session; updated on each text submit and voice end. */
  elapsedSeconds?: number;
  /** S3 object key for the interview recording (video/audio), set after upload on completion. */
  recordingKey?: string;
}

// Entity Schema System
export interface EntityAttribute {
  name: string;
  required: boolean;
  type: 'string' | 'number' | 'date' | 'text';
  description: string;
}

export interface EntitySchema {
  entityType: string; // e.g., 'sibling', 'pet', 'friend', 'school', 'job'
  attributes: EntityAttribute[];
}

// Discovered Entity Instance
export interface EntityInstance {
  id: string;
  entityType: string;
  attributes: Record<string, any>; // attribute name -> value
  discoveredAt: string; // timestamp or message index
  lastUpdated: string;
}

// Timeline Event
export interface TimelineEvent {
  id: string;
  eventType: string; // e.g., 'move', 'birth', 'marriage', 'graduation'
  description: string;
  date?: string; // ISO date string or relative date
  datePrecision?: 'exact' | 'year' | 'decade' | 'relative';
  context?: string; // Additional context about the event
  discoveredAt: string;
  relatedEntities?: string[]; // IDs of related entities
}

// Discovery Context
export interface DiscoveryContext {
  entities: EntityInstance[];
  timeline: TimelineEvent[];
  entitySchemas: EntitySchema[];
}

