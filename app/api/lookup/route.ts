import { NextRequest } from 'next/server';
import { isTorahBook, normalizeRef, canonicalizeRef } from '@/lib/torah';
import { getCachedVerse, cacheVerse, getCachedCount, incrementCachedCount, clearCachedVerse } from '@/lib/cache';
import { fetchMasoretText, fetchSeptuagint, fetchVulgate } from '@/lib/sources';
import { alignWithClaude } from '@/lib/claude';

// Rate limiting: simple in-memory store (resets on server restart / per Vercel instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 3_600_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

export async function GET() {
  const count = await getCachedCount();
  return Response.json({ count });
}

export async function DELETE(request: NextRequest) {
  const { refs } = await request.json() as { refs: string[] };
  const cleared: string[] = [];
  for (const ref of refs) {
    const key = normalizeRef(canonicalizeRef(ref.trim()));
    await clearCachedVerse(key);
    cleared.push(key);
  }
  return Response.json({ cleared });
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';

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
    return Response.json({ data: cached, fromCache: true });
  }

  // Rate limit only for uncached lookups
  if (!checkRateLimit(ip)) {
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
    return Response.json({ error: `Claude alignment failed: ${message}` }, { status: 502 });
  }

  // Cache and return
  await cacheVerse(key, aligned);
  await incrementCachedCount();

  return Response.json({ data: aligned, fromCache: false });
}
