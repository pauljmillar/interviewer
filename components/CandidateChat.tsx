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

export default function CandidateChat({ instance, session: initialSession, onSessionUpdate }: CandidateChatProps) {
  const [messages, setMessages] = useState<Message[]>(() =>
    initialSession.messages.map((m) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp ? new Date(m.timestamp) : undefined,
    }))
  );
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const ttsRef = useRef<TextToSpeech | null>(null);
  const sttRef = useRef<SpeechToText | null>(null);
  const loadTimeRef = useRef(Date.now());
  const elapsedAtLoad = initialSession.elapsedSeconds ?? 0;

  const questions = instance.questions;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      ttsRef.current = new TextToSpeech();
      sttRef.current = new SpeechToText();
      setIsVoiceAvailable(sttRef.current?.isAvailable() ?? false);
    }
  }, []);

  const getCurrentElapsedSeconds = useCallback(() => {
    return elapsedAtLoad + Math.floor((Date.now() - loadTimeRef.current) / 1000);
  }, [elapsedAtLoad]);

  useEffect(() => {
    const interval = setInterval(() => setElapsedTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const displayedElapsedSeconds = elapsedAtLoad + Math.floor((elapsedTick - loadTimeRef.current) / 1000);

  // Start the conversation with intro/first question when the session has no messages yet.
  // When messages.length > 0 (returning user), we do not restart; the next send continues the thread.
  useEffect(() => {
    if (messages.length > 0 || questions.length === 0) return;

    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
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

        if (ttsRef.current?.isAvailable()) {
          ttsRef.current.speak(data.response);
        }
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
  }, []); // Run once on mount when messages are empty and questions exist (questions.length check is inside)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        console.error('Failed to save session', await res.text());
      }
    } catch (err) {
      console.error('Failed to save session', err);
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

      if (ttsRef.current?.isAvailable()) {
        ttsRef.current.speak(data.response);
      }

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
            {messages.map((message, index) => (
              <MessageBubble key={index} message={message} />
            ))}
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
