'use client';

import ColumnHeaders from './ColumnHeaders';
import WordRow from './WordRow';
import CacheBadge from './CacheBadge';

interface WordEntry {
  orig: string;
  eng: string;
}

interface DSSEntry extends WordEntry {
  frag: string | null;
  status: 'extant' | 'attested' | 'partial' | 'lost';
  paleo?: boolean;
}

interface VerseRow {
  mt: WordEntry;
  lxx: WordEntry;
  vul: WordEntry;
  dss: DSSEntry;
}

interface VerseData {
  ref: string;
  title: string;
  subtitle: string;
  rows: VerseRow[];
}

interface VerseTableProps {
  data: VerseData;
  fromCache: boolean;
  streaming?: boolean;
}

export default function VerseTable({ data, fromCache, streaming }: VerseTableProps) {
  return (
    <div style={{ width: '100%' }}>
      {/* Verse title */}
      <div style={{ paddingTop: 16, paddingBottom: 6, textAlign: 'center' }}>
        <CacheBadge fromCache={fromCache} />
        <div style={{ marginTop: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 36, color: 'rgba(200,180,150,.25)', direction: 'rtl', display: 'inline-block', fontFamily: "'SBL Hebrew', 'Ezra SIL', 'Times New Roman', serif" }}>
            {data.title}
          </span>
        </div>
        <p style={{ fontSize: 15, color: 'rgba(200,180,150,.35)', fontStyle: 'italic', marginTop: 0, marginBottom: 12 }}>
          {data.subtitle} — {data.ref}
        </p>
      </div>

      {/* Table */}
      <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(200,170,120,.1)' }}>
        <ColumnHeaders />
        <div>
          {data.rows.map((row, i) => (
            <WordRow key={i} row={row} index={i} animateDSS={streaming} />
          ))}
        </div>
      </div>
    </div>
  );
}
