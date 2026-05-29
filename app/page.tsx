'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import SearchBar from './components/SearchBar';
import VerseTable from './components/VerseTable';
import AlignedStreams from './components/AlignedStreams';
import Legend from './components/Legend';
import { getAdjacentRef } from '@/lib/torah';
import type { Correction } from '@/lib/claude';

interface WordEntry { orig: string; eng: string; xlit?: string; def?: string; lemma?: string; strongs?: string; }
interface DSSEntry extends WordEntry { frag: string | null; status: 'extant' | 'attested' | 'partial' | 'lost'; paleo?: boolean; }
interface VerseRow { mt: WordEntry; lxx: WordEntry; vul: WordEntry; dss: DSSEntry; }

// Old (row-based) format — served from legacy cache entries
interface OldVerseData { ref: string; title: string; subtitle: string; rows: VerseRow[]; }

// New (source-order) format
interface Traditions { dss: DSSEntry[]; lxx: WordEntry[]; mt: WordEntry[]; vul: WordEntry[]; }
interface AlignmentGroup { lxx: number | null; mt: number | null; vul: number | null; }
interface NewVerseData { ref: string; title: string; subtitle: string; traditions: Traditions; groups: AlignmentGroup[]; }

type VerseData = OldVerseData | NewVerseData;
function isNewFormat(d: VerseData): d is NewVerseData { return 'traditions' in d; }

// ── SSE event parsing ─────────────────────────────────────────────────────────
function parseSSEBuffer(buffer: string): { events: Array<{ event: string; data: unknown }>; remaining: string } {
  const events: Array<{ event: string; data: unknown }> = [];
  const parts = buffer.split('\n\n');
  const remaining = parts.pop() ?? '';
  for (const part of parts) {
    let eventType = 'message';
    let dataStr = '';
    for (const line of part.split('\n')) {
      if (line.startsWith('event: ')) eventType = line.slice(7).trim();
      else if (line.startsWith('data: ')) dataStr = line.slice(6);
    }
    if (dataStr) {
      try { events.push({ event: eventType, data: JSON.parse(dataStr) }); } catch { /* skip */ }
    }
  }
  return { events, remaining };
}

// ── Source label helpers ──────────────────────────────────────────────────────
const SOURCE_LABELS: Record<string, { label: string; color: string; font: string }> = {
  mt:  { label: 'Masoretic Text', color: '#d4a574', font: "'SBL Hebrew','Ezra SIL','Times New Roman',serif" },
  lxx: { label: 'Septuagint',     color: '#7ea8be', font: "var(--font-garamond),'EB Garamond',serif" },
  vul: { label: 'Vulgate',        color: '#a8b896', font: "var(--font-garamond),'EB Garamond',serif" },
};

