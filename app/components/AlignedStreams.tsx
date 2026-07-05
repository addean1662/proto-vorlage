'use client';

import { useState, useMemo } from 'react';
import { transliterateHebrew, transliterateGreek } from '@/lib/transliterate';
import { DSS_FRAG_DATES } from '@/lib/dss-dates';

type WordEntry = {
  orig: string;
  eng: string;
  xlit?: string;
  def?: string;
  lemma?: string;
  strongs?: string;
};

type DSSEntry = {
  orig: string;
  eng: string;
  def?: string;
  frag: string | null;
  status: 'extant' | 'attested' | 'partial' | 'lost';
  paleo?: boolean;
};

type Traditions = {
  dss: DSSEntry[];
  lxx: WordEntry[];
  mt: WordEntry[];
  vul: WordEntry[];
};

type AlignmentGroup = { lxx: number | null; mt: number | null; vul: number | null; };

interface AlignedStreamsProps {
  ref: string;
  title: string;
  subtitle: string;
  traditions: Traditions;
  groups: AlignmentGroup[];
  loadingAlignment?: boolean;
}

const COLS = [
  { key: 'dss' as const, label: 'Dead Sea Scrolls', color: '#c4a882', isHebrew: true,  date: 'c. 250 BCE–68 CE',  glossSource: 'Brown-Driver-Briggs' },
  { key: 'lxx' as const, label: 'Septuagint',       color: '#7ea8be', isHebrew: false, date: 'c. 280–150 BCE',    glossSource: 'TBESG' },
  { key: 'vul' as const, label: 'Vulgate',           color: '#a8b896', isHebrew: false, date: 'c. 382–405 CE',    glossSource: "Whitaker's Words" },
  { key: 'mt'  as const, label: 'Masoretic Text',   color: '#d4a574', isHebrew: true,  date: 'c. 700–900 CE',    glossSource: 'Brown-Driver-Briggs' },
] as const;

const SOURCE_NOTES = {
  dss: 'DSS cells show manuscript preservation status. Extant readings are manuscript evidence; lost cells mean no preserved word is available for that MT position.',
  lxx: 'LXX tokens are source-order Greek data. Alignment to Hebrew is generated and should be checked before citation.',
  vul: 'Vulgate tokens are source-order Latin data. Alignment to Hebrew is generated and may reflect interpretive translation choices.',
  mt: 'MT tokens are the anchor sequence from OSHB / Westminster Leningrad Codex. Alignment groups are generated around this sequence.',
} as const;

function EvidenceStatus({
  loadingAlignment,
  groupCount,
  mtCount,
  dssCounts,
}: {
  loadingAlignment?: boolean;
  groupCount: number;
  mtCount: number;
  dssCounts: Record<DSSEntry['status'], number>;
}) {
  const statusText = loadingAlignment
    ? 'AI alignment pending'
    : groupCount > 0
      ? 'AI alignment generated; verify before citation'
      : 'No alignment map available';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, margin: '0 0 14px' }}>
      <div style={{ padding: '10px 12px', border: '1px solid rgba(200,170,120,.12)', borderRadius: 6, background: 'rgba(200,170,120,.035)' }}>
        <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(200,180,150,.35)', marginBottom: 5 }}>Alignment Status</div>
        <div style={{ fontSize: 13, color: 'rgba(220,205,175,.78)', lineHeight: 1.45 }}>{statusText}</div>
        <div style={{ fontSize: 11, color: 'rgba(200,180,150,.38)', marginTop: 4 }}>{groupCount} groups for {mtCount} MT tokens</div>
      </div>
      <div style={{ padding: '10px 12px', border: '1px solid rgba(200,170,120,.12)', borderRadius: 6, background: 'rgba(200,170,120,.035)' }}>
        <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(200,180,150,.35)', marginBottom: 5 }}>DSS Evidence</div>
        <div style={{ fontSize: 12, color: 'rgba(220,205,175,.7)', lineHeight: 1.55 }}>
          {dssCounts.extant} extant / {dssCounts.partial} partial / {dssCounts.attested} attested / {dssCounts.lost} lost
        </div>
        <div style={{ fontSize: 11, color: 'rgba(200,180,150,.38)', marginTop: 4 }}>DSS status is preservation evidence, not an automatic variant claim.</div>
      </div>
      <div style={{ padding: '10px 12px', border: '1px solid rgba(200,170,120,.12)', borderRadius: 6, background: 'rgba(200,170,120,.035)' }}>
        <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(200,180,150,.35)', marginBottom: 5 }}>Citation Rule</div>
        <div style={{ fontSize: 12, color: 'rgba(220,205,175,.7)', lineHeight: 1.55 }}>Cite the underlying editions/manuscripts. Treat hover links and alignment groups as generated research aids.</div>
      </div>
    </div>
  );
}

