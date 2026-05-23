'use client';

import { useState, useRef } from 'react';
import DSSBadge from './DSSBadge';
import { transliterateHebrew, transliterateGreek } from '@/lib/transliterate';
import { DSS_FRAG_DATES } from '@/lib/dss-dates';

interface WordEntry {
  orig: string;
  eng: string;
  xlit?: string;
  def?: string;
  lemma?: string;
  strongs?: string;
}

interface DSSEntry extends WordEntry {
  frag: string | null;
  status: 'extant' | 'attested' | 'partial' | 'lost';
  paleo?: boolean;
}

interface WordRowProps {
  row: {
    mt: WordEntry;
    lxx: WordEntry;
    vul: WordEntry;
    dss: DSSEntry;
  };
  index: number;
  animateDSS?: boolean;
}

function HoverTooltip({ children, content }: { children: React.ReactNode; content: React.ReactNode }) {
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const spanRef = useRef<HTMLSpanElement>(null);

  return (
    <span
      ref={spanRef}
      className="relative"
      onMouseEnter={() => {
        const r = spanRef.current?.getBoundingClientRect();
        if (r) setAnchor({ x: r.left + r.width / 2, y: r.top - 6 });
      }}
      onMouseLeave={() => setAnchor(null)}
    >
      {children}
      {anchor && content && (
        <span
          style={{
            position: 'fixed',
            top: anchor.y,
            left: anchor.x,
            transform: 'translate(-50%, -100%)',
            background: '#1a1510',
            border: '1px solid rgba(200,170,120,.25)',
            borderRadius: 4,
            padding: '8px 12px',
            boxShadow: '0 4px 12px rgba(0,0,0,.6)',
            zIndex: 9999,
            maxWidth: 320,
            maxHeight: '40vh',
            overflowY: 'auto',
            width: 'max-content',
            color: 'rgba(200,180,150,.85)',
            fontSize: 13,
            lineHeight: 1.5,
            pointerEvents: 'none',
            whiteSpace: 'pre-wrap',
          }}
        >
          {content}
        </span>
      )}
    </span>
  );
}

// Column order: DSS | LXX | VUL | MT
const COLUMNS = [
  { key: 'dss', color: '#c4a882', isHebrew: true,  lexicon: null },
  { key: 'lxx', color: '#7ea8be', isHebrew: false, lexicon: 'STEPBible TBESG (Rahlfs 1935)' },
  { key: 'vul', color: '#a8b896', isHebrew: false, lexicon: 'DICTLINE / Stuttgart Vulgate (Weber-Gryson 5th ed.)' },
  { key: 'mt',  color: '#d4a574', isHebrew: true,  lexicon: 'OSHB / BDB (Westminster Leningrad Codex)' },
] as const;

