import fs from 'fs';
import path from 'path';

// ⚠️  CACHE SAFETY: data/cache/ must NEVER be wiped by automated scripts.
// All cache-clearing requires explicit user instruction or a dedicated admin endpoint.

const CACHE_DIR = path.join(process.cwd(), 'data', 'cache');

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function safeKey(key: string): string {
  return key.replace(/[^a-z0-9_\-]/gi, '_');
}

function isRedisConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function getRedis() {
  const { Redis } = require('@upstash/redis');
  return Redis.fromEnv();
}

export async function getCachedVerse(key: string): Promise<unknown> {
  if (!isRedisConfigured()) {
    ensureCacheDir();
    const file = path.join(CACHE_DIR, `${safeKey(key)}.json`);
    if (!fs.existsSync(file)) return null;
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
  }
  return await getRedis().get(`verse:${key}`);
}

export async function cacheVerse(key: string, data: unknown): Promise<void> {
  if (!isRedisConfigured()) {
    ensureCacheDir();
    fs.writeFileSync(path.join(CACHE_DIR, `${safeKey(key)}.json`), JSON.stringify(data));
    return;
  }
  await getRedis().set(`verse:${key}`, data);
}

export async function getCachedCount(): Promise<number> {
  if (!isRedisConfigured()) {
    ensureCacheDir();
    return fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json')).length;
  }
  const count = await getRedis().get('__verse_count__') as number | null;
  return count ?? 0;
}

export async function clearCachedVerse(key: string): Promise<void> {
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
