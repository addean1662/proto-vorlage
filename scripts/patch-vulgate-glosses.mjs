/**
 * patch-vulgate-glosses.mjs
 *
 * Patches [no gloss] entries in data/vulgate/*.json in-place.
 * Two strategies:
 *   A) Has lemma   → try L&S lookup with improved extraction
 *   B) No lemma    → if proper noun (capital), use the word itself;
 *                    if ends in -que/-ve/-ne, strip enclitic and retry
 *
 * Run once: node scripts/patch-vulgate-glosses.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const VUL_DIR = path.join(ROOT, 'data', 'vulgate');

// ── L&S index ─────────────────────────────────────────────────────────────────

function buildLSIndex() {
  const index = {};
  for (const f of fs.readdirSync(VUL_DIR).filter(f => /^ls_[A-Z]\.json$/.test(f))) {
    let entries;
    try { entries = JSON.parse(fs.readFileSync(path.join(VUL_DIR, f), 'utf8')); }
    catch { console.warn(`  Skipping corrupt ${f}`); continue; }
    for (const e of entries) {
      if (e.key) index[e.key.toLowerCase()] = e;
    }
  }
  return index;
}

// ── Improved gloss extraction ─────────────────────────────────────────────────

function looksLikeEnglish(s) {
  if (!s || s.length < 3) return false;
  // Skip Latin morphological/grammatical notes
  if (/^(Gen|Dat|Acc|Nom|Voc|Abl|Loc)\b/.test(s)) return false;       // case labels
  if (/C\.\s*I\.\s*L\./.test(s)) return false;                          // corpus inscriptionum
  if (/\bInscr\b/.test(s)) return false;
  if (/^[A-Z][a-z]{1,5}\.\s+[A-Z]/.test(s)) return false;              // "Cic. Ad." etc.
  if (/^(v\.|cf\.|i\.e\.|i\.q\.|syn\.|see |vid\.|= )/.test(s)) return false;
  if (/^[A-Z]{2,}\./.test(s)) return false;                             // all-caps abbrev
  // Must contain at least one lowercase English word
  if (!/[a-z]{3}/.test(s)) return false;
  return true;
}

function flattenSenses(senses) {
  const out = [];
  function walk(node) {
    if (typeof node === 'string') { out.push(node); return; }
    if (Array.isArray(node)) { for (const c of node) walk(c); }
  }
  walk(senses);
  return out;
}

function extractGloss(entry) {
  if (!entry) return null;

  // Try all strings in senses depth-first
  const strings = flattenSenses(entry.senses || []);
  for (const s of strings) {
    if (!looksLikeEnglish(s)) continue;
    let g = s.split(/[;,]/)[0].trim();
    g = g.replace(/\s*\([^)]+\)/g, '').trim();
    g = g.replace(/^(To |A kind of |An? |The )/i, '');
    if (g.length < 2) continue;
    if (g.length > 40) g = g.slice(0, 40).replace(/\s+\S+$/, '').trim();
    return g;
  }

  // Fallback: main_notes with synonym/synonym pattern
  if (entry.main_notes) {
    const m = entry.main_notes.match(/^(?:=|i\.q\.)\s*([^,;.(]+)/);
    if (m) return m[1].trim();
  }

  return null;
}

// ── Proper-noun / enclitic handler ────────────────────────────────────────────

function glossNoLemma(orig) {
  let base = orig;
  // Strip enclitics
  base = base.replace(/(?:que|ve|ne)$/, '');
  // If starts with capital → proper noun
  if (/^[A-Z]/.test(base)) return base;  // use the name
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log('Building L&S index…');
const lsIndex = buildLSIndex();
console.log(`  ${Object.keys(lsIndex).length} entries`);

let fixed = 0, stillMissing = 0;

for (const basename of ['Gen', 'Exod', 'Lev', 'Num', 'Deut']) {
  const file = path.join(VUL_DIR, `${basename}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  let bookFixed = 0;

  for (const words of Object.values(data)) {
    for (const w of words) {
      if (w.eng !== '[no gloss]') continue;

      let gloss = null;

      if (w.lemma) {
        const entry = lsIndex[w.lemma.toLowerCase()];
        gloss = extractGloss(entry);
      }

      if (!gloss) {
        gloss = glossNoLemma(w.orig);
      }

      if (gloss) {
        w.eng = gloss;
        bookFixed++;
        fixed++;
      } else {
        stillMissing++;
      }
    }
  }

  fs.writeFileSync(file, JSON.stringify(data));
  console.log(`  ${basename}: fixed ${bookFixed}`);
}

console.log(`\nTotal fixed: ${fixed}  |  Still [no gloss]: ${stillMissing}`);
