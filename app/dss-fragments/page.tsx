import Link from 'next/link';
import { DSS_WITNESSES, CATEGORY_LABELS, CATEGORY_DESCRIPTIONS, type DSSCategory, type DSSWitness } from '@/lib/dss-witnesses';

export const metadata = {
  title: 'DSS Biblical Witnesses — Proto-Vorlage',
  description: 'Commonly cited Dead Sea Scroll biblical witnesses: dates, coverage, and textual significance.',
};

const CATEGORIES: DSSCategory[] = ['biblical', 'commentary', 'parabiblical'];

const TIER1 = DSS_WITNESSES.filter(w => w.tier === 1);
export default function DSSFragmentsPage() {
  const total = TIER1.length;
  const byCat = Object.fromEntries(
    CATEGORIES.map(c => [c, TIER1.filter(w => w.category === c)])
  ) as Record<DSSCategory, DSSWitness[]>;

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#0c0a07', color: '#d4c4a8' }}>

      {/* Header */}
      <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid rgba(200,170,120,.1)', background: 'linear-gradient(180deg, rgba(30,24,16,.8), transparent)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <Link href="/" style={{ fontSize: 11, color: 'rgba(200,180,150,.45)', letterSpacing: '.15em', textTransform: 'uppercase', textDecoration: 'none', display: 'inline-block', marginBottom: 12 }}>
            ← Proto-Vorlage
          </Link>
          <h1 style={{ fontSize: 28, fontWeight: 400, color: '#e0d4c0', margin: '0 0 6px' }}>
            Dead Sea Scroll Biblical Witnesses
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(200,180,150,.55)', fontStyle: 'italic', margin: '0 0 4px', fontFamily: "var(--font-garamond), 'EB Garamond', serif", lineHeight: 1.6 }}>
            Commonly cited witnesses from the Judaean Desert corpus · c. 250 BCE – 68 CE
          </p>
          <p style={{ fontSize: 12, color: 'rgba(200,180,150,.38)', margin: 0, fontFamily: "var(--font-garamond), 'EB Garamond', serif", lineHeight: 1.6 }}>
            The DSS column in the alignment table covers Torah witnesses only (Genesis–Deuteronomy).
            This page indexes the broader biblical corpus for scholarly reference.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 28px 80px' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 44 }}>
          {[
            { label: 'Core witnesses', value: total },
            { label: 'Biblical witnesses', value: byCat.biblical.length },
            { label: 'Torah witnesses', value: TIER1.filter(w => w.torahBook).length },
            { label: 'Date range', value: 'c. 250 BCE–68 CE' },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: '14px 18px', background: 'rgba(200,170,120,.04)', border: '1px solid rgba(200,170,120,.1)', borderRadius: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#c4a882', marginBottom: 3 }}>{value}</div>
              <div style={{ fontSize: 10, color: 'rgba(200,180,150,.5)', textTransform: 'uppercase', letterSpacing: '.1em' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Scholarly note */}
        <div style={{ padding: '14px 18px', background: 'rgba(200,170,120,.03)', border: '1px solid rgba(200,170,120,.08)', borderRadius: 6, marginBottom: 44, fontFamily: "var(--font-garamond), 'EB Garamond', serif" }}>
          <p style={{ margin: '0 0 6px', fontSize: 13, color: 'rgba(200,180,150,.7)', lineHeight: 1.7 }}>
            The DSS column does not represent a complete Hebrew Bible manuscript. It is a fragmentary witness layer.
            Where a Dead Sea Scroll manuscript preserves a passage, Proto-Vorlage displays the extant Hebrew witness
            and aligns it against the Septuagint, Vulgate, and Masoretic traditions.
          </p>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(200,180,150,.4)', lineHeight: 1.6 }}>
            English glosses are generated from lemma alignment and are not copied from copyrighted DSS translations.
            Variant readings are sourced from published DJD volumes and cited accordingly.
          </p>
        </div>

        {/* Categories */}
        {CATEGORIES.map(cat => (
          <section key={cat} style={{ marginBottom: 52 }}>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(200,180,150,.4)', fontWeight: 600, marginBottom: 4 }}>
                {CATEGORY_LABELS[cat]}
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(200,180,150,.45)', fontFamily: "var(--font-garamond), 'EB Garamond', serif", lineHeight: 1.6 }}>
                {CATEGORY_DESCRIPTIONS[cat]}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {byCat[cat].map(w => <WitnessCard key={w.id} witness={w} />)}
            </div>

          </section>
        ))}

        {/* Tier 2 note */}
        <div style={{ padding: '16px 20px', background: 'rgba(200,170,120,.02)', border: '1px solid rgba(200,170,120,.07)', borderRadius: 6 }}>
          <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(200,180,150,.3)', marginBottom: 6 }}>
            Additional witnesses
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(200,180,150,.4)', fontFamily: "var(--font-garamond), 'EB Garamond', serif", lineHeight: 1.6 }}>
            Further witnesses including 1QIsaᵇ variations, additional Cave 4 Isaiah fragments (4QIsaᵃ–ⁿ),
            4QJoshᵃ, 4QJudgᵃ, the Temple Scroll (11Q19), Community Rule (1QS), War Scroll (1QM),
            and the Genesis Apocryphon (1Q20) will be added in a subsequent update.
          </p>
        </div>

      </div>
    </main>
  );
}

function WitnessCard({ witness: w }: { witness: DSSWitness }) {
  const isTorahWitness = Boolean(w.torahBook);

  return (
    <div style={{
      padding: '16px 20px',
      background: '#0f0d0a',
      borderBottom: '1px solid rgba(200,170,120,.05)',
      display: 'grid',
      gridTemplateColumns: '130px 1fr',
      gap: 20,
      alignItems: 'start',
    }}>
      {/* Left: siglum + metadata */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#c4a882', fontFamily: 'monospace', marginBottom: 2 }}>
          {w.id}
        </div>
        {w.altId && (
          <div style={{ fontSize: 10, color: 'rgba(200,180,150,.4)', marginBottom: 4 }}>{w.altId}</div>
        )}
        <div style={{ fontSize: 11, color: 'rgba(200,180,150,.6)', fontStyle: 'italic', marginBottom: 3 }}>
          {w.commonName}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(200,180,150,.4)', marginBottom: 3 }}>
          {w.date}
        </div>
        {w.paleo && (
          <div style={{ fontSize: 9, color: 'rgba(200,180,150,.35)', letterSpacing: '.06em', textTransform: 'uppercase' }}>paleo-Hebrew</div>
        )}
        {isTorahWitness && (
          <div style={{ marginTop: 8, fontSize: 9, color: '#8ab86e', letterSpacing: '.06em', textTransform: 'uppercase' }}>
            Torah witness ·&nbsp;
            <Link href="/" style={{ color: '#8ab86e', textDecoration: 'none' }}>in alignment ↗</Link>
          </div>
        )}
        {w.iahUrl && (
          <a href={w.iahUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'block', marginTop: 6, fontSize: 9, color: 'rgba(200,180,150,.3)', letterSpacing: '.06em', textTransform: 'uppercase', textDecoration: 'none' }}>
            IAA archive ↗
          </a>
        )}
      </div>

      {/* Right: book + description + source */}
      <div>
        <div style={{ fontSize: 11, color: 'rgba(200,180,150,.5)', marginBottom: 6, letterSpacing: '.04em' }}>
          {w.book}
        </div>
        <p style={{ margin: '0 0 8px', fontSize: 13, color: 'rgba(200,180,150,.75)', fontFamily: "var(--font-garamond), 'EB Garamond', serif", lineHeight: 1.65 }}>
          {w.description}
        </p>
        <div style={{ fontSize: 10, color: 'rgba(200,180,150,.3)', fontStyle: 'italic' }}>
          {w.source}
        </div>
      </div>
    </div>
  );
}
