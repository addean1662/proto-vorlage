'use client';

const DSS_STATUSES = [
  { color: '#4ade80', label: 'Extant', description: 'clearly preserved on scroll' },
  { color: '#fbbf24', label: 'Partial', description: 'fragmentary or damaged' },
  { color: '#f87171', label: 'Lost', description: 'not preserved in any known scroll' },
];

interface Row {
  mt: { orig: string };
  dss: { orig: string };
}

export default function Legend({ rows = [] }: { rows?: Row[] }) {
  const showEt = rows.some(r => r.mt.orig.includes('את') || r.dss.orig.includes('את'));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* DSS status legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
        {DSS_STATUSES.map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: item.color, flexShrink: 0, display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: 'rgba(200,180,150,.55)' }}>
              <strong>{item.label}</strong>
              <span style={{ opacity: .6 }}> — {item.description}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Glossary — conditional */}
      {showEt && (
        <p style={{ margin: 0, fontSize: 13, color: 'rgba(200,180,150,.65)', lineHeight: 1.6 }}>
          <span style={{ color: 'rgba(200,180,150,.7)', fontStyle: 'italic' }}>ʾet / אֶת</span>
          {' — '}Hebrew direct object marker — has no equivalent word in Greek or Latin, which encode this grammatically through case endings on the noun itself.
        </p>
      )}
    </div>
  );
}
