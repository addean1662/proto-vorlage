import Anthropic from '@anthropic-ai/sdk';
import type { RawMessageStreamEvent } from '@anthropic-ai/sdk/resources/messages/messages';
import OpenAI from 'openai';
import { buildPrompt, buildRepairPrompt, buildVerifyPrompt, type LXXWordEntry, type MTWordEntry, type VulWordEntry } from './prompts';

type AlignmentProvider = 'anthropic' | 'openai';

let anthropic: Anthropic | null = null;
let openai: OpenAI | null = null;

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

function getAlignmentProvider(): AlignmentProvider {
  return process.env.ALIGNMENT_PROVIDER === 'openai' ? 'openai' : 'anthropic';
}

function getAnthropicModel(): string {
  return process.env.ANTHROPIC_ALIGNMENT_MODEL ?? 'claude-opus-4-6';
}

function getOpenAIModel(): string {
  return process.env.OPENAI_ALIGNMENT_MODEL ?? 'gpt-5.5';
}

function getAnthropicClient(): Anthropic {
  anthropic ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropic;
}

function getOpenAIClient(): OpenAI {
  openai ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

async function createOpenAIText(prompt: string, maxOutputTokens: number): Promise<string> {
  const response = await getOpenAIClient().responses.create({
    model: getOpenAIModel(),
    input: prompt,
    max_output_tokens: maxOutputTokens,
  });

  if (!response.output_text) {
    throw new Error('OpenAI response did not include output text.');
  }

  return response.output_text;
}

async function createAnthropicText(prompt: string, maxTokens: number): Promise<string> {
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: getAnthropicModel(),
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  }).catch(async (err) => {
    if (err?.status === 429) {
      console.log('Rate limited; waiting 90s before retry...');
      await new Promise(resolve => setTimeout(resolve, 90_000));
      return client.messages.create({
        model: getAnthropicModel(),
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      });
    }
    throw err;
  });

  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('');
}

async function createModelText(prompt: string, maxTokens: number): Promise<string> {
  if (getAlignmentProvider() === 'openai') {
    return createOpenAIText(prompt, maxTokens);
  }
  return createAnthropicText(prompt, maxTokens);
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

  for (let i = 0; i < textContent.length; i += 1) {
    const ch = textContent[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') { if (depth === 0) objStart = i; depth += 1; }
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0 && objStart !== -1) {
        candidates.push({ start: objStart, end: i });
        objStart = -1;
      }
    }
  }

  if (candidates.length === 0) {
    throw new Error(`No JSON object found in model response. Raw text: ${textContent.slice(0, 500)}`);
  }

  for (let i = candidates.length - 1; i >= 0; i -= 1) {
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

export async function repairAlignmentGroups(
  ref: string,
  groups: unknown[],
  traditions: unknown,
  errors: unknown[],
): Promise<unknown[]> {
  const prompt = buildRepairPrompt(ref, groups, traditions, errors);
  const textContent = await createModelText(prompt, 8000);
  const repaired = extractJSON(textContent) as { groups?: unknown[] };

  if (!Array.isArray(repaired.groups)) {
    throw new Error('Repair response did not include a groups array.');
  }

  return repaired.groups;
}

/**
 * Non-streaming alignment. The route still imports this under its historical name.
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
  const textContent = await createModelText(prompt, 16000);

  if (process.env.NODE_ENV !== 'production') {
    console.log(`Alignment response for ${ref} | provider: ${getAlignmentProvider()}`);
  }

  return extractJSON(textContent);
}

/**
 * Streaming alignment for Anthropic. OpenAI currently uses non-streaming generation
 * through the same API surface, then emits metadata once the JSON is parsed.
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
  if (getAlignmentProvider() === 'openai') {
    const data = await alignWithClaude(ref, mt, lxx, vul, mtWords, lxxWords, vulWords);
    const d = data as { ref: string; title: string; subtitle: string };
    onMeta({ ref: d.ref, title: d.title, subtitle: d.subtitle });
    return data;
  }

  const prompt = buildPrompt(ref, mt, lxx, vul, mtWords, lxxWords, vulWords);
  let rawStream: AsyncIterable<RawMessageStreamEvent>;

  try {
    rawStream = await getAnthropicClient().messages.create({
      model: getAnthropicModel(),
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

  if (process.env.NODE_ENV !== 'production') {
    console.log(`Anthropic stream done for ${ref} | chars: ${fullText.length}`);
  }

  return extractJSON(fullText);
}

/**
 * Second-pass verification of alignment groups.
 */
export async function verifyAlignment(ref: string, groups: unknown[], traditions: unknown): Promise<VerificationResult> {
  const prompt = buildVerifyPrompt(ref, groups, traditions);

  try {
    const text = await createModelText(prompt, 1000);
    return extractJSON(text) as VerificationResult;
  } catch (err) {
    console.warn('Verification failed (non-fatal):', err);
    return { verified: false, skipped: true, corrections: [] };
  }
}
