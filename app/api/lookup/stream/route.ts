import { NextRequest } from 'next/server';
import { isTorahBook, normalizeRef, canonicalizeRef } from '@/lib/torah';
import { getCachedVerse, cacheVerse, incrementCachedCount } from '@/lib/cache';
import { fetchMasoretText, fetchSeptuagint, fetchVulgate } from '@/lib/sources';
import { alignWithClaudeStream, verifyAlignment, type StreamMeta } from '@/lib/claude';
import { getMTWords, getLXXWords, getVulgateWords, getDSSWords, getDSSVariants, type OSHBWord, type LXXWord, type VulgateWord } from '@/lib/lexicon';
import { normalizeGloss } from '@/lib/normalize-gloss';
import { matchDSSWord } from '@/lib/dss-gloss';
import { checkRateLimit } from '@/lib/rate-limit';

export const maxDuration = 300;

// ── Display types ─────────────────────────────────────────────────────────────

type WordEntry = {
  orig: string;
  eng: string;
  xlit?: string;
  def?: string;
  lemma?: string;
  strongs?: string;
};

type DSSEntry = {
  orig: string;
  eng: string;
  def?: string;
  frag: string | null;
  status: 'extant' | 'attested' | 'partial' | 'lost';
  paleo: boolean;
};

type Traditions = {
  dss: DSSEntry[];   // one entry per MT word position (indexed with MT)
  lxx: WordEntry[];  // in LXX source order
  mt: WordEntry[];   // in MT source order
  vul: WordEntry[];  // in VUL source order
};

type AlignmentGroup = { lxx: number | null; mt: number | null; vul: number | null; };

type NewVerseData = {
  ref: string;
  title: string;
  subtitle: string;
  traditions: Traditions;
  groups: AlignmentGroup[];
};

// ── Tradition assembly from local data ────────────────────────────────────────

function assembleMT(words: OSHBWord[]): WordEntry[] {
  return words.map(w => ({
    orig: w.orig,
    eng: normalizeGloss(w.eng, w.orig, w.lemma ?? undefined),
    xlit: w.xlit,
    def: w.def ?? w.eng,
    lemma: w.lemma ?? undefined,
  }));
}

function assembleLXX(words: LXXWord[]): WordEntry[] {
  return words.map(w => ({
    orig: w.orig,
    eng: normalizeGloss(w.eng, w.orig, w.strongs ?? undefined),
    xlit: w.xlit,
    def: w.def,
    strongs: w.strongs ?? undefined,
  }));
}

function assembleVUL(words: VulgateWord[]): WordEntry[] {
  return words.map(w => ({
    orig: w.orig,
    eng: normalizeGloss(w.eng, w.orig, w.lemma ?? undefined),
    xlit: w.xlit,
    def: w.def ?? w.eng,
    lemma: w.lemma ?? undefined,
  }));
}

function assembleDSS(
  mtLength: number,
  prebuilt: ReturnType<typeof getDSSWords>,
  variants: ReturnType<typeof getDSSVariants>,
  book: string,
): DSSEntry[] {
  const LOST: DSSEntry = { orig: '—', eng: '—', frag: null, status: 'lost', paleo: false };
  const DASH: DSSEntry = { orig: '—', eng: '—', frag: null, status: 'extant', paleo: false };

  void DASH;

  return Array.from({ length: mtLength }, (_, i) => {
    if (!prebuilt) return LOST;

    const entry = prebuilt[i];
    if (!entry) {
      // Pre-built DSS exists for the verse but no entry for this position — alignment gap.
      return { orig: '—', eng: '—', frag: prebuilt[0]?.frag ?? null, status: 'extant' as const, paleo: false };
    }

    // Apply verified variant if available
    const variant = variants?.[i];
    const orig = variant?.orig ?? entry.orig;
    const rawEng = variant?.eng ?? entry.eng;

    // Normalize DSS gloss
    let eng = rawEng;
    let def: string | undefined;
    if (orig && orig !== '—' && orig !== '-') {
      const matched = matchDSSWord(orig, book);
      eng = matched
        ? normalizeGloss(matched.eng, orig, matched.lemma ?? undefined)
        : normalizeGloss(rawEng, orig);
      def = matched?.eng ?? rawEng;
    }

    return {
      orig,
      eng,
      def,
      frag: entry.frag ?? null,
      status: (variant ? 'extant' : entry.status) as DSSEntry['status'],
      paleo: entry.paleo ?? false,
    };
  });
}

