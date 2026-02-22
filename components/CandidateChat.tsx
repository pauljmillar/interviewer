'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Message, Question, DiscoveryContext } from '@/types';
import { DEFAULT_ENTITY_SCHEMAS } from '@/lib/entities/schemas';
import type { InterviewInstanceRecord, SessionRecord } from '@/types';
import MessageBubble from './MessageBubble';
import { TextToSpeech } from '@/lib/voice/textToSpeech';
import { SpeechToText } from '@/lib/voice/speechToText';

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
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
  const out = arr.map((m: { role?: string; content?: string; timestamp?: string }) => ({
    role: m.role ?? 'user',
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

export default function CandidateChat({ instance, session: initialSession, onSessionUpdate }: CandidateChatProps) {
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

  const questions = instance.questions;
  const voiceId = instance.voice ?? 'alloy';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      ttsRef.current = new TextToSpeech();
      sttRef.current = new SpeechToText();
      setIsVoiceAvailable(sttRef.current?.isAvailable() ?? false);
      ttsRef.current.setVoiceByTtsId(voiceId);
    }
  }, [voiceId]);

  /** Speak using OpenAI TTS (same as template sample); fall back to browser TTS if API fails. */
  const speakResponse = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
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
  useEffect(() => {
    if (messages.length > 0 || questions.length === 0) return;

    let cancelled = false;
    setIsLoading(true);

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
          }),
        });

        if (!response.ok) throw new Error('Failed to start conversation');
        const data = await response.json();

        if (cancelled) return;

        const firstMessage: Message = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
        };
        setMessages([firstMessage]);
        if (data.discoveryContext) setDiscoveryContext(data.discoveryContext);

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

        speakResponse(data.response);
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
  }, [speakResponse]); // Run once on mount when messages are empty and questions exist

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

      speakResponse(data.response);

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
            <div className="text-sm font-medium text-gray-500 tabular-nums" aria-label="Elapsed time">
              {formatElapsed(displayedElapsedSeconds)}
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
