import fs from 'fs';
import path from 'path';
import { Redis } from '@upstash/redis';
import type { VerseReviewMeta } from './provenance';

// ⚠️  CACHE SAFETY: data/cache/ must NEVER be wiped by automated scripts.
// All cache-clearing requires explicit user instruction or a dedicated admin endpoint.

const CACHE_DIR = path.join(process.cwd(), 'data', 'cache');

function isVercelRuntime(): boolean {
  return process.env.VERCEL === '1';
}

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function safeKey(key: string): string {
  return key.replace(/[^a-z0-9_\-]/gi, '_');
}

export function isRedisConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

export function getRedis() {
  return Redis.fromEnv();
}

export async function getCachedVerse(key: string): Promise<unknown> {
  if (isVercelRuntime() && !isRedisConfigured()) return null;

  if (!isRedisConfigured()) {
    ensureCacheDir();
    const file = path.join(CACHE_DIR, `${safeKey(key)}.json`);
    if (!fs.existsSync(file)) return null;
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
  }
  return await getRedis().get(`verse:${key}`);
}

export async function cacheVerse(key: string, data: unknown): Promise<boolean> {
  if (isVercelRuntime() && !isRedisConfigured()) return false;

  if (!isRedisConfigured()) {
    ensureCacheDir();
    fs.writeFileSync(path.join(CACHE_DIR, `${safeKey(key)}.json`), JSON.stringify(data));
    return true;
  }
  await getRedis().set(`verse:${key}`, data);
  return true;
}

export async function getCachedCount(): Promise<number> {
  if (isVercelRuntime() && !isRedisConfigured()) return 0;

  if (!isRedisConfigured()) {
    ensureCacheDir();
    return fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json')).length;
  }
  const count = await getRedis().get('__verse_count__') as number | null;
  return count ?? 0;
}

export async function getCachedKeys(limit = 100): Promise<string[]> {
  if (isVercelRuntime() && !isRedisConfigured()) return [];

  if (!isRedisConfigured()) {
    ensureCacheDir();
    return fs.readdirSync(CACHE_DIR)
      .filter(f => f.endsWith('.json'))
      .slice(0, limit)
      .map(f => f.replace(/\.json$/, ''));
  }

  const redis = getRedis();
  const keys: string[] = [];
  let cursor = '0';
  do {
    const result = await redis.scan(cursor, { match: 'verse:*', count: Math.min(limit, 100) });
    cursor = result[0];
    keys.push(...(result[1] as string[]).map(k => k.replace(/^verse:/, '')));
  } while (cursor !== '0' && keys.length < limit);
  return keys.slice(0, limit);
}

export async function getReviewMeta(key: string): Promise<VerseReviewMeta | null> {
  if (isVercelRuntime() && !isRedisConfigured()) return null;

  if (!isRedisConfigured()) {
    ensureCacheDir();
    const file = path.join(CACHE_DIR, `${safeKey(key)}.review.json`);
    if (!fs.existsSync(file)) return null;
    try { return JSON.parse(fs.readFileSync(file, 'utf8')) as VerseReviewMeta; } catch { return null; }
  }

  return await getRedis().get(`review:${key}`) as VerseReviewMeta | null;
}

export async function setReviewMeta(key: string, review: VerseReviewMeta): Promise<boolean> {
  if (isVercelRuntime() && !isRedisConfigured()) return false;

  if (!isRedisConfigured()) {
    ensureCacheDir();
    fs.writeFileSync(path.join(CACHE_DIR, `${safeKey(key)}.review.json`), JSON.stringify(review));
    return true;
  }

  await getRedis().set(`review:${key}`, review);
  return true;
}

export async function clearCachedVerse(key: string): Promise<void> {
  if (isVercelRuntime() && !isRedisConfigured()) return;

  if (!isRedisConfigured()) {
    const file = path.join(CACHE_DIR, `${safeKey(key)}.json`);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return;
  }
  await getRedis().del(`verse:${key}`);
}

export async function incrementCachedCount(): Promise<void> {
  if (isRedisConfigured()) {
    await getRedis().incr('__verse_count__');
  }
  // file-based count is derived from file count, nothing to increment
}

export async function clearAllCached(): Promise<number> {
  if (isVercelRuntime() && !isRedisConfigured()) return 0;

  if (!isRedisConfigured()) {
    ensureCacheDir();
    const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));
    for (const f of files) fs.unlinkSync(path.join(CACHE_DIR, f));
    return files.length;
  }
  const redis = getRedis();
  // Scan all verse keys and delete them, then reset the count
  let cursor = '0';
  let deleted = 0;
  do {
    const result = await redis.scan(cursor, { match: 'verse:*', count: 100 });
    cursor = result[0];
    const keys = result[1] as string[];
    if (keys.length > 0) {
      await redis.del(...keys);
      deleted += keys.length;
    }
  } while (cursor !== '0');
  await redis.set('__verse_count__', 0);
  return deleted;
}
