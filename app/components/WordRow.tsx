'use client';

import { useState } from 'react';
import DSSBadge from './DSSBadge';
import { transliterateHebrew, transliterateGreek } from '@/lib/transliterate';

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
  status: 'extant' | 'partial' | 'lost';
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
  const [visible, setVisible] = useState(false);
  return (
    <span
      className="relative"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && content && (
        <span
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 6,
            background: '#1a1510',
            border: '1px solid rgba(200,170,120,.25)',
            borderRadius: 4,
            padding: '8px 12px',
            boxShadow: '0 4px 12px rgba(0,0,0,.6)',
            zIndex: 10,
            maxWidth: 300,
            width: 'max-content',
            color: 'rgba(200,180,150,.85)',
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
  { key: 'dss', color: '#c4a882', isHebrew: true },
  { key: 'lxx', color: '#7ea8be', isHebrew: false },
  { key: 'vul', color: '#a8b896', isHebrew: false },
  { key: 'mt',  color: '#d4a574', isHebrew: true },
] as const;

function Cell({
  entry,
  color,
  isHebrew,
  dssEntry,
  isFirst,
  animateDSS,
  suppressDSSBadge,
}: {
  entry: WordEntry;
  color: string;
  isHebrew: boolean;
  dssEntry?: DSSEntry;
  isFirst: boolean;
  animateDSS?: boolean;
  suppressDSSBadge?: boolean;
}) {
  const isLost = !suppressDSSBadge && dssEntry?.status === 'lost';
  const isDash = !isLost && (entry.orig === '—' || entry.orig === '-');
  const dimmed = isDash || isLost;

  // Lost DSS cell — centered "(lost)" label with red dot, no gloss
  if (isLost) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '8px 14px',
          background: '#0f0d0a',
          borderBottom: '1px solid rgba(200,170,120,.04)',
          borderLeft: isFirst ? 'none' : '1px solid rgba(200,170,120,.06)',
          minHeight: 48,
          ...(animateDSS ? { animation: 'dss-reveal 300ms ease-out forwards' } : {}),
        }}
      >
        {!suppressDSSBadge && (
          <>
            <span
              style={{
                fontSize: 13,
                color: 'rgba(176,96,96,.4)',
                fontStyle: 'italic',
                fontFamily: "var(--font-garamond), 'EB Garamond', serif",
              }}
            >
              (lost)
            </span>
            <DSSBadge status="lost" frag={null} />
          </>
        )}
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
        {entry.def}
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

      {/* STATUS DOT: absolutely positioned at the exact horizontal center of the cell */}
      {!suppressDSSBadge && dssEntry && !isDash && dssEntry.status && (
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1,
        }}>
          <DSSBadge status={dssEntry.status} frag={dssEntry.frag} />
        </div>
      )}

      {/* RIGHT HALF: gloss — left-aligned from center, siglum shown before gloss */}
      <div style={{ flex: '1 1 50%', paddingLeft: 10 }}>
        {!suppressDSSBadge && dssEntry && !isDash && dssEntry.frag && (
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
        const isDash = (o: string) => o === '—' || o === '-';
        const suppressDSSBadge = col.key === 'dss' && isDash(row.mt.orig);
        return (
          <Cell
            key={col.key}
            entry={entry}
            color={col.color}
            isHebrew={col.isHebrew}
            dssEntry={dssEntry}
            isFirst={ci === 0}
            animateDSS={animateDSS && col.key === 'dss'}
            suppressDSSBadge={suppressDSSBadge}
          />
        );
      })}
    </div>
  );
}
