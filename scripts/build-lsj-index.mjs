/**
 * Downloads the Perseus LSJ XML and builds a compact JSON index:
 *   normalized-Unicode-lemma → first English gloss
 *
 * Source: PerseusDL/lexica (public domain, Liddell-Scott-Jones 9th ed. 1940)
 * Output: data/lxx/lsj-index.json
 *
 * Run: node scripts/build-lsj-index.mjs
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'data', 'lxx', 'lsj-index.json');
const LSJ_URL = 'https://raw.githubusercontent.com/PerseusDL/lexica/master/CTS_XML_TEI/perseus/pdllex/grc/lsj/grc.lsj.perseus-eng1.xml';

// ── Beta Code → Unicode Greek ─────────────────────────────────────────────────

const BASE = {
  a:'α',b:'β',g:'γ',d:'δ',e:'ε',z:'ζ',h:'η',q:'θ',i:'ι',k:'κ',
  l:'λ',m:'μ',n:'ν',c:'ξ',o:'ο',p:'π',r:'ρ',s:'σ',t:'τ',u:'υ',
  f:'φ',x:'χ',y:'ψ',w:'ω',
};

// Combining diacritics
const SMOOTH    = '̓'; // smooth breathing )
const ROUGH     = '̔'; // rough breathing (
const ACUTE     = '́'; // /
const GRAVE     = '̀'; // \
const CIRCUM    = '͂'; // =
const DIAER     = '̈'; // +
const IOTASUB   = 'ͅ'; // |
const MACRON    = '̄'; // _ (sometimes used)

function betaToUnicode(beta) {
  if (!beta) return '';
  let result = '';
  let i = 0;
  const s = beta.toLowerCase().replace(/^\*/, ''); // strip uppercase marker at start

  while (i < s.length) {
    const ch = s[i];

    if (ch === '*') { i++; continue; } // uppercase marker — skip (we work lowercase)

    const base = BASE[ch];
    if (!base) {
      // Pass through digits, spaces, punctuation
      result += ch;
      i++;
      continue;
    }

    // Collect diacritics that follow
    let diacritics = '';
    let j = i + 1;
    while (j < s.length && ')/(\\/=+|_'.includes(s[j])) {
      switch (s[j]) {
        case ')': diacritics += SMOOTH; break;
        case '(': diacritics += ROUGH; break;
        case '/': diacritics += ACUTE; break;
        case '\\': diacritics += GRAVE; break;
        case '=': diacritics += CIRCUM; break;
        case '+': diacritics += DIAER; break;
        case '|': diacritics += IOTASUB; break;
      }
      j++;
    }

    // Combine base + diacritics and NFC normalize to precomposed form
    const combined = (base + diacritics);
    result += combined.normalize('NFC');
    i = j;
  }

  return result;
}

/** Strip all diacritics for normalized lookup key */
function normalizeGreek(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining marks
    .replace(/[ϊΐ]/g, 'ι')
    .replace(/ϋ/g, 'υ')
    .toLowerCase()
    .trim();
}

// ── Extract first English gloss from an LSJ entry's XML text ─────────────────

function extractGloss(entryText) {
  // <tr> elements contain translations/English glosses
  const trMatches = entryText.match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) ?? [];
  for (const tr of trMatches) {
    const text = tr
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    // Skip very short, non-English, or reference-only strings
    if (text.length < 3) continue;
    if (/^[A-Za-z0-9 ,;:.!?()'"\-]+$/.test(text) === false) continue; // non-ASCII = not English
    // Take first comma/semicolon segment only
    let gloss = text.split(/[;,]/)[0].trim();
    gloss = gloss.replace(/\s*\([^)]*\)/g, '').trim(); // strip parentheticals
    if (gloss.length >= 2 && gloss.length <= 80) return gloss;
  }
  return null;
}

// ── Download + parse ──────────────────────────────────────────────────────────

function download(url) {
  return new Promise((resolve, reject) => {
    let body = '';
    https.get(url, { headers: { 'User-Agent': 'proto-vorlage-lsj-builder/1.0' } }, res => {
      const total = parseInt(res.headers['content-length'] || '0');
      let received = 0;
      res.on('data', chunk => {
        body += chunk;
        received += chunk.length;
        if (total) process.stdout.write(`\rDownloading LSJ: ${((received/total)*100).toFixed(0)}%`);
      });
      res.on('end', () => { console.log(''); resolve(body); });
    }).on('error', reject);
  });
}

console.log('Downloading LSJ XML from PerseusDL/lexica…');
const xml = await download(LSJ_URL);
console.log(`Downloaded ${(xml.length / 1e6).toFixed(1)} MB. Parsing entries…`);

// Extract all <entryFree> blocks
const entryPattern = /<entryFree\s([^>]+)>([\s\S]*?)<\/entryFree>/g;
const index = {};
let total = 0, indexed = 0;

let m;
while ((m = entryPattern.exec(xml)) !== null) {
  total++;
  const attrs = m[1];
  const body  = m[2];

  // Extract key attribute
  const keyMatch = attrs.match(/\bkey="([^"]+)"/);
  if (!keyMatch) continue;

  const betaKey = keyMatch[1];
  const unicode = betaToUnicode(betaKey);
  const normalized = normalizeGreek(unicode);
  if (!normalized) continue;

  const gloss = extractGloss(body);
  if (!gloss) continue;

  // Store under normalized key (no diacritics) — lookup will also normalize
  if (!index[normalized]) {
    index[normalized] = gloss;
    indexed++;
  }
}

console.log(`Parsed ${total} entries, indexed ${indexed} with English glosses`);

fs.writeFileSync(OUT, JSON.stringify(index));
console.log(`Saved to data/lxx/lsj-index.json (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);