function Cell({
  entry,
  color,
  isHebrew,
  lexicon,
  dssEntry,
  isFirst,
  animateDSS,
}: {
  entry: WordEntry;
  color: string;
  isHebrew: boolean;
  lexicon: string | null;
  dssEntry?: DSSEntry;
  isFirst: boolean;
  animateDSS?: boolean;
}) {
  const isLost = dssEntry?.status === 'lost';
  const isDash = !isLost && (entry.orig === '—' || entry.orig === '-');
  const isAttested = dssEntry?.status === 'attested';
  const dimmed = isDash || isLost;

  // Attested DSS cell — scroll covers this verse but no transcription entered yet.
  // Show siglum only; no dot, no text. The blank signals nothing has been entered.
  if (isAttested) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 14px',
          background: '#0f0d0a',
          borderBottom: '1px solid rgba(200,170,120,.04)',
          borderLeft: isFirst ? 'none' : '1px solid rgba(200,170,120,.06)',
          minHeight: 48,
          ...(animateDSS ? { animation: 'dss-reveal 300ms ease-out forwards' } : {}),
        }}
      >
        <div style={{ flex: '1 1 50%' }} />
        <div style={{ flex: '1 1 50%', paddingLeft: 10 }}>
          {dssEntry!.frag && (() => {
            const info = DSS_FRAG_DATES[dssEntry!.frag!];
            const sigLabel = `${dssEntry!.frag}${dssEntry!.paleo ? ' · paleo' : ''}`;
            const tooltipContent = info
              ? <span>{info.date}<br />{info.source}</span>
              : null;
            return (
              <HoverTooltip content={tooltipContent}>
                <span style={{
                  display: 'block',
                  fontSize: 10,
                  color: 'rgba(200,180,150,.35)',
                  fontFamily: "var(--font-garamond), 'EB Garamond', serif",
                  lineHeight: 1.2,
                  cursor: tooltipContent ? 'default' : undefined,
                }}>
                  {sigLabel}
                </span>
              </HoverTooltip>
            );
          })()}
        </div>
      </div>
    );
  }

  // Lost DSS cell — red dot signals absence. No text; the dot is the message.
  if (isLost) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px 14px',
          background: '#0f0d0a',
          borderBottom: '1px solid rgba(200,170,120,.04)',
          borderLeft: isFirst ? 'none' : '1px solid rgba(200,170,120,.06)',
          minHeight: 48,
          ...(animateDSS ? { animation: 'dss-reveal 300ms ease-out forwards' } : {}),
        }}
      >
        <DSSBadge status="lost" frag={null} />
      </div>
    );
  }

  const translit = isHebrew
    ? transliterateHebrew(entry.orig)
    : (isDash ? null : transliterateGreek(entry.orig));

  const xlitContent = !isDash && (entry.xlit || translit)
    ? <span style={{ fontStyle: 'italic', fontSize: isHebrew ? 22 : 18 }}>{entry.xlit || translit}</span>
    : null;

  const defContent = !isDash && entry.def
    ? (
      <span>
        {entry.lemma && <span style={{ opacity: .6, display: 'block', marginBottom: 4 }}>{entry.lemma}</span>}
        {entry.strongs && <span style={{ opacity: .6, display: 'block', marginBottom: 4 }}>{entry.strongs}</span>}
        <span style={{ display: 'block' }}>{entry.def}</span>
        {lexicon && (
          <span style={{ opacity: .5, display: 'block', marginTop: 6, fontSize: 11 }}>
            {lexicon}
          </span>
        )}
      </span>
    )
    : null;

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        padding: '8px 14px',
        background: '#0f0d0a',
        borderBottom: '1px solid rgba(200,170,120,.04)',
        borderLeft: isFirst ? 'none' : '1px solid rgba(200,170,120,.06)',
        minHeight: 48,
        ...(animateDSS ? { animation: 'dss-reveal 300ms ease-out forwards' } : {}),
      }}
    >
      {/* LEFT HALF: source text — right-aligned to center */}
      <div
        style={{
          flex: '1 1 50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: 10,
        }}
      >
        <HoverTooltip content={xlitContent}>
          <span
            style={{
              fontSize: isDash ? 13 : isHebrew ? 22 : 18,
              color: isDash ? 'rgba(200,180,150,.2)' : color,
              direction: isHebrew ? 'rtl' : 'ltr',
              lineHeight: 1.3,
              fontFamily: isHebrew ? "'SBL Hebrew', 'Ezra SIL', 'Times New Roman', serif" : "var(--font-garamond), 'EB Garamond', serif",
            }}
          >
            {entry.orig}
          </span>
        </HoverTooltip>
      </div>

      {/* RIGHT HALF: gloss — left-aligned from center, siglum shown before gloss */}
      <div style={{ flex: '1 1 50%', paddingLeft: 10 }}>
        {dssEntry && !isDash && dssEntry.frag && (
          <span style={{
            display: 'block',
            fontSize: 10,
            color: 'rgba(200,180,150,.45)',
            fontFamily: "var(--font-garamond), 'EB Garamond', serif",
            lineHeight: 1.2,
            marginBottom: 2,
          }}>
            {dssEntry.frag}{dssEntry.paleo ? ' · paleo' : ''}
          </span>
        )}
        <HoverTooltip content={defContent}>
          <span
            style={{
              fontSize: 14,
              color: isDash ? 'rgba(200,180,150,.15)' : 'rgba(200,180,150,.72)',
              fontStyle: 'italic',
              lineHeight: 1.3,
            }}
          >
            {entry.eng}
          </span>
        </HoverTooltip>
      </div>
    </div>
  );
}

export default function WordRow({ row, index, animateDSS }: WordRowProps) {
  return (
    <div
      className="g4"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4,1fr)',
        borderBottom: '1px solid rgba(200,170,120,.04)',
        animation: animateDSS ? 'row-enter 150ms ease-out forwards' : 'none',
      }}
    >
      {COLUMNS.map((col, ci) => {
        const entry = row[col.key] as WordEntry;
        const dssEntry = col.key === 'dss' ? (row.dss as DSSEntry) : undefined;
        return (
          <Cell
            key={col.key}
            entry={entry}
            color={col.color}
            isHebrew={col.isHebrew}
            lexicon={col.lexicon}
            dssEntry={dssEntry}
            isFirst={ci === 0}
            animateDSS={animateDSS && col.key === 'dss'}
          />
        );
      })}
    </div>
  );
}
