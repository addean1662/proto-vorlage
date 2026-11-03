import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ openai: vi.fn(), anthropic: vi.fn() }));
vi.mock('openai', () => ({ default: class { responses = { create: mocks.openai }; } }));
vi.mock('@anthropic-ai/sdk', () => ({ default: class { messages = { create: mocks.anthropic }; } }));

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe.each(['openai', 'anthropic'])('%s progressive alignment', provider => {
  it('delivers a hover group before the provider finishes the response', async () => {
    vi.stubEnv('ALIGNMENT_PROVIDER', provider);
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const group = { sp: 0, mt: 0, lxx: 0, vul: 0 };
    async function* stream() {
      for (const text of ['{"ref":"Genesis 1:1","title":"Creation","subtitle":"Test","groups" : [', JSON.stringify(group)]) {
        yield provider === 'openai'
          ? { type: 'response.output_text.delta', delta: text }
          : { type: 'content_block_delta', delta: { type: 'text_delta', text } };
      }
      await gate;
      yield provider === 'openai'
        ? { type: 'response.output_text.delta', delta: ']}' }
        : { type: 'content_block_delta', delta: { type: 'text_delta', text: ']}' } };
    }
    mocks[provider as 'openai' | 'anthropic'].mockResolvedValue(stream());
    const { alignWithClaudeStream } = await import('../lib/claude');
    const onGroups = vi.fn();
    const onMeta = vi.fn();
    let completed = false;
    const result = alignWithClaudeStream('Genesis 1:1', '', '', '', onMeta, null, null, null, null, onGroups)
      .then(value => { completed = true; return value; });
    try {
      await vi.waitFor(() => expect(onGroups).toHaveBeenCalledWith([group]));
      expect(completed).toBe(false);
      expect(onMeta).toHaveBeenCalledWith({ ref: 'Genesis 1:1', title: 'Creation', subtitle: 'Test' });
      expect(mocks[provider as 'openai' | 'anthropic']).toHaveBeenCalledWith(expect.objectContaining({ stream: true }));
    } finally { release(); }
    await expect(result).resolves.toMatchObject({ groups: [group] });
  });
});
