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

interface CandidateChatProps {
  instance: InterviewInstanceRecord;
  session: SessionRecord;
  onSessionUpdate?: (session: SessionRecord) => void;
  /** When true, start camera+mic recording on mount (if interview not already completed); stop and upload on completion. */
  startRecording?: boolean;
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

export default function CandidateChat({ instance, session: initialSession, onSessionUpdate, startRecording = false }: CandidateChatProps) {
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

  /** Speak using OpenAI TTS (same as template sample); fall back to browser TTS if API fails. */
  const speakResponse = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      // Cancel any pre-spoken intro (or other ongoing speech) before playing this response
      ttsRef.current?.stop();
      const truncated = text.trim().slice(0, 4096);
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: truncated, voice: voiceId }),
        });
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.onended = () => URL.revokeObjectURL(url);
          audio.onerror = () => URL.revokeObjectURL(url);
          await audio.play();
          return;
        }
      } catch {
        // fall through to browser TTS
      }
      if (ttsRef.current?.isAvailable()) {
        ttsRef.current.speak(truncated);
      }
    },
    [voiceId]
  );

  /** Speak text in sentence chunks: first segment plays immediately, rest queue. */
  const speakResponseChunked = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      ttsRef.current?.stop();
      const sentences = splitSentences(text);
      if (sentences.length === 0) {
        await playSegment(text);
        return;
      }
      for (const sentence of sentences) {
        await playSegment(sentence);
      }
    },
    [playSegment]
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
                    speakResponse(firstSentence);
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
                  if (remainder) speakResponseChunked(remainder);
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
  }, [speakResponse, speakResponseChunked, instance]); // Run once on mount when messages are empty and questions exist

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Typewriter effect for the last assistant message (word-by-word)
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const lastIsAssistant = lastMessage?.role === 'assistant';
  const lastAssistantContent = lastIsAssistant ? lastMessage!.content : '';

  useEffect(() => {
    if (!lastIsAssistant || !lastAssistantContent) {
      setTypewriterLength(0);
      return;
    }
    setTypewriterLength(0);
    const fullLength = lastAssistantContent.length;
    const wordDelayMs = 45;
    let intervalId: ReturnType<typeof setInterval>;

    const advance = () => {
      setTypewriterLength((prev) => {
        if (prev >= fullLength) {
          clearInterval(intervalId);
          return prev;
        }
        const nextSpace = lastAssistantContent.indexOf(' ', prev);
        const nextEnd = nextSpace === -1 ? fullLength : nextSpace + 1;
        return Math.min(nextEnd, fullLength);
      });
    };

    advance(); // show first word immediately
    intervalId = setInterval(advance, wordDelayMs);
    return () => clearInterval(intervalId);
  }, [messages.length, lastIsAssistant, lastAssistantContent]);

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

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="flex flex-col flex-1 min-h-0">
        <header className="bg-white border-b shadow-sm p-4 flex-shrink-0">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <h1 className="text-xl font-bold text-gray-800">
              {instance.name}
            </h1>
            <div className="flex items-center gap-3">
              {isInterviewRecording && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-red-600" role="status" aria-live="polite">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" />
                  </span>
                  Recording
                </span>
              )}
              {isInterviewRecording && !isInterviewRecordingPaused && (
                <button
                  type="button"
                  onClick={handlePauseRecording}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-amber-100 text-amber-800 hover:bg-amber-200"
                >
                  Pause recording
                </button>
              )}
              {isInterviewRecordingPaused && (
                <button
                  type="button"
                  onClick={handleResumeRecording}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-green-100 text-green-800 hover:bg-green-200"
                >
                  Resume recording
                </button>
              )}
              <div className="text-sm font-medium text-gray-500 tabular-nums" aria-label="Elapsed time">
                {formatElapsed(displayedElapsedSeconds)}
              </div>
            </div>
          </div>
        </header>

        {isRecording && (
          <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-center gap-3 flex-shrink-0" role="status" aria-live="polite">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
            </span>
            <span className="font-semibold">Recording…</span>
            <span className="text-red-200 text-sm">Click Stop when finished.</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 flex flex-col">
          <div className="max-w-4xl mx-auto w-full">
            {messages.length === 0 && !isLoading && (
              <div className="text-center text-gray-500 mt-8">
                Starting conversation...
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
                <div className="bg-blue-100 text-blue-900 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="animate-pulse">●</div>
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="bg-white border-t p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  onKeyDown={handleTextInput}
                  placeholder={
                    isRecording
                      ? 'Listening...'
                      : isVoiceAvailable
                      ? 'Type or use voice...'
                      : 'Type your response...'
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900"
                  rows={2}
                  disabled={isLoading || isRecording}
                />
              </div>
              {isVoiceAvailable && (
                <button
                  onClick={handleVoiceInput}
                  disabled={isLoading}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    isRecording ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse' : 'bg-green-600 text-white hover:bg-green-700'
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
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
