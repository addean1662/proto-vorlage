import { NextRequest } from 'next/server';
import { isTorahBook, normalizeRef, canonicalizeRef } from '@/lib/torah';
import { getCachedVerse, cacheVerse, getCachedCount, incrementCachedCount, clearCachedVerse, clearAllCached, isRedisConfigured } from '@/lib/cache';
import { fetchMasoretText, fetchSeptuagint, fetchVulgate } from '@/lib/sources';
import { alignWithClaude } from '@/lib/claude';
import { checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

function isAuthorizedAdmin(request: NextRequest): boolean {
  const expected = process.env.CACHE_ADMIN_SECRET;
  if (!expected) return false;
  return request.headers.get('x-cache-admin-secret') === expected;
}

export async function GET(request: NextRequest) {
  const count = await getCachedCount();
  if (isAuthorizedAdmin(request)) {
    const redisConfigured = isRedisConfigured();
    return Response.json({
      count,
      cacheBackend: redisConfigured ? 'upstash-redis' : process.env.VERCEL === '1' ? 'disabled' : 'local-file',
      rateLimitBackend: redisConfigured ? 'upstash-redis' : 'memory',
      cacheWritable: redisConfigured || process.env.VERCEL !== '1',
    });
  }
  return Response.json({ count });
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorizedAdmin(request)) {
    logger.warn('cache_delete_forbidden');
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { refs?: string[]; all?: boolean };
  try { body = await request.json(); } catch { body = {}; }

  if (body.all) {
    const count = await clearAllCached();
    return Response.json({ cleared: count });
  }

  const refs = body.refs ?? [];
  const cleared: string[] = [];
  for (const ref of refs) {
    const key = normalizeRef(canonicalizeRef(ref.trim()));
    await clearCachedVerse(key);
    cleared.push(key);
  }
  return Response.json({ cleared });
}

export async function POST(request: NextRequest) {
  let body: { ref?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { ref } = body;

  if (!ref || typeof ref !== 'string') {
    return Response.json({ error: 'Missing verse reference' }, { status: 400 });
  }

  const canonical = canonicalizeRef(ref.trim());
  if (!isTorahBook(canonical)) {
    return Response.json(
      { error: 'This tool covers the Torah only (Genesis–Deuteronomy).' },
      { status: 400 }
    );
  }

  const key = normalizeRef(canonical);

  // Check cache first
  const cached = await getCachedVerse(key);
  if (cached) {
    logger.info('lookup_cache_hit', { ref: canonical });
    return Response.json({ data: cached, fromCache: true });
  }

  // Rate limit only for uncached lookups
  if (!(await checkRateLimit(request.headers.get('x-forwarded-for')))) {
    logger.warn('lookup_rate_limited', { ref: canonical });
    return Response.json(
      { error: 'Rate limit: 10 new verse lookups per hour.' },
      { status: 429 }
    );
  }

  // Fetch three texts in parallel
  let mt: string, lxx: string, vul: string;
  try {
    [mt, lxx, vul] = await Promise.all([
      fetchMasoretText(canonical),
      fetchSeptuagint(canonical),
      fetchVulgate(canonical),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('lookup_source_fetch_failed', { ref: canonical, message });
    return Response.json({ error: `Failed to fetch source texts: ${message}` }, { status: 502 });
  }

  // Align with Claude
  let aligned: unknown;
  try {
    aligned = await alignWithClaude(canonical, mt, lxx, vul);
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 429) {
      return Response.json({ error: 'rate_limited' }, { status: 429 });
    }
    const message = err instanceof Error ? err.message : String(err);
    logger.error('lookup_alignment_failed', { ref: canonical, status, message });
    return Response.json({ error: `Claude alignment failed: ${message}` }, { status: 502 });
  }

  // Cache and return
  const cacheStored = await cacheVerse(key, aligned);
  if (cacheStored) {
    await incrementCachedCount();
  }
  logger.info('lookup_completed', { ref: canonical, cacheStored });

  return Response.json({ data: aligned, fromCache: false, cacheStored });
}
