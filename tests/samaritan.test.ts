import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getSamaritanVerse } from '../lib/samaritan';
import { getMTWords } from '../lib/lexicon';
import { buildPrompt, buildRepairPrompt } from '../lib/prompts';

describe('Samaritan manuscript import', () => {
  it('covers all five books with independent words and source lexical glosses', () => {
    const counts = { Gen: 1533, Exod: 1203, Lev: 859, Num: 1289, Deut: 957 };
    for (const [book, count] of Object.entries(counts)) {
      const verses = JSON.parse(fs.readFileSync(`data/samaritan/${book}.json`, 'utf8')) as Record<string, { orig: string; eng: string }[]>;
      expect(Object.keys(verses)).toHaveLength(count);
      for (const words of Object.values(verses)) {
        expect(words.length).toBeGreaterThan(0);
        for (const word of words) {
          expect(word.orig).toMatch(/[\u05D0-\u05EA]/);
          expect(word.orig).not.toMatch(/[\u0591-\u05C7\uFB1D-\uFB4F]/);
          expect(word.eng.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('joins prefixes at manuscript word boundaries', () => {
    const { words } = getSamaritanVerse('Genesis 1:1');
    expect(words.map(w => w.orig)).toEqual(['בראשית', 'ברא', 'אלהים', 'את', 'השמים', 'ואת', 'הארץ']);
    expect(words[0].eng).toBe('in · beginning');
  });

  it('retains distinctive readings and expansions rather than copying MT', () => {
    const text = (ref: string) => getSamaritanVerse(ref).words.map(w => w.orig).join(' ');
    expect(text('Deuteronomy 27:4')).toContain('בהרגריזים');
    expect(text('Exodus 12:40')).toContain('בארץ כנען ובארץ מצרים');
    expect(text('Exodus 20:17')).toContain('בהרגריזים');
    expect(getSamaritanVerse('Exodus 20:17').words.length).toBeGreaterThan(getMTWords('Exodus 20:17')!.length * 3);
  });

  it('accounts for all MT reference keys and explicitly notes source location differences', () => {
    const books = { Gen: 'Genesis', Exod: 'Exodus', Lev: 'Leviticus', Num: 'Numbers', Deut: 'Deuteronomy' };
    const absent: string[] = [];
    for (const [basename, book] of Object.entries(books)) {
      const mt = JSON.parse(fs.readFileSync(`data/oshb/${basename}.json`, 'utf8'));
      for (const key of Object.keys(mt)) {
        const verse = getSamaritanVerse(`${book} ${key}`);
        if (!verse.words.length) { expect(verse.note).toBeTruthy(); absent.push(`${book} ${key}`); }
      }
    }
    expect(absent).toHaveLength(12);
    expect(getSamaritanVerse('Exodus 30:1').note).toContain('Exodus 26:35');
    expect(getSamaritanVerse('Deuteronomy 34:2').note).toContain('34:1');
    expect(() => getSamaritanVerse('Genesis 99:1')).toThrow();
  });

  it('supplies source SP words to generation and coverage repair', () => {
    const sp = getSamaritanVerse('Genesis 1:1').words;
    const prompt = buildPrompt('Genesis 1:1', '', '', '', [], [], [], sp);
    expect(prompt).toContain('orig="בראשית"');
    expect(prompt).toContain('sp: every index 0–6');
    expect(buildRepairPrompt('Genesis 1:1', [], { sp }, [])).toContain('Every supplied sp, mt, lxx, and vul index');
  });
});
