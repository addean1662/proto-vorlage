/** Import pinned Text-Fabric SP data. Run from the project root. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const dir = 'data/samaritan';
const source = path.join(dir, 'source');
const revision = '8842267d29e37bf786b95209c76852461c389144';
const version = '7.3.0';
const features = ['otype', 'oslots', 'book', 'chapter', 'verse', 'g_cons_utf8', 'gloss', 'trailer'];
const hashes = {};

function expand(range) {
  return range.split(',').flatMap(part => {
    const [first, last = first] = part.split('-').map(Number);
    return Array.from({ length: last - first + 1 }, (_, i) => first + i);
  });
}

function readFeature(name) {
  const raw = fs.readFileSync(path.join(source, `${name}.tf`), 'utf8');
  hashes[`${name}.tf`] = crypto.createHash('sha256').update(raw).digest('hex');
  const lines = raw.replaceAll('\r\n', '\n').split('\n');
  const start = lines.indexOf('');
  const data = lines.slice(start + 1);
  if (data.at(-1) === '') data.pop(); // final newline, not a feature value
  const values = new Map();
  let node = 0;
  for (const line of data) {
    const tab = line.indexOf('\t');
    if (tab >= 0) {
      const nodes = expand(line.slice(0, tab));
      for (const id of nodes) values.set(id, line.slice(tab + 1));
      node = nodes.at(-1);
    } else {
      values.set(++node, line);
    }
  }
  return values;
}

const f = Object.fromEntries(features.map(name => [name, readFeature(name)]));
const bounds = node => {
  const slots = expand(f.oslots.get(node));
  return [slots[0], slots.at(-1)];
};
const books = [...f.book].map(([id, name]) => ({ name, range: bounds(id) }));
const chapters = [...f.chapter].map(([id, number]) => ({ number, range: bounds(id) }));
const verses = [...f.verse].map(([id, number]) => ({ number, range: bounds(id) }));
const basenames = { Genesis: 'Gen', Exodus: 'Exod', Leviticus: 'Lev', Numbers: 'Num', Deuteronomy: 'Deut' };
const output = Object.fromEntries(books.map(b => [b.name, {}]));
let bookIndex = 0, chapterIndex = 0, verseIndex = 0;
let pending = { orig: '', glosses: [] };
let morphemes = 0;
for (const [node, text] of f.g_cons_utf8) {
  if (f.otype.get(node) !== 'word') throw new Error(`Unexpected word node ${node}`);
  const [first, last] = bounds(node);
  while (first > books[bookIndex].range[1]) bookIndex++;
  while (first > chapters[chapterIndex].range[1]) chapterIndex++;
  while (first > verses[verseIndex].range[1]) verseIndex++;
  const book = books[bookIndex].name;
  const key = `${chapters[chapterIndex].number}:${verses[verseIndex].number}`;
  if (last > verses[verseIndex].range[1]) throw new Error(`Word crosses verse at ${book} ${key}`);
  // Compatibility shin/sin glyphs become ordinary unpointed Hebrew. No vowels invented.
  pending.orig += text.normalize('NFKD').replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, '');
  pending.glosses.push(f.gloss.get(node) || '[no gloss]');
  morphemes++;
  if (f.trailer.get(node) || last === verses[verseIndex].range[1]) {
    const eng = pending.glosses.join(' · ');
    (output[book][key] ??= []).push({ orig: pending.orig, eng });
    pending = { orig: '', glosses: [] };
  }
}
if (pending.orig) throw new Error('Unflushed final word');
const counts = {};
for (const [book, data] of Object.entries(output)) {
  fs.writeFileSync(path.join(dir, `${basenames[book]}.json`), JSON.stringify(data) + '\n');
  counts[book] = { verses: Object.keys(data).length, words: Object.values(data).reduce((n, w) => n + w.length, 0) };
}
const manifest = {
  dataset: 'Text-Fabric Dataset of the Samaritan Pentateuch', version, revision,
  sourceUrl: `https://github.com/DT-UCPH/sp/tree/${revision}`,
  citation: 'Christian Canu Højgaard, Martijn Naaijer, and Stefan Schorch. Text-Fabric Dataset of the Samaritan Pentateuch. https://doi.org/10.5281/zenodo.7734632',
  license: 'CC BY-NC 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-nc/4.0/',
  manuscripts: 'MS Dublin Chester Beatty Library 751 (Genesis 1–Deuteronomy 32:36a); MS Garizim 1 (Deuteronomy 32:36b–34)',
  transformations: 'Join morphemes according to source trailer boundaries; normalize Hebrew presentation forms to unpointed square Hebrew; join source morpheme glosses with middle dots. JSON keys preserve source verse numbering.',
  morphemes, counts, sha256: hashes,
};
fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ morphemes, counts }, null, 2));
