'use client';

import { FormEvent } from 'react';

const QUICK_ACCESS = [
  'Genesis 1:1',
  'Genesis 3:15',
  'Genesis 22:8',
  'Exodus 3:14',
  'Exodus 20:2',
  'Leviticus 17:11',
  'Numbers 24:17',
  'Deuteronomy 6:4',
  'Deuteronomy 18:15',
];

interface SearchBarProps {
  query: string;
  onQueryChange: (val: string) => void;
  onSubmit: (ref: string) => void;
  loading: boolean;
  history: string[];
  cooldown?: number;
}

export default function SearchBar({
  query,
  onQueryChange,
  onSubmit,
  loading,
  history,
  cooldown = 0,
}: SearchBarProps) {
  const blocked = loading || cooldown > 0;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (query.trim() && !blocked) onSubmit(query.trim());
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="e.g. Genesis 1:1 or Bereishit 1:1"
          disabled={blocked}
          className="flex-1 px-4 py-2.5 rounded-lg outline-none"
          style={{
            fontSize: 18,
            backgroundColor: 'rgba(212,196,168,0.07)',
            border: '1px solid rgba(212,196,168,0.2)',
            color: '#d4c4a8',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(212,196,168,0.45)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(212,196,168,0.2)';
          }}
        />
        <button
          type="submit"
          disabled={blocked || !query.trim()}
          className="px-5 py-2.5 rounded-lg text-sm font-medium transition-opacity"
          style={{
            backgroundColor: cooldown > 0 ? 'rgba(212,196,168,0.15)' : '#d4a574',
            color: cooldown > 0 ? '#d4c4a8' : '#0c0a07',
            opacity: blocked || !query.trim() ? 0.6 : 1,
            cursor: blocked || !query.trim() ? 'not-allowed' : 'pointer',
            minWidth: 100,
          }}
        >
          {loading ? 'Loading…' : cooldown > 0 ? `Wait ${cooldown}s` : 'Look up'}
        </button>
      </form>
      {cooldown > 0 && (
        <p style={{ fontSize: 11, color: 'rgba(200,180,150,.35)', fontStyle: 'italic', marginTop: -8 }}>
          Rate limit cooldown — next uncached lookup available in {cooldown}s. Cached verses load instantly.
        </p>
      )}

      {/* Quick-access buttons */}
      <div className="flex flex-wrap gap-2">
        {QUICK_ACCESS.map((ref) => (
          <button
            key={ref}
            onClick={() => {
              onQueryChange(ref);
              onSubmit(ref);
            }}
            disabled={blocked}
            className="px-3 py-1 rounded-full transition-opacity"
            style={{
              fontSize: 14,
              backgroundColor: 'rgba(212,196,168,0.08)',
              border: '1px solid rgba(212,196,168,0.18)',
              color: '#d4c4a8',
              opacity: blocked ? 0.5 : 1,
              cursor: blocked ? 'not-allowed' : 'pointer',
            }}
          >
            {ref}
          </button>
        ))}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-xs opacity-40">Recent:</span>
          {history
            .slice()
            .reverse()
            .slice(0, 8)
            .map((ref) => (
              <button
                key={ref}
                onClick={() => {
                  onQueryChange(ref);
                  onSubmit(ref);
                }}
                disabled={blocked}
                className="text-xs underline underline-offset-2 opacity-50 hover:opacity-80 transition-opacity"
                style={{ color: '#d4c4a8' }}
              >
                {ref}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
