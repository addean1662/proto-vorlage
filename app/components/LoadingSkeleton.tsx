'use client';

function SkeletonCell({ isFirst }: { isFirst: boolean }) {
  return (
    <div style={{
      padding: '8px 14px',
      background: '#0f0d0a',
      borderLeft: isFirst ? 'none' : '1px solid rgba(200,170,120,.06)',
      minHeight: 48,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      <div className="skeleton" style={{ height: 18, flex: '1 1 50%' }} />
      <div className="skeleton" style={{ height: 12, flex: '1 1 40%' }} />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="g4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '1px solid rgba(200,170,120,.04)' }}>
      {[0, 1, 2, 3].map((i) => <SkeletonCell key={i} isFirst={i === 0} />)}
    </div>
  );
}

interface LoadingSkeletonProps {
  phase: string;
  elapsed: number;
}

export default function LoadingSkeleton({ phase: _phase, elapsed: _elapsed }: LoadingSkeletonProps) {
  return (
    <div style={{ width: '100%' }}>
      {/* Verse header skeleton */}
      <div style={{ padding: '20px 0 10px', textAlign: 'center' }}>
        <div className="skeleton" style={{ height: 30, width: 200, margin: '0 auto 10px' }} />
        <div className="skeleton" style={{ height: 14, width: 280, margin: '0 auto' }} />
      </div>

      {/* Column headers placeholder */}
      <div className="g4" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4,1fr)',
        background: 'rgba(200,170,120,.06)',
        borderRadius: '8px 8px 0 0',
        overflow: 'hidden',
      }}>
        {['Dead Sea Scrolls', 'Septuagint', 'Vulgate', 'Masoretic Text'].map((label, i) => (
          <div key={label} style={{ padding: '12px 14px', background: '#0f0d0a', borderBottom: '2px solid rgba(200,170,120,.12)' }}>
            <div className="skeleton" style={{ height: 14, width: i === 0 ? 110 : i === 3 ? 100 : 70 }} />
            <div className="skeleton" style={{ height: 10, width: 40, marginTop: 6 }} />
          </div>
        ))}
      </div>

      {/* Skeleton rows */}
      <div style={{ borderRadius: '0 0 8px 8px', overflow: 'hidden', border: '1px solid rgba(200,170,120,.1)', borderTop: 'none' }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
