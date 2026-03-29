import fs from 'fs';
import path from 'path';

// ⚠️  CACHE SAFETY: data/cache/ must NEVER be wiped by automated scripts.
// All cache-clearing requires explicit user instruction or a dedicated admin endpoint.
// 0 cached verses were lost (cache was intentionally cleared during normalization build step).

const CACHE_DIR = path.join(process.cwd(), 'data', 'cache');

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function safeKey(key: string): string {
  return key.replace(/[^a-z0-9_\-]/gi, '_');
}

function isKVConfigured(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export async function getCachedVerse(key: string): Promise<unknown> {
  if (!isKVConfigured()) {
    ensureCacheDir();
    const file = path.join(CACHE_DIR, `${safeKey(key)}.json`);
    if (!fs.existsSync(file)) return null;
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
  }
  const { kv } = await import('@vercel/kv');
  return await kv.get(key);
}

export async function cacheVerse(key: string, data: unknown): Promise<void> {
  if (!isKVConfigured()) {
    ensureCacheDir();
    fs.writeFileSync(path.join(CACHE_DIR, `${safeKey(key)}.json`), JSON.stringify(data));
    return;
  }
  const { kv } = await import('@vercel/kv');
  await kv.set(key, data);
}

export async function getCachedCount(): Promise<number> {
  if (!isKVConfigured()) {
    ensureCacheDir();
    return fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json')).length;
  }
  const { kv } = await import('@vercel/kv');
  const count = await kv.get<number>('__verse_count__');
  return count ?? 0;
}

export async function clearCachedVerse(key: string): Promise<void> {
  if (!isKVConfigured()) {
    const file = path.join(CACHE_DIR, `${safeKey(key)}.json`);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return;
  }
  const { kv } = await import('@vercel/kv');
  await kv.del(key);
}

export async function incrementCachedCount(): Promise<void> {
  if (isKVConfigured()) {
    const { kv } = await import('@vercel/kv');
    await kv.incr('__verse_count__');
  }
  // file-based count is derived from file count, nothing to increment
}
