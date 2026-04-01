'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type { AnalysisResult, RankedCandidate } from '@/app/api/positions/[id]/analyze/route';

export type InstanceRow = {
  id: string;
  recipientName?: string;
  status: 'not_started' | 'started' | 'completed';
  createdAt: string;
  durationSeconds?: number;
  shareableToken?: string;
  recipientEmail?: string;
  emailSentAt?: string | null;
};

type MergedRow = InstanceRow & {
  rank: number | null;
  overallScore: number | null;
  impressionScore: number | null;
  impressionNotes: string | null;
  notes: string | null;
  questionDetails: RankedCandidate['questionDetails'];
  analyzedAt: string | null;
};

type EmailSendState = { [instanceId: string]: 'sending' | 'sent' | 'error' };

interface AnalysisPanelProps {
  positionId: string;
  instances: InstanceRow[];
  instancesLoading: boolean;
  onCreateNew: () => void;
  hasTemplate: boolean;
}

export default function AnalysisPanel({
  positionId,
  instances,
  instancesLoading,
  onCreateNew,
  hasTemplate,
}: AnalysisPanelProps) {
  const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const [detailCandidate, setDetailCandidate] = useState<RankedCandidate | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scoringPrompt, setScoringPrompt] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const [emailSendState, setEmailSendState] = useState<EmailSendState>({});
  const [instanceEmailSentAt, setInstanceEmailSentAt] = useState<{ [instanceId: string]: string }>({});

  const loadAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/positions/${positionId}/analyze`, { credentials: 'include' });
      const body = await res.json().catch(() => ({})) as AnalysisResult & { error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Failed to load analysis');
      setAnalysisData(body);
      setWarning(body.warning ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analysis');
    } finally {
      setLoading(false);
    }
  }, [positionId]);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch(`/api/positions/${positionId}/analyze/settings`, {
        credentials: 'include',
      });
      if (!res.ok) return;
      const data = (await res.json()) as { scoringPrompt: string };
      setScoringPrompt(data.scoringPrompt);
    } catch {
      // silently ignore
    }
  }, [positionId]);

  useEffect(() => {
    loadAnalysis();
    loadSettings();
  }, [loadAnalysis, loadSettings]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    setWarning(null);
    try {
      const res = await fetch(`/api/positions/${positionId}/analyze`, {
        method: 'POST',
        credentials: 'include',
      });
      const body = await res.json().catch(() => ({})) as AnalysisResult & { error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Analysis failed');
      setAnalysisData(body);
      setWarning(body.warning ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    setSettingsError(null);
    try {
      const res = await fetch(`/api/positions/${positionId}/analyze/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ scoringPrompt }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? 'Failed to save settings');
      }
      setSettingsOpen(false);
    } catch (e) {
      setSettingsError(e instanceof Error ? e.message : 'Failed to save settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleCopyLink = (inst: InstanceRow) => {
    if (!inst.shareableToken) return;
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/interview/${inst.shareableToken}`
        : `/interview/${inst.shareableToken}`;
    navigator.clipboard.writeText(url);
    setCopiedId(inst.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleSendEmail = async (inst: InstanceRow) => {
    setEmailSendState((s) => ({ ...s, [inst.id]: 'sending' }));
    try {
      const res = await fetch(`/api/instances/${inst.id}/send-email`, {
        method: 'POST',
        credentials: 'include',
      });
      const body = await res.json().catch(() => ({})) as { sentAt?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Failed to send');
      setEmailSendState((s) => ({ ...s, [inst.id]: 'sent' }));
      if (body.sentAt) {
        setInstanceEmailSentAt((s) => ({ ...s, [inst.id]: body.sentAt! }));
      }
    } catch {
      setEmailSendState((s) => ({ ...s, [inst.id]: 'error' }));
      setTimeout(() => setEmailSendState((s) => { const n = { ...s }; delete n[inst.id]; return n; }), 3000);
    }
  };

  const summary = analysisData?.summary;

  const lastAnalyzedText = summary?.lastAnalyzedAt
    ? new Date(summary.lastAnalyzedAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  // Merge instances with analysis candidates
  const candidateMap = new Map<string, RankedCandidate>();
  (analysisData?.candidates ?? []).forEach((c) => candidateMap.set(c.instanceId, c));

  const mergedRows: MergedRow[] = instances.map((inst) => {
    const c = candidateMap.get(inst.id);
    return {
      ...inst,
      rank: c?.rank ?? null,
      overallScore: c?.overallScore ?? null,
      impressionScore: c?.impressionScore ?? null,
      impressionNotes: c?.impressionNotes ?? null,
      notes: c?.notes ?? null,
      questionDetails: c?.questionDetails ?? null,
      analyzedAt: c?.analyzedAt ?? null,
    };
  });

  // Sort: ranked rows by rank, then unranked by createdAt desc
  mergedRows.sort((a, b) => {
    if (a.rank !== null && b.rank !== null) return a.rank - b.rank;
    if (a.rank !== null) return -1;
    if (b.rank !== null) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const isBodyLoading = instancesLoading || loading;

  return (
    <>
      <div className="bg-[var(--retro-bg-surface)] border border-[var(--retro-border-color)] rounded-lg overflow-hidden mt-6 admin-card">
        {/* Header */}
        <div className="flex flex-col gap-2 px-6 py-4 border-b border-[var(--retro-border-color)]">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-lg font-semibold text-[var(--retro-text-primary)]">Candidates</h2>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              title="Scoring settings"
              className="p-1.5 rounded-lg text-[var(--retro-text-muted)] hover:text-[var(--retro-text-primary)] hover:bg-[var(--retro-bg-raised)] transition-colors flex-shrink-0"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path
                  fillRule="evenodd"
                  d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
          {!isBodyLoading && summary && (
            <p className="text-sm text-[var(--retro-text-muted)]">
              {summary.notStarted} not started · {summary.started} in progress ·{' '}
              {summary.completed} completed
              {lastAnalyzedText && (
                <>
                  {' '}· Last analysed: {lastAnalyzedText}
                  {summary.newlyScored > 0 && ` (${summary.newlyScored} new)`}
                </>
              )}
            </p>
          )}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={analyzing || isBodyLoading}
              className="px-4 py-2 bg-[#F28A0F] text-white rounded-lg hover:bg-[#d47b0a] disabled:opacity-50 disabled:pointer-events-none font-medium text-sm flex items-center gap-1"
            >
              {analyzing ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Analysing…
                </>
              ) : (
                <>▶ Analyze</>
              )}
            </button>
            {hasTemplate && (
              <button
                type="button"
                onClick={onCreateNew}
                className="px-4 py-2 bg-[#F28A0F] text-white rounded-lg hover:bg-[#d47b0a] font-medium text-sm"
              >
                Create New
              </button>
            )}
          </div>
        </div>

        {/* Error / warning */}
        {error && (
          <p className="px-6 py-2 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
        {warning && !error && (
          <p className="px-6 py-2 text-sm text-amber-600 dark:text-amber-400">
            {warning}
          </p>
        )}

        {/* Body */}
        {isBodyLoading ? (
          <p className="p-6 text-[var(--retro-text-muted)]">Loading…</p>
        ) : mergedRows.length === 0 ? (
          <p className="p-6 text-[var(--retro-text-secondary)]">
            No candidates yet.{hasTemplate ? ' Click Create New to add recipients.' : ''}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--retro-border-color)]">
              <thead className="bg-[var(--retro-bg-raised)]">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--retro-text-muted)] uppercase w-10">
                    #
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--retro-text-muted)] uppercase">
                    Candidate
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--retro-text-muted)] uppercase w-24">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--retro-text-muted)] uppercase w-20">
                    Duration
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--retro-text-muted)] uppercase w-16">
                    Score
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--retro-text-muted)] uppercase w-24">
                    Impression
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--retro-text-muted)] uppercase">
                    Notes
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-[var(--retro-text-muted)] uppercase">
                    Email
                  </th>
                  <th className="px-4 py-2 w-10" aria-label="Copy link" />
                </tr>
              </thead>
              <tbody className="bg-[var(--retro-bg-surface)] divide-y divide-[var(--retro-border-color)]">
                {mergedRows.map((row) => {
                  const isScored = row.rank !== null;
                  const canOpenDetail = isScored && (row.notes || row.questionDetails);
                  const detailCandidate: RankedCandidate = {
                    instanceId: row.id,
                    recipientName: row.recipientName,
                    status: row.status,
                    rank: row.rank,
                    overallScore: row.overallScore,
                    impressionScore: row.impressionScore,
                    impressionNotes: row.impressionNotes,
                    notes: row.notes,
                    questionDetails: row.questionDetails,
                    analyzedAt: row.analyzedAt,
                  };
                  return (
                    <tr key={row.id} className={isScored ? '' : 'opacity-60'}>
                      <td className="px-4 py-2 text-sm text-center font-medium text-[var(--retro-text-primary)]">
                        {row.rank ?? '—'}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <Link
                          href={`/admin/interviews/${encodeURIComponent(row.id)}`}
                          className="font-medium text-[#F28A0F] hover:underline"
                        >
                          {row.recipientName ?? '—'}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span
                          className={
                            row.status === 'completed'
                              ? 'text-green-600 dark:text-green-400'
                              : row.status === 'started'
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-[var(--retro-text-muted)]'
                          }
                        >
                          {row.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-[var(--retro-text-secondary)]">
                        {formatDuration(row.durationSeconds, row.status)}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {row.overallScore !== null ? (
                          <span
                            className={`font-semibold ${
                              row.overallScore >= 75
                                ? 'text-green-700 dark:text-green-400'
                                : row.overallScore >= 50
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-red-700 dark:text-red-400'
                            }`}
                          >
                            {row.overallScore}
                          </span>
                        ) : (
                          <span className="text-[var(--retro-text-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-[var(--retro-text-secondary)]">
                        {row.impressionScore !== null ? `${row.impressionScore}/10` : '—'}
                      </td>
                      <td className="px-4 py-2 text-sm text-[var(--retro-text-secondary)] max-w-xs">
                        {row.status === 'not_started' ? (
                          <span className="text-[var(--retro-text-muted)] italic">Not started</span>
                        ) : canOpenDetail ? (
                          <button
                            type="button"
                            onClick={() => setDetailCandidate(detailCandidate)}
                            className="text-left line-clamp-2 hover:text-[#F28A0F] underline decoration-dotted underline-offset-2 cursor-pointer"
                          >
                            {row.notes ?? 'View details'}
                          </button>
                        ) : (
                          <span className="text-[var(--retro-text-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {!row.recipientEmail ? (
                          <span className="text-[var(--retro-text-muted)]">—</span>
                        ) : (() => {
                          const sentAt = instanceEmailSentAt[row.id] ?? row.emailSentAt;
                          const state = emailSendState[row.id];
                          if (sentAt) {
                            return (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-green-600 dark:text-green-400 text-xs whitespace-nowrap">
                                  Sent {new Date(sentAt).toLocaleDateString()}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleSendEmail(row)}
                                  disabled={state === 'sending'}
                                  className="text-xs text-[var(--retro-text-muted)] hover:text-[#F28A0F] underline disabled:opacity-50"
                                >
                                  {state === 'sending' ? 'Sending…' : 'Resend'}
                                </button>
                              </div>
                            );
                          }
                          return (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs text-[var(--retro-text-secondary)] truncate max-w-[120px]" title={row.recipientEmail}>
                                {row.recipientEmail}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleSendEmail(row)}
                                disabled={state === 'sending'}
                                className="text-xs px-2 py-0.5 bg-[#F28A0F] text-white rounded hover:bg-[#d47b0a] disabled:opacity-50 whitespace-nowrap"
                              >
                                {state === 'sending' ? 'Sending…' : state === 'error' ? 'Error' : 'Send invite'}
                              </button>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-2">
                        {row.shareableToken ? (
                          <button
                            type="button"
                            onClick={() => handleCopyLink(row)}
                            title="Copy interview link"
                            className="p-1 rounded text-[var(--retro-text-muted)] hover:text-[var(--retro-text-primary)] hover:bg-[var(--retro-bg-raised)] transition-colors"
                          >
                            {copiedId === row.id ? (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-500">
                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
                                <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" />
                              </svg>
                            )}
                          </button>
                        ) : (
                          <span />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Candidate detail modal */}
      {detailCandidate && (
        <CandidateDetailModal
          candidate={detailCandidate}
          onClose={() => setDetailCandidate(null)}
        />
      )}

      {/* Settings modal */}
      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="analysis-settings-title"
        >
          <div className="bg-[var(--retro-bg-surface)] rounded-lg shadow-xl max-w-lg w-full mx-4 p-6 border border-[var(--retro-border-color)] admin-card">
            <h2
              id="analysis-settings-title"
              className="text-lg font-semibold text-[var(--retro-text-primary)] mb-4"
            >
              Scoring settings
            </h2>
            <label className="block text-sm font-medium text-[var(--retro-text-secondary)] mb-1">
              Scoring rubric
            </label>
            <textarea
              value={scoringPrompt}
              onChange={(e) => setScoringPrompt(e.target.value)}
              rows={12}
              className="w-full px-3 py-2 border border-[var(--retro-border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28A0F] text-[var(--retro-text-primary)] bg-[var(--retro-bg-raised)] resize-y mb-4 text-sm font-mono"
            />
            {settingsError && (
              <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
                {settingsError}
              </p>
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={settingsSaving}
                className="px-4 py-2 bg-[#F28A0F] text-white rounded-lg hover:bg-[#d47b0a] font-medium disabled:opacity-50 disabled:pointer-events-none"
              >
                {settingsSaving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!settingsSaving) setSettingsOpen(false);
                }}
                disabled={settingsSaving}
                className="px-4 py-2 border border-[var(--retro-border-color)] text-[var(--retro-text-secondary)] rounded-lg hover:bg-[var(--retro-bg-raised)] font-medium disabled:opacity-50 disabled:pointer-events-none"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function formatDuration(seconds: number | undefined, status: 'not_started' | 'started' | 'completed'): string {
  if (status === 'not_started' || seconds == null || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function scoreColor(score: number): string {
  if (score >= 8) return 'text-green-700 dark:text-green-400';
  if (score >= 5) return 'text-amber-700 dark:text-amber-400';
  return 'text-red-700 dark:text-red-400';
}

function CandidateDetailModal({
  candidate: c,
  onClose,
}: {
  candidate: RankedCandidate;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[var(--retro-bg-surface)] rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-[var(--retro-border-color)] admin-card">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-[var(--retro-border-color)] flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-[var(--retro-text-primary)]">
              {c.recipientName ?? 'Candidate'}
            </h2>
            <p className="text-sm text-[var(--retro-text-muted)] mt-0.5">
              Overall score:{' '}
              <span
                className={`font-semibold ${
                  (c.overallScore ?? 0) >= 75
                    ? 'text-green-700 dark:text-green-400'
                    : (c.overallScore ?? 0) >= 50
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-red-700 dark:text-red-400'
                }`}
              >
                {c.overallScore ?? '—'}/100
              </span>
              {c.rank !== null && (
                <span className="ml-3 text-[var(--retro-text-muted)]">Rank #{c.rank}</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 text-[var(--retro-text-muted)] hover:text-[var(--retro-text-primary)] flex-shrink-0"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-6 py-4 space-y-6">

          {/* Overall summary */}
          {c.notes && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--retro-text-muted)] mb-2">
                Summary
              </h3>
              <p className="text-sm text-[var(--retro-text-secondary)] leading-relaxed">{c.notes}</p>
            </section>
          )}

          {/* Per-question scores */}
          {c.questionDetails && c.questionDetails.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--retro-text-muted)] mb-3">
                Question scores
              </h3>
              <div className="space-y-3">
                {c.questionDetails.map((qd) => (
                  <div
                    key={qd.questionIndex}
                    className="bg-[var(--retro-bg-raised)] rounded-lg px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <p className="text-sm font-medium text-[var(--retro-text-primary)] leading-snug">
                        {qd.question}
                      </p>
                      <span
                        className={`text-sm font-bold flex-shrink-0 ${scoreColor(qd.score)}`}
                      >
                        {qd.score}/10
                      </span>
                    </div>
                    {qd.notes && (
                      <p className="text-sm text-[var(--retro-text-muted)] leading-relaxed">
                        {qd.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Overall impression */}
          {c.impressionScore !== null && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--retro-text-muted)] mb-3">
                Overall impression
              </h3>
              <div className="bg-[var(--retro-bg-raised)] rounded-lg px-4 py-3">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <p className="text-sm font-medium text-[var(--retro-text-primary)]">
                    Enthusiasm, communication, reliability, professionalism
                  </p>
                  <span className={`text-sm font-bold flex-shrink-0 ${scoreColor(c.impressionScore)}`}>
                    {c.impressionScore}/10
                  </span>
                </div>
                {c.impressionNotes && (
                  <p className="text-sm text-[var(--retro-text-muted)] leading-relaxed">
                    {c.impressionNotes}
                  </p>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--retro-border-color)] flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[var(--retro-border-color)] text-[var(--retro-text-secondary)] rounded-lg hover:bg-[var(--retro-bg-raised)] font-medium text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
