import { describe, expect, it, vi } from 'vitest';

vi.mock('../lib/cache', () => ({
  isRedisConfigured: () => false,
  getRedis: () => {
    throw new Error('Redis should not be used in memory fallback tests');
  },
}));

describe('rate limit memory fallback', () => {
  it('allows requests up to the configured limit and blocks after it', async () => {
    const { checkRateLimit } = await import('../lib/rate-limit');
    const ip = `203.0.113.${Math.floor(Math.random() * 100000)}`;

    await expect(checkRateLimit(ip, 'test', 2, 60)).resolves.toBe(true);
    await expect(checkRateLimit(ip, 'test', 2, 60)).resolves.toBe(true);
    await expect(checkRateLimit(ip, 'test', 2, 60)).resolves.toBe(false);
  });
});
