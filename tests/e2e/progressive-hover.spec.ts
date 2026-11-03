import { expect, test, type Page } from '@playwright/test';

declare global {
  interface Window {
    sendHoverEvent?: (event: string, data: unknown, close?: boolean) => void;
  }
}

// A controllable browser ReadableStream lets the test hold generation/review
// open indefinitely, rather than delivering every SSE event in one response.
async function startLookup(page: Page) {
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      if (String(input).endsWith('/api/lookup/stream')) {
        return new Response(new ReadableStream({
          start(controller) {
            window.sendHoverEvent = (event, data, close = false) => {
              controller.enqueue(new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
              if (close) controller.close();
            };
          },
        }), { headers: { 'Content-Type': 'text/event-stream' } });
      }
      return originalFetch(input, init);
    };
  });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByPlaceholder(/Genesis 1:1/i).fill('Genesis 1:1');
  await page.getByRole('button', { name: 'Look up', exact: true }).click();
  await page.waitForFunction(() => !!window.sendHoverEvent);
  await send(page, 'traditions', { traditions });
}

async function send(page: Page, event: string, data: unknown, close = false) {
  await page.evaluate(({ event, data, close }) => window.sendHoverEvent!(event, data, close), { event, data, close });
}

const traditions = {
  sp: [{ orig: 'בראשית', eng: 'beginning' }, { orig: 'ברא', eng: 'create' }],
  dss: [{ orig: 'ברא', eng: 'create', status: 'extant', frag: null }, { orig: 'בראשית', eng: 'beginning', status: 'extant', frag: null }],
  mt: [{ orig: 'ברא', eng: 'create' }, { orig: 'בראשית', eng: 'beginning' }],
  lxx: [{ orig: 'ἐποίησεν', eng: 'made' }, { orig: 'ἀρχῇ', eng: 'beginning' }],
  vul: [{ orig: 'principio', eng: 'beginning' }, { orig: 'creavit', eng: 'created' }],
};
const firstGroup = { sp: 0, mt: 1, lxx: 1, vul: 0 };
const secondGroup = { sp: 1, mt: 0, lxx: 0, vul: 1 };

test('hover activates under a stationary mouse before generation/review finish and survives reordered groups', async ({ page }) => {
  await startLookup(page);
  const word = page.locator('[data-tradition="sp"]').first();
  await word.getByText('בראשית', { exact: true }).hover();
  const initialBox = await word.boundingBox();
  await expect(word).toHaveAttribute('data-highlighted', 'false');

  await send(page, 'alignment', { groups: [firstGroup], complete: false });
  await expect(page.getByText('Hover available; more matches are loading…')).toBeVisible();
  for (const [key, index] of [['sp', 0], ['dss', 1], ['mt', 1], ['lxx', 1], ['vul', 0]] as const) {
    await expect(page.locator(`[data-tradition="${key}"]`).nth(index)).toHaveAttribute('data-highlighted', 'true');
  }
  await expect(page.locator('[data-tradition="mt"]').first()).toHaveAttribute('data-highlighted', 'false');
  expect((await word.boundingBox())?.height).toBe(initialBox?.height);

  // Repair/cache upgrades can renumber groups; the hovered word must stay selected.
  await send(page, 'alignment', { groups: [secondGroup, firstGroup], complete: true });
  await expect(word).toHaveAttribute('data-alignment-group', '1');
  await expect(word).toHaveAttribute('data-highlighted', 'true');
  await expect(page.locator('[data-tradition="mt"]').nth(1)).toHaveAttribute('data-highlighted', 'true');
  await expect(page.getByText('Hover available; more matches are loading…')).toHaveCount(0);

  await send(page, 'done', { data: { ref: 'Genesis 1:1', title: '', subtitle: '', traditions, groups: [secondGroup, firstGroup] }, cacheStored: true }, true);
  await expect(word).toHaveAttribute('data-highlighted', 'true');
});

test('a failed generation keeps received links usable and clears the pending indicator', async ({ page }) => {
  await startLookup(page);
  await send(page, 'alignment', { groups: [firstGroup], complete: false });
  await send(page, 'error', { message: 'Alignment provider disconnected' }, true);
  await expect(page.getByText('Alignment provider disconnected')).toBeVisible();
  await expect(page.getByText('Hover available; more matches are loading…')).toHaveCount(0);
  const word = page.locator('[data-tradition="sp"]').first();
  await word.hover();
  await expect(page.locator('[data-tradition="lxx"]').nth(1)).toHaveAttribute('data-highlighted', 'true');
});
