export type ReviewStatus = 'generated' | 'reviewed' | 'corrected';

export type TraditionKey = 'dss' | 'lxx' | 'mt' | 'vul';

export interface TraditionProvenance {
  tradition: TraditionKey;
  sourceEdition: string;
  dataSource: string;
  lexicalSource: string;
  evidenceType: 'manuscript' | 'critical-edition' | 'lexical-database';
  alignmentRole: 'source-order-data' | 'mt-anchor' | 'generated-correspondence';
  note: string;
}

export interface VerseReviewMeta {
  status: ReviewStatus;
  reviewedAt?: string;
  reviewer?: string;
  note?: string;
}

export interface VerseProvenance {
  generatedAt: string;
  alignmentMethod: 'ai-generated';
  alignmentModel: string;
  review: VerseReviewMeta;
  traditions: Record<TraditionKey, TraditionProvenance>;
}

export const ALIGNMENT_MODEL = 'claude-opus-4-6';

export function createVerseProvenance(review?: VerseReviewMeta): VerseProvenance {
  return {
    generatedAt: new Date().toISOString(),
    alignmentMethod: 'ai-generated',
    alignmentModel: ALIGNMENT_MODEL,
    review: review ?? { status: 'generated' },
    traditions: {
      dss: {
        tradition: 'dss',
        sourceEdition: 'Dead Sea Scroll biblical witnesses from project coverage tables and variant files',
        dataSource: 'data/dss plus data/dss/variants',
        lexicalSource: 'Brown-Driver-Briggs via Hebrew matching where available',
        evidenceType: 'manuscript',
        alignmentRole: 'source-order-data',
        note: 'DSS status indicates preservation/attestation state. It is not automatically a variant claim.',
      },
      lxx: {
        tradition: 'lxx',
        sourceEdition: 'Rahlfs 1935 Septuagint',
        dataSource: 'eliranwong/LXX-Rahlfs-1935 and STEPBible TBESG-derived local data',
        lexicalSource: 'STEPBible TBESG and LSJ index where available',
        evidenceType: 'critical-edition',
        alignmentRole: 'generated-correspondence',
        note: 'Greek token order is source data. Correspondence to Hebrew is generated and requires verification before citation.',
      },
      mt: {
        tradition: 'mt',
        sourceEdition: 'Westminster Leningrad Codex via OSHB',
        dataSource: 'data/oshb',
        lexicalSource: 'Brown-Driver-Briggs / Strong derived local data',
        evidenceType: 'critical-edition',
        alignmentRole: 'mt-anchor',
        note: 'MT token sequence is the anchor used for alignment groups.',
      },
      vul: {
        tradition: 'vul',
        sourceEdition: 'Stuttgart / Weber-Gryson Vulgate tradition as represented by local Vulgate data',
        dataSource: 'data/vulgate',
        lexicalSource: "Whitaker's Words, Morpheus, and Lewis & Short-derived local data",
        evidenceType: 'critical-edition',
        alignmentRole: 'generated-correspondence',
        note: 'Latin token order is source data. Correspondence to Hebrew is generated and may reflect interpretive translation.',
      },
    },
  };
}
