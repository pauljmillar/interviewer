'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { InterviewInstanceRecord, SessionRecord } from '@/types';

type InstanceStatus = 'not_started' | 'started' | 'completed';

type DetailResponse = {
  instance: InterviewInstanceRecord;
  session: SessionRecord | null;
  status: InstanceStatus | null;
  templateName: string | null;
  positionName: string | null;
};

export default function AdminInterviewInstanceDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : null;
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSentAt, setEmailSentAt] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [editingContact, setEditingContact] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [contactSaving, setContactSaving] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/instances/${encodeURIComponent(id)}`, {
          credentials: 'include',
        });
        if (!res.ok) {
          if (!cancelled) setError(res.status === 404 ? 'Instance not found' : 'Failed to load');
          return;
        }
        const json = await res.json();
        if (!cancelled) {
          setData(json);
          setEmailSentAt(json.instance?.emailSentAt ?? null);
          setEditName(json.instance?.recipientName ?? '');
          setEditEmail(json.instance?.recipientEmail ?? '');
        }
      } catch {
        if (!cancelled) setError('Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSendEmail = async () => {
    if (!id) return;
    setEmailSending(true);
    setEmailError(null);
    try {
      const res = await fetch(`/api/instances/${encodeURIComponent(id)}/send-email`, {
        method: 'POST',
        credentials: 'include',
      });
      const body = await res.json().catch(() => ({})) as { sentAt?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Failed to send');
      setEmailSentAt(body.sentAt ?? new Date().toISOString());
    } catch (e) {
      setEmailError(e instanceof Error ? e.message : 'Failed to send email');
    } finally {
      setEmailSending(false);
    }
  };

  const handleSaveContact = async () => {
    if (!id) return;
    setContactSaving(true);
    setContactError(null);
    try {
      const res = await fetch(`/api/instances/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientName: editName, recipientEmail: editEmail }),
      });
      const body = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Failed to save');
      setData((prev) =>
        prev
          ? {
              ...prev,
              instance: {
                ...prev.instance,
                recipientName: editName || undefined,
                recipientEmail: editEmail || undefined,
              },
            }
          : prev
      );
      setEditingContact(false);
    } catch (e) {
      setContactError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setContactSaving(false);
    }
  };

  if (!id) return <p className="p-4 text-[var(--retro-text-muted)]">Loading...</p>;
  if (loading) return <p className="p-4 text-[var(--retro-text-secondary)]">Loading instance...</p>;
  if (error || !data) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <p className="text-red-600 dark:text-red-400">{error ?? 'Not found'}</p>
        <Link href="/admin/interviews" className="mt-4 inline-block text-[#F28A0F] hover:underline">
          Back to interviews
        </Link>
      </div>
    );
  }

  const { instance, session, status, templateName, positionName } = data;
  const messages = session?.messages ?? [];

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-4">
        <Link href="/admin/interviews" className="text-sm text-[var(--retro-text-muted)] hover:text-[var(--retro-text-primary)]">
          ← Back to interviews
        </Link>
      </div>

      <div className="bg-[var(--retro-bg-surface)] border border-[var(--retro-border-color)] rounded-lg admin-card p-6 mb-6">
        <h1 className="text-xl font-semibold text-[var(--retro-text-primary)] mb-4">Interview instance</h1>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="font-medium text-[var(--retro-text-muted)]">Recipient</dt>
            <dd className="text-[var(--retro-text-primary)] flex items-center gap-2">
              {instance.recipientName ?? '—'}
              {!editingContact && (
                <button
                  type="button"
                  onClick={() => { setEditingContact(true); setContactError(null); }}
                  className="text-xs text-[#F28A0F] hover:underline"
                >
                  Edit
                </button>
              )}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-[var(--retro-text-muted)]">Position</dt>
            <dd className="text-[var(--retro-text-primary)]">{positionName ?? instance.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="font-medium text-[var(--retro-text-muted)]">Template</dt>
            <dd className="text-[var(--retro-text-primary)]">{templateName ?? '—'}</dd>
          </div>
          <div>
            <dt className="font-medium text-[var(--retro-text-muted)]">Date</dt>
            <dd className="text-[var(--retro-text-primary)]">
              {new Date(instance.createdAt).toLocaleString()}
              {status && (
                <span
                  className={`ml-2 ${
                    status === 'completed'
                      ? 'text-green-600 dark:text-green-400'
                      : status === 'started'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-[var(--retro-text-muted)]'
                  }`}
                >
                  · {status.replace('_', ' ')}
                </span>
              )}
            </dd>
          </div>
          {session?.recordingKey && (
            <div className="sm:col-span-2">
              <dt className="font-medium text-[var(--retro-text-muted)]">Recording</dt>
              <dd>
                <a
                  href={`/api/instances/${id}/recording`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#F28A0F] hover:underline"
                >
                  View recording
                </a>
              </dd>
            </div>
          )}
          {editingContact ? (
            <div className="sm:col-span-2">
              <dt className="font-medium text-[var(--retro-text-muted)] mb-2">Edit contact</dt>
              <dd className="space-y-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Full name"
                  className="w-full px-3 py-2 border border-[var(--retro-border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28A0F] text-[var(--retro-text-primary)] bg-[var(--retro-bg-raised)] text-sm"
                />
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full px-3 py-2 border border-[var(--retro-border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F28A0F] text-[var(--retro-text-primary)] bg-[var(--retro-bg-raised)] text-sm"
                />
                {contactError && (
                  <p className="text-sm text-red-600 dark:text-red-400">{contactError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveContact}
                    disabled={contactSaving}
                    className="px-3 py-1.5 text-sm bg-[#F28A0F] text-white rounded-lg hover:bg-[#d47b0a] disabled:opacity-50"
                  >
                    {contactSaving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingContact(false)}
                    disabled={contactSaving}
                    className="px-3 py-1.5 text-sm border border-[var(--retro-border-color)] text-[var(--retro-text-secondary)] rounded-lg hover:bg-[var(--retro-bg-raised)] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </dd>
            </div>
          ) : instance.recipientEmail ? (
            <div className="sm:col-span-2">
              <dt className="font-medium text-[var(--retro-text-muted)]">Candidate email</dt>
              <dd className="text-[var(--retro-text-primary)] flex items-center gap-3 flex-wrap">
                <span>{instance.recipientEmail}</span>
                <span className="text-sm text-[var(--retro-text-muted)]">
                  {emailSentAt
                    ? `Invitation sent ${new Date(emailSentAt).toLocaleString()}`
                    : 'Not sent'}
                </span>
                <button
                  type="button"
                  onClick={handleSendEmail}
                  disabled={emailSending}
                  className="px-3 py-1 text-sm bg-[#F28A0F] text-white rounded-lg hover:bg-[#d47b0a] disabled:opacity-50 disabled:pointer-events-none"
                >
                  {emailSending ? 'Sending…' : emailSentAt ? 'Resend invitation' : 'Send invite'}
                </button>
                {emailError && (
                  <span className="text-sm text-red-600 dark:text-red-400">{emailError}</span>
                )}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className="bg-[var(--retro-bg-surface)] border border-[var(--retro-border-color)] rounded-lg admin-card overflow-hidden">
        <h2 className="text-base font-semibold text-[var(--retro-text-primary)] px-6 py-3 border-b border-[var(--retro-border-color)]">
          Questions asked and responses given
        </h2>
        {messages.length === 0 ? (
          <p className="p-6 text-[var(--retro-text-muted)]">No messages yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--retro-border-color)]">
            {messages.map((m, i) => (
              <li key={i} className="p-6">
                <div className="text-xs font-medium text-[var(--retro-text-muted)] mb-1">
                  {m.role === 'assistant' ? 'Interviewer' : 'Candidate'}
                </div>
                <div className="text-[var(--retro-text-primary)] whitespace-pre-wrap">{m.content}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
