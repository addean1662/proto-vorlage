import { NextRequest } from 'next/server';
import { isTorahBook, normalizeRef, canonicalizeRef } from '@/lib/torah';
import { getCachedVerse, cacheVerse, incrementCachedCount } from '@/lib/cache';
import { fetchMasoretText, fetchSeptuagint, fetchVulgate } from '@/lib/sources';
import { alignWithClaudeStream, verifyAlignment, type StreamMeta, type Correction } from '@/lib/claude';
import { getMTWords, getLXXWords, getVulgateWords, getDSSWords, getDSSVariants, type OSHBWord, type LXXWord, type VulgateWord, type DSSWord } from '@/lib/lexicon';
import { normalizeGloss } from '@/lib/normalize-gloss';
import { matchDSSWord, stripNikud } from '@/lib/dss-gloss';

// Allow up to 5 minutes for long-running Claude + verification calls
export const maxDuration = 300;

// Rate limiting (same store as the main route — per Vercel instance)
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

// ── Display row types ─────────────────────────────────────────────────────────

type DisplayWordEntry = {
  orig: string;
  eng: string;
  xlit?: string;
  def?: string;
  lemma?: string;
  strongs?: string;
};

type DisplayDSSEntry = {
  orig: string;
  eng: string;
  def?: string;
  frag: string | null;
  status: 'extant' | 'attested' | 'partial' | 'lost';
  paleo: boolean;
};

type DisplayRow = {
  mt: DisplayWordEntry;
  lxx: DisplayWordEntry;
  vul: DisplayWordEntry;
  dss: DisplayDSSEntry;
};

// ── Raw alignment row from Claude (index-based) ───────────────────────────────

type RawAlignmentRow = {
  // Index-based (when word lists are available):
  mt_idx?: number | null;
  lxx_idx?: number | null;
  vul_idx?: number | null;
  // Full object fallback (when word lists are not available):
  mt?: DisplayWordEntry;
  lxx?: DisplayWordEntry;
  vul?: DisplayWordEntry;
  // DSS is always a full object (requires web research):
  dss?: Partial<DisplayDSSEntry> | null;
};

const DASH: DisplayWordEntry = { orig: '—', eng: '—' };
const LOST_DSS: DisplayDSSEntry = { orig: '—', eng: '—', frag: null, status: 'lost', paleo: false };

/**
 * Convert a raw Claude alignment row (index-based) into a full display row
 * by looking up the indexed words from the pre-tokenized word lists.
 */
function assembleDisplayRow(
  raw: RawAlignmentRow,
  mtWords: OSHBWord[] | null,
  lxxWords: LXXWord[] | null,
  vulWords: VulgateWord[] | null,
): DisplayRow {
  // MT
  let mt: DisplayWordEntry;
  if ('mt_idx' in raw) {
    const idx = raw.mt_idx;
    mt = (idx !== null && idx !== undefined && mtWords && mtWords[idx])
      ? { orig: mtWords[idx].orig, eng: normalizeGloss(mtWords[idx].eng, mtWords[idx].orig, mtWords[idx].lemma ?? undefined), xlit: mtWords[idx].xlit, def: mtWords[idx].def ?? mtWords[idx].eng, lemma: mtWords[idx].lemma ?? undefined }
      : DASH;
  } else {
    mt = raw.mt ?? DASH;
  }

  // LXX
  let lxx: DisplayWordEntry;
  if ('lxx_idx' in raw) {
    const idx = raw.lxx_idx;
    lxx = (idx !== null && idx !== undefined && lxxWords && lxxWords[idx])
      ? { orig: lxxWords[idx].orig, eng: normalizeGloss(lxxWords[idx].eng, lxxWords[idx].orig, lxxWords[idx].strongs ?? undefined), xlit: lxxWords[idx].xlit, def: lxxWords[idx].def, strongs: lxxWords[idx].strongs ?? undefined }
      : DASH;
  } else {
    lxx = raw.lxx ?? DASH;
  }

  // Vulgate
  let vul: DisplayWordEntry;
  if ('vul_idx' in raw) {
    const idx = raw.vul_idx;
    vul = (idx !== null && idx !== undefined && vulWords && vulWords[idx])
      ? { orig: vulWords[idx].orig, eng: normalizeGloss(vulWords[idx].eng, vulWords[idx].orig, vulWords[idx].lemma ?? undefined), xlit: vulWords[idx].xlit, def: vulWords[idx].def ?? vulWords[idx].eng, lemma: vulWords[idx].lemma ?? undefined }
      : DASH;
  } else {
    vul = raw.vul ?? DASH;
  }

  // DSS
  const rawDSS = raw.dss;
  let dss: DisplayDSSEntry;
  if (rawDSS) {
    dss = {
      orig: rawDSS.orig ?? '—',
      eng: rawDSS.eng ?? '—',
      frag: rawDSS.frag ?? null,
      status: rawDSS.status ?? 'lost',
      paleo: rawDSS.paleo ?? false,
    };
  } else if (mt.orig === '—') {
    // MT is a padding/alignment dash — no word to be "lost", so DSS is also a dash.
    dss = { orig: '—', eng: '—', frag: null, status: 'extant', paleo: false };
  } else {
    dss = LOST_DSS;
  }

  return { mt, lxx, vul, dss };
}

