import Anthropic from '@anthropic-ai/sdk';
import { buildPrompt, buildVerifyPrompt, type MTWordEntry, type LXXWordEntry, type VulWordEntry } from './prompts';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface StreamMeta {
  ref: string;
  title: string;
  subtitle: string;
}

export interface Correction {
  group: number;
  tradition: string;
  field: string;
  was: unknown;
  now: unknown;
  reason: string;
}

export interface VerificationResult {
  verified: boolean;
  skipped?: boolean;
  corrections: Correction[];
}

/**
 * Scan accumulated text for the last complete top-level JSON object.
 */
function extractJSON(textContent: string): unknown {
  const candidates: Array<{ start: number; end: number }> = [];
  let depth = 0;
  let objStart = -1;
  let inString = false;
  let escape = false;
  for (let i = 0; i < textContent.length; i++) {
    const ch = textContent[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') { if (depth === 0) objStart = i; depth++; }
    else if (ch === '}') {
      depth--;
      if (depth === 0 && objStart !== -1) {
        candidates.push({ start: objStart, end: i });
        objStart = -1;
      }
    }
  }

  if (candidates.length === 0) {
    throw new Error(`No JSON object found in Claude response. Raw text: ${textContent.slice(0, 500)}`);
  }

  for (let i = candidates.length - 1; i >= 0; i--) {
    const jsonStr = textContent.slice(candidates[i].start, candidates[i].end + 1);
    try { return JSON.parse(jsonStr); } catch { /* try next */ }
  }

  const last = candidates[candidates.length - 1];
  throw new Error(`JSON parse failed on all ${candidates.length} candidate(s). Last (first 500): ${textContent.slice(last.start, last.end + 1).slice(0, 500)}`);
}

/**
 * Try to extract ref/title/subtitle as soon as the "groups":[ marker appears.
 */
function tryExtractMeta(buffer: string): StreamMeta | null {
  if (!buffer.includes('"groups":[')) return null;
  const get = (field: string): string | null => {
    const m = buffer.match(new RegExp(`"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
    return m ? m[1] : null;
  };
  const ref = get('ref');
  const title = get('title');
  const subtitle = get('subtitle');
  return ref && title && subtitle ? { ref, title, subtitle } : null;
}

/**
 * Non-streaming alignment — returns the full groups JSON.
 */
export async function alignWithClaude(
  ref: string,
  mt: string,
  lxx: string,
  vul: string,
  mtWords: MTWordEntry[] | null = null,
  lxxWords: LXXWordEntry[] | null = null,
  vulWords: VulWordEntry[] | null = null,
): Promise<unknown> {
  const prompt = buildPrompt(ref, mt, lxx, vul, mtWords, lxxWords, vulWords);

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }],
  }).catch(async (err) => {
    if (err?.status === 429) {
      console.log('Rate limited — waiting 90s before retry...');
      await new Promise(r => setTimeout(r, 90_000));
      return client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 16000,
        messages: [{ role: 'user', content: prompt }],
      });
    }
    throw err;
  });

  console.log(`\n=== Claude response for ${ref} | stop_reason: ${response.stop_reason} | blocks: ${response.content.length} ===`);

  const textContent = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  console.log(`\n=== RAW TEXT (first 500 chars) ===\n${textContent.slice(0, 500)}\n=== END RAW ===\n`);

  return extractJSON(textContent);
}

/**
 * Streaming alignment — streams Claude's response for connection keepalive.
 * Calls onMeta as soon as ref/title/subtitle are available in the stream.
 * Returns the full parsed JSON when streaming completes.
 */
export async function alignWithClaudeStream(
  ref: string,
  mt: string,
  lxx: string,
  vul: string,
  onMeta: (meta: StreamMeta) => void,
  mtWords: MTWordEntry[] | null = null,
  lxxWords: LXXWordEntry[] | null = null,
  vulWords: VulWordEntry[] | null = null,
): Promise<unknown> {
  const prompt = buildPrompt(ref, mt, lxx, vul, mtWords, lxxWords, vulWords);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rawStream: AsyncIterable<any>;
  try {
    rawStream = await (client.messages.create as Function)({
      model: 'claude-opus-4-6',
      max_tokens: 16000,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    });
  } catch (err) {
    console.warn('Streaming create failed, falling back to non-streaming:', err);
    const data = await alignWithClaude(ref, mt, lxx, vul, mtWords, lxxWords, vulWords);
    const d = data as { ref: string; title: string; subtitle: string };
    onMeta({ ref: d.ref, title: d.title, subtitle: d.subtitle });
    return data;
  }

  let fullText = '';
  let metaEmitted = false;

  for await (const event of rawStream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta?.type === 'text_delta' &&
      typeof event.delta.text === 'string'
    ) {
      fullText += event.delta.text;

      if (!metaEmitted) {
        const meta = tryExtractMeta(fullText);
        if (meta) { onMeta(meta); metaEmitted = true; }
      }
    }
  }

  console.log(`\n=== Stream done for ${ref} | chars: ${fullText.length} ===`);

  return extractJSON(fullText);
}

/**
 * Second-pass verification of alignment groups.
 */
export async function verifyAlignment(ref: string, groups: unknown[], traditions: unknown): Promise<VerificationResult> {
  const prompt = buildVerifyPrompt(ref, groups, traditions);

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('');

    return extractJSON(text) as VerificationResult;
  } catch (err) {
    console.warn('Verification failed (non-fatal):', err);
    return { verified: false, skipped: true, corrections: [] };
  }
}