function HoverTooltip({ children, content }: { children: React.ReactNode; content: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  if (!content) return <>{children}</>;

  return (
    <span
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={e => {
        const r = e.currentTarget.getBoundingClientRect();
        setPos({ x: r.left + r.width / 2, y: r.top - 6 });
        setVisible(true);
      }}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span style={{
          position: 'fixed',
          top: pos.y,
          left: pos.x,
          transform: 'translate(-50%, -100%)',
          background: '#1a1510',
          border: '1px solid rgba(200,170,120,.25)',
          borderRadius: 4,
          padding: '8px 12px',
          boxShadow: '0 4px 12px rgba(0,0,0,.6)',
          zIndex: 9999,
          maxWidth: 320,
          color: 'rgba(200,180,150,.85)',
          fontSize: 13,
          lineHeight: 1.5,
          pointerEvents: 'none',
          whiteSpace: 'pre-wrap',
          width: 'max-content',
        }}>
          {content}
        </span>
      )}
    </span>
  );
}

function WordChip({
  orig,
  eng,
  xlit,
  def,
  lemma,
  strongs,
  color,
  isHebrew,
  groupId,
  hoveredGroup,
  onHover,
  frag,
  status,
  paleo,
}: {
  orig: string;
  eng: string;
  xlit?: string;
  def?: string;
  lemma?: string;
  strongs?: string;
  color: string;
  isHebrew: boolean;
  groupId: number | null;
  hoveredGroup: number | null;
  onHover: (g: number | null) => void;
  frag?: string | null;
  status?: DSSEntry['status'];
  paleo?: boolean;
}) {
  const isDash = orig === '—' || orig === '-';
  const isLost = status === 'lost';
  const isAttested = status === 'attested';
  const highlighted = groupId !== null && hoveredGroup === groupId;

  const translit = isHebrew
    ? (!isDash ? transliterateHebrew(orig) : null)
    : (!isDash ? transliterateGreek(orig) : null);

  const xlitContent = !isDash && (xlit || translit)
    ? <span style={{ fontStyle: 'italic', fontSize: isHebrew ? 20 : 16 }}>{xlit || translit}</span>
    : null;

  const defContent = !isDash && def
    ? (
      <span>
        {lemma && <span style={{ opacity: .6, display: 'block', marginBottom: 4 }}>{lemma}</span>}
        {strongs && <span style={{ opacity: .6, display: 'block', marginBottom: 4 }}>{strongs}</span>}
        <span style={{ display: 'block' }}>{def}</span>
      </span>
    )
    : null;

  const fragInfo = frag ? DSS_FRAG_DATES[frag] : null;
  const statusLabel = status
    ? status === 'lost'
      ? 'lost: no preserved DSS word for this MT position'
      : status === 'attested'
        ? 'attested: scroll covers the verse, but no transcription is entered here'
        : status === 'partial'
          ? 'partial: fragmentary or incomplete preservation'
          : 'extant: preserved manuscript reading displayed'
    : null;
  const dssTooltip = fragInfo || statusLabel
    ? (
      <span>
        {statusLabel && <span>{statusLabel}</span>}
        {fragInfo && <span>{statusLabel ? <br /> : null}{fragInfo.date}<br />{fragInfo.source}</span>}
      </span>
    )
    : null;
  const sigLabel = frag ? `${frag}${paleo ? ' · paleo' : ''}` : null;

  return (
    <div
      onMouseEnter={() => onHover(groupId)}
      onMouseLeave={() => onHover(null)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '8px 12px',
        borderBottom: '1px solid rgba(200,170,120,.05)',
        background: highlighted ? `${color}12` : 'transparent',
        borderLeft: highlighted ? `2px solid ${color}60` : '2px solid transparent',
        transition: 'background 80ms, border-color 80ms',
        minHeight: 52,
        gap: 3,
      }}
    >
      {/* Siglum — centered above both source and gloss */}
      {sigLabel && (
        <HoverTooltip content={dssTooltip}>
          <span style={{
            display: 'block',
            textAlign: 'center',
            fontSize: 10,
            color: 'rgba(200,180,150,.4)',
            letterSpacing: '.04em',
            lineHeight: 1.2,
          }}>
            {sigLabel}
          </span>
        </HoverTooltip>
      )}

      {/* Source + gloss row */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {/* LEFT: source text — right-aligned */}
        <div style={{
          flex: '1 1 50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: 10,
        }}>
          {isLost ? (
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'rgba(180,80,80,.6)' }} />
          ) : (
            <HoverTooltip content={xlitContent}>
              <span style={{
                fontSize: isDash ? 12 : isHebrew ? 20 : 16,
                color: isDash ? `${color}30` : isAttested ? `${color}50` : color,
                direction: isHebrew ? 'rtl' : 'ltr',
                lineHeight: 1.3,
                fontFamily: isHebrew
                  ? "'SBL Hebrew', 'Ezra SIL', 'Times New Roman', serif"
                  : "var(--font-garamond), 'EB Garamond', serif",
                display: 'block',
              }}>
                {orig}
              </span>
            </HoverTooltip>
          )}
        </div>

        {/* RIGHT: gloss — left-aligned */}
        <div style={{ flex: '1 1 50%', paddingLeft: 10 }}>
          {!isLost && !isAttested && (
            <HoverTooltip content={defContent}>
              <span style={{
                fontSize: 12,
                color: isDash ? 'rgba(200,180,150,.2)' : 'rgba(200,180,150,.6)',
                fontStyle: 'italic',
                lineHeight: 1.3,
                display: 'block',
              }}>
                {isDash ? '' : eng}
              </span>
            </HoverTooltip>
          )}
        </div>
      </div>
      {highlighted && groupId !== null && (
        <div style={{ fontSize: 9, color: 'rgba(200,180,150,.32)', letterSpacing: '.08em', textTransform: 'uppercase', textAlign: 'center' }}>
          AI group {groupId + 1}
        </div>
      )}
    </div>
  );
}

