/**
 * patch-vulgate-defs.mjs
 *
 * Adds a short `def` field to each Vulgate word by looking up the word form
 * (and lemma when available) directly in the L&S index.
 *
 * Run once: node scripts/patch-vulgate-defs.mjs
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
  for (const f of fs.readdirSync(VUL_DIR).filter(f => /^ls_[A-Z]\.json$/.test(f) && !f.includes('sample'))) {
    let entries;
    try { entries = JSON.parse(fs.readFileSync(path.join(VUL_DIR, f), 'utf8')); }
    catch { console.warn(`  Skipping ${f}`); continue; }
    for (const e of entries) {
      if (e.key) index[e.key.toLowerCase()] = e;
    }
  }
  return index;
}

// ── English detection (from patch-vulgate-glosses.mjs) ───────────────────────

// Patterns that indicate a string is NOT a clean English definition
const BAD_PREFIXES = [
  /^(Gen|Dat|Acc|Nom|Voc|Abl|Loc|Subst|Adv|Adj|Conj|Prep|Pron|Interj)\b/,
  /^(v\.|cf\.|i\.e\.|i\.q\.|syn\.|see |vid\.|= |Prop\.|V\.|q\.v\.|sc\.|e\.g\.|etc\.)/,
  /^[A-Z]{2,}\./,                        // all-caps abbreviation
  /^\[/,                                  // "[Sanscr..." etymology
  /^[A-Z][a-z]{1,8}\.[\s,]/,             // "Cic. " / "Plaut., " author citations
  /\b(Cic|Verg|Ov|Plaut|Hor|Liv|Tac|Plin|Ter|Sall|Quint|Caes)\.\s/,  // author abbrevs
  /Forms of/,
  /C\.\s*I\.\s*L\./,
  /\bInscr\b/,
];

function looksLikeEnglish(s) {
  if (!s || s.length < 10) return false;
  for (const rx of BAD_PREFIXES) if (rx.test(s)) return false;
  // Must have at least 3 distinct lowercase English words (≥3 chars each)
  const words = (s.match(/\b[a-z]{3,}\b/g) || []);
  if (words.length < 3) return false;
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

/**
 * Extract a tooltip-length definition (first clean English phrase, up to ~120 chars).
 */
function extractDef(entry) {
  if (!entry) return null;

  const strings = flattenSenses(entry.senses || []);
  for (const s of strings) {
    if (!looksLikeEnglish(s)) continue;
    // Take text before first semicolon
    let def = s.split(';')[0].trim();
    // Strip citation tails: ", Cic." and everything after
    def = def.replace(/,\s+[A-Z][a-z]{0,7}\..*$/, '').trim();
    // Strip parenthetical notes
    def = def.replace(/\s*\([^)]{0,60}\)/g, '').trim();
    // Strip leading "In gen.:" / "Esp.:" type labels
    def = def.replace(/^[A-Z][a-z]+ [a-z]+\.:\s*/, '').trim();
    def = def.replace(/^[A-Z][a-z]+\.:\s*/, '').trim();
    if (def.length < 8) continue;
    // Final quality check — must still look like English
    if (!looksLikeEnglish(def + ' padding')) continue;
    if (def.length > 120) def = def.slice(0, 117).replace(/\s+\S+$/, '').trim() + '…';
    return def;
  }

  return null;
}

// ── Normalise word form for lookup ────────────────────────────────────────────

function normalizeForm(orig) {
  // Strip punctuation, lowercase
  return orig.replace(/[^\w\u00C0-\u024F]/g, '').toLowerCase();
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log('Building L&S index…');
const lsIndex = buildLSIndex();
console.log(`  ${Object.keys(lsIndex).length} entries`);

let added = 0, skipped = 0;

for (const basename of ['Gen', 'Exod', 'Lev', 'Num', 'Deut']) {
  const file = path.join(VUL_DIR, `${basename}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  let bookAdded = 0;

  for (const words of Object.values(data)) {
    for (const w of words) {
      delete w.def; // clear any stale def from previous run

      let def = null;

      // Try lemma first
      if (w.lemma) {
        def = extractDef(lsIndex[w.lemma.toLowerCase()]);
      }

      // Try word form directly
      if (!def) {
        const form = normalizeForm(w.orig);
        def = extractDef(lsIndex[form]);
      }

      if (def) {
        w.def = def;
        bookAdded++;
        added++;
      } else {
        skipped++;
      }
    }
  }

  fs.writeFileSync(file, JSON.stringify(data));
  console.log(`  ${basename}: added def to ${bookAdded} words`);
}

console.log(`\nTotal: ${added} defs added, ${skipped} still without def`);
