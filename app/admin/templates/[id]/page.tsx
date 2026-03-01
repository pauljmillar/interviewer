'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { getTemplateById } from '@/constants/templates';
import type { InterviewTemplate, Question, InterviewMode } from '@/types';

const MODE_LABELS: Record<InterviewMode, string> = {
  1: '1 – Screening (right answer, no hints)',
  2: '2 – Right answer + hints',
  3: '3 – List only, no follow-up',
  4: '4 – Conversational (biographer)',
  5: '5 – Contradiction check',
};

const TTS_VOICES = [
  { value: '', label: 'Default (alloy)' },
  { value: 'alloy', label: 'Alloy' },
  { value: 'echo', label: 'Echo' },
  { value: 'fable', label: 'Fable' },
  { value: 'onyx', label: 'Onyx' },
  { value: 'nova', label: 'Nova' },
  { value: 'shimmer', label: 'Shimmer' },
] as const;

type EditQuestion = { mainQuestion: string; mode: InterviewMode; acceptableAnswers: string[] };

export default function TemplateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const [template, setTemplate] = useState<InterviewTemplate | null>(null);
  const [isBuiltIn, setIsBuiltIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIntro, setEditIntro] = useState('');
  const [editConclusion, setEditConclusion] = useState('');
  const [editReminder, setEditReminder] = useState('');
  const [editVoice, setEditVoice] = useState<string>('');
  const [voicePreviewPlaying, setVoicePreviewPlaying] = useState(false);
  const [editQuestions, setEditQuestions] = useState<EditQuestion[]>([]);

  const loadTemplate = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const builtIn = getTemplateById(id);
    if (builtIn) {
      setTemplate(builtIn);
      setIsBuiltIn(true);
      setEditName(builtIn.name);
      setEditIntro(builtIn.intro ?? '');
      setEditConclusion(builtIn.conclusion ?? '');
      setEditReminder(builtIn.reminder ?? '');
      setEditQuestions((builtIn.questions ?? []).map((q) => ({
        mainQuestion: q.mainQuestion,
        mode: (q.mode ?? 4) as InterviewMode,
        acceptableAnswers: q.acceptableAnswers ?? [],
      })));
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/templates/${id}`, { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 404) setError('Template not found');
        else setError('Failed to load template');
        setTemplate(null);
        return;
      }
      const data = await res.json();
      setTemplate(data);
      setIsBuiltIn(false);
      setEditName(data.name);
      setEditIntro(data.intro ?? '');
      setEditConclusion(data.conclusion ?? '');
      setEditReminder(data.reminder ?? '');
      setEditVoice(data.voice ?? '');
      setEditQuestions((data.questions ?? []).map((q: Question) => ({
        mainQuestion: q.mainQuestion,
        mode: (q.mode ?? 4) as InterviewMode,
        acceptableAnswers: q.acceptableAnswers ?? [],
      })));
    } catch {
      setError('Failed to load template');
      setTemplate(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  const handleSave = async () => {
    if (!template || isBuiltIn) return;
    setError(null);
    setSaving(true);
    try {
      const questions: Question[] = editQuestions
        .map((eq, i) => {
          const existing = template.questions?.[i];
          return {
            mainQuestion: eq.mainQuestion.trim(),
            subTopics: existing?.subTopics ?? [],
            mode: eq.mode,
            ...((eq.mode === 1 || eq.mode === 2) && {
              acceptableAnswers: eq.acceptableAnswers.map((a) => a.trim()).filter(Boolean),
            }),
            ...(existing?.followUpPrompt != null && { followUpPrompt: existing.followUpPrompt }),
            ...(existing?.correctReply != null && { correctReply: existing.correctReply }),
            ...(existing?.incorrectReply != null && { incorrectReply: existing.incorrectReply }),
            ...(existing?.wordCountThreshold != null && { wordCountThreshold: existing.wordCountThreshold }),
          };
        })
        .filter((q) => q.mainQuestion.length > 0);
      const payload: InterviewTemplate = {
        ...template,
        name: editName.trim(),
        intro: editIntro.trim() || undefined,
        conclusion: editConclusion.trim() || undefined,
        reminder: editReminder.trim() || undefined,
        voice: editVoice?.trim() || undefined,
        questions,
      };
      const res = await fetch(`/api/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update template');
      }
      const updated = await res.json();
      setTemplate(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!template || isBuiltIn || !window.confirm(`Delete "${template.name}"? This cannot be undone.`)) return;
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete');
      router.push('/admin/templates');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const addQuestion = () =>
    setEditQuestions((prev) => [...prev, { mainQuestion: '', mode: 4, acceptableAnswers: [] }]);
  const removeQuestion = (index: number) =>
    setEditQuestions((prev) => prev.filter((_, i) => i !== index));
  const setQuestion = (index: number, value: string) =>
    setEditQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, mainQuestion: value } : q)));
  const setQuestionMode = (index: number, mode: InterviewMode) =>
    setEditQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, mode } : q)));
  const setQuestionAcceptableAnswers = (index: number, value: string) =>
    setEditQuestions((prev) =>
      prev.map((q, i) =>
        i === index
          ? { ...q, acceptableAnswers: value.split('\n').map((s) => s.trim()).filter(Boolean) }
          : q
      )
    );

  const handleVoicePreview = async () => {
    if (voicePreviewPlaying) return;
    setVoicePreviewPlaying(true);
    try {
      const voice = editVoice?.trim() || 'alloy';
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'This is a brief sample of how this voice sounds.',
          voice,
        }),
      });
      if (!res.ok) throw new Error('Preview failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          reject(audio.error);
        };
        audio.play().catch(reject);
      });
    } catch {
      // ignore
    } finally {
      setVoicePreviewPlaying(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-gray-500">Loading template...</p>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-red-600">{error || 'Template not found'}</p>
        <Link href="/admin/templates" className="mt-4 inline-block text-blue-600 hover:underline">
          Back to templates
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Link href="/admin/templates" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
          ← Back to templates
        </Link>
      </div>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-6">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">Template details</h1>
        {isBuiltIn && (
          <p className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Built-in templates cannot be edited or deleted. Create a custom template (e.g. from a position) to edit questions.
          </p>
        )}
        {error && (
          <p className="mb-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              readOnly={isBuiltIn}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100"
              placeholder="Template name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Intro (optional)</label>
            <textarea
              value={editIntro}
              onChange={(e) => setEditIntro(e.target.value)}
              readOnly={isBuiltIn}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100"
              placeholder="Shown before the first question"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Conclusion (optional)</label>
            <textarea
              value={editConclusion}
              onChange={(e) => setEditConclusion(e.target.value)}
              readOnly={isBuiltIn}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100"
              placeholder="Shown after all questions"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reminder (optional)</label>
            <textarea
              value={editReminder}
              onChange={(e) => setEditReminder(e.target.value)}
              readOnly={isBuiltIn}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100"
              placeholder="One-time reminder when interviewee dismisses"
            />
          </div>
          {!isBuiltIn && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">TTS voice</label>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={editVoice || ''}
                  onChange={(e) => setEditVoice(e.target.value)}
                  className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                  title="Voice used for text-to-speech in candidate interview"
                >
                  {TTS_VOICES.map((v) => (
                    <option key={v.value || 'default'} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleVoicePreview}
                  disabled={voicePreviewPlaying}
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Play a short sample of this voice"
                >
                  {voicePreviewPlaying ? 'Playing…' : 'Play sample'}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">Used when the candidate hears the interviewer (browser or API TTS).</p>
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Questions</label>
              {!isBuiltIn && (
                <button
                  type="button"
                  onClick={addQuestion}
                  className="text-sm text-blue-600 hover:underline"
                >
                  + Add question
                </button>
              )}
            </div>
            <div className="space-y-3">
              {editQuestions.map((q, i) => (
                <div key={i} className="flex flex-col gap-2 sm:gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50/50">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
                    <div className="flex gap-2 sm:items-center flex-1 min-w-0">
                      <span className="flex-shrink-0 text-sm font-medium text-gray-600 w-6">{i + 1}.</span>
                      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2">
                        {isBuiltIn ? (
                          <span className="text-xs font-medium text-gray-500 sm:w-48 flex-shrink-0">
                            {MODE_LABELS[q.mode]}
                          </span>
                        ) : (
                          <select
                            value={q.mode}
                            onChange={(e) => setQuestionMode(i, parseInt(e.target.value, 10) as InterviewMode)}
                            className="flex-shrink-0 w-full sm:w-56 px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                            title="Question type (1–5)"
                          >
                            {([1, 2, 3, 4, 5] as const).map((m) => (
                              <option key={m} value={m}>
                                {MODE_LABELS[m]}
                              </option>
                            ))}
                          </select>
                        )}
                        <input
                          type="text"
                          value={q.mainQuestion}
                          onChange={(e) => setQuestion(i, e.target.value)}
                          readOnly={isBuiltIn}
                          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100"
                          placeholder="Question text"
                        />
                      </div>
                    </div>
                    {!isBuiltIn && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(i)}
                        className="flex-shrink-0 self-start sm:self-center px-2 py-1.5 text-red-600 hover:bg-red-50 rounded text-sm"
                        title="Remove question"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {(q.mode === 1 || q.mode === 2) && (
                    <div className="ml-8">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Acceptable answers (one per line)
                      </label>
                      {isBuiltIn ? (
                        <div className="text-sm text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 min-h-[2.5rem]">
                          {q.acceptableAnswers.length === 0
                            ? '—'
                            : q.acceptableAnswers.map((a, j) => (
                                <span key={j}>
                                  {a}
                                  {j < q.acceptableAnswers.length - 1 ? ', ' : ''}
                                </span>
                              ))}
                        </div>
                      ) : (
                        <textarea
                          value={q.acceptableAnswers.join('\n')}
                          onChange={(e) => setQuestionAcceptableAnswers(i, e.target.value)}
                          rows={Math.min(4, Math.max(2, q.acceptableAnswers.length + 1))}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          placeholder="e.g. yes, yeah, I am"
                        />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        {!isBuiltIn && (
          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !editName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none font-medium"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:pointer-events-none font-medium"
            >
              {deleting ? 'Deleting…' : 'Delete template'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
