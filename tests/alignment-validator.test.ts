import { describe, expect, it } from 'vitest';
import { validateAlignment, type AlignmentGroup, type AlignmentTraditions } from '../lib/alignment-validator';

const traditions: AlignmentTraditions = {
  dss: [{ orig: 'a' }, { orig: 'b' }],
  mt: [{ orig: 'a' }, { orig: 'b' }],
  lxx: [{ orig: 'x' }, { orig: 'y' }, { orig: 'z' }],
  vul: [{ orig: 'u' }, { orig: 'v' }],
};

describe('alignment validator', () => {
  it('validates independent Samaritan coverage, including SP-only additions', () => {
    const input = {
      traditions: { ...traditions, sp: [{ orig: 'a' }, { orig: 'addition' }] },
      groups: [
        { mt: 0, lxx: 0, vul: 0, sp: 0 },
        { mt: 1, lxx: 1, vul: 1, sp: null },
        { mt: null, lxx: 2, vul: null, sp: null },
        { mt: null, lxx: null, vul: null, sp: 1 },
      ],
    };
    expect(validateAlignment(input).valid).toBe(true);
    expect(validateAlignment({ ...input, groups: input.groups.slice(0, -1) }).errors).toContainEqual(expect.objectContaining({ code: 'missing_index', tradition: 'sp', index: 1 }));
    expect(validateAlignment({ ...input, groups: [...input.groups, { mt: null, lxx: null, vul: null, sp: 1 }] }).errors).toContainEqual(expect.objectContaining({ code: 'duplicate_index', tradition: 'sp' }));
    expect(validateAlignment({ ...input, groups: [...input.groups, { mt: null, lxx: null, vul: null, sp: 99 }] }).errors).toContainEqual(expect.objectContaining({ code: 'invalid_index', tradition: 'sp' }));
  });

  it('accepts complete one-use coverage with provenance', () => {
    const groups: AlignmentGroup[] = [
      { mt: 0, lxx: 0, vul: 0 },
      { mt: 1, lxx: 1, vul: 1 },
      { mt: null, lxx: 2, vul: null },
    ];

    const report = validateAlignment({ traditions, groups, provenance: { generatedAt: 'now' } }, { requireProvenance: true });

    expect(report.valid).toBe(true);
    expect(report.errors).toEqual([]);
    expect(report.coverage.lxx).toMatchObject({ total: 3, covered: 3, missing: [], duplicates: [] });
  });

  it('rejects duplicate indexes', () => {
    const groups: AlignmentGroup[] = [
      { mt: 0, lxx: 0, vul: 0 },
      { mt: 0, lxx: 1, vul: 1 },
      { mt: 1, lxx: 2, vul: null },
    ];

    const report = validateAlignment({ traditions, groups });

    expect(report.valid).toBe(false);
    expect(report.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'duplicate_index', tradition: 'mt', index: 0 }),
    ]));
  });

  it('rejects missing coverage', () => {
    const groups: AlignmentGroup[] = [
      { mt: 0, lxx: 0, vul: 0 },
      { mt: 1, lxx: 1, vul: 1 },
    ];

    const report = validateAlignment({ traditions, groups });

    expect(report.valid).toBe(false);
    expect(report.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'missing_index', tradition: 'lxx', index: 2 }),
    ]));
  });

  it('rejects out-of-bounds indexes and empty groups', () => {
    const groups: AlignmentGroup[] = [
      { mt: 0, lxx: 0, vul: 0 },
      { mt: null, lxx: null, vul: null },
      { mt: 1, lxx: 9, vul: 1 },
    ];

    const report = validateAlignment({ traditions, groups });

    expect(report.valid).toBe(false);
    expect(report.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'empty_group', group: 1 }),
      expect.objectContaining({ code: 'invalid_index', tradition: 'lxx', group: 2 }),
    ]));
  });

  it('requires provenance when cache gating requests it', () => {
    const groups: AlignmentGroup[] = [
      { mt: 0, lxx: 0, vul: 0 },
      { mt: 1, lxx: 1, vul: 1 },
      { mt: null, lxx: 2, vul: null },
    ];

    const report = validateAlignment({ traditions, groups }, { requireProvenance: true });

    expect(report.valid).toBe(false);
    expect(report.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'missing_provenance' }),
    ]));
  });
});
