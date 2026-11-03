import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const require = createRequire(import.meta.url);
const minimatch = require('minimatch');

describe('patched lint glob compatibility', () => {
  it('supports legacy callable imports and modern named exports', () => {
    expect(minimatch('app/page.tsx', '**/*.tsx')).toBe(true);
    expect(minimatch('app/page.tsx', '**/*.js')).toBe(false);
    expect(minimatch.minimatch('app/page.tsx', '**/*.tsx')).toBe(true);
    expect(new minimatch.Minimatch('**/*.tsx').match('app/page.tsx')).toBe(true);
    expect(minimatch.match(['a.ts', 'b.js'], '*.ts')).toEqual(['a.ts']);
    expect(minimatch.braceExpand('*.{ts,tsx}')).toEqual(['*.ts', '*.tsx']);
  });
});
