import type { AlignmentGroup } from './alignment-validator';

/** Emit snapshots of complete group objects while the model is still writing JSON. */
export function createAlignmentStreamParser(onGroups: (groups: AlignmentGroup[]) => void) {
  let buffer = '';
  let cursor = 0;
  let inGroups = false;
  let finished = false;
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;
  const groups: AlignmentGroup[] = [];

  return (delta: string) => {
    if (finished) return;
    buffer += delta;
    if (!inGroups) {
      const marker = /"groups"\s*:\s*\[/.exec(buffer);
      if (!marker) return;
      cursor = marker.index + marker[0].length;
      inGroups = true;
    }
    const previousCount = groups.length;
    for (; cursor < buffer.length; cursor += 1) {
      const ch = buffer[cursor];
      if (escaped) { escaped = false; continue; }
      if (inString && ch === '\\') { escaped = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === ']' && depth === 0) { finished = true; break; }
      if (ch === '{') {
        if (depth === 0) start = cursor;
        depth += 1;
      } else if (ch === '}') {
        depth -= 1;
        if (depth === 0 && start >= 0) {
          try { groups.push(JSON.parse(buffer.slice(start, cursor + 1))); }
          catch { finished = true; break; } // Final parsing/repair handles malformed output.
          start = -1;
        }
      }
    }
    if (groups.length > previousCount) onGroups([...groups]);
  };
}
