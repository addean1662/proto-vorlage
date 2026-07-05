'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { ReviewStatus, VerseReviewMeta } from '@/lib/provenance';

interface AdminState {
  cacheBackend: string;
  cacheCount: number;
  keys: string[];
  reviews: Record<string, VerseReviewMeta>;
}

const STATUS_OPTIONS: ReviewStatus[] = ['reviewed', 'corrected', 'generated'];

function displayRef(key: string): string {
  const [book, chapterVerse] = key.split('_');
  if (!book || !chapterVerse) return key;
  return `${book.charAt(0).toUpperCase()}${book.slice(1)} ${chapterVerse}`;
}

function AdminButton({
  children,
  disabled,
  onClick,
  tone = 'default',
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        border: `1px solid ${tone === 'danger' ? 'rgba(180,80,70,.45)' : 'rgba(200,170,120,.2)'}`,
        background: disabled ? 'rgba(200,170,120,.04)' : 'rgba(200,170,120,.08)',
        color: disabled ? 'rgba(200,180,150,.35)' : tone === 'danger' ? '#d48c7c' : '#d4c4a8',
        borderRadius: 6,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 12,
        padding: '8px 12px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

export default function AdminConsole() {
  const [secret, setSecret] = useState('');
  const [reviewer, setReviewer] = useState('');
  const [data, setData] = useState<AdminState | null>(null);
  const [selectedKey, setSelectedKey] = useState('');
  const [status, setStatus] = useState<ReviewStatus>('reviewed');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const selectedReview = selectedKey && data ? data.reviews[selectedKey] : undefined;
  const selectedRef = useMemo(() => displayRef(selectedKey), [selectedKey]);

  async function adminFetch(path: string, init?: RequestInit) {
    if (!secret.trim()) throw new Error('Enter the admin secret first.');

    const response = await fetch(path, {
      ...init,
      headers: {
        'x-cache-admin-secret': secret.trim(),
        ...(init?.body ? { 'content-type': 'application/json' } : {}),
        ...init?.headers,
      },
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(typeof body.error === 'string' ? body.error : `Request failed with ${response.status}`);
    }
    return body;
  }

  async function loadAdminState() {
    setBusy(true);
    setMessage('');
    try {
      const nextData = await adminFetch('/api/admin?limit=100') as AdminState;
      setData(nextData);
      setSelectedKey(current => current || nextData.keys[0] || '');
      setMessage(`Loaded ${nextData.keys.length} cached verse${nextData.keys.length === 1 ? '' : 's'}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load admin data.');
    } finally {
      setBusy(false);
    }
  }

  async function saveReview() {
    if (!selectedKey) return;
    setBusy(true);
    setMessage('');
    try {
      await adminFetch('/api/admin', {
        method: 'POST',
        body: JSON.stringify({
          ref: selectedRef,
          status,
          reviewer: reviewer.trim() || undefined,
          note: note.trim() || undefined,
        }),
      });
      await loadAdminState();
      setMessage(`${selectedRef} marked ${status}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save review.');
    } finally {
      setBusy(false);
    }
  }

  async function clearVerse() {
    if (!selectedKey) return;
    const confirmed = window.confirm(`Clear cached data for ${selectedRef}? The next lookup will regenerate it.`);
    if (!confirmed) return;

    setBusy(true);
    setMessage('');
    try {
      await adminFetch(`/api/admin?ref=${encodeURIComponent(selectedRef)}`, { method: 'DELETE' });
      setSelectedKey('');
      setNote('');
      await loadAdminState();
      setMessage(`${selectedRef} cache cleared.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to clear cached verse.');
    } finally {
      setBusy(false);
    }
  }

  function chooseKey(key: string) {
    const review = data?.reviews[key];
    setSelectedKey(key);
    setStatus(review?.status ?? 'reviewed');
    setNote(review?.note ?? '');
  }

  const reviewedCount = data ? Object.keys(data.reviews).length : 0;

  return (
    <main style={{ minHeight: '100vh', background: '#0c0a07', color: '#d4c4a8', padding: '28px 18px 56px' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'end', flexWrap: 'wrap', marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: '.22em', textTransform: 'uppercase', color: 'rgba(200,180,150,.45)', marginBottom: 8 }}>
              Proto-Vorlage Admin
            </div>
            <h1 style={{ fontSize: 30, fontWeight: 400, margin: 0 }}>Cache Review Console</h1>
          </div>
          <Link href="/" style={{ color: 'rgba(200,180,150,.55)', fontSize: 13, textDecoration: 'none' }}>Back to alignment</Link>
        </div>

        <section style={{ border: '1px solid rgba(200,170,120,.14)', borderRadius: 8, padding: 16, background: 'rgba(200,170,120,.035)', marginBottom: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 10, alignItems: 'end' }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, color: 'rgba(220,205,175,.62)' }}>
              Admin secret
              <input
                value={secret}
                onChange={event => setSecret(event.target.value)}
                type="password"
                autoComplete="off"
                placeholder="x-cache-admin-secret"
                style={{ background: '#14100b', color: '#e0d4c0', border: '1px solid rgba(200,170,120,.18)', borderRadius: 6, padding: '10px 12px' }}
              />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, color: 'rgba(220,205,175,.62)' }}>
              Reviewer
              <input
                value={reviewer}
                onChange={event => setReviewer(event.target.value)}
                placeholder="optional"
                style={{ background: '#14100b', color: '#e0d4c0', border: '1px solid rgba(200,170,120,.18)', borderRadius: 6, padding: '10px 12px' }}
              />
            </label>
            <AdminButton disabled={busy || !secret.trim()} onClick={loadAdminState}>Load cache</AdminButton>
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 12, color: 'rgba(220,205,175,.48)', lineHeight: 1.6 }}>
            The secret is kept in this browser session and sent only as an HTTP header. Do not paste it into URLs.
          </p>
        </section>

        {message && (
          <div style={{ border: '1px solid rgba(200,170,120,.12)', borderRadius: 6, padding: '10px 12px', marginBottom: 18, color: 'rgba(230,215,185,.82)', background: 'rgba(200,170,120,.03)' }}>
            {message}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 18, alignItems: 'start' }}>
          <section style={{ border: '1px solid rgba(200,170,120,.12)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: 14, background: 'rgba(200,170,120,.045)', borderBottom: '1px solid rgba(200,170,120,.1)' }}>
              <div style={{ fontSize: 13, color: '#e0d4c0' }}>Cached Verses</div>
              <div style={{ fontSize: 11, color: 'rgba(200,180,150,.45)', marginTop: 4 }}>
                {data ? `${data.cacheCount} total · ${reviewedCount} reviewed · ${data.cacheBackend}` : 'Load cache to begin'}
              </div>
            </div>
            <div style={{ maxHeight: 560, overflowY: 'auto' }}>
              {data?.keys.map(key => {
                const review = data.reviews[key];
                const active = key === selectedKey;
                return (
                  <button
                    key={key}
                    onClick={() => chooseKey(key)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 10,
                      padding: '12px 14px',
                      border: 0,
                      borderBottom: '1px solid rgba(200,170,120,.06)',
                      background: active ? 'rgba(200,170,120,.1)' : '#0f0d0a',
                      color: '#d4c4a8',
                      cursor: 'pointer',
                    }}
                  >
                    <span>{displayRef(key)}</span>
                    <span style={{ color: review ? '#8ab86e' : 'rgba(200,180,150,.32)', fontSize: 11 }}>
                      {review?.status ?? 'unreviewed'}
                    </span>
                  </button>
                );
              })}
              {data && data.keys.length === 0 && (
                <div style={{ padding: 14, color: 'rgba(200,180,150,.45)' }}>No cached verses found.</div>
              )}
            </div>
          </section>

          <section style={{ border: '1px solid rgba(200,170,120,.12)', borderRadius: 8, padding: 18, background: 'rgba(200,170,120,.025)' }}>
            {selectedKey ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'rgba(200,180,150,.45)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 5 }}>Selected verse</div>
                    <h2 style={{ margin: 0, fontSize: 24, fontWeight: 400 }}>{selectedRef}</h2>
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(200,180,150,.48)', textAlign: 'right' }}>
                    <div>Key: {selectedKey}</div>
                    {selectedReview?.reviewedAt && <div>Reviewed: {new Date(selectedReview.reviewedAt).toLocaleString()}</div>}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 12, marginBottom: 12 }}>
                  <label style={{ display: 'grid', gap: 6, fontSize: 12, color: 'rgba(220,205,175,.62)' }}>
                    Status
                    <select
                      value={status}
                      onChange={event => setStatus(event.target.value as ReviewStatus)}
                      style={{ background: '#14100b', color: '#e0d4c0', border: '1px solid rgba(200,170,120,.18)', borderRadius: 6, padding: '10px 12px' }}
                    >
                      {STATUS_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </label>
                  <label style={{ display: 'grid', gap: 6, fontSize: 12, color: 'rgba(220,205,175,.62)' }}>
                    Review note
                    <input
                      value={note}
                      onChange={event => setNote(event.target.value)}
                      placeholder="e.g. checked against local source tables"
                      style={{ background: '#14100b', color: '#e0d4c0', border: '1px solid rgba(200,170,120,.18)', borderRadius: 6, padding: '10px 12px' }}
                    />
                  </label>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
                  <AdminButton disabled={busy || !secret.trim()} onClick={saveReview}>Save review</AdminButton>
                  <AdminButton disabled={busy || !secret.trim()} onClick={clearVerse} tone="danger">Clear cache</AdminButton>
                  <a href={`/?q=${encodeURIComponent(selectedRef)}`} style={{ border: '1px solid rgba(200,170,120,.2)', color: '#d4c4a8', borderRadius: 6, padding: '8px 12px', fontSize: 12, textDecoration: 'none' }}>
                    Open verse
                  </a>
                </div>

                {selectedReview && (
                  <div style={{ marginTop: 20, borderTop: '1px solid rgba(200,170,120,.09)', paddingTop: 14, fontSize: 12, color: 'rgba(220,205,175,.58)', lineHeight: 1.7 }}>
                    <div>Current status: {selectedReview.status}</div>
                    {selectedReview.reviewer && <div>Reviewer: {selectedReview.reviewer}</div>}
                    {selectedReview.note && <div>Note: {selectedReview.note}</div>}
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: 'rgba(200,180,150,.5)', lineHeight: 1.7 }}>
                Load the cache, then select a verse to record review metadata or clear cached generated data.
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
