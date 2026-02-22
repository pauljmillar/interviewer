'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Message, Question, DiscoveryContext } from '@/types';
import { DEFAULT_QUESTIONS } from '@/constants/questions';
import { INTERVIEW_TEMPLATES, getCustomTemplates, addCustomTemplate, getTemplateById } from '@/constants/templates';
import { DEFAULT_ENTITY_SCHEMAS } from '@/lib/entities/schemas';
import {
  getInterviewInstances,
  getInterviewInstance,
  getLatestSession,
  createInterviewInstance,
  createSession,
  saveSession,
  getPositions,
  createPosition,
} from '@/lib/persistence/interviewStorage';
import type { InterviewInstanceRecord, SessionRecord, PositionRecord, PositionType } from '@/types';
import MessageBubble from './MessageBubble';
import BiographyViewer from './BiographyViewer';
import ConfigPanel from './ConfigPanel';
import WordCountViewer from './WordCountViewer';
import DiscoveryViewer from './DiscoveryViewer';
import { TextToSpeech } from '@/lib/voice/textToSpeech';
import { SpeechToText } from '@/lib/voice/speechToText';
import type { CategoryWordCount } from '@/lib/openai/wordCount';
import type { DebugStep } from '@/lib/openai/chat';

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

type CreateChoice = 'jd' | 'template' | 'scratch' | null;

interface ChatInterfaceProps {
  /** When true, use h-full instead of h-screen (e.g. when embedded in admin tabs). */
  embedded?: boolean;
  /** When set by admin "Create position" tab, open the corresponding flow and then clear. */
  createChoice?: CreateChoice;
  onCreateChoiceConsumed?: () => void;
  /** Called when a new position is created (e.g. so admin Positions view can refresh and close create mode). */
  onPositionCreated?: () => void;
  /** When true, load/save positions and custom templates via API (Supabase) instead of localStorage. */
  useApiForPositionsAndTemplates?: boolean;
}

