import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { getSamaritanVerse } from '../lib/samaritan';

const mocks = vi.hoisted(() => ({
  cached: vi.fn(async (): Promise<unknown> => null),
  cache: vi.fn(async () => true),
  count: vi.fn(async () => undefined),
  align: vi.fn(), repair: vi.fn(),
}));
vi.mock('../lib/cache', () => ({
  getCachedVerse: mocks.cached, cacheVerse: mocks.cache, incrementCachedCount: mocks.count,
  getCachedCount: vi.fn(), clearCachedVerse: vi.fn(), clearAllCached: vi.fn(), isRedisConfigured: vi.fn(),
}));
vi.mock('../lib/rate-limit', () => ({ checkRateLimit: async () => true }));
vi.mock('../lib/claude', () => ({
  alignWithClaudeStream: mocks.align, repairAlignmentGroups: mocks.repair,
  verifyAlignment: async () => ({ verified: true, corrections: [] }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.cached.mockResolvedValue(null);
  mocks.align.mockImplementation(async (ref, _mt, _lxx, _vul, _meta, mt, lxx, vul, sp) => ({
    ref, title: 'Test', subtitle: 'Test fixture',
    groups: Array.from({ length: Math.max(mt.length, lxx.length, vul.length, sp.length) }, (_, i) => ({
      mt: i < mt.length ? i : null, lxx: i < lxx.length ? i : null,
      vul: i < vul.length ? i : null, sp: i < sp.length ? i : null,
    })),
  }));
});

function request(ref: string) {
  return new Request('http://localhost/api/lookup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ref }) }) as NextRequest;
}

describe('five-tradition lookup pipeline', () => {
  it('includes real SP source words and provenance in both progressive and final responses', async () => {
    const { POST } = await import('../app/api/lookup/stream/route');
    const response = await POST(request('Genesis 1:1'));
    const text = await response.text();
    const events = text.split('\n\n').filter(Boolean).map(block => ({
      event: block.split('\n')[0].slice(7), data: JSON.parse(block.split('\n')[1].slice(6)),
    }));
    const source = getSamaritanVerse('Genesis 1:1').words;
    expect(events.find(e => e.event === 'traditions')?.data.traditions.sp).toEqual(source);
    const done = events.find(e => e.event === 'done')!.data;
    expect(done.data.traditions.sp).toEqual(source);
    expect(done.data.validation.coverage.sp).toMatchObject({ total: 7, covered: 7 });
    expect(done.data.provenance.traditions.sp.dataSource).toContain('DT-UCPH/sp');
    expect(mocks.align.mock.calls[0][8]).toEqual(source);
    expect(mocks.cache).toHaveBeenCalledOnce();
    expect(mocks.count).toHaveBeenCalledOnce();
  });

  it('upgrades legacy cached results without counting a verse twice, and reuses the upgraded cache', async () => {
    const { POST } = await import('../app/api/lookup/route');
    mocks.cached.mockResolvedValue({ ref: 'Genesis 1:1', provenance: {}, validation: { valid: true } });
    const result = await (await POST(request('Genesis 1:1'))).json();
    expect(result.data.traditions.sp).toHaveLength(7);
    expect(mocks.count).not.toHaveBeenCalled();
    mocks.cached.mockResolvedValue(result.data);
    const cached = await (await POST(request('Genesis 1:1'))).json();
    expect(cached.fromCache).toBe(true);
    expect(mocks.align).toHaveBeenCalledOnce();
  });

  it('exposes the source location note for a relocated passage', async () => {
    const { POST } = await import('../app/api/lookup/route');
    const result = await (await POST(request('Exodus 30:1'))).json();
    expect(result.data.traditions.sp).toEqual([]);
    expect(result.data.sourceNotes.sp).toContain('Exodus 26:35');
    expect(result.data.validation.valid).toBe(true);
  });

  it('does not cache results if SP coverage remains incomplete after repair', async () => {
    mocks.align.mockResolvedValue({ ref: 'Genesis 1:1', title: '', subtitle: '', groups: [] });
    mocks.repair.mockResolvedValue([]);
    const { POST } = await import('../app/api/lookup/route');
    const result = await (await POST(request('Genesis 1:1'))).json();
    expect(result.cacheStored).toBe(false);
    expect(result.data.traditions.sp).toHaveLength(7);
    expect(mocks.repair).toHaveBeenCalledTimes(2);
    expect(mocks.cache).not.toHaveBeenCalled();
  });
});
