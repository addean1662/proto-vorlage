export type TraditionKey = 'mt' | 'lxx' | 'vul';

export interface AlignmentGroup {
  mt: number | null;
  lxx: number | null;
  vul: number | null;
}

export interface TraditionWord {
  orig?: string;
  eng?: string;
  def?: string;
}

export interface AlignmentTraditions {
  dss?: TraditionWord[];
  mt: TraditionWord[];
  lxx: TraditionWord[];
  vul: TraditionWord[];
}

export interface ValidationIssue {
  code:
    | 'missing_tradition'
    | 'dss_mt_length_mismatch'
    | 'empty_groups'
    | 'empty_group'
    | 'invalid_index'
    | 'duplicate_index'
    | 'missing_index'
    | 'missing_provenance';
  severity: 'error' | 'warning';
  message: string;
  tradition?: TraditionKey | 'dss';
  index?: number;
  group?: number;
}

export interface AlignmentValidationReport {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  coverage: Record<TraditionKey, {
    total: number;
    covered: number;
    missing: number[];
    duplicates: number[];
  }>;
}

interface ValidationInput {
  traditions?: Partial<AlignmentTraditions>;
  groups?: AlignmentGroup[];
  provenance?: unknown;
}

function createCoverage(total: number) {
  return {
    total,
    covered: 0,
    missing: [] as number[],
    duplicates: [] as number[],
  };
}

function isValidGroupValue(value: unknown): value is number | null {
  return value === null || Number.isInteger(value);
}

export function validateAlignment(input: ValidationInput, options: { requireProvenance?: boolean } = {}): AlignmentValidationReport {
  const issues: ValidationIssue[] = [];
  const traditions = input.traditions;
  const groups = input.groups ?? [];

  const counts: Record<TraditionKey, number> = {
    mt: traditions?.mt?.length ?? 0,
    lxx: traditions?.lxx?.length ?? 0,
    vul: traditions?.vul?.length ?? 0,
  };

  for (const key of ['mt', 'lxx', 'vul'] as const) {
    if (!traditions?.[key]?.length) {
      issues.push({
        code: 'missing_tradition',
        severity: 'error',
        tradition: key,
        message: `${key} tradition is missing or empty.`,
      });
    }
  }

  if (traditions?.dss && traditions.mt && traditions.dss.length !== traditions.mt.length) {
    issues.push({
      code: 'dss_mt_length_mismatch',
      severity: 'error',
      tradition: 'dss',
      message: `DSS length ${traditions.dss.length} does not match MT length ${traditions.mt.length}.`,
    });
  }

  if (!groups.length) {
    issues.push({
      code: 'empty_groups',
      severity: 'error',
      message: 'Alignment groups are missing or empty.',
    });
  }

  if (options.requireProvenance && !input.provenance) {
    issues.push({
      code: 'missing_provenance',
      severity: 'error',
      message: 'Alignment provenance is required before caching.',
    });
  }

  const seen: Record<TraditionKey, Map<number, number[]>> = {
    mt: new Map(),
    lxx: new Map(),
    vul: new Map(),
  };

  groups.forEach((group, groupIndex) => {
    const values = [group.mt, group.lxx, group.vul];
    if (values.every(value => value === null || value === undefined)) {
      issues.push({
        code: 'empty_group',
        severity: 'error',
        group: groupIndex,
        message: `Group ${groupIndex} does not reference any tradition index.`,
      });
    }

    for (const key of ['mt', 'lxx', 'vul'] as const) {
      const value = group[key];
      if (value === null || value === undefined) continue;

      if (!isValidGroupValue(value) || value < 0 || value >= counts[key]) {
        issues.push({
          code: 'invalid_index',
          severity: 'error',
          tradition: key,
          group: groupIndex,
          index: Number(value),
          message: `${key} index ${value} in group ${groupIndex} is out of bounds for ${counts[key]} tokens.`,
        });
        continue;
      }

      const groupsForIndex = seen[key].get(value) ?? [];
      groupsForIndex.push(groupIndex);
      seen[key].set(value, groupsForIndex);
    }
  });

  const coverage = {
    mt: createCoverage(counts.mt),
    lxx: createCoverage(counts.lxx),
    vul: createCoverage(counts.vul),
  };

  for (const key of ['mt', 'lxx', 'vul'] as const) {
    for (let index = 0; index < counts[key]; index += 1) {
      const groupsForIndex = seen[key].get(index) ?? [];
      if (groupsForIndex.length === 0) {
        coverage[key].missing.push(index);
        issues.push({
          code: 'missing_index',
          severity: 'error',
          tradition: key,
          index,
          message: `${key} index ${index} is not covered by any alignment group.`,
        });
      } else {
        coverage[key].covered += 1;
      }

      if (groupsForIndex.length > 1) {
        coverage[key].duplicates.push(index);
        issues.push({
          code: 'duplicate_index',
          severity: 'error',
          tradition: key,
          index,
          message: `${key} index ${index} is used in multiple groups: ${groupsForIndex.join(', ')}.`,
        });
      }
    }
  }

  const errors = issues.filter(issue => issue.severity === 'error');
  const warnings = issues.filter(issue => issue.severity === 'warning');

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    coverage,
  };
}