export default function AlignedStreams({
  ref: verseRef,
  title,
  subtitle,
  traditions,
  groups,
  loadingAlignment,
}: AlignedStreamsProps) {
  const [hoveredGroup, setHoveredGroup] = useState<number | null>(null);

  // Pre-compute group ID for each word in each tradition
  const groupByIdx = useMemo(() => {
    const dss = new Map<number, number>();
    const lxx = new Map<number, number>();
    const mt  = new Map<number, number>();
    const vul = new Map<number, number>();

    groups.forEach((g, gid) => {
      if (g.lxx !== null) lxx.set(g.lxx, gid);
      if (g.mt  !== null) { mt.set(g.mt, gid); dss.set(g.mt, gid); }
      if (g.vul !== null) vul.set(g.vul, gid);
    });

    return { dss, lxx, mt, vul };
  }, [groups]);

  const colWords = {
    dss: traditions.dss,
    lxx: traditions.lxx,
    mt:  traditions.mt,
    vul: traditions.vul,
  };

  const dssCounts = traditions.dss.reduce<Record<DSSEntry['status'], number>>((acc, word) => {
    acc[word.status] += 1;
    return acc;
  }, { extant: 0, attested: 0, partial: 0, lost: 0 });

  return (
    <div style={{ width: '100%' }}>
      {/* Verse title */}
      <div style={{ paddingTop: 16, paddingBottom: 12, textAlign: 'center' }}>
        <div style={{ marginBottom: 4 }}>
          <span style={{ fontSize: 36, color: 'rgba(200,180,150,.25)', direction: 'rtl', display: 'inline-block', fontFamily: "'SBL Hebrew', 'Ezra SIL', 'Times New Roman', serif" }}>
            {title}
          </span>
        </div>
        <p style={{ fontSize: 15, color: 'rgba(200,180,150,.35)', fontStyle: 'italic', margin: '0 0 4px' }}>
          {subtitle} — {verseRef}
        </p>
        {loadingAlignment && (
          <p style={{ fontSize: 11, color: 'rgba(200,180,150,.3)', fontStyle: 'italic', margin: 0 }}>
            Computing alignment — hover highlighting will activate shortly…
          </p>
        )}
      </div>

      <EvidenceStatus
        loadingAlignment={loadingAlignment}
        groupCount={groups.length}
        mtCount={traditions.mt.length}
        dssCounts={dssCounts}
      />

      {/* Four independent word streams */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid rgba(200,170,120,.1)',
      }}>
        {/* Column headers */}
        {COLS.map((col, ci) => (
          <div
            key={col.key}
            style={{
              padding: '10px 12px',
              background: '#0f0d0a',
              borderBottom: `2px solid ${col.color}40`,
              borderLeft: ci === 0 ? 'none' : '1px solid rgba(200,170,120,.08)',
              display: 'flex',
              alignItems: 'stretch',
            }}
          >
            {/* Left half — right-aligned, mirrors source text column */}
            <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingRight: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: col.color, textAlign: 'right' }}>{col.label}</div>
              <div style={{ fontSize: 10, color: 'rgba(200,180,150,.4)', fontStyle: 'italic', marginTop: 2 }}>{col.date}</div>
              <HoverTooltip content={SOURCE_NOTES[col.key]}>
                <div style={{ fontSize: 10, color: 'rgba(200,180,150,.35)', marginTop: 4, textDecoration: 'underline dotted rgba(200,180,150,.25)', cursor: 'help' }}>source note</div>
              </HoverTooltip>
            </div>
            {/* Right half — left-aligned, mirrors gloss column */}
            <div style={{ flex: '1 1 50%', paddingLeft: 10, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div style={{ fontSize: 10, color: 'rgba(200,180,150,.35)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{col.glossSource}</div>
            </div>
          </div>
        ))}

        {/* Word columns — each independent, in source order */}
        {COLS.map((col, ci) => {
          const words = colWords[col.key] as (WordEntry | DSSEntry)[];

          return (
            <div
              key={col.key}
              style={{
                borderLeft: ci === 0 ? 'none' : '1px solid rgba(200,170,120,.06)',
                background: '#0f0d0a',
              }}
            >
              {words.map((word, idx) => {
                const groupId = groupByIdx[col.key].get(idx) ?? null;
                const w = word as WordEntry & Partial<DSSEntry>;

                return (
                  <WordChip
                    key={idx}
                    orig={w.orig}
                    eng={w.eng}
                    xlit={w.xlit}
                    def={w.def}
                    lemma={w.lemma}
                    strongs={w.strongs}
                    color={col.color}
                    isHebrew={col.isHebrew}
                    groupId={groupId}
                    hoveredGroup={hoveredGroup}
                    onHover={setHoveredGroup}
                    frag={col.key === 'dss' ? (w as DSSEntry).frag : undefined}
                    status={col.key === 'dss' ? (w as DSSEntry).status : undefined}
                    paleo={col.key === 'dss' ? (w as DSSEntry).paleo : undefined}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      {!loadingAlignment && groups.length === 0 && (
        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(200,180,150,.3)', marginTop: 12, fontStyle: 'italic' }}>
          Alignment data unavailable — hover highlighting inactive.
        </p>
      )}
    </div>
  );
}
