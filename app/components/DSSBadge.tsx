'use client';

import { useState } from 'react';

interface DSSBadgeProps {
  status: 'extant' | 'partial' | 'lost';
  frag: string | null;
}

export default function DSSBadge({ status, frag }: DSSBadgeProps) {
  const [hovered, setHovered] = useState(false);

  const colorMap = {
    extant: '#4ade80',   // green
    partial: '#fbbf24',  // amber
    lost:    '#f87171',  // red
  };

  const labelMap = {
    extant: 'Extant',
    partial: 'Partial',
    lost:    'Lost',
  };

  const color = colorMap[status];
  const label = labelMap[status];
  const tooltipBase = status === 'lost' ? 'Lost — not preserved in any known scroll' : label;
  const tooltip = frag ? `${tooltipBase} — ${frag}` : tooltipBase;

  return (
    <span
      className="relative inline-flex items-center cursor-default"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        className="inline-block w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      {hovered && (
        <span
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs rounded whitespace-nowrap z-50 pointer-events-none"
          style={{
            backgroundColor: '#1a1612',
            border: '1px solid rgba(212,196,168,0.3)',
            color: '#d4c4a8',
          }}
        >
          {tooltip}
        </span>
      )}
    </span>
  );
}
