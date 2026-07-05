import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/cache', () => ({
  isRedisConfigured: () => false,
  getCachedCount: vi.fn(async () => 3),
  getCachedKeys: vi.fn(async () => ['genesis_1:1']),
  getReviewMeta: vi.fn(async () => null),
  setReviewMeta: vi.fn(async () => true),
  clearCachedVerse: vi.fn(async () => undefined),
}));

const originalSecret = process.env.CACHE_ADMIN_SECRET;

afterEach(() => {
  process.env.CACHE_ADMIN_SECRET = originalSecret;
});

describe('admin api', () => {
  it('rejects unauthenticated access', async () => {
    process.env.CACHE_ADMIN_SECRET = 'secret';
    const { GET } = await import('../app/api/admin/route');

    const response = await GET(new Request('https://example.test/api/admin') as never);
    expect(response.status).toBe(403);
  });

  it('returns cache metadata for authenticated admin requests', async () => {
    process.env.CACHE_ADMIN_SECRET = 'secret';
    const { GET } = await import('../app/api/admin/route');

    const response = await GET(new Request('https://example.test/api/admin', {
      headers: { 'x-cache-admin-secret': 'secret' },
    }) as never);

    await expect(response.json()).resolves.toMatchObject({
      cacheBackend: 'local-file',
      cacheCount: 3,
      keys: ['genesis_1:1'],
    });
  });

  it('stores review metadata for authenticated requests', async () => {
    process.env.CACHE_ADMIN_SECRET = 'secret';
    const { POST } = await import('../app/api/admin/route');

    const response = await POST(new Request('https://example.test/api/admin', {
      method: 'POST',
      headers: { 'x-cache-admin-secret': 'secret', 'content-type': 'application/json' },
      body: JSON.stringify({ ref: 'Gen 1:1', status: 'reviewed', reviewer: 'tester' }),
    }) as never);

    await expect(response.json()).resolves.toMatchObject({
      key: 'genesis_1:1',
      stored: true,
    });
  });
});
