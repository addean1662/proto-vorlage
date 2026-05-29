'use client';

import Link from 'next/link';

const COLUMNS = [
  { key: 'dss', label: 'Dead Sea Scrolls', date: 'c. 250 BCE–68 CE', color: '#c4a882', glossSource: 'Academic glosses' },
  { key: 'lxx', label: 'Septuagint',       date: 'c. 280–150 BCE',   color: '#7ea8be', glossSource: 'TBESG' },
  { key: 'vul', label: 'Vulgate',          date: 'c. 382–405 CE',    color: '#a8b896', glossSource: "Whitaker's Words" },
  { key: 'mt',  label: 'Masoretic Text',   date: 'c. 700–900 CE',    color: '#d4a574', glossSource: 'BDB' },
];

export default function ColumnHeaders() {
  return (
    <div
      className="grid grid-cols-4"
      style={{
        background: 'rgba(200,170,120,.06)',
        borderRadius: '8px 8px 0 0',
        overflow: 'hidden',
      }}
    >
      {COLUMNS.map((col) => (
        <div
          key={col.key}
          style={{
            padding: '12px 14px',
            background: '#0f0d0a',
            borderBottom: `2px solid ${col.color}40`,
            display: 'flex',
            alignItems: 'flex-start',
          }}
        >
          {/* Left half — right-aligned, above source text */}
          <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingRight: 10 }}>
            {col.key === 'dss' && (
              <Link
                href="/dss-fragments"
                style={{
                  marginBottom: 6,
                  display: 'inline-block',
                  fontSize: 9,
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  color: col.color,
                  border: `1px solid ${col.color}80`,
                  borderRadius: 3,
                  padding: '3px 7px',
                  transition: 'background .15s, border-color .15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = `${col.color}18`;
                  e.currentTarget.style.borderColor = col.color;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = `${col.color}80`;
                }}
              >
                See DSS Fragments →
              </Link>
            )}
            <div style={{ fontSize: 14, fontWeight: 600, color: col.color, textAlign: 'right' }}>{col.label}</div>
            <div style={{ fontSize: 10, color: 'rgba(200,180,150,.45)', fontStyle: 'italic', marginTop: 2 }}>{col.date}</div>
          </div>
          {/* Right half — left-aligned, above gloss */}
          <div style={{ flex: '1 1 50%', paddingLeft: 10, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div style={{ fontSize: 10, color: 'rgba(200,180,150,.35)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{col.glossSource}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
