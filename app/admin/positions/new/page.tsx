'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { INTERVIEW_TEMPLATES } from '@/constants/templates';
import type { Question, PositionType, InterviewTemplate } from '@/types';

type View = 'default' | 'jd' | 'jd-review' | 'template' | 'scratch';

const SCREENING_INTRO =
  "Thanks for your time. This is a short screening — I'll ask you a few questions to see if we should move to the next round.";
const SCREENING_CONCLUSION =
  "That's all for this round. We'll review and be in touch about next steps.";
const SCREENING_REMINDER =
  'This is a real interview. Your answers will be reviewed by the hiring team. Please answer the question so we can continue.';

export default function NewPositionPage() {
  const router = useRouter();
  const [view, setView] = useState<View>('default');
  const [error, setError] = useState<string | null>(null);

  // JD flow
  const [jdText, setJdText] = useState('');
  const [jdAnalyzing, setJdAnalyzing] = useState(false);
  const [jdGeneratedQuestions, setJdGeneratedQuestions] = useState<Question[] | null>(null);
  const [jdPositionName, setJdPositionName] = useState('');
  const [jdPositionType, setJdPositionType] = useState<PositionType>('job');
  const [jdDropActive, setJdDropActive] = useState(false);
  const [creating, setCreating] = useState(false);

  // Template flow
  const [customTemplates, setCustomTemplates] = useState<InterviewTemplate[]>([]);
  const [templatePositionName, setTemplatePositionName] = useState('');
  const [templatePositionType, setTemplatePositionType] = useState<PositionType>('job');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Scratch flow
  const [scratchPositionName, setScratchPositionName] = useState('');
  const [scratchPositionType, setScratchPositionType] = useState<PositionType>('job');
  const [scratchQuestionsText, setScratchQuestionsText] = useState('');

  const loadCustomTemplates = useCallback(() => {
    fetch('/api/templates', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : []))
      .then((arr) => setCustomTemplates(Array.isArray(arr) ? arr : []))
      .catch(() => setCustomTemplates([]));
  }, []);

  useEffect(() => {
    if (view === 'template') loadCustomTemplates();
  }, [view, loadCustomTemplates]);

  const allTemplates = [...INTERVIEW_TEMPLATES, ...customTemplates];

  const handleJdFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setJdText((prev) => prev + (reader.result as string) + (prev ? '\n' : ''));
    reader.readAsText(file);
  };

  const handleGenerateQuestions = async () => {
    if (!jdText.trim()) return;
    setError(null);
    setJdAnalyzing(true);
    try {
      const res = await fetch('/api/analyze-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: jdText.trim() }),
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate questions');
      }
      const data = await res.json();
      setJdGeneratedQuestions(data.questions ?? []);
      setView('jd-review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate questions');
    } finally {
      setJdAnalyzing(false);
    }
  };

  const createPositionFromJd = async () => {
    if (!jdPositionName.trim() || !jdGeneratedQuestions?.length) return;
    setError(null);
    setCreating(true);
    try {
      const name = jdPositionName.trim();
      const templateId = `custom-${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-screening-${Date.now()}`;
      const template = {
        id: templateId,
        name: `${name} screening`,
        questions: jdGeneratedQuestions,
        intro: SCREENING_INTRO,
        conclusion: SCREENING_CONCLUSION,
        reminder: SCREENING_REMINDER,
      };
      const tRes = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
        credentials: 'include',
      });
      if (!tRes.ok) throw new Error('Failed to create template');
      const pRes = await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type: jdPositionType, templateId }),
        credentials: 'include',
      });
      if (!pRes.ok) throw new Error('Failed to create position');
      router.push('/admin/positions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setCreating(false);
    }
  };

  const createPositionFromTemplate = async () => {
    if (!templatePositionName.trim() || !selectedTemplateId) return;
    setError(null);
    setCreating(true);
    try {
      const res = await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templatePositionName.trim(),
          type: templatePositionType,
          templateId: selectedTemplateId,
        }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to create position');
      router.push('/admin/positions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setCreating(false);
    }
  };

  const createPositionFromScratch = async () => {
    if (!scratchPositionName.trim()) return;
    setError(null);
    setCreating(true);
    try {
      const name = scratchPositionName.trim();
      const lines = scratchQuestionsText.trim().split('\n').map((s) => s.trim()).filter(Boolean);
      let templateId: string | undefined;
      if (lines.length > 0) {
        const questions: Question[] = lines.map((mainQuestion) => ({
          mainQuestion,
          subTopics: [],
          mode: 4,
        }));
        const id = `custom-${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now()}`;
        const template = { id, name: `${name} questions`, questions };
        const tRes = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(template),
          credentials: 'include',
        });
        if (!tRes.ok) throw new Error('Failed to create template');
        templateId = id;
      }
      const pRes = await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type: scratchPositionType, templateId }),
        credentials: 'include',
      });
      if (!pRes.ok) throw new Error('Failed to create position');
      router.push('/admin/positions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setCreating(false);
    }
  };

  const backToDefault = () => {
    setView('default');
    setError(null);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-4">
        <Link
          href="/admin/positions"
          className="text-sm text-[var(--retro-text-secondary)] hover:text-[var(--retro-text-primary)]"
        >
          ← Back to positions
        </Link>
      </div>

      {view === 'default' && (
        <>
          <h1 className="text-xl font-semibold text-[var(--retro-text-primary)] mb-6">Create a new position</h1>
          {error && (
            <p className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm" role="alert">
              {error}
            </p>
          )}
          <div className="bg-[var(--retro-bg-surface)] border border-[var(--retro-border-color)] rounded-lg p-6 admin-card mb-6">
            <h2 className="text-base font-medium text-[var(--retro-text-primary)] mb-3">Upload Job Description</h2>
            <p className="text-sm text-[var(--retro-text-secondary)] mb-3">
              Upload a .txt file or paste the job description below. We&apos;ll generate screening questions for you.
            </p>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center mb-3 transition-colors ${
                jdDropActive ? 'border-[#F28A0F] bg-[#F28A0F]/10' : 'border-[var(--retro-border-color)] bg-[var(--retro-bg-raised)]'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setJdDropActive(true);
              }}
              onDragLeave={() => setJdDropActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setJdDropActive(false);
                const file = e.dataTransfer.files?.[0];
                if (file && (file.name.endsWith('.txt') || file.type === 'text/plain')) {
                  handleJdFile(file);
                }
              }}
            >
              <input
                id="jd-file"
                type="file"
                accept=".txt,text/plain"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleJdFile(file);
                  e.target.value = '';
                }}
              />
              <label htmlFor="jd-file" className="cursor-pointer text-sm text-[var(--retro-text-secondary)] hover:text-[var(--retro-text-primary)]">
                Drop a .txt file here or click to browse
              </label>
            </div>
            <label htmlFor="jd-paste" className="block text-sm font-medium text-[var(--retro-text-secondary)] mb-1">
              Or paste below
            </label>
            <textarea
              id="jd-paste"
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste job description here..."
              className="w-full h-40 px-3 py-2 border border-[var(--retro-border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28A0F] text-[var(--retro-text-primary)] bg-[var(--retro-bg-raised)] resize-y"
            />
            <div className="mt-3">
              <button
                type="button"
                disabled={!jdText.trim() || jdAnalyzing}
                onClick={handleGenerateQuestions}
                className="px-4 py-2 bg-[#F28A0F] text-white rounded-lg hover:bg-[#d47b0a] disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
              >
                {jdAnalyzing ? 'Generating questions...' : 'Generate questions'}
              </button>
            </div>
          </div>

          <p className="text-sm text-[var(--retro-text-muted)] text-center mb-3">Or start another way</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              type="button"
              onClick={() => setView('template')}
              className="px-4 py-2 border border-[var(--retro-border-color)] rounded-lg text-[var(--retro-text-secondary)] hover:bg-[var(--retro-bg-raised)] font-medium text-sm"
            >
              Use existing template
            </button>
            <button
              type="button"
              onClick={() => setView('scratch')}
              className="px-4 py-2 border border-[var(--retro-border-color)] rounded-lg text-[var(--retro-text-secondary)] hover:bg-[var(--retro-bg-raised)] font-medium text-sm"
            >
              From scratch
            </button>
          </div>
        </>
      )}

      {view === 'jd-review' && (
        <>
          <h1 className="text-xl font-semibold text-[var(--retro-text-primary)] mb-6">Review and create position</h1>
          {error && (
            <p className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm" role="alert">
              {error}
            </p>
          )}
          <div className="bg-[var(--retro-bg-surface)] border border-[var(--retro-border-color)] rounded-lg p-6 admin-card space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--retro-text-secondary)] mb-1">Position name</label>
              <input
                type="text"
                value={jdPositionName}
                onChange={(e) => setJdPositionName(e.target.value)}
                placeholder="e.g. Senior Engineer at Acme"
                className="w-full px-3 py-2 border border-[var(--retro-border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28A0F] text-[var(--retro-text-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--retro-text-secondary)] mb-1">Type</label>
              <select
                value={jdPositionType}
                onChange={(e) => setJdPositionType((e.target.value as PositionType) || 'job')}
                className="w-full px-3 py-2 border border-[var(--retro-border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28A0F] text-[var(--retro-text-primary)] bg-[var(--retro-bg-raised)]"
              >
                <option value="job">job</option>
                <option value="biography">biography</option>
                <option value="screening">screening</option>
              </select>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--retro-text-secondary)] mb-2">
                Generated questions ({jdGeneratedQuestions?.length ?? 0})
              </p>
              <ul className="list-decimal list-inside space-y-1 text-[var(--retro-text-primary)] text-sm max-h-48 overflow-y-auto border border-[var(--retro-border-color)] rounded p-3 bg-[var(--retro-bg-raised)]">
                {jdGeneratedQuestions?.map((q, i) => (
                  <li key={i}>{q.mainQuestion}</li>
                ))}
              </ul>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setView('default')}
                className="px-4 py-2 border border-[var(--retro-border-color)] rounded-lg text-[var(--retro-text-secondary)] hover:bg-[var(--retro-bg-raised)] font-medium text-sm"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!jdPositionName.trim() || !jdGeneratedQuestions?.length || creating}
                onClick={createPositionFromJd}
                className="px-4 py-2 bg-[#F28A0F] text-white rounded-lg hover:bg-[#d47b0a] disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
              >
                {creating ? 'Creating...' : 'Create position'}
              </button>
            </div>
          </div>
        </>
      )}

      {view === 'template' && (
        <>
          <h1 className="text-xl font-semibold text-[var(--retro-text-primary)] mb-6">Use existing template</h1>
          {error && (
            <p className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm" role="alert">
              {error}
            </p>
          )}
          <div className="bg-[var(--retro-bg-surface)] border border-[var(--retro-border-color)] rounded-lg p-6 admin-card space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--retro-text-secondary)] mb-1">Template</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--retro-border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28A0F] text-[var(--retro-text-primary)] bg-[var(--retro-bg-raised)]"
              >
                <option value="">Choose a template...</option>
                {allTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--retro-text-secondary)] mb-1">Position name</label>
              <input
                type="text"
                value={templatePositionName}
                onChange={(e) => setTemplatePositionName(e.target.value)}
                placeholder="e.g. Janitor at Company X"
                className="w-full px-3 py-2 border border-[var(--retro-border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28A0F] text-[var(--retro-text-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--retro-text-secondary)] mb-1">Type</label>
              <select
                value={templatePositionType}
                onChange={(e) => setTemplatePositionType((e.target.value as PositionType) || 'job')}
                className="w-full px-3 py-2 border border-[var(--retro-border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28A0F] text-[var(--retro-text-primary)] bg-[var(--retro-bg-raised)]"
              >
                <option value="job">job</option>
                <option value="biography">biography</option>
                <option value="screening">screening</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={backToDefault}
                className="px-4 py-2 border border-[var(--retro-border-color)] rounded-lg text-[var(--retro-text-secondary)] hover:bg-[var(--retro-bg-raised)] font-medium text-sm"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!templatePositionName.trim() || !selectedTemplateId || creating}
                onClick={createPositionFromTemplate}
                className="px-4 py-2 bg-[#F28A0F] text-white rounded-lg hover:bg-[#d47b0a] disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
              >
                {creating ? 'Creating...' : 'Create position'}
              </button>
            </div>
          </div>
        </>
      )}

      {view === 'scratch' && (
        <>
          <h1 className="text-xl font-semibold text-[var(--retro-text-primary)] mb-6">From scratch</h1>
          {error && (
            <p className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm" role="alert">
              {error}
            </p>
          )}
          <div className="bg-[var(--retro-bg-surface)] border border-[var(--retro-border-color)] rounded-lg p-6 admin-card space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--retro-text-secondary)] mb-1">Position name</label>
              <input
                type="text"
                value={scratchPositionName}
                onChange={(e) => setScratchPositionName(e.target.value)}
                placeholder="e.g. Biography for Grandma Betty"
                className="w-full px-3 py-2 border border-[var(--retro-border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28A0F] text-[var(--retro-text-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--retro-text-secondary)] mb-1">Type</label>
              <select
                value={scratchPositionType}
                onChange={(e) => setScratchPositionType((e.target.value as PositionType) || 'job')}
                className="w-full px-3 py-2 border border-[var(--retro-border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28A0F] text-[var(--retro-text-primary)] bg-[var(--retro-bg-raised)]"
              >
                <option value="job">job</option>
                <option value="biography">biography</option>
                <option value="screening">screening</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--retro-text-secondary)] mb-1">
                Questions (optional, one per line)
              </label>
              <textarea
                value={scratchQuestionsText}
                onChange={(e) => setScratchQuestionsText(e.target.value)}
                placeholder="Add questions one per line, or leave blank to add later."
                className="w-full h-32 px-3 py-2 border border-[var(--retro-border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28A0F] text-[var(--retro-text-primary)] bg-[var(--retro-bg-raised)] resize-y"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={backToDefault}
                className="px-4 py-2 border border-[var(--retro-border-color)] rounded-lg text-[var(--retro-text-secondary)] hover:bg-[var(--retro-bg-raised)] font-medium text-sm"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!scratchPositionName.trim() || creating}
                onClick={createPositionFromScratch}
                className="px-4 py-2 bg-[#F28A0F] text-white rounded-lg hover:bg-[#d47b0a] disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
              >
                {creating ? 'Creating...' : 'Create position'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
