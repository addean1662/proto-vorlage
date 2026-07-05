import { getRedis, isRedisConfigured } from './cache';

const memoryLimits = new Map<string, { count: number; resetAt: number }>();

function clientIdFromForwardedFor(value: string | null): string {
  return value?.split(',')[0]?.trim() || 'unknown';
}

function safeRateKey(value: string): string {
  return value.replace(/[^a-z0-9:_.-]/gi, '_');
}

export async function checkRateLimit(
  forwardedFor: string | null,
  scope = 'lookup',
  limit = 10,
  windowSeconds = 3600,
): Promise<boolean> {
  const clientId = clientIdFromForwardedFor(forwardedFor);
  const key = `rate:${scope}:${safeRateKey(clientId)}`;

  if (isRedisConfigured()) {
    const redis = getRedis();
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);
    return count <= limit;
  }

  const now = Date.now();
  const memoryKey = `${scope}:${clientId}`;
  const entry = memoryLimits.get(memoryKey);
  if (!entry || now > entry.resetAt) {
    memoryLimits.set(memoryKey, { count: 1, resetAt: now + windowSeconds * 1000 });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}
