'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { getTemplateById } from '@/constants/templates';
import type { InterviewTemplate, Question } from '@/types';

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
  const [editQuestions, setEditQuestions] = useState<string[]>([]);

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
      setEditQuestions((builtIn.questions ?? []).map((q) => q.mainQuestion));
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
      setEditQuestions((data.questions ?? []).map((q: Question) => q.mainQuestion));
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
        .map((mainQuestion, i) => {
          const existing = template.questions?.[i];
          return {
            mainQuestion: mainQuestion.trim(),
            subTopics: existing?.subTopics ?? [],
            mode: existing?.mode ?? 4,
            ...(existing?.acceptableAnswers != null && { acceptableAnswers: existing.acceptableAnswers }),
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

  const addQuestion = () => setEditQuestions((prev) => [...prev, '']);
  const removeQuestion = (index: number) =>
    setEditQuestions((prev) => prev.filter((_, i) => i !== index));
  const setQuestion = (index: number, value: string) =>
    setEditQuestions((prev) => prev.map((v, i) => (i === index ? value : v)));

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <p className="text-gray-500">Loading template...</p>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <p className="text-red-600">{error || 'Template not found'}</p>
        <Link href="/admin/templates" className="mt-4 inline-block text-blue-600 hover:underline">
          Back to templates
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <Link href="/admin/templates" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to templates
        </Link>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h1 className="text-xl font-semibold text-gray-800 mb-2">Template details</h1>
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
            <div className="space-y-2">
              {editQuestions.map((q, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="flex-shrink-0 text-sm text-gray-500 mt-2.5">{i + 1}.</span>
                  <input
                    type="text"
                    value={q}
                    onChange={(e) => setQuestion(i, e.target.value)}
                    readOnly={isBuiltIn}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100"
                    placeholder="Question text"
                  />
                  {!isBuiltIn && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(i)}
                      className="flex-shrink-0 px-2 py-1.5 text-red-600 hover:bg-red-50 rounded text-sm"
                      title="Remove question"
                    >
                      Remove
                    </button>
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
