/**
 * Fills missing glosses in data/lxx and data/vulgate using:
 *   1. Perseids/Alpheios morphology service → lemma
 *   2. Wiktionary REST API → scholarly definition for that lemma
 *
 * Run: node scripts/fill-missing-glosses.js
 * Safe to interrupt and re-run — cache file preserves progress.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const BOOKS = ['Gen', 'Exod', 'Lev', 'Num', 'Deut'];
const CACHE_FILE = path.join(__dirname, '..', 'data', 'gloss-cache.json');
const UA = 'proto-vorlage-lexicon-builder/1.0 (scholarly lexical enrichment)';
const DELAY_MS = 250;

// ── HTTP helper ───────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function get(url) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      https.get(
        { hostname: u.hostname, path: u.pathname + u.search, headers: { 'User-Agent': UA } },
        (res) => {
          let body = '';
          res.on('data', c => body += c);
          res.on('end', () => {
            try { resolve(JSON.parse(body)); } catch { resolve(null); }
          });
        }
      ).on('error', () => resolve(null));
    } catch { resolve(null); }
  });
}

function stripHtml(s) {
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .trim();
}

// Skip Wiktionary "form of" entries — they describe inflection, not meaning
const FORM_OF_PATTERNS = [
  /^first-person/i, /^second-person/i, /^third-person/i,
  /^nominative/i, /^genitive/i, /^accusative/i, /^dative/i,
  /^singular/i, /^plural/i,
  /inflection of/i, /form of/i, /conjugation of/i, /declension of/i,
];
function isFormOf(def) {
  const clean = stripHtml(def);
  return FORM_OF_PATTERNS.some(p => p.test(clean));
}

function bestDefinition(defs) {
  if (!defs?.length) return null;
  // Prefer a definition that is not a "form of" description
  for (const d of defs) {
    if (!isFormOf(d.definition)) return stripHtml(d.definition);
  }
  // Fall back to first even if form-of
  return stripHtml(defs[0].definition);
}

// ── Step 1: Lemmatize via Perseids/Alpheios ───────────────────────────────────

async function getLemma(word, lang) {
  const engine = lang === 'lat' ? 'morpheuslat' : 'morpheusgrc';
  const url = 'https://services.perseids.org/bsp/morphologyservice/analysis/word?lang=' +
    lang + '&engine=' + engine + '&word=' + encodeURIComponent(word) + '&xml=true';
  const r = await get(url);
  if (!r) return null;
  // Body is nested inside Annotation
  const body = r?.RDF?.Annotation?.Body?.rest;
  if (!body) return null;
  const entries = Array.isArray(body.entry) ? body.entry : [body.entry];
  for (const e of entries) {
    const hdwd = e?.dict?.hdwd?.['$'];
    if (hdwd) return hdwd;
  }
  return null;
}

// ── Step 2: Definition via Wiktionary REST v1 ─────────────────────────────────

async function getDefinition(lemma, lang) {
  const url = 'https://en.wiktionary.org/api/rest_v1/page/definition/' + encodeURIComponent(lemma);
  const r = await get(url);
  if (!r) return null;

  if (lang === 'lat') {
    return bestDefinition(r['la']?.[0]?.definitions);
  } else {
    // Ancient Greek: try 'grc' first, then 'other'
    for (const key of ['grc', 'other']) {
      const section = r[key];
      if (!section) continue;
      for (const entry of section) {
        if (entry.language?.toLowerCase().includes('greek') || key === 'grc') {
          const def = bestDefinition(entry.definitions);
          if (def) return def;
        }
      }
    }
  }
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const cache = fs.existsSync(CACHE_FILE)
    ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'))
    : {};

  // Collect unique missing words
  const missing = { lxx: new Map(), vulgate: new Map() };
  for (const [src] of [['lxx'], ['vulgate']]) {
    for (const book of BOOKS) {
      const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', src, `${book}.json`), 'utf8'));
      for (const words of Object.values(data)) {
        for (const w of words) {
          if ((!w.eng || w.eng === '[no gloss]') && w.orig) {
            if (!missing[src].has(w.orig)) missing[src].set(w.orig, true);
          }
        }
      }
    }
  }

  const totalLxx = missing.lxx.size;
  const totalVul = missing.vulgate.size;
  const total = totalLxx + totalVul;
  console.log(`LXX: ${totalLxx} unique missing | Vulgate: ${totalVul} unique missing | Total: ${total}`);

  const alreadyCached = Object.keys(cache).length;
  console.log(`Cache: ${alreadyCached} entries already resolved`);

  let done = 0;
  const SAVE_EVERY = 100;

  for (const [src, wordMap, lang] of [['lxx', missing.lxx, 'grc'], ['vulgate', missing.vulgate, 'lat']]) {
    for (const [word] of wordMap) {
      const cacheKey = `${lang}:${word}`;
      if (cacheKey in cache) { done++; continue; }

      const lemma = await getLemma(word, lang);
      await sleep(DELAY_MS);

      let gloss = null;
      if (lemma) {
        gloss = await getDefinition(lemma, lang);
        await sleep(DELAY_MS);
        if (!gloss && lemma !== word) {
          gloss = await getDefinition(word, lang);
          await sleep(DELAY_MS);
        }
      } else {
        gloss = await getDefinition(word, lang);
        await sleep(DELAY_MS);
      }

      cache[cacheKey] = gloss;
      done++;

      if (done % SAVE_EVERY === 0 || done === total) {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
        const found = Object.values(cache).filter(v => v !== null).length;
        const pct = ((done / total) * 100).toFixed(1);
        process.stdout.write(`\r${done}/${total} (${pct}%) — ${found} glosses resolved`);
      }
    }
  }

  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  console.log('\nLookups complete. Patching data files…');

  let patched = 0;
  for (const [src, lang] of [['lxx', 'grc'], ['vulgate', 'lat']]) {
    for (const book of BOOKS) {
      const filePath = path.join(__dirname, '..', 'data', src, `${book}.json`);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      let changed = false;
      for (const words of Object.values(data)) {
        for (const w of words) {
          if ((!w.eng || w.eng === '[no gloss]') && w.orig) {
            const gloss = cache[`${lang}:${w.orig}`];
            if (gloss) { w.eng = gloss; patched++; changed = true; }
          }
        }
      }
      if (changed) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`  Patched ${src}/${book}.json`);
      }
    }
  }

  const unresolved = Object.values(cache).filter(v => v === null).length;
  console.log(`Done. Patched ${patched} word instances. Unresolved: ${unresolved} unique words.`);
}

main().catch(console.error);
