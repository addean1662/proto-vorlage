import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Samaritan Pentateuch — Proto-Vorlage',
  description: 'Source edition, manuscript basis, lexical glosses, and attribution for the Samaritan Pentateuch comparison.',
};

export default function SamaritanPentateuchPage() {
  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '40px 24px 80px', color: '#d8ccb9', lineHeight: 1.8 }}>
      <Link href="/" style={{ color: '#b6a0d4' }}>← Torah comparison</Link>
      <h1 style={{ color: '#b6a0d4', fontWeight: 400 }}>Samaritan Pentateuch</h1>
      <p>The far-left column presents the Samaritan Pentateuch in unpointed square Hebrew. It retains its own word order, readings, and expansions. Hover over a word to highlight generated correspondences in the other traditions.</p>
      <h2>Text and manuscripts</h2>
      <p>The text comes from the Samaritanus project directed by Stefan Schorch, through the <a href="https://github.com/DT-UCPH/sp/tree/8842267d29e37bf786b95209c76852461c389144">Text-Fabric Samaritan Pentateuch dataset, version 7.3.0</a>. Its manuscript basis is Dublin, Chester Beatty Library MS 751 for Genesis through Deuteronomy 32:36a, and MS Garizim 1 for Deuteronomy 32:36b through the end of Deuteronomy.</p>
      <p>The import contains 5,841 source verse entries across all five books. Square Hebrew makes comparison with the Masoretic Text easier; no Masoretic vowels or Samaritan pronunciation have been added.</p>
      <h2>Words, glosses, and hover links</h2>
      <p>Source morphemes are joined using the dataset’s word boundaries. Their lexical glosses are joined with middle dots. These are vocabulary aids, not a continuous English translation. Hebrew presentation forms are normalized to ordinary unpointed letters.</p>
      <p>Each tradition is displayed in source order. Hover links are generated research aids; a genuine addition can remain without a counterpart. Cite and check the underlying manuscript edition when using a reading in research.</p>
      <h2>Passage locations</h2>
      <p>The source places the incense-altar passage corresponding to Exodus 30:1–10 within Exodus 26:35. It also includes the description of the land at Deuteronomy 34:1, with no separately numbered 34:2–3. Those lookups show a location note rather than substitute Masoretic text.</p>
      <p>Examples to explore in the comparison: Exodus 12:40 (Canaan and Egypt), Exodus 20:17 (the Gerizim expansion), and Deuteronomy 27:4 (Mount Gerizim).</p>
      <h2>Attribution and reuse</h2>
      <p>Christian Canu Højgaard, Martijn Naaijer, and Stefan Schorch, <em>Text-Fabric Dataset of the Samaritan Pentateuch</em>. <a href="https://doi.org/10.5281/zenodo.7734632">Dataset DOI</a>. Text provided by Stefan Schorch in collaboration with Evelyn Burkhardt, Ulrike Hirschfelder, Irina Wandrey, and József Zsengellér.</p>
      <p>The source text and gloss dataset are licensed under <a href="https://creativecommons.org/licenses/by-nc/4.0/">Creative Commons Attribution–NonCommercial 4.0</a>. Attribution and the noncommercial restriction apply to reuse of this data. Proto-Vorlage’s changes are word-boundary joining, Hebrew character normalization, JSON conversion, and generated cross-tradition links.</p>
      <p>Dataset description: Naaijer, Højgaard, Schorch, and Ehrensvärd (2024), <a href="https://doi.org/10.1163/24523666-bja10051">Text-Fabric Dataset of the Samaritan Pentateuch</a>, <em>Research Data Journal for the Humanities and Social Sciences</em>, 9(1), 1–13.</p>
    </main>
  );
}
