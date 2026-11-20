// Import the standalone, already-built collection into ProtoVorlage's URL space.
// Usage: node scripts/sync-bible-evidence.mjs <text-and-stone checkout>
import { readFile, writeFile, mkdir, readdir, copyFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!process.argv[2]) throw new Error('Supply the standalone collection checkout.');
const sourceRoot = path.resolve(process.argv[2]);
const source = path.join(sourceRoot, 'dist');
const target = path.join(root, 'public', 'Bible_Evidence');
const prefix = '/Bible_Evidence';
// The compact ProtoVorlage timeline is maintained here. Keep those files when
// refreshing the upstream collection; records, maps and discovery pages still sync.
const localPresentation = ['index.html', 'timeline.html', 'reference.js', 'timeline.css'];
for (const name of localPresentation) await access(path.join(target, name));
const reference = JSON.parse(await readFile(path.join(source, 'reference-data.json'), 'utf8'));
const geography = reference.nodes.filter(node => node.geography);
if (reference.nodes.length !== 1399 || geography.length !== 1285) throw new Error('Review changed collection counts before importing.');
const files = [];
async function copyDirectory(directory, relative = '') {
  await mkdir(path.join(target, relative), { recursive: true });
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const name = path.posix.join(relative, entry.name);
    if (entry.isDirectory()) { await copyDirectory(path.join(directory, entry.name), name); continue; }
    if (!entry.isFile()) throw new Error(`Unsupported source entry: ${name}`);
    const original = await readFile(path.join(directory, entry.name));
    if (!localPresentation.includes(name)) await copyFile(path.join(directory, entry.name), path.join(target, name));
    files.push({ file: name, sha256: createHash('sha256').update(original).digest('hex') });
  }
}
await copyDirectory(source);

for (const name of ['index.html', 'timeline.html', 'map.html', 'discovery.html', 'gallery.html']) {
  const file = path.join(target, name);
  let html = await readFile(file, 'utf8');
  html = html.replace(/(href|src)="(?![a-z][a-z\d+.-]*:|\/|#)([^"]+)"/gi, (_, attribute, value) => `${attribute}="${prefix}/${value}"`);
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${name === 'map.html' ? 'Bible_Evidence Map' : name === 'gallery.html' ? 'Bible_Evidence Gallery' : name === 'discovery.html' ? 'Bible_Evidence Discovery' : 'Bible_Evidence'} | ProtoVorlage</title>`);
  html = html.replace('<span>Reference Node<small>TEXT & STONE COLLECTION</small></span>', '<span>ProtoVorlage<small>Bible_Evidence</small></span>');
  html = html.replace('class="reference-brand" href="/Bible_Evidence/timeline.html"', 'class="reference-brand" href="/" aria-label="ProtoVorlage home"');
  html = html.replace('Reference Node · Text & Stone', 'ProtoVorlage · Bible_Evidence');
  html = html.replace('<span>Text <i>&</i> Stone<small>THE BIBLE, GROUNDED IN HISTORY</small></span>', '<span>ProtoVorlage<small>Bible_Evidence</small></span>');
  html = html.replace('class="brand" href="/Bible_Evidence/index.html" aria-label="Text and Stone home"', 'class="brand" href="/" aria-label="ProtoVorlage home"');
  await writeFile(file, html);
}
async function adapt(name, transform) {
  const file = path.join(target, name);
  await writeFile(file, transform(await readFile(file, 'utf8')));
}
await adapt('reference-common.js', text => text
  .replace('return `discovery.html?', 'return `/Bible_Evidence/discovery.html?')
  .replace("fetch('reference-data.json')", "fetch('/Bible_Evidence/reference-data.json')"));
await adapt('reference.js', text => text
  .replaceAll('src="assets/', 'src="/Bible_Evidence/assets/')
  .replace('location.replace(`gallery.html', 'location.replace(`/Bible_Evidence/gallery.html'));
await adapt('discovery.js', text => text
  .replace("['/','/index','/index.html','/timeline','/timeline.html','/map','/map.html']", "['/Bible_Evidence','/Bible_Evidence/','/Bible_Evidence/index','/Bible_Evidence/index.html','/Bible_Evidence/timeline','/Bible_Evidence/timeline.html','/Bible_Evidence/map','/Bible_Evidence/map.html']")
  .replace('/^\\/map(?:\\.html)?$/', '/^\\/Bible_Evidence\\/map(?:\\.html)?$/')
  .replace(' | Text & Stone`', ' | Bible_Evidence · ProtoVorlage`'));

const manifest = {
  collection: 'Bible_Evidence', mountPath: prefix,
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: sourceRoot, encoding: 'utf8' }).trim(),
  importedAt: new Date().toISOString(),
  counts: { dataPoints: reference.nodes.length, geographyEntries: geography.length, sourceDocuments: reference.sources.length },
  adaptations: ['ProtoVorlage branding and local navigation', 'Collection-prefixed asset, data, discovery and return URLs', 'Local compact timeline with Overview, Discoveries and Passages zoom levels'],
  localPresentation: await Promise.all(localPresentation.map(async name => ({ file: name, sha256: createHash('sha256').update(await readFile(path.join(target, name))).digest('hex') }))),
  sourceFiles: files,
};
await writeFile(path.join(target, 'integration-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ files: files.length, ...manifest.counts, sourceCommit: manifest.sourceCommit }));
