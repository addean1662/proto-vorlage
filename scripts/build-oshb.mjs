/**
 * Build OSHB lexical lookup JSON files for each Torah book.
 *
 * Reads:
 *   scripts/strongs-hebrew-dictionary.js  (JS variable format)
 *   data/oshb/{Gen,Exod,Lev,Num,Deut}.xml
 *
 * Writes:
 *   data/oshb/{Gen,Exod,Lev,Num,Deut}.json
 *   data/oshb/index.json  (maps "Genesis 1:1" → {book, chapter, verse})
 *
 * Output format per book JSON:
 *   { "1:1": [ {orig, lemma, eng}, ... ], "1:2": [...], ... }
 *
 * Where:
 *   orig  = pointed Hebrew text (from XML content)
 *   lemma = normalized Strong's number e.g. "H7225"
 *   eng   = English gloss from Strong's (strongs_def, first phrase), or "[no gloss]"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const require = createRequire(import.meta.url);

// ── 1. Load lexicons ──────────────────────────────────────────────────────────

console.log('Loading Strong\'s dictionary…');
const strongsDict = require('./strongs-hebrew-dictionary.js');
console.log(`  Loaded ${Object.keys(strongsDict).length} Strong's entries`);

console.log('Loading BDB (Brown-Driver-Briggs)…');
const bdbRaw = JSON.parse(fs.readFileSync(path.join(__dirname, 'DictBDB.json'), 'utf8'));
// Index BDB by Strong's number (from the 'top' field of each entry)
const bdbByStrong = {};
for (const entry of Object.values(bdbRaw)) {
  if (entry.top?.startsWith('H')) bdbByStrong[entry.top] = entry.def || '';
}
console.log(`  Loaded ${Object.keys(bdbByStrong).length} BDB entries`);

// BDB part-of-speech labels to skip when extracting the primary gloss
const BDB_SKIP = new Set([
  'noun','verb','adjective','adverb','preposition','conjunction','pronoun',
  'interjection','particle','prefix','suffix','article','numeral',
  'noun masculine','noun feminine','noun masculine plural','noun feminine plural',
  'noun m','noun f','noun common','adjective masculine','adjective feminine',
  'verb qal','verb niphal','verb piel','verb pual','verb hiphil','verb hophal','verb hithpael',
  'proper name','proper name masculine','proper name feminine','proper name place',
  'masculine','feminine','plural','singular','dual','common',
  // BDB-specific label forms
  'substantive','substantive masculine','substantive feminine',
  'substantive noun masculine','substantive noun feminine',
  'adjective number','adjective ordinal','adjective gentilic',
  'pronoun personal','pronoun demonstrative','pronoun relative',
  'pronoun interrogative','pronoun reflexive','pronoun indefinite',
  'pronoun 1 singular','pronoun 2 singular','pronoun 3 singular',
  'pronoun 1 plural','pronoun 2 plural','pronoun 3 plural',
  'pronoun plural masculine','pronoun plural feminine',
  'pronoun singular masculine','pronoun singular feminine',
  'pronoun of the','pronoun feminine','pronoun masculine',
  'verb piel denominative','verb hiphil denominative',
  'verb niphal denominative','verb qal denominative',
  'verb pual denominative','verb hithpael denominative',
  'demonstrative particle','hypothetical particle',
  'particle of relation','particle of negation',
  'adverb a','adverb b','adverb c',
  'denoting motion to','denoting motion',
  'interjection a','interjection b',
]);

// Manual overrides for entries BDB can't reduce to a clean single gloss
const BDB_OVERRIDE = {
  // Deity names
  'H430':'God','H410':'God','H433':'God','H426':'God',
  'H3068':'LORD','H3069':'LORD','H136':'Lord',
  // Pronouns (BDB gives grammatical descriptions, not glosses)
  'H589':'I','H595':'I',
  'H859':'you','H860':'you',
  'H1931':'he','H1932':'he',
  'H1932':'she',
  'H587':'we','H586':'we',
  'H1992':'they','H2007':'they',
  'H2063':'this','H2088':'this','H2090':'this',
  'H428':'these','H1976':'these',
  'H1931': 'he',
  // Common particles and prepositions BDB labels
  'H413':'to','H854':'with','H5921':'upon',
  'H518':'if','H3588':'that','H3282':'because',
  'H834':'which','H369':'not','H3808':'not',
  'H2009':'behold','H2005':'behold',
  'H310':'after','H6440':'face',
  // Direct object marker
  'H853':'[obj]',
  // Common verbs with clear glosses
  'H1961':'be','H1254':'create','H559':'say','H6680':'command',
  'H3045':'know','H3318':'go out','H935':'come','H5414':'give',
  'H6213':'make','H8085':'hear','H7200':'see','H1696':'speak',
  'H3427':'sit','H3212':'go','H5927':'go up','H7725':'return',
  'H4191':'die','H3205':'bear','H2421':'live',
  // Nouns with override-worthy glosses
  'H8415':'deep','H1121':'son','H5892':'city',
  'H7307':'spirit','H3820':'heart','H5315':'soul',
  'H4908':'tabernacle','H4150':'assembly',
  'H899':'garment',
  // Numbers
  'H259':'one','H8147':'two','H7969':'three','H702':'four','H2568':'five',
  'H8337':'six','H7651':'seven','H8083':'eight','H8672':'nine','H6235':'ten',
  // Proper names BDB labels as "proper name" instead of the name
  'H3478':'Israel','H4714':'Egypt','H3063':'Judah','H4872':'Moses',
  'H175':'Aaron','H85':'Abraham','H3290':'Jacob','H3327':'Isaac',
  'H3063':'Judah','H3878':'Levi','H4519':'Manasseh','H669':'Ephraim',
  'H1121':'son',
  // Common nouns with wrong/unhelpful BDB extractions
  'H352':'ram','H6629':'flock','H8081':'oil','H6944':'holy',
  'H996':'between','H4994':'please','H3651':'so','H3605':'all',
  'H6629':'flock','H4150':'assembly','H5712':'congregation',
  'H8033':'there','H3627':'vessel','H4264':'camp',
  'H5869':'eye','H1697':'word','H4100':'what',
  // BDB sense-I vs sense-II conflicts for Torah-relevant words
  'H7363':'hover',  // rachaph Gen 1:2 (BDB sense-II); BDB extracts sense-I "grow soft"
  'H2895':'good',   // tov; BDB "pleasing" but YLT "good" and standard gloss is "good"
  'H3190':'good',   // yatab; BDB variant of "good"
  'H5375':'lift',   // nasa; BDB "carry" fine but "lift" shorter
  'H6030':'answer', // anah; BDB "answer/respond"
  'H7592':'ask',    // shaal
  'H3947':'take',   // laqach
  'H7971':'send',   // shalach
  'H7760':'set',    // sum/sim; "place/set"
  'H5060':'touch',  // naga
  'H5307':'fall',   // naphal
  'H2026':'kill',   // harag
  'H7126':'approach', // qarab
  'H5674':'cross',  // avar; "pass over/cross"
  'H3318':'go out', // yatsa
  'H7725':'return', // shuv
  'H3381':'go down',// yarad
  'H5927':'go up',  // alah
  'H5975':'stand',  // amad
  'H7760':'put',    // sum/sim
  'H5414':'give',   // natan
  'H3947':'take',   // laqach
  'H2388':'be strong', // chazaq
};

function bdbPrimaryGloss(html) {
  if (!html) return null;
  const bolds = [...html.matchAll(/<b>([^<]+)<\/b>/g)].map(m => m[1].trim());
  for (const b of bolds) {
    const low = b.toLowerCase().replace(/[\[\]\d.,;:()+*?`']/g, '').replace(/\s+/g, ' ').trim();
    if (BDB_SKIP.has(low)) continue;
    if (/^[IVXivx\d\s.]+$/.test(b)) continue;
    if (/^[a-d]\.\s*$/.test(b)) continue;
    if (/^H\d/.test(b)) continue;
    // Skip BDB structural labels that start with "verb " followed by a stem name
    if (/^verb\s+(qal|niphal|piel|pual|hiphil|hophal|hithpael)/i.test(low)) continue;
    // Skip pure grammatical descriptions
    if (/^(pronoun|adjective|substantive|particle|adverb|collective)\s/i.test(low)) continue;
    if (/^(denoting|hypothetical|demonstrative|exhortation)/i.test(low)) continue;
    if (/^(noun indeclinable|collective noun|used as food|used of)/i.test(low)) continue;
    if (/^verb\s+denominative/i.test(low)) continue;
    if (/^(a sacred|an object|an act|the act)/i.test(low)) continue;
    // Take first phrase before comma/semicolon, cap at 3 words
    const g = b.split(/[,;]/)[0].trim();
    const words = g.split(/\s+/).filter(Boolean);
    const gloss = words.length > 3 ? words.slice(0, 3).join(' ') : g;
    if (gloss.length > 1) return gloss;
  }
  return null;
}

function getBDBGloss(strongsNum) {
  if (!strongsNum) return null;
  if (BDB_OVERRIDE[strongsNum]) return BDB_OVERRIDE[strongsNum];
  return bdbPrimaryGloss(bdbByStrong[strongsNum]);
}

// Gloss map for standalone OSHB morpheme prefixes (no Strong's number)
const PREFIX_GLOSSES = {
  'b': 'in',       // בְּ  bet   — in/by/with
  'l': 'to',       // לְ  lamed — to/for
  'm': 'from',     // מִ  mem   — from
  'k': 'like',     // כְּ  kaph  — like/as
  'c': 'and',      // וְ  waw   — and (conjunction)
  'i': '?',        // הֲ  heh   — interrogative marker
};

/**
 * Normalize an OSHB augmented lemma like "b/7225", "1254 a", "d/8064", "c/853"
 * to a canonical Strong's key like "H7225", "H1254", "H8064", "H853".
 * Returns null for non-numeric lemmas (prefixes like "b", "d", "c" alone).
 */
