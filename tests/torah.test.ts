import { describe, expect, it } from 'vitest';
import { canonicalizeRef, getAdjacentRef, isTorahBook, normalizeRef, parseRef } from '../lib/torah';

describe('torah reference helpers', () => {
  it('canonicalizes supported Torah book aliases', () => {
    expect(canonicalizeRef('Gen1:1')).toBe('Genesis 1:1');
    expect(canonicalizeRef('deut 34:12')).toBe('Deuteronomy 34:12');
    expect(canonicalizeRef('Shemot 3:2')).toBe('Exodus 3:2');
  });

  it('normalizes canonical references for cache keys', () => {
    expect(normalizeRef('Genesis 1:1')).toBe('genesis_1:1');
    expect(normalizeRef('  Deuteronomy   34:12  ')).toBe('deuteronomy_34:12');
  });

  it('checks Torah coverage and parses references', () => {
    expect(isTorahBook('Genesis 1:1')).toBe(true);
    expect(isTorahBook('Joshua 1:1')).toBe(false);
    expect(parseRef('Numbers 6:24')).toEqual({ book: 'Numbers', chapter: 6, verse: 24 });
  });

  it('walks adjacent verses across chapter and book boundaries', () => {
    expect(getAdjacentRef('Genesis 1:31', 'next')).toBe('Genesis 2:1');
    expect(getAdjacentRef('Exodus 1:1', 'prev')).toBe('Genesis 50:26');
    expect(getAdjacentRef('Genesis 1:1', 'prev')).toBeNull();
    expect(getAdjacentRef('Deuteronomy 34:12', 'next')).toBeNull();
  });
});
