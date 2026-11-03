import { describe, expect, it } from 'vitest';
import { createAlignmentStreamParser } from '../lib/alignment-stream';
import { validateAlignment, type AlignmentGroup } from '../lib/alignment-validator';

describe('progressive alignment', () => {
  it('emits complete groups across arbitrary JSON chunk boundaries', () => {
    const snapshots: AlignmentGroup[][] = [];
    const parse = createAlignmentStreamParser(groups => snapshots.push(groups));
    const first = { sp: 0, mt: 0, lxx: 1, vul: 1 };
    parse('{"title":"escaped \\"quote\\" and }","groups" : [');
    const group = JSON.stringify(first);
    for (const ch of group.slice(0, -1)) parse(ch);
    expect(snapshots).toEqual([]);
    parse('}, {"sp":1,"mt":1,"lxx":0,"vul":0}');
    expect(snapshots).toEqual([[first, { sp: 1, mt: 1, lxx: 0, vul: 0 }]]);
    parse(']} trailing text {"sp":99}');
    expect(snapshots).toHaveLength(1);
  });

  it('allows missing coverage while streaming, but still rejects duplicate and invalid links', () => {
    const traditions = { sp: [{}, {}], mt: [{}, {}], lxx: [{}, {}], vul: [{}, {}] };
    const group = { sp: 0, mt: 0, lxx: 1, vul: 1 };
    expect(validateAlignment({ traditions, groups: [group] }).valid).toBe(false);
    expect(validateAlignment({ traditions, groups: [group] }, { allowPartial: true }).valid).toBe(true);
    expect(validateAlignment({ traditions, groups: [group, group] }, { allowPartial: true }).valid).toBe(false);
    expect(validateAlignment({ traditions, groups: [{ ...group, sp: 2 }] }, { allowPartial: true }).valid).toBe(false);
  });
});