function normalizeLemma(raw) {
  if (!raw) return null;
  // Strip everything up to and including the last "/"
  let s = raw.includes('/') ? raw.slice(raw.lastIndexOf('/') + 1) : raw;
  // Strip trailing variant letter(s) like " a", " b"
  s = s.replace(/\s+[a-z]$/, '').trim();
  // Strip trailing "+" (proper noun / place name marker in OSHB)
  s = s.replace(/\+$/, '');
  // Must be numeric
  if (!/^\d+$/.test(s)) return null;
  return `H${s}`;
}

/**
 * Get prefix gloss for a compound lemma like "c/l", "b/884+", "m/6307+".
 * Returns a combined gloss for the prefix portion, or null if not applicable.
 */
function getPrefixGloss(raw) {
  if (!raw || !raw.includes('/')) return null;
  const parts = raw.split('/');
  // Collect all non-numeric parts (the prefix chain) before the final number
  const prefixes = parts.slice(0, -1).filter(p => PREFIX_GLOSSES[p]);
  if (prefixes.length === 0) return null;
  return prefixes.map(p => PREFIX_GLOSSES[p]).join(' ');
}

/**
 * Get the best English gloss for a Strong's number.
 * Primary: BDB (Brown-Driver-Briggs, scholarly).
 * Fallback: Strong's 1894 definition.
 */