export async function POST(request: NextRequest): Promise<Response> {
  let body: { ref?: string };
  try { body = await request.json(); }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 }); }

  const { ref } = body;
  if (!ref || typeof ref !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing verse reference' }), { status: 400 });
  }

  const canonical = canonicalizeRef(ref.trim());
  if (!isTorahBook(canonical)) {
    return new Response(JSON.stringify({ error: 'This tool covers the Torah only (Genesis–Deuteronomy).' }), { status: 400 });
  }

  const key = normalizeRef(canonical);

  // ── SSE stream setup ─────────────────────────────────────────────────────────
  const encoder = new TextEncoder();
  let enqueueFn: ((chunk: Uint8Array) => void) | null = null;
  let closeFn: (() => void) | null = null;

  const readable = new ReadableStream({
    start(controller) {
      enqueueFn = (chunk) => { try { controller.enqueue(chunk); } catch { /* closed */ } };
      closeFn = () => { try { controller.close(); } catch { /* already closed */ } };
    },
    cancel() { closeFn = null; enqueueFn = null; },
  });

  const emit = (event: string, data: unknown) => {
    enqueueFn?.(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
  };
  const close = () => closeFn?.();

  // ── Pipeline ─────────────────────────────────────────────────────────────────
  (async () => {
    try {
      // 1. Cache hit
      const cached = await getCachedVerse(key);
      if (cached) {
        emit('cached', { data: cached, fromCache: true });
        close();
        return;
      }

      // 2. Rate limit
      if (!(await checkRateLimit(request.headers.get('x-forwarded-for')))) {
        emit('error', { message: 'rate_limited' });
        close();
        return;
      }

      // 3. Fetch source texts
      emit('phase', { text: 'Fetching Masoretic Text…' });
      let mt: string, lxx: string, vul: string;
      try {
        mt = await fetchMasoretText(canonical);
        emit('source_preview', { source: 'mt', text: mt });
      } catch (err) {
        emit('error', { message: `Failed to fetch Masoretic Text: ${(err as Error).message}` });
        close(); return;
      }

      emit('phase', { text: 'Fetching Septuagint…' });
      try {
        lxx = await fetchSeptuagint(canonical);
        emit('source_preview', { source: 'lxx', text: lxx });
      } catch (err) {
        emit('error', { message: `Failed to fetch Septuagint: ${(err as Error).message}` });
        close(); return;
      }

      emit('phase', { text: 'Fetching Vulgate…' });
      try {
        vul = await fetchVulgate(canonical);
        emit('source_preview', { source: 'vul', text: vul });
      } catch (err) {
        emit('error', { message: `Failed to fetch Vulgate: ${(err as Error).message}` });
        close(); return;
      }

      // 4. Assemble tradition word lists from local data and emit immediately
      const book = canonical.split(/\s+\d/)[0].trim();
      const mtWords  = getMTWords(canonical);
      const lxxWords = getLXXWords(canonical);
      const vulWords = getVulgateWords(canonical);
      const prebuiltDSS = getDSSWords(canonical);
      const dssVariants = getDSSVariants(canonical);

      // If local word lists aren't available, fall back to old row-based format
      if (!mtWords || !lxxWords || !vulWords) {
        emit('phase', { text: 'Aligning traditions…' });
        // Legacy path: let Claude provide full word objects
        let aligned: unknown;
        try {
          aligned = await alignWithClaudeStream(
            canonical, mt!, lxx!, vul!,
            (meta: StreamMeta) => emit('meta', meta),
          );
        } catch (err) {
          const status = (err as { status?: number })?.status;
          emit('error', { message: status === 429 ? 'rate_limited' : `Claude alignment failed: ${(err as Error).message}` });
          close(); return;
        }
        const cacheStored = await cacheVerse(key, aligned);
        if (cacheStored) {
          await incrementCachedCount();
        }
        emit('done', { data: aligned, fromCache: false, cacheStored });
        close();
        return;
      }

      const mtDisplay  = assembleMT(mtWords);
      const lxxDisplay = assembleLXX(lxxWords);
      const vulDisplay = assembleVUL(vulWords);
      const dssDisplay = assembleDSS(mtWords.length, prebuiltDSS, dssVariants, book);

      const traditions: Traditions = {
        dss: dssDisplay,
        lxx: lxxDisplay,
        mt:  mtDisplay,
        vul: vulDisplay,
      };

      emit('traditions', { traditions });

      // 5. Stream Claude alignment (for connection keepalive; groups arrive at end)
      emit('phase', { text: 'Aligning traditions and searching Dead Sea Scrolls…' });

      let aligned: unknown;
      let streamMeta: StreamMeta | null = null;
      try {
        aligned = await alignWithClaudeStream(
          canonical, mt!, lxx!, vul!,
          (meta: StreamMeta) => { streamMeta = meta; emit('meta', meta); },
          mtWords, lxxWords, vulWords,
        );
      } catch (err) {
        const status = (err as { status?: number })?.status;
        emit('error', { message: status === 429 ? 'rate_limited' : `Claude alignment failed: ${(err as Error).message}` });
        close(); return;
      }

      const alignedData = aligned as { ref: string; title: string; subtitle: string; groups: AlignmentGroup[] };

      if (!streamMeta) {
        emit('meta', { ref: alignedData.ref, title: alignedData.title, subtitle: alignedData.subtitle });
      }

      const groups: AlignmentGroup[] = alignedData.groups ?? [];

      // 6. Verification (non-fatal)
      const verification = await verifyAlignment(canonical, groups, {
        mt: mtDisplay.map(w => ({ orig: w.orig, eng: w.eng })),
        lxx: lxxDisplay.map(w => ({ orig: w.orig, eng: w.eng })),
        vul: vulDisplay.map(w => ({ orig: w.orig, eng: w.eng })),
        dss: dssDisplay.map(w => ({ orig: w.orig, eng: w.eng, status: w.status })),
      });

      const corrections = verification.skipped ? [] : verification.corrections;

      // 7. Cache and done
      const finalData: NewVerseData = {
        ref: alignedData.ref,
        title: alignedData.title,
        subtitle: alignedData.subtitle,
        traditions,
        groups,
      };

      const cacheStored = await cacheVerse(key, finalData);
      if (cacheStored) {
        await incrementCachedCount();
      }

      emit('done', { data: finalData, fromCache: false, cacheStored, corrections, verificationSkipped: verification.skipped ?? false });
      close();

    } catch (err) {
      emit('error', { message: (err as Error).message ?? 'Unknown error' });
      close();
    }
  })();

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