export default function Home() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [cachedCount, setCachedCount] = useState<number | null>(null);
  const [lastRef, setLastRef] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Progressive display state
  const [displayData, setDisplayData] = useState<VerseData | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [sourcePreview, setSourcePreview] = useState<Record<string, string>>({});
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [alignmentLoading, setAlignmentLoading] = useState(false);

  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isCompleteRef = useRef(false);
  const loadingRef = useRef(false);
  const displayDataRef = useRef<VerseData | null>(null);

  // Keep refs in sync so the keydown handler always sees fresh values
  useEffect(() => { isCompleteRef.current = isComplete; }, [isComplete]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { displayDataRef.current = displayData; }, [displayData]);

  // Keyboard navigation: ← prev  → next
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!isCompleteRef.current || loadingRef.current) return;
      const data = displayDataRef.current;
      if (!data) return;
      if (e.key === 'ArrowRight') {
        const next = getAdjacentRef(data.ref, 'next');
        if (next) { window.scrollTo({ top: 0, behavior: 'smooth' }); setQuery(next); handleLookup(next); }
      } else if (e.key === 'ArrowLeft') {
        const prev = getAdjacentRef(data.ref, 'prev');
        if (prev) { window.scrollTo({ top: 0, behavior: 'smooth' }); setQuery(prev); handleLookup(prev); }
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startCooldown() {
    setCooldown(30);
    cooldownIntervalRef.current = setInterval(() => {
      setCooldown(s => {
        if (s <= 1) { clearInterval(cooldownIntervalRef.current!); cooldownIntervalRef.current = null; return 0; }
        return s - 1;
      });
    }, 1000);
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem('proto_vorlage_history');
      if (stored) setHistory(JSON.parse(stored));
    } catch {}
  }, []);

  useEffect(() => {
    fetch('/api/lookup').then(r => r.json()).then(d => setCachedCount(d.count ?? null)).catch(() => {});
  }, []);

  function addToHistory(ref: string) {
    setHistory(prev => {
      const filtered = prev.filter(r => r !== ref);
      const next = [...filtered, ref].slice(-20);
      try { localStorage.setItem('proto_vorlage_history', JSON.stringify(next)); } catch {}
      return next;
    });
  }

  async function handleLookup(ref: string) {
    if (!ref.trim()) return;
    const trimmed = ref.trim();
    setLastRef(trimmed);

    // Abort any in-flight stream
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Reset all state
    setLoading(true);
    setError(null);
    setDisplayData(null);
    setFromCache(false);
    setIsComplete(false);
    setSourcePreview({});
    setCorrections([]);
    setAlignmentLoading(false);
    setPhase('Connecting…');
    setElapsed(0);

    if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    elapsedIntervalRef.current = setInterval(() => setElapsed(s => s + 1), 1000);

    let sseBuffer = '';

    try {
      const res = await fetch('/api/lookup/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: trimmed }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const { events, remaining } = parseSSEBuffer(sseBuffer);
        sseBuffer = remaining;

        for (const { event, data } of events) {
          const d = data as Record<string, unknown>;

          if (event === 'cached') {
            setDisplayData(d.data as VerseData);
            setFromCache(true);
            setIsComplete(true);
            addToHistory((d.data as VerseData).ref);
            setLoading(false);
            if (elapsedIntervalRef.current) { clearInterval(elapsedIntervalRef.current); elapsedIntervalRef.current = null; }
            break;
          }

          if (event === 'phase') setPhase(d.text as string);

          if (event === 'source_preview') {
            setSourcePreview(prev => ({ ...prev, [d.source as string]: d.text as string }));
          }

          // New: word lists arrive before alignment — show columns immediately
          if (event === 'traditions') {
            setDisplayData(prev => {
              const base = { ref: trimmed, title: '', subtitle: '', groups: [] };
              if (prev && isNewFormat(prev)) return { ...prev, traditions: d.traditions as Traditions };
              return { ...base, traditions: d.traditions as Traditions };
            });
            setAlignmentLoading(true);
          }

          if (event === 'meta') {
            setDisplayData(prev => {
              if (!prev) return { ref: d.ref as string, title: d.title as string, subtitle: d.subtitle as string, rows: [] };
              return { ...prev, ref: d.ref as string, title: d.title as string, subtitle: d.subtitle as string };
            });
          }

          // Old format: progressive row streaming (legacy cache entries)
          if (event === 'row') {
            setDisplayData(prev => {
              if (!prev || isNewFormat(prev)) return prev;
              return { ...prev, rows: [...prev.rows, d.row as VerseRow] };
            });
          }

          if (event === 'correction') {
            setCorrections(prev => [...prev, d as unknown as Correction]);
          }

          if (event === 'done') {
            const finalData = d.data as VerseData;
            setDisplayData(finalData);
            setAlignmentLoading(false);
            setFromCache(false);
            setIsComplete(true);
            addToHistory(finalData.ref);
            setCachedCount(prev => (prev !== null ? prev + 1 : 1));
            startCooldown();
            setLoading(false);
            if (elapsedIntervalRef.current) { clearInterval(elapsedIntervalRef.current); elapsedIntervalRef.current = null; }
          }

          if (event === 'error') {
            const msg = d.message as string;
            setError(msg === 'rate_limited' ? 'rate_limited' : msg);
            setLoading(false);
            if (elapsedIntervalRef.current) { clearInterval(elapsedIntervalRef.current); elapsedIntervalRef.current = null; }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError((err instanceof Error) ? err.message : String(err));
      setLoading(false);
      if (elapsedIntervalRef.current) { clearInterval(elapsedIntervalRef.current); elapsedIntervalRef.current = null; }
    }
  }

  // Whether to show the source preview area
  const showPreviews = loading && Object.keys(sourcePreview).length > 0 && (!displayData || (!isNewFormat(displayData) && (displayData as OldVerseData).rows.length === 0));
  // Fade previews once rows start arriving
  const previewsVisible = showPreviews;

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#0c0a07', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '24px 28px 16px', borderBottom: '1px solid rgba(200,170,120,.1)', background: 'linear-gradient(180deg, rgba(30,24,16,.8), transparent)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: '.25em', textTransform: 'uppercase', color: 'rgba(200,180,150,.55)', fontWeight: 600, marginBottom: 4 }}>
              Proto-Vorlage
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 400, color: '#e0d4c0', margin: 0 }}>
              Torah Textual Tradition Alignment
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(200,180,150,.6)', fontStyle: 'italic', margin: '2px 0 0' }}>
              Genesis · Exodus · Leviticus · Numbers · Deuteronomy
            </p>
            <div style={{ marginTop: 10, display: 'flex', gap: 18 }}>
              <Link href="/dss-fragments" style={{ fontSize: 11, color: 'rgba(200,180,150,.4)', letterSpacing: '.1em', textTransform: 'uppercase', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(200,180,150,.75)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(200,180,150,.4)')}>
                Dead Sea Scroll Witnesses →
              </Link>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, color: '#8ab86e', fontWeight: 600 }}>
              {cachedCount ?? 0} <span style={{ fontWeight: 400, color: 'rgba(200,180,150,.35)' }}>/ 5,853</span>
            </div>
            <div style={{ fontSize: 10, color: 'rgba(200,180,150,.5)' }}>Torah verses cached</div>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ padding: '16px 28px 4px', borderBottom: '1px solid rgba(200,170,120,.07)', background: 'rgba(20,16,10,.5)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <SearchBar
            query={query}
            onQueryChange={setQuery}
            onSubmit={handleLookup}
            loading={loading}
            history={history}
            cooldown={cooldown}
          />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', padding: '0 28px 60px' }}>
      <div style={{ maxWidth: 1400, width: '100%', margin: '0 auto' }}>

        {/* Error */}
        {error && !loading && (
          error === 'rate_limited' ? (
            <div style={{ margin: '0 0 28px', padding: '28px 24px', background: 'rgba(180,140,60,.05)', border: '1px solid rgba(180,140,60,.15)', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 28, opacity: .25, marginBottom: 12 }}>⧖</div>
              <p style={{ margin: '0 0 6px', fontSize: 15, color: 'rgba(200,180,150,.8)', fontFamily: "var(--font-garamond),'EB Garamond',serif" }}>
                The scrolls require a moment of patience.
              </p>
              <p style={{ margin: '0 0 18px', fontSize: 12, color: 'rgba(200,180,150,.35)', fontStyle: 'italic', lineHeight: 1.6 }}>
                API rate limit reached — the alignment engine is resting. Please wait a minute and try again.
              </p>
              <button onClick={() => handleLookup(lastRef)} style={{ background: 'none', border: '1px solid rgba(180,140,60,.25)', color: 'rgba(200,180,150,.5)', padding: '6px 18px', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontFamily: "var(--font-garamond),'EB Garamond',serif" }}>
                Try again
              </button>
            </div>
          ) : (
            <div style={{ margin: '0 0 28px', padding: '20px', background: 'rgba(160,60,60,.08)', border: '1px solid rgba(160,60,60,.2)', borderRadius: 8 }}>
              <p style={{ margin: 0, fontSize: 14, color: '#c07070', lineHeight: 1.6 }}>{error}</p>
              <button onClick={() => handleLookup(lastRef)} style={{ marginTop: 10, background: 'none', border: '1px solid rgba(160,60,60,.3)', color: '#c07070', padding: '5px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontFamily: "var(--font-garamond),'EB Garamond',serif" }}>
                Retry
              </button>
            </div>
          )
        )}

        {/* Loading header panel — only shown before table appears */}
        {loading && !displayData && (
          <div style={{ maxWidth: 620, margin: '20px auto 36px', padding: '28px 32px', background: 'rgba(200,170,120,.03)', border: '1px solid rgba(200,170,120,.1)', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ width: 28, height: 28, margin: '0 auto 18px', border: '2px solid rgba(200,170,120,.12)', borderTop: '2px solid rgba(200,170,120,.5)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ margin: '0 0 16px', fontSize: 15, color: 'rgba(200,180,150,.75)', fontFamily: "var(--font-garamond),'EB Garamond',serif", lineHeight: 1.6 }}>
              Retrieving this verse from the Masoretic Text, Septuagint, and Vulgate —
              then searching the Dead Sea Scrolls for manuscript evidence.
            </p>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(200,180,150,.38)', fontStyle: 'italic', lineHeight: 1.7 }}>
              The AI reads each tradition, maps every Hebrew word to its Greek and Latin translation
              equivalent, checks which scroll fragments cover this verse, and looks up any textual variants.
              This typically takes about a minute.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'rgba(200,170,120,.3)', animation: 'pulse-subtle 1.4s ease-in-out infinite' }} />
              <span style={{ fontSize: 12, color: 'rgba(200,180,150,.35)', fontStyle: 'italic' }}>{phase}</span>
              <span style={{ fontSize: 11, color: 'rgba(200,180,150,.2)' }}>{elapsed}s</span>
            </div>
          </div>
        )}

        {/* Source text previews — appear between source fetch and alignment */}
        {Object.keys(sourcePreview).length > 0 && (
          <div style={{
            maxWidth: 860,
            margin: '0 auto 28px',
            display: previewsVisible ? 'flex' : 'none',
            flexDirection: 'column',
            gap: 10,
            transition: 'opacity 600ms ease',
            pointerEvents: 'none',
          }}>
            {(Object.entries(sourcePreview) as [string, string][]).map(([source, text]) => {
              const meta = SOURCE_LABELS[source];
              return (
                <div key={source} style={{ padding: '10px 16px', background: 'rgba(200,170,120,.04)', border: '1px solid rgba(200,170,120,.1)', borderRadius: 6, animation: 'preview-fade-in 400ms ease-out forwards' }}>
                  <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(200,180,150,.4)', marginBottom: 5 }}>
                    {meta?.label}
                  </div>
                  <div style={{ fontSize: 14, color: meta?.color ?? '#d4c4a8', fontFamily: meta?.font, lineHeight: 1.6, direction: source === 'mt' ? 'rtl' : 'ltr' }}>
                    {text}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Phase indicator during streaming (shown below previews / above table) */}
        {loading && displayData && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: 'rgba(200,170,120,.3)', animation: 'pulse-subtle 1.4s ease-in-out infinite' }} />
            <span style={{ fontSize: 11, color: 'rgba(200,180,150,.35)', fontStyle: 'italic' }}>{phase}</span>
            <span style={{ fontSize: 10, color: 'rgba(200,180,150,.2)' }}>{elapsed}s</span>
          </div>
        )}

        {/* Table — shown as soon as meta arrives, grows as rows stream in */}
        {displayData && (() => {
          const prevRef = isComplete ? getAdjacentRef(displayData.ref, 'prev') : null;
          const nextRef = isComplete ? getAdjacentRef(displayData.ref, 'next') : null;
          const navBtn = (r: string, label: string) => (
            <button
              onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setQuery(r); handleLookup(r); }}
              style={{ background: 'none', border: '1px solid rgba(212,196,168,0.18)', color: 'rgba(200,180,150,.65)', padding: '6px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontFamily: "var(--font-garamond),'EB Garamond',serif" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(212,196,168,0.4)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(212,196,168,0.18)')}
            >
              {label}
            </button>
          );
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {isNewFormat(displayData) ? (
                <AlignedStreams
                  ref={displayData.ref || lastRef}
                  title={displayData.title}
                  subtitle={displayData.subtitle}
                  traditions={displayData.traditions}
                  groups={displayData.groups}
                  loadingAlignment={alignmentLoading}
                />
              ) : (
                <VerseTable data={displayData as OldVerseData} fromCache={fromCache} streaming={!isComplete} />
              )}

              {/* Corrections box */}
              {corrections.length > 0 && (
                <div style={{ padding: '12px 16px', background: 'rgba(180,160,100,.04)', border: '1px solid rgba(180,160,100,.12)', borderRadius: 6 }}>
                  <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(200,180,150,.4)', marginBottom: 8 }}>Verification corrections</div>
                  {corrections.map((c, i) => (
                    <p key={i} style={{ margin: '0 0 4px', fontSize: 12, color: 'rgba(200,180,150,.55)', lineHeight: 1.6, fontFamily: "var(--font-garamond),'EB Garamond',serif" }}>
                      <span style={{ textTransform: 'capitalize' }}>{c.tradition}</span> group {c.group + 1} —{' '}
                      <span style={{ color: 'rgba(200,180,150,.35)', textDecoration: 'line-through' }}>{String(c.was)}</span>{' '}
                      → <span style={{ color: 'rgba(200,180,150,.75)' }}>{String(c.now)}</span>
                      {c.reason ? <span style={{ color: 'rgba(200,180,150,.3)' }}> ({c.reason})</span> : null}
                    </p>
                  ))}
                </div>
              )}

              {/* Verse navigation — only after complete */}
              {isComplete && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {prevRef ? navBtn(prevRef, `← ${prevRef}`) : <span />}
                  <span style={{ fontSize: 11, color: 'rgba(200,180,150,.2)', fontStyle: 'italic', userSelect: 'none' }}>← → keys</span>
                  {nextRef ? navBtn(nextRef, `${nextRef} →`) : <span />}
                </div>
              )}

              {isComplete && (
                <>
                  {!isNewFormat(displayData) && <Legend rows={(displayData as OldVerseData).rows} />}
                  <p style={{ margin: '14px 0 0', fontSize: 11, color: 'rgba(200,180,150,.4)', lineHeight: 1.5 }}>
                    {fromCache ? 'Served from community cache — no API cost.' : 'Fetched live and permanently cached.'}
                    {' '}Masoretic Text: Westminster Leningrad Codex (OSHB) · Septuagint: Rahlfs 1935 (STEPBible TBESG) ·
                    Vulgate: Stuttgart critical edition, Weber-Gryson 5th ed. · Dead Sea Scrolls: AI-searched from published academic sources ·
                    Word alignment generated by AI — verify against published critical editions for scholarly citation.
                  </p>
                </>
              )}
            </div>
          );
        })()}

        {/* Empty state */}
        {!loading && !displayData && !error && (
          <div style={{ textAlign: 'center', padding: '70px 20px' }}>
            <div style={{ fontSize: 56, opacity: .12, marginBottom: 16 }}>𐤀</div>
            <p style={{ fontSize: 15, color: 'rgba(200,180,150,.3)', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
              Type any Torah verse above. Cached verses load instantly for free.
              New verses are aligned across all four traditions and stored permanently.
            </p>
          </div>
        )}

      </div>
      </div>

      {/* Scholarly column descriptions footer */}
      <footer style={{ borderTop: '1px solid rgba(200,170,120,.08)', background: 'rgba(12,10,7,.6)', padding: '36px 28px 40px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(200,180,150,.3)', marginBottom: 24, fontWeight: 600 }}>
            Column Reference
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px 36px' }}>
            {[
              {
                color: '#c4a882',
                label: 'Dead Sea Scrolls',
                text: 'Displays the oldest surviving Hebrew manuscript witnesses (c. 200 BCE–70 CE) word-by-word with lexical glosses, revealing the pre-standardization Hebrew text before the Masoretes fixed the tradition — where it diverges from the MT, a different ancient reading is preserved.',
              },
              {
                color: '#7ea8be',
                label: 'Septuagint',
                text: 'Displays the Greek translation (Rahlfs 1935 critical edition, c. 280–150 BCE) token-by-token with TBESG glosses, representing the Hebrew Vorlage as the Alexandrian translators read it — any word not matching the MT column signals they were working from a different Hebrew text.',
              },
              {
                color: '#a8b896',
                label: 'Vulgate',
                text: 'Displays Jerome’s Latin translation (Stuttgart critical edition, Weber-Gryson 5th ed., c. 382–405 CE) word-by-word with Whitaker’s Words glosses, positioned chronologically between the Greek and Hebrew traditions and reflecting Jerome’s own reading of the Hebrew with reference to the LXX.',
              },
              {
                color: '#d4a574',
                label: 'Masoretic Text',
                text: 'Displays the Westminster Leningrad Codex (the oldest complete Hebrew Bible, 1008/1009 CE) word-by-word with BDB lexical glosses, representing the standardized rabbinic text that became the basis of all modern Old Testament translations and the anchor column against which the three older traditions are compared.',
              },
            ].map(({ color, label, text }) => (
              <div key={label}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.06em', color, marginBottom: 7, textTransform: 'uppercase' }}>
                  {label}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(200,180,150,.45)', lineHeight: 1.75, fontFamily: "var(--font-garamond),'EB Garamond',serif" }}>
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
