'use client';

const COLUMNS = [
  { key: 'dss', label: 'Dead Sea Scrolls', script: 'Hebrew', date: 'c. 250 BCE–68 CE', color: '#c4a882' },
  { key: 'lxx', label: 'Septuagint',       script: 'Greek',  date: 'c. 280–150 BCE', color: '#7ea8be' },
  { key: 'vul', label: 'Vulgate',          script: 'Latin',  date: 'c. 382–405 CE', color: '#a8b896' },
  { key: 'mt',  label: 'Masoretic Text',   script: 'Hebrew', date: 'c. 700–900 CE',  color: '#d4a574' },
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
      {COLUMNS.map((col) => {
        const isHebrew = col.script === 'Hebrew';

        if (isHebrew) {
          return (
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
              {/* Left half — right-aligned to sit above the RTL original text */}
              <div style={{
                flex: '1 1 50%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
              }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: col.color }}>{col.label}</div>
                <div style={{ fontSize: 11, color: 'rgba(200,180,150,.5)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
                  {col.script}
                </div>
              <div style={{ fontSize: 10, color: 'rgba(200,180,150,.45)', fontStyle: 'italic' }}>
                  {col.date}
                </div>
              </div>
              {/* Right half empty — mirrors gloss area */}
              <div style={{ flex: '1 1 50%' }} />
            </div>
          );
        }

        return (
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
            {/* Left half — right-aligned to sit above the original text */}
            <div style={{
              flex: '1 1 50%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: col.color }}>{col.label}</div>
              <div style={{ fontSize: 10, color: 'rgba(200,180,150,.5)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
                {col.script}
              </div>
              <div style={{ fontSize: 9, color: 'rgba(200,180,150,.45)', fontStyle: 'italic' }}>
                {col.date}
              </div>
            </div>
            {/* Right half empty — mirrors gloss area */}
            <div style={{ flex: '1 1 50%' }} />
          </div>
        );
      })}
    </div>
  );
}
