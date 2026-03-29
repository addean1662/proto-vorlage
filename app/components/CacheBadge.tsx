'use client';

interface CacheBadgeProps {
  fromCache: boolean;
}

export default function CacheBadge({ fromCache }: CacheBadgeProps) {
  if (fromCache) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
        style={{
          fontSize: 11,
          backgroundColor: 'rgba(74, 222, 128, 0.12)',
          border: '1px solid rgba(74, 222, 128, 0.3)',
          color: '#4ade80',
        }}
      >
        <span>✓</span>
        <span>Cached — Free</span>
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
      style={{
        fontSize: 11,
        backgroundColor: 'rgba(96, 165, 250, 0.12)',
        border: '1px solid rgba(96, 165, 250, 0.3)',
        color: '#60a5fa',
      }}
    >
      <span>↓</span>
      <span>Live — Fetched &amp; Stored</span>
    </span>
  );
}
