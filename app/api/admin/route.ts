import { NextRequest } from 'next/server';
import { canonicalizeRef, normalizeRef } from '@/lib/torah';
import { clearCachedVerse, getCachedCount, getCachedKeys, getReviewMeta, isRedisConfigured, setReviewMeta } from '@/lib/cache';
import type { ReviewStatus } from '@/lib/provenance';
import { logger } from '@/lib/logger';

function isAuthorizedAdmin(request: NextRequest): boolean {
  const expected = process.env.CACHE_ADMIN_SECRET;
  return !!expected && request.headers.get('x-cache-admin-secret') === expected;
}

function forbidden() {
  logger.warn('admin_forbidden');
  return Response.json({ error: 'Forbidden' }, { status: 403 });
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedAdmin(request)) return forbidden();

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? 25), 1), 100);
  const keys = await getCachedKeys(limit);
  const reviewed = await Promise.all(keys.map(async key => [key, await getReviewMeta(key)] as const));

  return Response.json({
    cacheBackend: isRedisConfigured() ? 'upstash-redis' : process.env.VERCEL === '1' ? 'disabled' : 'local-file',
    cacheCount: await getCachedCount(),
    keys,
    reviews: Object.fromEntries(reviewed.filter(([, review]) => review)),
  });
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedAdmin(request)) return forbidden();

  let body: { ref?: string; status?: ReviewStatus; reviewer?: string; note?: string };
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  if (!body.ref) return Response.json({ error: 'Missing ref' }, { status: 400 });
  const status = body.status ?? 'reviewed';
  if (!['generated', 'reviewed', 'corrected'].includes(status)) {
    return Response.json({ error: 'Invalid review status' }, { status: 400 });
  }

  const key = normalizeRef(canonicalizeRef(body.ref.trim()));
  const stored = await setReviewMeta(key, {
    status,
    reviewedAt: new Date().toISOString(),
    reviewer: body.reviewer,
    note: body.note,
  });

  return Response.json({ key, stored });
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorizedAdmin(request)) return forbidden();

  const { searchParams } = new URL(request.url);
  const ref = searchParams.get('ref');
  if (!ref) return Response.json({ error: 'Missing ref' }, { status: 400 });

  const key = normalizeRef(canonicalizeRef(ref.trim()));
  await clearCachedVerse(key);
  return Response.json({ cleared: key });
}