function getGloss(strongsNum) {
  if (!strongsNum) return '[no gloss]';

  // 1. BDB primary
  const bdb = getBDBGloss(strongsNum);
  if (bdb) return bdb;

  // 2. Strong's fallback
  const entry = strongsDict[strongsNum];
  if (!entry) return '[no gloss]';
  const raw = (entry.strongs_def || entry.kjv_def || '').trim();
  if (!raw) return '[no gloss]';
  // Split on semicolon or period — but NOT on "i.e." or "e.g."
  let gloss = raw.replace(/\bi\.e\.\b/gi, 'ie').replace(/\be\.g\.\b/gi, 'eg')
    .split(/[;.]/)[0].replace(/\s+/g, ' ').trim();
  gloss = gloss.replace(/\s+(or|and)$/i, '').trim();
  const words = gloss.split(/\s+/).filter(Boolean);
  if (words.length > 5) gloss = words.slice(0, 5).join(' ') + '…';
  return gloss || '[no gloss]';
}

// ── 2. XML parser (no external deps) ─────────────────────────────────────────

/**
 * Very lightweight XML parser: extracts all <verse> elements with their
 * osisID attribute, and within each verse all <w> elements with lemma attr
 * and text content.
 *
 * Returns array of { osisID, words: [{orig, lemma}] }
 */
