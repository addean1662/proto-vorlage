import { NextRequest } from 'next/server';
import { normalizeRef, canonicalizeRef } from '@/lib/torah';
import { getCachedCount, clearCachedVerse, clearAllCached, isRedisConfigured } from '@/lib/cache';
import { POST as streamLookup } from './stream/route';

export const maxDuration = 300;
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

/** JSON clients use the same source-backed, validated pipeline as the streaming UI. */
export async function POST(request: NextRequest) {
  const response = await streamLookup(request);
  if (!response.ok) return response;
  const body = await response.text();
  for (const block of body.split('\n\n')) {
    const event = block.match(/^event: (.+)$/m)?.[1];
    const raw = block.match(/^data: (.+)$/m)?.[1];
    if (!raw) continue;
    const data = JSON.parse(raw);
    if (event === 'cached' || event === 'done') return Response.json(data);
    if (event === 'error') {
      return Response.json({ error: data.message }, { status: data.message === 'rate_limited' ? 429 : 502 });
    }
  }
  return Response.json({ error: 'Lookup ended before completion' }, { status: 502 });
}