export default function ChatInterface({
  embedded,
  createChoice,
  onCreateChoiceConsumed,
  onPositionCreated,
  useApiForPositionsAndTemplates = false,
}: ChatInterfaceProps = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [allQuestionsCovered, setAllQuestionsCovered] = useState(false);
  const [biography, setBiography] = useState<string | null>(null);
  const [isGeneratingBiography, setIsGeneratingBiography] = useState(false);
  const [isVoiceAvailable, setIsVoiceAvailable] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [questions, setQuestions] = useState<Question[]>(DEFAULT_QUESTIONS);
  const [coveredSubTopics, setCoveredSubTopics] = useState<Array<{ questionIndex: number; subTopicIndex: number }>>([]);
  const [currentQuestionWordCount, setCurrentQuestionWordCount] = useState(0);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [wordCounts, setWordCounts] = useState<{ categories: CategoryWordCount[]; totalWords: number } | null>(null);
  const [isAnalyzingWordCount, setIsAnalyzingWordCount] = useState(false);
  const [discoveryContext, setDiscoveryContext] = useState<DiscoveryContext>({
    entities: [],
    timeline: [],
    entitySchemas: DEFAULT_ENTITY_SCHEMAS,
  });
  const [isDiscoveryViewerOpen, setIsDiscoveryViewerOpen] = useState(false);
  const [userRepliesForCurrentQuestion, setUserRepliesForCurrentQuestion] = useState(0);
  const [customTemplates, setCustomTemplates] = useState<typeof INTERVIEW_TEMPLATES>([]);
  const [currentInstance, setCurrentInstance] = useState<InterviewInstanceRecord | null>(null);
  const [currentSession, setCurrentSession] = useState<SessionRecord | null>(null);
  const [resumeBriefing, setResumeBriefing] = useState<string | null>(null);
  const [savedInstances, setSavedInstances] = useState<InterviewInstanceRecord[]>([]);
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);
  const [debugSteps, setDebugSteps] = useState<DebugStep[]>([]);
  const [debugPanelWidth, setDebugPanelWidth] = useState(25);
  const debugResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const [interviewIntro, setInterviewIntro] = useState<string | undefined>(undefined);
  const [interviewConclusion, setInterviewConclusion] = useState<string | undefined>(undefined);
  const [interviewReminder, setInterviewReminder] = useState<string | undefined>(undefined);
  const [savedPositions, setSavedPositions] = useState<PositionRecord[]>([]);
  const [selectedPositionId, setSelectedPositionId] = useState<string>('');
  const [jdFlowOpen, setJdFlowOpen] = useState(false);
  const [jdText, setJdText] = useState('');
  const [jdGeneratedQuestions, setJdGeneratedQuestions] = useState<Question[] | null>(null);
  const [jdAnalyzing, setJdAnalyzing] = useState(false);
  const [jdStep, setJdStep] = useState<'paste' | 'review'>('paste');
  const [jdPositionName, setJdPositionName] = useState('');
  const [jdPositionType, setJdPositionType] = useState<PositionType | undefined>('job');
  const jdFileInputRef = useRef<HTMLInputElement>(null);

  /** When loading a template or instance with voice, sync TTS and config panel selection. */
  const applyVoiceFromTtsId = useCallback((ttsId: string | undefined) => {
    if (!ttsId || !ttsRef.current) return;
    ttsRef.current.setVoiceByTtsId(ttsId);
    const v = ttsRef.current.getSelectedVoice();
    if (v) setSelectedVoiceName(v.name);
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const ttsRef = useRef<TextToSpeech | null>(null);
  const sttRef = useRef<SpeechToText | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Initialize voice services
    if (typeof window !== 'undefined') {
      ttsRef.current = new TextToSpeech();
      sttRef.current = new SpeechToText();
      setIsVoiceAvailable(sttRef.current?.isAvailable() ?? false);
      
      // Load available voices
      const loadVoices = () => {
        if (ttsRef.current) {
          const voices = ttsRef.current.getAvailableVoices();
          setAvailableVoices(voices);
          // Set default voice if none selected
          if (!selectedVoiceName && voices.length > 0) {
            const defaultVoice = voices.find(v => 
              v.name.includes('Natural') || v.name.includes('Premium') || v.name.includes('Enhanced')
            ) || voices[0];
            if (defaultVoice) {
              setSelectedVoiceName(defaultVoice.name);
              ttsRef.current.setVoice(defaultVoice.name);
            }
          }
        }
      };
      
      loadVoices();
      // Some browsers load voices asynchronously
      if (window.speechSynthesis && window.speechSynthesis.onvoiceschanged) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  useEffect(() => {
    if (!createChoice) return;
    if (createChoice === 'jd') {
      setJdFlowOpen(true);
      setJdStep('paste');
      setJdText('');
      setJdGeneratedQuestions(null);
      setJdPositionName('');
      setJdPositionType('job');
    } else if (createChoice === 'template') {
      const template = INTERVIEW_TEMPLATES[0];
      if (template) {
        setQuestions(template.questions);
        setInterviewIntro(template.intro);
        setInterviewConclusion(template.conclusion);
        setInterviewReminder(template.reminder);
        if (template.voice) applyVoiceFromTtsId(template.voice);
      }
      setIsConfigOpen(true);
    } else if (createChoice === 'scratch') {
      setQuestions([]);
      setInterviewIntro(undefined);
      setInterviewConclusion(undefined);
      setInterviewReminder(undefined);
      setIsConfigOpen(true);
    }
    onCreateChoiceConsumed?.();
  }, [createChoice, onCreateChoiceConsumed]);

  useEffect(() => {
    // Update TTS voice when selection changes
    if (ttsRef.current && selectedVoiceName) {
      ttsRef.current.setVoice(selectedVoiceName);
    }
  }, [selectedVoiceName]);

  useEffect(() => {
    // Start the conversation with the first question
    const initConversation = async () => {
      if (questions.length === 0) {
        const welcomeMessage: Message = {
          role: 'assistant',
          content: 'Welcome! Please configure your questions in the Config panel before starting the interview.',
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        let instance = currentInstance;
        let session = currentSession;
        if (!instance && questions.length > 0) {
          instance = createInterviewInstance({
            name: `Interview ${new Date().toLocaleDateString()}`,
            questions,
            intro: interviewIntro,
            conclusion: interviewConclusion,
            reminder: interviewReminder,
            positionId: selectedPositionId || undefined,
          });
          session = createSession(instance.id);
          setCurrentInstance(instance);
          setCurrentSession(session);
        }

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
            discoveryContext: {
              entities: [],
              timeline: [],
              entitySchemas: DEFAULT_ENTITY_SCHEMAS,
            },
            includeDebug: debugPanelOpen,
            intro: instance?.intro ?? interviewIntro,
            conclusion: instance?.conclusion ?? interviewConclusion,
            reminder: instance?.reminder ?? interviewReminder,
            reminderAlreadyShown: session?.reminderAlreadyShown ?? false,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to start conversation');
        }

        const data = await response.json();
        if (data.debugSteps?.length) setDebugSteps((prev) => [...prev, ...data.debugSteps]);
        const firstMessage: Message = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
        };

        setMessages([firstMessage]);
        if (session) {
          const updated: SessionRecord = {
            ...session,
            messages: [firstMessage].map((m) => ({
              role: m.role,
              content: m.content,
              timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : undefined,
            })),
            currentQuestionIndex: 0,
            reminderAlreadyShown: data.reminderShown ?? session.reminderAlreadyShown,
          };
          saveSession(updated);
          setCurrentSession(updated);
        }

        // Speak the first question
        if (ttsRef.current?.isAvailable()) {
          ttsRef.current.speak(data.response);
        }
      } catch (error) {
        console.error('Error starting conversation:', error);
        alert('Failed to start conversation. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };

    initConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (useApiForPositionsAndTemplates) {
      fetch('/api/templates', { credentials: 'include' })
        .then((res) => (res.ok ? res.json() : []))
        .then((arr) => setCustomTemplates(Array.isArray(arr) ? arr : []))
        .catch(() => setCustomTemplates([]));
    } else {
      setCustomTemplates(getCustomTemplates());
    }
  }, [useApiForPositionsAndTemplates]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (useApiForPositionsAndTemplates) {
      fetch('/api/positions', { credentials: 'include' })
        .then((res) => (res.ok ? res.json() : []))
        .then((arr) => setSavedPositions(Array.isArray(arr) ? arr : []))
        .catch(() => setSavedPositions([]));
    } else {
      setSavedInstances(getInterviewInstances());
      setSavedPositions(getPositions());
    }
  }, [currentInstance, useApiForPositionsAndTemplates]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const ref = debugResizeRef.current;
      if (!ref) return;
      const deltaX = e.clientX - ref.startX;
      const deltaPercent = (deltaX / window.innerWidth) * 100;
      // Drag divider right = panel contracts (smaller width); left = panel expands
      setDebugPanelWidth((w) => Math.min(50, Math.max(15, ref.startWidth - deltaPercent)));
    };
    const onMouseUp = () => {
      debugResizeRef.current = null;
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const showWordCount = questions.some((q) => {
    const m = q.mode ?? 4;
    return m === 3 || m === 4;
  });

  const startConversation = async () => {
    if (questions.length === 0) {
      const welcomeMessage: Message = {
        role: 'assistant',
        content: 'Welcome! Please configure your questions in the Config panel before starting the interview.',
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
      setCurrentQuestionIndex(0);
      setCurrentQuestionWordCount(0);
      setCoveredSubTopics([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setCurrentQuestionIndex(0);
    setCurrentQuestionWordCount(0);
    setCoveredSubTopics([]);
    setUserRepliesForCurrentQuestion(0);
    setCurrentInstance(null);
    setCurrentSession(null);
    setResumeBriefing(null);
    try {
      const instance = createInterviewInstance({
        name: `Interview ${new Date().toLocaleDateString()}`,
        questions,
        intro: interviewIntro,
        conclusion: interviewConclusion,
        reminder: interviewReminder,
        positionId: selectedPositionId || undefined,
      });
      const session = createSession(instance.id);
      setCurrentInstance(instance);
      setCurrentSession(session);

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
          discoveryContext: {
            entities: [],
            timeline: [],
            entitySchemas: DEFAULT_ENTITY_SCHEMAS,
          },
          includeDebug: debugPanelOpen,
          intro: instance.intro ?? interviewIntro,
          conclusion: instance.conclusion ?? interviewConclusion,
          reminder: instance.reminder ?? interviewReminder,
          reminderAlreadyShown: false,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start conversation');
      }

      const data = await response.json();
      if (data.debugSteps?.length) setDebugSteps((prev) => [...prev, ...data.debugSteps]);
      const firstMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages([firstMessage]);
      const updated: SessionRecord = {
        ...session,
        messages: [firstMessage].map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : undefined,
        })),
        currentQuestionIndex: 0,
        reminderAlreadyShown: data.reminderShown ?? false,
      };
      saveSession(updated);
      setCurrentSession(updated);

      // Speak the first question
      if (ttsRef.current?.isAvailable()) {
        ttsRef.current.speak(data.response);
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      alert('Failed to start conversation. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return;

    if (questions.length === 0) {
      alert('Please configure questions in the Config panel before continuing.');
      return;
    }

    const userMsg: Message = {
      role: 'user',
      content: userMessage.trim(),
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMsg];
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
            messages: updatedMessages.map(m => ({
              role: m.role,
              content: m.content,
            })),
            currentQuestionIndex,
            questions,
            coveredSubTopics,
            currentQuestionWordCount: newWordCount,
            userRepliesForCurrentQuestion: newRepliesCount,
            discoveryContext,
            includeDebug: debugPanelOpen,
            intro: currentInstance?.intro ?? interviewIntro,
            conclusion: currentInstance?.conclusion ?? interviewConclusion,
            reminder: currentInstance?.reminder ?? interviewReminder,
            reminderAlreadyShown: currentSession?.reminderAlreadyShown ?? false,
          }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      if (data.debugSteps?.length) setDebugSteps((prev) => [...prev, ...data.debugSteps]);
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages([...updatedMessages, assistantMsg]);
      
      // Update discovery context if provided
      if (data.discoveryContext) {
        console.log('Updating discovery context from API:', {
          entities: data.discoveryContext.entities?.length || 0,
          timeline: data.discoveryContext.timeline?.length || 0,
        });
        setDiscoveryContext(data.discoveryContext);
      } else {
        console.warn('No discovery context in API response');
      }
      
      // Update question index if covered
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

      // Also check the API response
      if (data.allQuestionsCovered) {
        setAllQuestionsCovered(true);
      }

      // Speak the AI response
      if (ttsRef.current?.isAvailable()) {
        ttsRef.current.speak(data.response);
      }

      // Persist session if we have an active interview
      if (currentSession && currentInstance) {
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
        };
        saveSession(nextSession);
        setCurrentSession(nextSession);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = () => {
    if (!sttRef.current?.isAvailable()) {
      alert('Voice input is not supported in this browser. Please use Chrome or Edge, or type your response.');
      return;
    }

    if (isRecording) {
      sttRef.current.stop();
      setIsRecording(false);
      return;
    }

    setIsRecording(true);
    sttRef.current.start(
      (transcript) => {
        setIsRecording(false);
        handleSendMessage(transcript);
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
      const message = textarea.value.trim();
      if (message) {
        handleSendMessage(message);
        textarea.value = '';
      }
    }
  };

  const handleCreateStory = async () => {
    if (messages.length === 0) {
      alert('No messages to create a story from.');
      return;
    }

    setIsGeneratingBiography(true);
    try {
      const response = await fetch('/api/biography', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate biography');
      }

      const data = await response.json();
      setBiography(data.biography);
    } catch (error) {
      console.error('Error generating biography:', error);
      alert('Failed to generate biography. Please try again.');
    } finally {
      setIsGeneratingBiography(false);
    }
  };

  const handleWordCountAnalysis = async () => {
    if (messages.length === 0) {
      alert('No messages to analyze.');
      return;
    }

    setIsAnalyzingWordCount(true);
    try {
      const response = await fetch('/api/wordcount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          questions,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze word counts');
      }

      const data = await response.json();
      setWordCounts(data);
    } catch (error) {
      console.error('Error analyzing word counts:', error);
      alert('Failed to analyze word counts. Please try again.');
    } finally {
      setIsAnalyzingWordCount(false);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset the conversation? All progress will be lost.')) {
      setMessages([]);
      setCurrentQuestionIndex(0);
      setAllQuestionsCovered(false);
      setBiography(null);
      setIsLoading(false);
      setIsRecording(false);
      setCurrentQuestionWordCount(0);
      setCoveredSubTopics([]);
      setUserRepliesForCurrentQuestion(0);
      setDebugSteps([]);
      setDiscoveryContext({
        entities: [],
        timeline: [],
        entitySchemas: DEFAULT_ENTITY_SCHEMAS,
      });
      
      // Stop any ongoing speech
      if (ttsRef.current) {
        ttsRef.current.stop();
      }
      if (sttRef.current) {
        sttRef.current.stop();
      }

      // Restart conversation
      startConversation();
    }
  };

  const handleQuestionsChange = (newQuestions: Question[]) => {
    setQuestions(newQuestions);
    // Reset conversation if questions changed
    if (confirm('Questions updated. Reset conversation to use new questions?')) {
      handleReset();
    }
  };

  const handleResumeInterview = async (instanceId: string) => {
    const instance = getInterviewInstance(instanceId);
    if (!instance) return;
    const session = getLatestSession(instanceId);
    setQuestions(instance.questions);
    setCurrentInstance(instance);
    if (instance.voice) applyVoiceFromTtsId(instance.voice);
    if (!session) {
      setMessages([]);
      setCurrentSession(null);
      setResumeBriefing(null);
      setCurrentQuestionIndex(0);
      setCoveredSubTopics([]);
      setCurrentQuestionWordCount(0);
      setUserRepliesForCurrentQuestion(0);
      setAllQuestionsCovered(false);
      setDiscoveryContext({ entities: [], timeline: [], entitySchemas: DEFAULT_ENTITY_SCHEMAS });
      return;
    }
    setCurrentSession(session);
    setMessages(
      session.messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp ? new Date(m.timestamp) : undefined,
      }))
    );
    setCurrentQuestionIndex(session.currentQuestionIndex);
    setCoveredSubTopics(session.coveredSubTopics);
    setCurrentQuestionWordCount(session.currentQuestionWordCount);
    setUserRepliesForCurrentQuestion(session.userRepliesForCurrentQuestion);
    setAllQuestionsCovered(session.allQuestionsCovered);
    setDiscoveryContext(session.discoveryContext);
    setResumeBriefing(null);
    if (session.messages.length > 0) {
      try {
        const res = await fetch('/api/review-historical', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: session.messages.map((m) => ({ role: m.role, content: m.content })),
            questions: instance.questions,
            currentQuestionIndex: session.currentQuestionIndex,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setResumeBriefing(data.briefing ?? null);
        }
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className={`flex flex-col bg-gray-50 ${embedded ? 'h-full' : 'h-screen'}`}>
      <div className={debugPanelOpen ? 'flex flex-1 min-h-0' : 'flex flex-col flex-1 min-h-0'}>
        {/* Left column: header + chat + input (full width when debug closed, left side when debug open) */}
        <div className={`flex flex-col flex-1 min-h-0 ${debugPanelOpen ? 'min-w-0 border-r border-gray-200' : ''}`}>
      {/* Header */}
      <div className="bg-white border-b shadow-sm p-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex justify-between items-center flex-wrap gap-2">
          <h1 className="text-2xl font-bold text-gray-800">AI Interviewer</h1>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Position:</label>
            <select
              value={selectedPositionId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedPositionId(id);
                if (id) {
                  const position = savedPositions.find((p) => p.id === id);
                  if (position?.templateId) {
                    const template =
                      getTemplateById(position.templateId) ??
                      customTemplates.find((t) => t.id === position.templateId);
                    if (template) {
                      setQuestions(template.questions);
                      setInterviewIntro(template.intro);
                      setInterviewConclusion(template.conclusion);
                      setInterviewReminder(template.reminder);
                      if (template.voice) applyVoiceFromTtsId(template.voice);
                    }
                  }
                }
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            >
              <option value="">None</option>
              {savedPositions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.type ? ` (${p.type})` : ''}
                </option>
              ))}
            </select>
            <button
              onClick={async () => {
                const name = window.prompt('Position name (e.g. "Janitor at Company X")?');
                if (!name?.trim()) return;
                const typeInput = window.prompt('Type: job, biography, or screening?', 'job');
                const type = (typeInput?.toLowerCase().trim() as PositionType) || undefined;
                if (type && !['job', 'biography', 'screening'].includes(type)) return;
                if (useApiForPositionsAndTemplates) {
                  try {
                    const res = await fetch('/api/positions', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name: name.trim(), type: type as PositionType | undefined }),
                      credentials: 'include',
                    });
                    if (res.ok) {
                      const list = await fetch('/api/positions', { credentials: 'include' }).then((r) => r.json());
                      setSavedPositions(Array.isArray(list) ? list : []);
                      onPositionCreated?.();
                    }
                  } catch {
                    // ignore
                  }
                } else {
                  createPosition({ name: name.trim(), type: type as PositionType | undefined });
                  setSavedPositions(getPositions());
                  onPositionCreated?.();
                }
              }}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
              title="Create a new position"
            >
              New position
            </button>
            <button
              onClick={() => {
                setJdFlowOpen(true);
                setJdStep('paste');
                setJdText('');
                setJdGeneratedQuestions(null);
                setJdPositionName('');
                setJdPositionType('job');
              }}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium"
              title="Create position from job description"
            >
              New position from JD
            </button>
            <label className="text-sm font-medium text-gray-700">Start from template:</label>
            <select
              value=""
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') return;
                if (value === 'empty') {
                  setQuestions([]);
                  setInterviewIntro(undefined);
                  setInterviewConclusion(undefined);
                  setInterviewReminder(undefined);
                  setIsConfigOpen(true);
                } else {
                  const template =
                    INTERVIEW_TEMPLATES.find((t) => t.id === value) ??
                    customTemplates.find((t) => t.id === value);
                  if (template) {
                    setQuestions(template.questions);
                    setInterviewIntro(template.intro);
                    setInterviewConclusion(template.conclusion);
                    setInterviewReminder(template.reminder);
                    if (template.voice) applyVoiceFromTtsId(template.voice);
                    setIsConfigOpen(true);
                  }
                }
                e.target.value = '';
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            >
              <option value="">Choose...</option>
              <option value="empty">Empty (custom)</option>
              {INTERVIEW_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
              {customTemplates.length > 0 &&
                customTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (saved)
                  </option>
                ))}
            </select>
            <button
              onClick={async () => {
                const name = window.prompt('Name for this template?');
                if (!name?.trim()) return;
                if (useApiForPositionsAndTemplates) {
                  try {
                    const id = `custom-${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now()}`;
                    const template = { id, name: name.trim(), questions, intro: interviewIntro, conclusion: interviewConclusion, reminder: interviewReminder };
                    const res = await fetch('/api/templates', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(template),
                      credentials: 'include',
                    });
                    if (res.ok) {
                      const list = await fetch('/api/templates', { credentials: 'include' }).then((r) => r.json());
                      setCustomTemplates(Array.isArray(list) ? list : []);
                    }
                  } catch {
                    // ignore
                  }
                } else {
                  addCustomTemplate(name.trim(), questions);
                  setCustomTemplates(getCustomTemplates());
                }
              }}
              disabled={questions.length === 0}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              title="Save current questions as a template"
            >
              Save as template
            </button>
            <label className="text-sm font-medium text-gray-700">Resume:</label>
            <select
              value=""
              onChange={(e) => {
                const id = e.target.value;
                if (id) handleResumeInterview(id);
                e.target.value = '';
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            >
              <option value="">Choose...</option>
              {savedInstances.map((i) => {
                const pos = i.positionId ? savedPositions.find((p) => p.id === i.positionId) : null;
                return (
                  <option key={i.id} value={i.id}>
                    {i.name}
                    {pos ? ` (${pos.name})` : ''}
                  </option>
                );
              })}
            </select>
            <button
              onClick={() => setIsConfigOpen(true)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              ⚙️ Config
            </button>
            <button
              onClick={() => setIsDiscoveryViewerOpen(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              🔍 Discovered ({discoveryContext.entities.length + discoveryContext.timeline.length})
            </button>
            {showWordCount && (
              <button
                onClick={handleWordCountAnalysis}
                disabled={isAnalyzingWordCount || messages.length === 0}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  messages.length > 0 && !isAnalyzingWordCount
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isAnalyzingWordCount ? 'Analyzing...' : '📊 Word Count'}
              </button>
            )}
            {jdFlowOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                  <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-800">
                      {jdStep === 'paste' ? 'Paste or upload job description' : 'Review and create position'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setJdFlowOpen(false)}
                      className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                  <div className="p-4 overflow-y-auto flex-1">
                    {jdStep === 'paste' ? (
                      <>
                        <textarea
                          value={jdText}
                          onChange={(e) => setJdText(e.target.value)}
                          placeholder="Paste job description here..."
                          className="w-full h-48 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 resize-y"
                        />
                        <div className="mt-2 flex flex-wrap gap-2 items-center">
                          <input
                            ref={jdFileInputRef}
                            type="file"
                            accept=".txt,text/plain"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = () => setJdText((prev) => prev + (reader.result as string || ''));
                                reader.readAsText(file);
                              }
                              e.target.value = '';
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => jdFileInputRef.current?.click()}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                          >
                            Upload .txt file
                          </button>
                          <button
                            type="button"
                            disabled={!jdText.trim() || jdAnalyzing}
                            onClick={async () => {
                              setJdAnalyzing(true);
                              try {
                                const res = await fetch('/api/analyze-jd', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ jobDescription: jdText.trim() }),
                                });
                                if (!res.ok) {
                                  const err = await res.json().catch(() => ({}));
                                  throw new Error(err.error || 'Failed to generate questions');
                                }
                                const data = await res.json();
                                setJdGeneratedQuestions(data.questions ?? []);
                                setJdStep('review');
                              } catch (err) {
                                alert(err instanceof Error ? err.message : 'Failed to generate questions');
                              } finally {
                                setJdAnalyzing(false);
                              }
                            }}
                            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                          >
                            {jdAnalyzing ? 'Generating...' : 'Generate questions'}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-2 mb-4">
                          <label className="block text-sm font-medium text-gray-700">Position name</label>
                          <input
                            type="text"
                            value={jdPositionName}
                            onChange={(e) => setJdPositionName(e.target.value)}
                            placeholder="e.g. Senior Engineer at Acme"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900"
                          />
                          <label className="block text-sm font-medium text-gray-700">Type</label>
                          <select
                            value={jdPositionType ?? 'job'}
                            onChange={(e) => setJdPositionType((e.target.value as PositionType) || undefined)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 bg-white"
                          >
                            <option value="job">job</option>
                            <option value="biography">biography</option>
                            <option value="screening">screening</option>
                          </select>
                        </div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Generated questions ({jdGeneratedQuestions?.length ?? 0})
                        </p>
                        <ul className="list-decimal list-inside space-y-1 text-gray-800 text-sm mb-4 max-h-48 overflow-y-auto">
                          {jdGeneratedQuestions?.map((q, i) => (
                            <li key={i}>{q.mainQuestion}</li>
                          ))}
                        </ul>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setJdStep('paste')}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                          >
                            Back
                          </button>
                          <button
                            type="button"
                            disabled={!jdPositionName.trim() || !jdGeneratedQuestions?.length}
                            onClick={async () => {
                              const name = jdPositionName.trim();
                              const screeningIntro = 'Thanks for your time. This is a short screening — I\'ll ask you a few questions to see if we should move to the next round.';
                              const screeningConclusion = 'That\'s all for this round. We\'ll review and be in touch about next steps.';
                              const screeningReminder = 'This is a real interview. Your answers will be reviewed by the hiring team. Please answer the question so we can continue.';
                              if (useApiForPositionsAndTemplates) {
                                try {
                                  const templateId = `custom-${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-screening-${Date.now()}`;
                                  const template = { id: templateId, name: `${name} screening`, questions: jdGeneratedQuestions!, intro: screeningIntro, conclusion: screeningConclusion, reminder: screeningReminder };
                                  await fetch('/api/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(template), credentials: 'include' });
                                  await fetch('/api/positions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, type: jdPositionType, templateId }), credentials: 'include' });
                                  const list = await fetch('/api/positions', { credentials: 'include' }).then((r) => r.json());
                                  setSavedPositions(Array.isArray(list) ? list : []);
                                  fetch('/api/templates', { credentials: 'include' }).then((r) => r.json()).then((arr) => setCustomTemplates(Array.isArray(arr) ? arr : []));
                                  setJdFlowOpen(false);
                                  onPositionCreated?.();
                                } catch {
                                  // ignore
                                }
                              } else {
                                const template = addCustomTemplate(
                                  `${name} screening`,
                                  jdGeneratedQuestions!,
                                  { intro: screeningIntro, conclusion: screeningConclusion, reminder: screeningReminder }
                                );
                                createPosition({ name, type: jdPositionType, templateId: template.id });
                                setCustomTemplates(getCustomTemplates());
                                setSavedPositions(getPositions());
                                setJdFlowOpen(false);
                                onPositionCreated?.();
                              }
                            }}
                            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                          >
                            Create position
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={handleCreateStory}
              disabled={isGeneratingBiography || messages.length === 0}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                messages.length > 0 && !isGeneratingBiography
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isGeneratingBiography ? 'Generating...' : 'Create Story'}
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Reset
            </button>
            <button
              onClick={() => setDebugPanelOpen((v) => !v)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                debugPanelOpen ? 'bg-amber-600 text-white' : 'bg-gray-400 text-white'
              }`}
              title="Toggle debug panel"
            >
              Debug
            </button>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4"
      >
        <div className="max-w-4xl mx-auto">
          {resumeBriefing && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
              <strong>Session briefing:</strong> {resumeBriefing}
              <button
                type="button"
                onClick={() => setResumeBriefing(null)}
                className="ml-2 text-amber-700 hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}
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

      {/* Input Area */}
      <div className="bg-white border-t p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                onKeyDown={handleTextInput}
                placeholder={
                  isRecording
                    ? 'Listening... (speak now, you have 5 seconds of silence before it stops)'
                    : isVoiceAvailable
                    ? 'Type your response or use voice input...'
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
                  isRecording
                    ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {isRecording ? 'Stop' : '🎤 Voice'}
              </button>
            )}
            <button
              onClick={() => {
                const textarea = inputRef.current;
                if (textarea && textarea.value.trim()) {
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
          {!isVoiceAvailable && (
            <p className="text-sm text-gray-500 mt-2">
              Voice input requires Chrome or Edge browser. You can still type your responses.
            </p>
          )}
        </div>
      </div>

        </div>
        {debugPanelOpen && (
          <>
            <div
              className="w-2 cursor-col-resize bg-gray-300 hover:bg-gray-400 flex-shrink-0 flex items-center justify-center"
              onMouseDown={(e) => {
                e.preventDefault();
                debugResizeRef.current = { startX: e.clientX, startWidth: debugPanelWidth };
              }}
              role="separator"
              aria-label="Resize debug panel"
            >
              <div className="w-0.5 h-8 bg-gray-500 rounded" />
            </div>
            <div
              className="flex flex-col bg-gray-100 border-l border-gray-300 overflow-hidden flex-shrink-0 min-w-[200px]"
              style={{ width: `${debugPanelWidth}%` }}
            >
              <div className="p-2 border-b border-gray-300 font-medium text-gray-800 bg-gray-200">
                Debug
              </div>
              <div className="flex-1 overflow-y-auto p-2 text-xs font-mono space-y-2">
                {debugSteps.length === 0 ? (
                  <p className="text-gray-500">No steps yet. Send a message with Debug on.</p>
                ) : (
                  debugSteps.map((step, i) => (
                    <div key={i} className="border border-gray-300 rounded p-2 bg-white">
                      <div className="font-semibold text-gray-700">
                        {step.type === 'tool_call' ? `Tool: ${step.name ?? '?'}` : 'Thinking'}
                      </div>
                      {step.timestamp && (
                        <div className="text-gray-400 text-[10px]">{step.timestamp}</div>
                      )}
                      {step.content && (
                        <pre className="mt-1 whitespace-pre-wrap break-words">{step.content}</pre>
                      )}
                      {step.input != null && (
                        <details className="mt-1">
                          <summary className="cursor-pointer">Input</summary>
                          <pre className="whitespace-pre-wrap break-words mt-1">
                            {JSON.stringify(step.input, null, 2)}
                          </pre>
                        </details>
                      )}
                      {step.output != null && (
                        <details className="mt-1">
                          <summary className="cursor-pointer">Output</summary>
                          <pre className="whitespace-pre-wrap break-words mt-1">
                            {JSON.stringify(step.output, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Config Panel */}
      <ConfigPanel
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        questions={questions}
        onQuestionsChange={handleQuestionsChange}
        availableVoices={availableVoices}
        selectedVoiceName={selectedVoiceName}
        onVoiceChange={(voiceName) => {
          setSelectedVoiceName(voiceName);
          if (ttsRef.current) {
            ttsRef.current.setVoice(voiceName);
          }
        }}
      />

      {/* Biography Modal */}
      {biography && (
        <BiographyViewer
          biography={biography}
          onClose={() => setBiography(null)}
        />
      )}

      {/* Word Count Viewer */}
      {wordCounts && (
        <WordCountViewer
          wordCounts={wordCounts}
          onClose={() => setWordCounts(null)}
        />
      )}

      {/* Discovery Viewer */}
      {isDiscoveryViewerOpen && (
        <DiscoveryViewer
          discoveryContext={discoveryContext}
          onClose={() => setIsDiscoveryViewerOpen(false)}
        />
      )}
    </div>
  );
}
