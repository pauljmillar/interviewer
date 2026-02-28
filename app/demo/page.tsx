'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import type { Question } from '@/types';

const DEMO_JD_KEY = 'demo_jd';

const VOICE_OPTIONS = [
  { value: '', label: 'Default (alloy)' },
  { value: 'alloy', label: 'Alloy' },
  { value: 'echo', label: 'Echo' },
  { value: 'fable', label: 'Fable' },
  { value: 'onyx', label: 'Onyx' },
  { value: 'nova', label: 'Nova' },
  { value: 'shimmer', label: 'Shimmer' },
];

const DEFAULT_INTRO =
  "Thanks for your time. This is a short screening — I'll ask you a few questions to see if we should move to the next round.";
const DEFAULT_CONCLUSION =
  "That's all for this round. We'll review and be in touch about next steps.";
const DEFAULT_REMINDER =
  'This is a real interview. Your answers will be reviewed by the hiring team. Please answer the question so we can continue.';

type Step = 'analyzing' | 'review' | 'settings' | 'recipient' | 'done';

function ensureQuestion(q: unknown): Question {
  if (q && typeof q === 'object' && 'mainQuestion' in q && typeof (q as Question).mainQuestion === 'string') {
    const x = q as Question;
    return {
      mainQuestion: x.mainQuestion,
      subTopics: Array.isArray(x.subTopics) ? x.subTopics : [],
      mode: x.mode ?? 4,
    };
  }
  return { mainQuestion: '', subTopics: [], mode: 4 };
}

function DemoPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn } = useAuth();
  const initialStep = (searchParams.get('step') as Step) || 'analyzing';

  const [step, setStep] = useState<Step>(initialStep);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [positionName, setPositionName] = useState('Demo position');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [intro, setIntro] = useState(DEFAULT_INTRO);
  const [conclusion, setConclusion] = useState(DEFAULT_CONCLUSION);
  const [reminder, setReminder] = useState(DEFAULT_REMINDER);
  const [voice, setVoice] = useState('');
  const [recordVideo, setRecordVideo] = useState(true);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | ''>('');

  const [recipientName, setRecipientName] = useState('');
  const [creating, setCreating] = useState(false);
  const [shareableUrl, setShareableUrl] = useState<string | null>(null);
  const [positionId, setPositionId] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  const runAnalyze = useCallback(async () => {
    const jd = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(DEMO_JD_KEY) : null;
    if (!jd?.trim()) {
      setError('No job description found. Please go back and upload or paste one.');
      setStep('review');
      return;
    }
    setError(null);
    setAnalyzing(true);
    try {
      const res = await fetch('/api/analyze-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: jd.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to analyze job description');
      }
      const data = await res.json();
      const raw = data.questions;
      const list = Array.isArray(raw) ? raw.map(ensureQuestion) : [];
      setQuestions(list.length > 0 ? list : [{ mainQuestion: 'Tell us about yourself.', subTopics: [], mode: 4 }]);
      if (typeof data.suggestedTitle === 'string' && data.suggestedTitle.trim()) {
        setPositionName(data.suggestedTitle.trim());
      }
      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(DEMO_JD_KEY);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setAnalyzing(false);
    }
  }, []);

  useEffect(() => {
    if (step === 'analyzing' && !analyzing) runAnalyze();
  }, [step, analyzing, runAnalyze]);

  const addQuestion = () => {
    setQuestions((prev) => [...prev, { mainQuestion: '', subTopics: [], mode: 4 }]);
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, mainQuestion: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, mainQuestion } : q))
    );
  };

  const handleCreateAndGetLink = async () => {
    const name = recipientName?.trim() || 'Candidate';
    setError(null);
    setCreating(true);
    try {
      const createRes = await fetch('/api/demo/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionName: positionName.trim() || 'Demo position',
          questions,
          intro,
          conclusion,
          reminder,
          voice: voice || undefined,
        }),
      });
      if (!createRes.ok) {
        const d = await createRes.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to create demo');
      }
      const createData = await createRes.json();
      setPositionId(createData.positionId);

      const instanceRes = await fetch('/api/demo/create-instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionId: createData.positionId,
          recipientName: name,
          intro,
          conclusion,
          reminder,
          voice: voice || undefined,
        }),
      });
      if (!instanceRes.ok) {
        const d = await instanceRes.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to create interview link');
      }
      const instanceData = await instanceRes.json();
      setShareableUrl(instanceData.shareableUrl ?? null);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setCreating(false);
    }
  };

  const copyUrl = () => {
    if (shareableUrl && typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(shareableUrl);
    }
  };

  const claimDemo = useCallback(async () => {
    setClaiming(true);
    try {
      const res = await fetch('/api/demo/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: positionId ? JSON.stringify({ positionId }) : '{}',
        credentials: 'include',
      });
      if (res.ok) router.replace('/admin');
      else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to add to your account.');
      }
    } catch {
      setError('Something went wrong.');
    } finally {
      setClaiming(false);
    }
  }, [positionId, router]);

  if (step === 'analyzing' || analyzing) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-gray-100 px-4">
        <div className="animate-pulse text-landing-primary text-2xl mb-4">Thinking…</div>
        <p className="text-gray-400 text-sm">Analyzing your job description and generating questions.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-gray-100 px-4 py-12 w-full max-w-6xl mx-auto">
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-900/30 border border-red-800 text-red-200 text-sm" role="alert">
          {error}
        </div>
      )}

      {step === 'review' && (
        <>
          <h1 className="text-xl font-semibold text-white mb-2">Review questions</h1>
          <p className="text-gray-400 text-sm mb-6">Edit, add, or remove questions.</p>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1">Position name</label>
            <input
              type="text"
              value={positionName}
              onChange={(e) => setPositionName(e.target.value)}
              placeholder="e.g. Senior Engineer"
              className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white placeholder-gray-500"
            />
          </div>
          <ul className="space-y-4 mb-6">
            {questions.map((q, i) => (
              <li key={i} className="flex gap-3 items-start w-full">
                <textarea
                  value={q.mainQuestion}
                  onChange={(e) => updateQuestion(i, e.target.value)}
                  placeholder="Question"
                  rows={3}
                  className="flex-1 min-w-0 w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white placeholder-gray-500 resize-y"
                />
                <button
                  type="button"
                  onClick={() => removeQuestion(i)}
                  className="flex-shrink-0 px-3 py-2 text-red-400 hover:text-red-300 text-sm"
                  aria-label="Remove question"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={addQuestion}
            className="mb-6 px-4 py-2 rounded-lg border border-neutral-600 text-gray-300 hover:bg-neutral-800 text-sm"
          >
            Add question
          </button>
          <button
            type="button"
            onClick={() => setStep('settings')}
            className="w-full px-4 py-3 rounded-lg bg-landing-primary text-white font-medium hover:opacity-90"
          >
            Next: Settings
          </button>
          <div className="mt-8">
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-300">
              ← Back to home
            </Link>
          </div>
        </>
      )}

      {step === 'settings' && (
        <>
          <h1 className="text-xl font-semibold text-white mb-2">Settings</h1>
          <p className="text-gray-400 text-sm mb-6">Customize voice and messages.</p>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Voice</label>
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white"
              >
                {VOICE_OPTIONS.map((o) => (
                  <option key={o.value || 'default'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="record-video"
                checked={recordVideo}
                onChange={(e) => setRecordVideo(e.target.checked)}
                className="rounded border-neutral-600 bg-neutral-800"
              />
              <label htmlFor="record-video" className="text-sm text-gray-300">
                Record video
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Time limit (minutes, optional)</label>
              <input
                type="number"
                min={1}
                value={timeLimitMinutes}
                onChange={(e) => setTimeLimitMinutes(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="None"
                className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white placeholder-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Intro message</label>
              <textarea
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white placeholder-gray-500 resize-y"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Thank you / conclusion</label>
              <textarea
                value={conclusion}
                onChange={(e) => setConclusion(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white placeholder-gray-500 resize-y"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep('review')}
              className="px-4 py-3 rounded-lg border border-neutral-600 text-gray-300 hover:bg-neutral-800"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep('recipient')}
              className="flex-1 px-4 py-3 rounded-lg bg-landing-primary text-white font-medium hover:opacity-90"
            >
              Next: Create link
            </button>
          </div>
          <div className="mt-8">
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-300">
              ← Back to home
            </Link>
          </div>
        </>
      )}

      {step === 'recipient' && (
        <>
          <h1 className="text-xl font-semibold text-white mb-2">Create interview link</h1>
          <p className="text-gray-400 text-sm mb-6">Enter the recipient&apos;s name to generate a shareable link.</p>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-1">Recipient name</label>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="e.g. Jane Smith"
              className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white placeholder-gray-500"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep('settings')}
              className="px-4 py-3 rounded-lg border border-neutral-600 text-gray-300 hover:bg-neutral-800"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleCreateAndGetLink}
              disabled={creating}
              className="flex-1 px-4 py-3 rounded-lg bg-landing-primary text-white font-medium hover:opacity-90 disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Generate interview link'}
            </button>
          </div>
          <div className="mt-8">
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-300">
              ← Back to home
            </Link>
          </div>
        </>
      )}

      {step === 'done' && shareableUrl && (
        <>
          <h1 className="text-xl font-semibold text-white mb-2">Your interview link</h1>
          <p className="text-gray-400 text-sm mb-4">Share this link with your candidate.</p>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              readOnly
              value={shareableUrl}
              className="flex-1 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-gray-300 text-sm"
            />
            <button
              type="button"
              onClick={copyUrl}
              className="px-4 py-2 rounded-lg bg-neutral-700 text-white text-sm hover:bg-neutral-600"
            >
              Copy
            </button>
          </div>
          <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-700 mb-6">
            <p className="text-gray-300 text-sm mb-3">
              {isSignedIn
                ? 'Add this position to your account to manage it in admin.'
                : 'To review results, create a free account or sign in.'}
            </p>
            <div className="flex flex-wrap gap-3">
              {isSignedIn ? (
                <>
                  <button
                    type="button"
                    onClick={claimDemo}
                    disabled={claiming}
                    className="px-4 py-2 rounded-lg bg-landing-primary text-white font-medium text-sm hover:opacity-90 disabled:opacity-50"
                  >
                    {claiming ? 'Adding…' : 'Add to my account'}
                  </button>
                  <Link
                    href="/admin"
                    className="px-4 py-2 rounded-lg border border-neutral-600 text-gray-300 text-sm hover:bg-neutral-800"
                  >
                    Go to admin
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/sign-up"
                    className="px-4 py-2 rounded-lg bg-landing-primary text-white font-medium text-sm hover:opacity-90"
                  >
                    Create free account
                  </Link>
                  <Link
                    href="/sign-in?next=/claim-demo"
                    className="px-4 py-2 rounded-lg border border-neutral-600 text-gray-300 text-sm hover:bg-neutral-800"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-300">
            ← Back to home
          </Link>
        </>
      )}
    </div>
  );
}

export default function DemoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>}>
      <DemoPageContent />
    </Suspense>
  );
}
