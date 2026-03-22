'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Message, MessageRole, Question, DiscoveryContext } from '@/types';
import { DEFAULT_ENTITY_SCHEMAS } from '@/lib/entities/schemas';
import type { InterviewInstanceRecord, SessionRecord } from '@/types';
import MessageBubble from './MessageBubble';
import { TextToSpeech } from '@/lib/voice/textToSpeech';
import { SpeechToText } from '@/lib/voice/speechToText';

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
}

/** Hardcoded intro spoken via browser TTS immediately (no round trip) while session refetch + chat run. */
function getPreSpokenIntroText(instance: InterviewInstanceRecord): string {
  const recruiter = instance.recruiterName?.trim() || 'the hiring team';
  const company = instance.companyName?.trim() || 'the company';
  return `Hi, I'm Candice. I'm working with ${recruiter} at ${company} to help them work through a large list of candidates. The most qualified candidates will be passed along to ${recruiter} to continue to the next steps of the interview process.`;
}

/** Split text into sentences (by . ! ?) for chunked TTS. */
function splitSentences(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const parts = trimmed.split(/(?<=[.!?])\s+/);
  return parts.map((p) => p.trim()).filter(Boolean);
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface OrgData {
  companyName: string | null;
  hasLogo: boolean;
  privacyPolicyUrl: string | null;
}

interface CandidateChatProps {
  instance: InterviewInstanceRecord;
  session: SessionRecord;
  onSessionUpdate?: (session: SessionRecord) => void;
  /** When true, start camera+mic recording on mount (if interview not already completed); stop and upload on completion. */
  startRecording?: boolean;
  orgSettings?: OrgData | null;
}

/** Normalize messages from API (array or JSON string) to Message[]. */
function normalizeMessages(raw: unknown): Message[] {
  const arr = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? (() => {
          try {
            const p = JSON.parse(raw) as unknown;
            return Array.isArray(p) ? p : [];
          } catch (e) {
            console.warn('[CandidateChat normalizeMessages] JSON.parse failed', e);
            return [];
          }
        })()
      : [];
  const out: Message[] = arr.map((m: { role?: string; content?: string; timestamp?: string }) => ({
    role: (m.role === 'assistant' ? 'assistant' : 'user') as MessageRole,
    content: m.content ?? '',
    timestamp: m.timestamp ? new Date(m.timestamp) : undefined,
  }));
  console.log('[CandidateChat normalizeMessages]', {
    rawType: typeof raw,
    rawIsArray: Array.isArray(raw),
    rawLength: typeof raw === 'string' ? raw.length : Array.isArray(raw) ? raw.length : 'n/a',
    parsedLength: out.length,
  });
  return out;
}

export default function CandidateChat({ instance, session: initialSession, onSessionUpdate, startRecording = false, orgSettings }: CandidateChatProps) {
  const [messages, setMessages] = useState<Message[]>(() => normalizeMessages(initialSession.messages));
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialSession.currentQuestionIndex);
  const [coveredSubTopics, setCoveredSubTopics] = useState(initialSession.coveredSubTopics);
  const [currentQuestionWordCount, setCurrentQuestionWordCount] = useState(initialSession.currentQuestionWordCount);
  const [userRepliesForCurrentQuestion, setUserRepliesForCurrentQuestion] = useState(
    initialSession.userRepliesForCurrentQuestion
  );
  const [discoveryContext, setDiscoveryContext] = useState<DiscoveryContext>(initialSession.discoveryContext);
  const [allQuestionsCovered, setAllQuestionsCovered] = useState(initialSession.allQuestionsCovered);
  const [currentSession, setCurrentSession] = useState<SessionRecord>(initialSession);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceAvailable, setIsVoiceAvailable] = useState(false);
  /** True when interview video/audio is being recorded (camera+mic). */
  const [isInterviewRecording, setIsInterviewRecording] = useState(false);
  /** True when recording was paused (user can resume). */
  const [isInterviewRecordingPaused, setIsInterviewRecordingPaused] = useState(false);
  /** Ticker for elapsed time display; updates every second. */
  const [elapsedTick, setElapsedTick] = useState(() => Date.now());
  /** Typewriter: number of characters to show for the last assistant message (0 = not yet started). */
  const [typewriterLength, setTypewriterLength] = useState(0);
  /** Help/FAQ modal open state. */
  const [helpOpen, setHelpOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const ttsRef = useRef<TextToSpeech | null>(null);
  const sttRef = useRef<SpeechToText | null>(null);
  const loadTimeRef = useRef(Date.now());
  const elapsedAtLoad = initialSession.elapsedSeconds ?? 0;
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  /** Accumulated segments (one blob per recording run); concatenated and uploaded on each pause/completion. */
  const segmentsRef = useRef<Blob[]>([]);
  /** Why the recorder was stopped: 'pause' = show Resume; 'complete' = interview ended. */
  const recordingStopReasonRef = useRef<'pause' | 'complete'>('complete');
  const sessionIdRef = useRef<string>(currentSession.id);
  /** Length of the first sentence we spoke during streaming (so we can speak the remainder in chunks). */
  const firstSentenceLengthRef = useRef<number>(0);

  const questions = instance.questions;
  const voiceId = instance.voice ?? 'alloy';

  useEffect(() => {
    sessionIdRef.current = currentSession.id;
  }, [currentSession.id]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      ttsRef.current = new TextToSpeech();
      sttRef.current = new SpeechToText();
      setIsVoiceAvailable(sttRef.current?.isAvailable() ?? false);
      ttsRef.current.setVoiceByTtsId(voiceId);
    }
  }, [voiceId]);

  // Pre-warm TTS connection so the first real request is faster
  useEffect(() => {
    const t = setTimeout(() => {
      fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Hi', voice: voiceId }),
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [voiceId]);

  const uploadRecordingSegments = useCallback(
    (segments: Blob[], mimeType: string) => {
      if (segments.length === 0) return;
      const blob = new Blob(segments, { type: mimeType });
      const sessionId = sessionIdRef.current;
      console.log('[CandidateChat] recording upload starting', {
        instanceId: instance.id,
        segmentCount: segments.length,
        blobSizeBytes: blob.size,
        blobType: blob.type,
      });
      const headers: Record<string, string> = { 'Content-Type': blob.type || 'video/webm' };
      if (sessionId) headers['X-Recording-Session-Id'] = sessionId;
      fetch(`/api/instances/${instance.id}/recording`, { method: 'POST', headers, body: blob })
        .then((res) => {
          if (!res.ok) {
            return res.text().then((text) => {
              console.error('[CandidateChat] recording upload failed', { status: res.status, statusText: res.statusText, body: text });
            });
          }
          return res.json().then((data) => {
            console.log('[CandidateChat] recording upload success', data);
          });
        })
        .catch((err) => {
          console.error('[CandidateChat] recording upload error', err);
        });
    },
    [instance.id]
  );

  const startRecordingStream = useCallback(async () => {
    recordingChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      mediaStreamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const effectiveMime = recorder.mimeType || 'video/webm';

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordingChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const chunks = recordingChunksRef.current;
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;

        if (chunks.length > 0) {
          const segmentBlob = new Blob(chunks, { type: effectiveMime });
          segmentsRef.current = [...segmentsRef.current, segmentBlob];
          uploadRecordingSegments(segmentsRef.current, effectiveMime);
        } else {
          console.warn('[CandidateChat] recording onstop: no chunks for this segment');
        }

        if (recordingStopReasonRef.current === 'pause') {
          setIsInterviewRecordingPaused(true);
        }
        setIsInterviewRecording(false);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setIsInterviewRecording(true);
      setIsInterviewRecordingPaused(false);
    } catch (err) {
      console.warn('[CandidateChat] getUserMedia failed', err);
    }
  }, [uploadRecordingSegments]);

  const handlePauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state !== 'recording') return;
    recordingStopReasonRef.current = 'pause';
    mediaRecorderRef.current.stop();
  }, []);

  const handleResumeRecording = useCallback(() => {
    startRecordingStream();
  }, [startRecordingStream]);

  // Interview recording: start when startRecording is true and session not already completed.
  useEffect(() => {
    if (!startRecording || initialSession.allQuestionsCovered) return;

    let cancelled = false;
    segmentsRef.current = [];
    recordingStopReasonRef.current = 'complete';

    startRecordingStream().then(() => {
      if (cancelled) {
        if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
      }
    });

    return () => {
      cancelled = true;
      if (mediaRecorderRef.current?.state === 'recording') {
        recordingStopReasonRef.current = 'complete';
        mediaRecorderRef.current.stop();
      }
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- run only when startRecording/allQuestionsCovered change; startRecordingStream is stable for resume.
  }, [startRecording, initialSession.allQuestionsCovered]);

  // When interview completes, stop the recorder so onstop runs and uploads (replacing S3 object).
  useEffect(() => {
    if (!allQuestionsCovered || !mediaRecorderRef.current) return;
    if (mediaRecorderRef.current.state === 'recording') {
      recordingStopReasonRef.current = 'complete';
      mediaRecorderRef.current.stop();
    }
  }, [allQuestionsCovered]);

  /** Play one segment of TTS (API or browser) and return a Promise that resolves when playback ends. */
  const playSegment = useCallback(
    (text: string): Promise<void> => {
      const truncated = text.trim().slice(0, 4096);
      if (!truncated) return Promise.resolve();
      return new Promise((resolve) => {
        const done = () => resolve();
        fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: truncated, voice: voiceId }),
        })
          .then((res) => {
            if (!res.ok) throw new Error('TTS failed');
            return res.blob();
          })
          .then((blob) => {
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.onended = () => {
              URL.revokeObjectURL(url);
              done();
            };
            audio.onerror = () => {
              URL.revokeObjectURL(url);
              done();
            };
            return audio.play();
          })
          .then(() => {
            // Promise resolves in onended
          })
          .catch(() => {
            if (ttsRef.current?.isAvailable()) {
              ttsRef.current.speak(truncated);
              setTimeout(done, Math.max(truncated.length * 50, 2000));
            } else {
              done();
            }
          });
      });
    },
    [voiceId]
  );

  /** Speak text in sentence chunks with prefetch: fetches the next sentence while the current one plays. */
  const speakResponseChunked = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      ttsRef.current?.stop();
      const sentences = splitSentences(text);
      if (sentences.length === 0) {
        await playSegment(text);
        return;
      }

      const fetchBlob = (sentence: string): Promise<Blob | null> =>
        fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: sentence.trim().slice(0, 4096), voice: voiceId }),
        })
          .then((r) => (r.ok ? r.blob() : null))
          .catch(() => null);

      const playBlob = (blob: Blob): Promise<void> => {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        return new Promise((resolve) => {
          const cleanup = () => { URL.revokeObjectURL(url); resolve(); };
          audio.onended = cleanup;
          audio.onerror = cleanup;
          audio.play().catch(cleanup);
        });
      };

      // Kick off first fetch immediately
      let currentBlobPromise = fetchBlob(sentences[0]);

      for (let i = 0; i < sentences.length; i++) {
        // Start prefetching next sentence concurrently while we await current
        const nextBlobPromise = i + 1 < sentences.length ? fetchBlob(sentences[i + 1]) : null;

        const blob = await currentBlobPromise;
        if (blob) {
          await playBlob(blob);
        } else if (ttsRef.current?.isAvailable()) {
          ttsRef.current.speak(sentences[i]);
          await new Promise<void>((r) => setTimeout(r, Math.max(sentences[i].length * 50, 2000)));
        }

        if (nextBlobPromise) currentBlobPromise = nextBlobPromise;
      }
    },
    [voiceId, playSegment]
  );

  const getCurrentElapsedSeconds = useCallback(() => {
    return elapsedAtLoad + Math.floor((Date.now() - loadTimeRef.current) / 1000);
  }, [elapsedAtLoad]);

  useEffect(() => {
    const interval = setInterval(() => setElapsedTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const displayedElapsedSeconds = elapsedAtLoad + Math.floor((elapsedTick - loadTimeRef.current) / 1000);

  // Start the conversation with intro/first question when the session has no messages yet.
  // If the initial load returned 0 messages (e.g. stale read), re-fetch once before starting;
  // if the server has messages we hydrate from it and never overwrite the DB.
  // Pre-spoken intro: play a hardcoded greeting via browser TTS immediately (no round trip) while refetch + chat run.
  useEffect(() => {
    if (messages.length > 0 || questions.length === 0) return;

    let cancelled = false;
    setIsLoading(true);

    // Start pre-spoken intro immediately so voice begins while refetch and chat run
    const preSpokenIntro = getPreSpokenIntroText(instance);
    if (ttsRef.current?.isAvailable()) {
      ttsRef.current.speak(preSpokenIntro);
    }

    (async () => {
      try {
        const sessionRes = await fetch(`/api/instances/${instance.id}/session`);
        if (sessionRes.ok) {
          const { session: refetched } = await sessionRes.json();
          const refetchedMessages = Array.isArray(refetched?.messages)
            ? refetched.messages
            : typeof refetched?.messages === 'string'
              ? (() => {
                  try {
                    const p = JSON.parse(refetched.messages) as unknown;
                    return Array.isArray(p) ? p : [];
                  } catch {
                    return [];
                  }
                })()
              : [];
          if (refetchedMessages.length > 0 && !cancelled) {
            ttsRef.current?.stop(); // stop pre-spoken intro when hydrating existing session
            setMessages(
              refetchedMessages.map((m: { role?: string; content?: string; timestamp?: string }) => ({
                role: m.role ?? 'user',
                content: m.content ?? '',
                timestamp: m.timestamp ? new Date(m.timestamp) : undefined,
              }))
            );
            setCurrentQuestionIndex(refetched.currentQuestionIndex ?? 0);
            setCoveredSubTopics(refetched.coveredSubTopics ?? []);
            setCurrentQuestionWordCount(refetched.currentQuestionWordCount ?? 0);
            setUserRepliesForCurrentQuestion(refetched.userRepliesForCurrentQuestion ?? 0);
            if (refetched.discoveryContext) setDiscoveryContext(refetched.discoveryContext);
            setAllQuestionsCovered(refetched.allQuestionsCovered ?? false);
            setCurrentSession(refetched);
            if (!cancelled) setIsLoading(false);
            return;
          }
        }

        if (cancelled) return;

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [],
            currentQuestionIndex: 0,
            questions,
            coveredSubTopics: [],
            currentQuestionWordCount: 0,
            userRepliesForCurrentQuestion: 0,
            discoveryContext: currentSession.discoveryContext,
            includeDebug: false,
            intro: instance.intro,
            conclusion: instance.conclusion,
            reminder: instance.reminder,
            reminderAlreadyShown: currentSession.reminderAlreadyShown ?? false,
            stream: true,
          }),
        });

        if (!response.ok) throw new Error('Failed to start conversation');
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';
        let accumulatedContent = '';
        let firstSentenceSpoken = false;
        const firstSentencePattern = /^([^.!?]*[.!?])\s*/;
        let streamComplete = false;
        // Track first-sentence playback so the remainder waits for it to finish
        let firstSentencePlayback: Promise<void> | null = null;

        while (!streamComplete && !cancelled) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line) as { type: string; text?: string; result?: { response: string; discoveryContext?: DiscoveryContext; reminderShown?: boolean }; error?: string };
              if (parsed.type === 'delta' && typeof parsed.text === 'string') {
                accumulatedContent += parsed.text;
                const firstMessage: Message = {
                  role: 'assistant',
                  content: accumulatedContent,
                  timestamp: new Date(),
                };
                setMessages([firstMessage]);
                if (!firstSentenceSpoken) {
                  const match = accumulatedContent.match(firstSentencePattern);
                  if (match) {
                    firstSentenceSpoken = true;
                    const firstSentence = match[1].trim();
                    firstSentenceLengthRef.current = firstSentence.length;
                    // Stop any pre-spoken browser TTS, then play first sentence.
                    // Store the promise so the remainder waits for this to finish.
                    ttsRef.current?.stop();
                    firstSentencePlayback = playSegment(firstSentence);
                  }
                }
              } else if (parsed.type === 'done' && parsed.result) {
                const data = parsed.result;
                const fullContent = data.response ?? accumulatedContent;
                const firstMessage: Message = {
                  role: 'assistant',
                  content: fullContent,
                  timestamp: new Date(),
                };
                setMessages([firstMessage]);
                if (data.discoveryContext) setDiscoveryContext(data.discoveryContext);
                if (firstSentenceSpoken) {
                  const remainder = fullContent.slice(firstSentenceLengthRef.current).trim();
                  if (remainder) {
                    // Only start the remainder after the first sentence finishes playing
                    (firstSentencePlayback ?? Promise.resolve()).then(() => {
                      if (!cancelled) speakResponseChunked(remainder);
                    });
                  }
                } else {
                  speakResponseChunked(fullContent);
                }
                const updatedSession: SessionRecord = {
                  ...currentSession,
                  messages: [firstMessage].map((m) => ({
                    role: m.role,
                    content: m.content,
                    timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : undefined,
                  })),
                  currentQuestionIndex: 0,
                  reminderAlreadyShown: data.reminderShown ?? currentSession.reminderAlreadyShown,
                  elapsedSeconds: 0,
                };
                await persistSession(updatedSession);
                setCurrentSession(updatedSession);
                streamComplete = true;
                break;
              } else if (parsed.type === 'error') {
                throw new Error(parsed.error ?? 'Stream error');
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }

        if (cancelled) return;
      } catch (err) {
        if (!cancelled) {
          console.error('Error starting conversation:', err);
          alert('Failed to start conversation. Please refresh the page.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [speakResponseChunked, playSegment, instance]); // Run once on mount when messages are empty and questions exist

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Typewriter effect for the last assistant message (word-by-word)
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const lastIsAssistant = lastMessage?.role === 'assistant';
  const lastAssistantContent = lastIsAssistant ? lastMessage!.content : '';
  // Ref so the interval always reads the latest streamed content without re-running the effect
  const lastAssistantContentRef = useRef('');
  lastAssistantContentRef.current = lastAssistantContent;

  useEffect(() => {
    if (!lastIsAssistant) {
      setTypewriterLength(0);
      return;
    }
    setTypewriterLength(0);
    const wordDelayMs = 45;
    const intervalId = setInterval(() => {
      setTypewriterLength((prev) => {
        const content = lastAssistantContentRef.current;
        if (!content || prev >= content.length) return prev;
        const nextSpace = content.indexOf(' ', prev);
        const nextEnd = nextSpace === -1 ? content.length : nextSpace + 1;
        return Math.min(nextEnd, content.length);
      });
    }, wordDelayMs);
    // Show first word immediately
    setTypewriterLength(() => {
      const content = lastAssistantContentRef.current;
      if (!content) return 0;
      const nextSpace = content.indexOf(' ');
      return nextSpace === -1 ? content.length : nextSpace + 1;
    });
    return () => clearInterval(intervalId);
  // Only reset the typewriter when a genuinely new message is added, not on streaming updates
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, lastIsAssistant]);

  // When the last message content changes (new message), we already reset in the effect above.
  // Ensure we never show more than current message length in case of rapid updates.
  const displayedLastContent =
    lastIsAssistant && lastAssistantContent
      ? lastAssistantContent.slice(0, typewriterLength)
      : null;

  const persistSession = async (nextSession: SessionRecord) => {
    setCurrentSession(nextSession);
    onSessionUpdate?.(nextSession);
    try {
      const res = await fetch(`/api/instances/${instance.id}/session`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextSession),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('[CandidateChat] persistSession failed', { status: res.status, body: text });
      } else {
        console.log('[CandidateChat] persistSession ok', { messageCount: nextSession.messages?.length ?? 0 });
      }
    } catch (err) {
      console.error('[CandidateChat] persistSession error', err);
    }
  };

  const handleSendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return;

    const updatedMessages: Message[] = [
      ...messages,
      { role: 'user', content: userMessage.trim(), timestamp: new Date() },
    ];
    setMessages(updatedMessages);
    setIsLoading(true);

    const newRepliesCount = userRepliesForCurrentQuestion + 1;
    const wordCount = countWords(userMessage);
    const newWordCount = currentQuestionWordCount + wordCount;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          currentQuestionIndex,
          questions,
          coveredSubTopics,
          currentQuestionWordCount: newWordCount,
          userRepliesForCurrentQuestion: newRepliesCount,
          discoveryContext,
          includeDebug: false,
          intro: instance.intro,
          conclusion: instance.conclusion,
          reminder: instance.reminder,
          reminderAlreadyShown: currentSession.reminderAlreadyShown ?? false,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages([...updatedMessages, assistantMsg]);
      if (data.discoveryContext) setDiscoveryContext(data.discoveryContext);

      if (data.questionCovered) {
        setUserRepliesForCurrentQuestion(0);
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          setCurrentQuestionWordCount(0);
        } else {
          setAllQuestionsCovered(true);
        }
      } else {
        setUserRepliesForCurrentQuestion(newRepliesCount);
        setCurrentQuestionWordCount(newWordCount);
      }
      if (data.allQuestionsCovered) setAllQuestionsCovered(true);

      speakResponseChunked(data.response);

      const nextIndex =
        data.questionCovered && currentQuestionIndex < questions.length - 1
          ? currentQuestionIndex + 1
          : currentQuestionIndex;
      const nextSession: SessionRecord = {
        ...currentSession,
        messages: [...updatedMessages, assistantMsg].map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : (m.timestamp as string | undefined),
        })),
        currentQuestionIndex: nextIndex,
        currentQuestionWordCount:
          data.questionCovered && currentQuestionIndex < questions.length - 1 ? 0 : newWordCount,
        userRepliesForCurrentQuestion: data.questionCovered ? 0 : newRepliesCount,
        discoveryContext: data.discoveryContext ?? discoveryContext,
        allQuestionsCovered: !!data.allQuestionsCovered,
        reminderAlreadyShown: data.reminderShown ?? currentSession.reminderAlreadyShown,
        elapsedSeconds: getCurrentElapsedSeconds(),
      };
      await persistSession(nextSession);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (!sttRef.current?.isAvailable()) {
      alert('Voice input is not supported. Please type your response.');
      return;
    }
    if (isRecording) {
      sttRef.current.stop();
      setIsRecording(false);
      return;
    }
    setIsRecording(true);
    sttRef.current.startManualStop(
      (transcript) => {
        setIsRecording(false);
        if (transcript.trim()) {
          handleSendMessage(transcript);
        }
      },
      (error) => {
        setIsRecording(false);
        alert(error);
      }
    );
  };

  const handleTextInput = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const textarea = e.currentTarget;
      if (textarea.value.trim()) {
        handleSendMessage(textarea.value);
        textarea.value = '';
      }
    }
  };

  const faqItems = [
    {
      q: 'Is this a real interview?',
      a: `Yes. Candice is an AI assistant conducting a real screening interview on behalf of ${instance.companyName || 'the hiring team'}. Your responses are reviewed by the recruiting team.`,
    },
    {
      q: 'Can I start over?',
      a: 'You cannot restart the interview yourself. If you encountered a technical issue, please reach out to the recruiter who sent you the link.',
    },
    {
      q: 'How can I learn more about the role?',
      a: `Check the company's website or reply to the email you received from the recruiter${instance.recruiterName ? ` (${instance.recruiterName})` : ''}. Candice is focused on the interview itself and cannot answer detailed questions about compensation or team structure.`,
    },
    {
      q: 'When can I expect to hear back?',
      a: 'Typically within a few business days of completing the interview. The hiring team will review your responses and follow up directly.',
    },
    {
      q: 'What happens with my responses?',
      a: 'Your answers and the interview transcript are shared only with the hiring team at the company that invited you. They are used solely for candidate evaluation.',
    },
    {
      q: 'Can I type instead of speaking?',
      a: 'Absolutely. You can type your answers in the text box at the bottom of the screen. Press Enter to send, or Shift+Enter for a new line.',
    },
  ];

  return (
    <>
      <div className="font-landing flex flex-col h-screen bg-landing-bg">
        {/* Interview-specific header: Candice logo, company + job title, recording controls, timer, help */}
        <header className="bg-landing-bg border-b border-landing-border px-4 py-3 flex-shrink-0">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {/* Candice AI brand */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[#3ECF8E]"
                  aria-hidden
                >
                  <path d="M2 13a2 2 0 0 0 2-2V7a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0V4a2 2 0 0 1 4 0v13a2 2 0 0 0 4 0v-4a2 2 0 0 1 2-2" />
                </svg>
                <span className="text-sm font-semibold text-landing-heading whitespace-nowrap">Candice AI</span>
              </div>
              {/* Divider + company logo + company/job info */}
              {(orgSettings?.companyName || orgSettings?.hasLogo || instance.companyName || instance.name) && (
                <>
                  <span className="text-landing-border select-none hidden sm:block">|</span>
                  <div className="flex items-center gap-2 min-w-0 hidden sm:flex">
                    {orgSettings?.hasLogo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/org/logo/${instance.orgId}`}
                        alt={orgSettings.companyName ?? instance.companyName ?? 'Company logo'}
                        className="h-7 w-auto object-contain flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                    {(orgSettings?.companyName || instance.companyName) && (
                      <p className="text-xs font-medium text-landing-muted uppercase tracking-widest truncate leading-none">
                        {orgSettings?.companyName ?? instance.companyName}
                      </p>
                    )}
                    <p className="text-sm font-medium text-landing-heading truncate leading-snug">
                      {instance.name}
                    </p>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isInterviewRecording && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-red-500" role="status" aria-live="polite">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  Rec
                </span>
              )}
              {isInterviewRecording && !isInterviewRecordingPaused && (
                <button
                  type="button"
                  onClick={handlePauseRecording}
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50"
                >
                  Pause
                </button>
              )}
              {isInterviewRecordingPaused && (
                <button
                  type="button"
                  onClick={handleResumeRecording}
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-[#3ECF8E]/10 text-[#2dbe7e] hover:bg-[#3ECF8E]/20"
                >
                  Resume
                </button>
              )}
              <div className="text-sm font-medium text-landing-muted tabular-nums" aria-label="Elapsed time">
                {formatElapsed(displayedElapsedSeconds)}
              </div>
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-landing-border text-landing-muted hover:text-landing-heading hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                aria-label="Help and FAQ"
              >
                Help
              </button>
            </div>
          </div>
        </header>

        {isRecording && (
          <div className="bg-red-600 text-white px-4 py-2.5 flex items-center justify-center gap-3 flex-shrink-0 text-sm" role="status" aria-live="polite">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
            </span>
            <span className="font-semibold">Listening…</span>
            <span className="text-red-200">Click Stop when finished.</span>
          </div>
        )}

        {/* Scrollable messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto w-full">
            {messages.length === 0 && !isLoading && (
              <div className="text-center text-landing-muted mt-8 text-sm">
                Starting conversation…
              </div>
            )}
            {messages.map((message, index) => {
              const isLastAssistant =
                index === messages.length - 1 && message.role === 'assistant';
              const content =
                isLastAssistant && displayedLastContent !== null
                  ? displayedLastContent
                  : message.content;
              return (
                <MessageBubble
                  key={index}
                  message={{ ...message, content }}
                />
              );
            })}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] text-landing-muted rounded-lg px-4 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="animate-pulse">●</div>
                    <span>Thinking…</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input bar — anchored to bottom */}
        <div className="flex-shrink-0 bg-landing-bg border-t border-landing-border px-4 py-3">
          <div className="max-w-3xl mx-auto">

            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                onKeyDown={handleTextInput}
                placeholder={
                  isRecording
                    ? 'Listening…'
                    : isVoiceAvailable
                    ? 'Type or use voice…'
                    : 'Type your response…'
                }
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-[#2a2a2a] dark:bg-[#1c1c1c] dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3ECF8E] resize-none text-gray-900 text-sm leading-5"
                rows={1}
                disabled={isLoading || isRecording}
              />
              {isVoiceAvailable && (
                <button
                  onClick={handleVoiceInput}
                  disabled={isLoading}
                  className={`px-5 py-3 rounded-lg font-medium text-sm transition-colors flex-shrink-0 ${
                    isRecording
                      ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse'
                      : 'bg-[#3ECF8E] text-white hover:bg-[#2dbe7e]'
                  }`}
                >
                  {isRecording ? 'Stop' : '🎤 Voice'}
                </button>
              )}
              <button
                onClick={() => {
                  const textarea = inputRef.current;
                  if (textarea?.value.trim()) {
                    handleSendMessage(textarea.value);
                    textarea.value = '';
                  }
                }}
                disabled={isLoading || isRecording}
                className="px-5 py-3 bg-[#3ECF8E] text-white rounded-lg hover:bg-[#2dbe7e] transition-colors font-medium text-sm disabled:bg-gray-300 disabled:cursor-not-allowed flex-shrink-0"
              >
                Send
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-landing-muted">
              <a
                href={orgSettings?.privacyPolicyUrl ?? '/privacy'}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                Privacy policy
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Help / FAQ modal */}
      {helpOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setHelpOpen(false); }}
        >
          <div className="bg-white dark:bg-[#1c1c1c] rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-landing-heading">Help &amp; FAQ</h2>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="text-landing-muted hover:text-landing-heading transition-colors text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="space-y-5">
              {faqItems.map(({ q, a }) => (
                <div key={q}>
                  <p className="text-sm font-semibold text-landing-heading">{q}</p>
                  <p className="mt-1 text-sm text-landing-muted leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setHelpOpen(false)}
              className="mt-6 w-full py-2.5 rounded-lg bg-[#3ECF8E] text-white font-medium text-sm hover:bg-[#2dbe7e] transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