export async function POST(request: NextRequest): Promise<Response> {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';

  let body: { ref?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const { ref } = body;
  if (!ref || typeof ref !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing verse reference' }), { status: 400 });
  }

  const canonical = canonicalizeRef(ref.trim());
  if (!isTorahBook(canonical)) {
    return new Response(
      JSON.stringify({ error: 'This tool covers the Torah only (Genesis–Deuteronomy).' }),
      { status: 400 }
    );
  }

  const key = normalizeRef(canonical);

  // ── SSE stream setup ────────────────────────────────────────────────────────
  const encoder = new TextEncoder();
  let enqueueFn: ((chunk: Uint8Array) => void) | null = null;
  let closeFn: (() => void) | null = null;

  const readable = new ReadableStream({
    start(controller) {
      enqueueFn = (chunk) => { try { controller.enqueue(chunk); } catch { /* stream closed */ } };
      closeFn = () => { try { controller.close(); } catch { /* already closed */ } };
    },
    cancel() {
      closeFn = null;
      enqueueFn = null;
    },
  });

  const emit = (event: string, data: unknown) => {
    enqueueFn?.(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
  };
  const close = () => closeFn?.();

  // ── Pipeline (runs in background while stream is open) ───────────────────────
  (async () => {
    try {
      // 1. Cache hit → instant response
      const cached = await getCachedVerse(key);
      if (cached) {
        // Apply the MT-dash fix to cached entries that predate the fix
        const cachedData = cached as { ref: string; title: string; subtitle: string; rows: DisplayRow[] };
        const fixedRows = cachedData.rows.map((row: DisplayRow) => {
          if (row.mt.orig === '—' && row.dss.status === 'lost') {
            return { ...row, dss: { ...row.dss, orig: '—', eng: '—', status: 'extant' as const } };
          }
          return row;
        });
        emit('cached', { data: { ...cachedData, rows: fixedRows }, fromCache: true });
        close();
        return;
      }

      // 2. Rate limit (only for live fetches)
      if (!checkRateLimit(ip)) {
        emit('error', { message: 'rate_limited' });
        close();
        return;
      }

      // 3. Fetch source texts sequentially, emitting previews
      emit('phase', { text: 'Fetching Masoretic Text…' });
      let mt: string, lxx: string, vul: string;
      try {
        mt = await fetchMasoretText(canonical);
        emit('source_preview', { source: 'mt', text: mt });
      } catch (err) {
        emit('error', { message: `Failed to fetch Masoretic Text: ${(err as Error).message}` });
        close();
        return;
      }

      emit('phase', { text: 'Fetching Septuagint…' });
      try {
        lxx = await fetchSeptuagint(canonical);
        emit('source_preview', { source: 'lxx', text: lxx });
      } catch (err) {
        emit('error', { message: `Failed to fetch Septuagint: ${(err as Error).message}` });
        close();
        return;
      }

      emit('phase', { text: 'Fetching Vulgate…' });
      try {
        vul = await fetchVulgate(canonical);
        emit('source_preview', { source: 'vul', text: vul });
      } catch (err) {
        emit('error', { message: `Failed to fetch Vulgate: ${(err as Error).message}` });
        close();
        return;
      }

      // 4. Stream Claude alignment
      emit('phase', { text: 'Aligning traditions and searching Dead Sea Scrolls…' });

      const mtWords = getMTWords(canonical);
      const lxxWords = getLXXWords(canonical);
      const vulWords = getVulgateWords(canonical);
      const book = canonical.split(/\s+\d/)[0].trim();

      let routeRowsEmitted = 0;
      let routeMetaEmitted = false;

      let aligned: unknown;
      try {
        aligned = await alignWithClaudeStream(
          canonical, mt!, lxx!, vul!,
          (rawRow) => {
            // Assemble full display row from index-based Claude output before emitting to client
            const displayRow = assembleDisplayRow(rawRow as RawAlignmentRow, mtWords, lxxWords, vulWords);
            emit('row', { row: displayRow });
            routeRowsEmitted++;
          },
          (meta: StreamMeta) => { emit('meta', meta); routeMetaEmitted = true; },
          mtWords,
          lxxWords,
          vulWords,
        );
      } catch (err) {
        const status = (err as { status?: number })?.status;
        if (status === 429) {
          emit('error', { message: 'rate_limited' });
        } else {
          emit('error', { message: `Claude alignment failed: ${(err as Error).message}` });
        }
        close();
        return;
      }

      const alignedData = aligned as { ref: string; title: string; subtitle: string; rows: unknown[] };
      if (!routeMetaEmitted) {
        emit('meta', { ref: alignedData.ref, title: alignedData.title, subtitle: alignedData.subtitle });
      }

      // Assemble all raw rows into display rows
      const rawRows = (alignedData.rows ?? []) as RawAlignmentRow[];
      const assembledRows: DisplayRow[] = rawRows.map(r => assembleDisplayRow(r, mtWords, lxxWords, vulWords));

      // Emit any rows the streaming loop missed (e.g. if Claude wrote JSON all at once)
      for (let i = routeRowsEmitted; i < assembledRows.length; i++) {
        emit('row', { row: assembledRows[i] });
      }

      // 4b. Apply pre-built DSS data if available (keyed by mt_idx → position in MT word list).
      // Plus rows (mt_idx: null) get the verse-level status — the scroll covers this verse region
      // and may attest the plus word; that evidence must not be suppressed.
      const prebuiltDSS = getDSSWords(canonical);
      let finalRows: DisplayRow[];
      if (prebuiltDSS) {
        const verseLevelDSS = prebuiltDSS[0]; // all words in a verse share the same status/frag
        finalRows = assembledRows.map((row, i) => {
          const rawRow = rawRows[i];
          const mtIdx = 'mt_idx' in rawRow ? rawRow.mt_idx : null;
          const prebuilt = (mtIdx !== null && mtIdx !== undefined)
            ? prebuiltDSS[mtIdx]
            : verseLevelDSS; // plus rows inherit verse-level DSS status
          if (!prebuilt) {
            // Pre-built DSS exists for this verse but no entry for this mt_idx.
            // This is an alignment gap — DSS simply has fewer words than MT here.
            // Show a dash, not a red dot (the word is not "lost", just unaligned).
            return {
              ...row,
              dss: { orig: '—', eng: '—', frag: verseLevelDSS?.frag ?? null, status: 'extant' as const, paleo: false },
            };
          }
          return {
            ...row,
            dss: {
              orig: prebuilt.orig,
              eng: prebuilt.eng,
              frag: prebuilt.frag ?? null,
              status: prebuilt.status,
              paleo: prebuilt.paleo ?? false,
            },
          };
        });
      } else {
        finalRows = assembledRows;
      }

      // 4c. When MT is a dash (alignment padding row), DSS should also be a dash.
      // A red dot on a row with no MT word is meaningless — there is nothing to be "lost".
      finalRows = finalRows.map((row) => {
        if (row.mt.orig === '—' && row.dss.status === 'lost') {
          return { ...row, dss: { ...row.dss, orig: '—', eng: '—', status: 'extant' as const } };
        }
        return row;
      });

      // 4d. Apply verified DSS variants (audited against published scholarly sources).
      //     Only entries in the variants file get DSS text — unaudited attested entries
      //     intentionally show siglum only, so divergences are never silently hidden.
      const dssVariants = getDSSVariants(canonical);
      if (dssVariants) {
        finalRows = finalRows.map((row, i) => {
          const rawRow = rawRows[i];
          const mtIdx = 'mt_idx' in rawRow ? rawRow.mt_idx : null;
          if (mtIdx === null || mtIdx === undefined) return row;
          const variant = dssVariants[mtIdx];
          if (!variant) return row;
          return {
            ...row,
            dss: {
              ...row.dss,
              orig: variant.orig,
              eng: variant.eng,
              status: 'extant' as const,
            },
          };
        });
      }

      // 5. Normalize DSS glosses (match against OSHB index, fallback to normalizeGloss)
      finalRows = finalRows.map((row) => {
        const dss = row.dss;
        if (dss.orig && dss.orig !== '—' && dss.orig !== '-') {
          const matched = matchDSSWord(dss.orig, book);
          const eng = matched
            ? normalizeGloss(matched.eng, dss.orig, matched.lemma ?? undefined)
            : normalizeGloss(dss.eng, dss.orig);
          const def = matched?.eng ?? dss.eng;
          return { ...row, dss: { ...dss, eng, def } };
        }
        return row;
      });

      // 6. Second-pass verification — catches semantic misalignments
      const verification = await verifyAlignment(ref, finalRows);
      const corrections = verification.skipped ? [] : verification.corrections;

      // 7. Cache and signal done
      const finalData = { ...alignedData, rows: finalRows };
      await cacheVerse(key, finalData);
      await incrementCachedCount();

      emit('done', { data: finalData, fromCache: false, corrections, verificationSkipped: verification.skipped ?? false });
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