function parseOshbXml(xml) {
  const verses = [];

  // Match verse blocks
  const verseRe = /<verse\s[^>]*osisID="([^"]+)"[^>]*>([\s\S]*?)<\/verse>/g;
  let vm;
  while ((vm = verseRe.exec(xml)) !== null) {
    const osisID = vm[1]; // e.g. "Gen.1.1"
    const body = vm[2];

    const words = [];
    // Match <w> elements with optional lemma attr
    const wordRe = /<w\s([^>]*)>([\s\S]*?)<\/w>/g;
    let wm;
    while ((wm = wordRe.exec(body)) !== null) {
      const attrs = wm[1];
      const rawText = wm[2];

      // Extract lemma attribute value
      const lemmaMatch = attrs.match(/lemma="([^"]+)"/);
      const lemmaRaw = lemmaMatch ? lemmaMatch[1] : null;

      // Strip cantillation marks and dagesh from Hebrew text to get clean display form
      // (Actually keep them — these are the pointed Hebrew we want to display)
      // Strip any embedded XML tags (like <seg>) from text
      const orig = rawText.replace(/<[^>]+>/g, '').trim();

      if (orig) {
        words.push({ orig, lemma: lemmaRaw });
      }
    }

    verses.push({ osisID, words });
  }

  return verses;
}

// ── 3. Convert osisID to verse key ───────────────────────────────────────────

// osisID format: "Gen.1.1" → chapter:verse "1:1"
function osisToKey(osisID) {
  const parts = osisID.split('.');
  return `${parts[1]}:${parts[2]}`;
}

// ── 4. Process each book ──────────────────────────────────────────────────────

const BOOKS = [
  { file: 'Gen.xml', out: 'Gen.json' },
  { file: 'Exod.xml', out: 'Exod.json' },
  { file: 'Lev.xml', out: 'Lev.json' },
  { file: 'Num.xml', out: 'Num.json' },
  { file: 'Deut.xml', out: 'Deut.json' },
];

let totalVerses = 0;
let totalWords = 0;
let noGlossCount = 0;

for (const { file, out } of BOOKS) {
  const bookName = file.replace('.xml', '');
  console.log(`\nProcessing ${bookName}…`);

  const xml = fs.readFileSync(path.join(ROOT, 'data/oshb', file), 'utf8');
  const verses = parseOshbXml(xml);
  console.log(`  Parsed ${verses.length} verses`);

  const lookup = {};

  for (const { osisID, words } of verses) {
    const key = osisToKey(osisID);
    const enriched = words.map(({ orig, lemma: lemmaRaw }) => {
      // Standalone prefix morpheme (no number component)
      if (lemmaRaw && !lemmaRaw.match(/\d/) && PREFIX_GLOSSES[lemmaRaw.split('/').pop()]) {
        const eng = PREFIX_GLOSSES[lemmaRaw.split('/').pop()];
        totalWords++;
        return { orig, lemma: lemmaRaw, eng };
      }
      const lemma = normalizeLemma(lemmaRaw);
      let eng = getGloss(lemma);
      // For compound lemmas (e.g. "c/l", "b/884+"), prepend prefix gloss to root gloss
      if (eng === '[no gloss]' || lemmaRaw?.includes('/')) {
        const prefixGloss = getPrefixGloss(lemmaRaw);
        if (prefixGloss) {
          const rootGloss = eng !== '[no gloss]' ? eng : getGloss(lemma);
          eng = rootGloss !== '[no gloss]' ? `${prefixGloss} ${rootGloss}` : prefixGloss;
        }
      }
      if (eng === '[no gloss]') noGlossCount++;
      totalWords++;
      return { orig, lemma: lemma ?? lemmaRaw ?? null, eng };
    });
    lookup[key] = enriched;
    totalVerses++;
  }

  const outPath = path.join(ROOT, 'data/oshb', out);
  fs.writeFileSync(outPath, JSON.stringify(lookup));
  const size = fs.statSync(outPath).size;
  console.log(`  Written ${out} (${(size / 1024).toFixed(0)} KB, ${Object.keys(lookup).length} verses)`);
}

console.log(`\nDone. ${totalVerses} verses, ${totalWords} words, ${noGlossCount} [no gloss] (${((noGlossCount/totalWords)*100).toFixed(1)}%)`);
