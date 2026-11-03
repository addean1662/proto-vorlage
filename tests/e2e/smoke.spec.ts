import { expect, test } from '@playwright/test';
import { getSamaritanVerse } from '../../lib/samaritan';

test('homepage renders the primary research tool', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Torah Textual Tradition Alignment' })).toBeVisible();
  await expect(page.getByPlaceholder(/Genesis 1:1/i)).toBeVisible();
  await expect(page.getByText(/Torah verses cached/i)).toBeVisible();
});

test('Samaritan is leftmost and hover highlights corresponding words across independent streams', async ({ page }) => {
  const sp = getSamaritanVerse('Genesis 1:1').words;
  const data = {
    ref: 'Genesis 1:1', title: 'בראשית', subtitle: 'Creation',
    traditions: {
      sp,
      dss: [{ orig: 'בראשית', eng: 'beginning', status: 'extant', frag: null }],
      mt: [{ orig: 'בראשית', eng: 'beginning' }],
      lxx: [{ orig: 'ἐν', eng: 'in' }, { orig: 'ἀρχῇ', eng: 'beginning' }],
      vul: [{ orig: 'in', eng: 'in' }, { orig: 'principio', eng: 'beginning' }],
    },
    groups: [{ sp: 0, mt: 0, lxx: 1, vul: 1 }, { sp: 1, mt: null, lxx: null, vul: null }],
  };
  await page.route('**/api/lookup/stream', route => route.fulfill({
    contentType: 'text/event-stream', body: `event: cached\ndata: ${JSON.stringify({ data, fromCache: true })}\n\n`,
  }));
  await page.goto('/');
  await page.getByPlaceholder(/Genesis 1:1/i).fill('Genesis 1:1');
  await page.getByPlaceholder(/Genesis 1:1/i).press('Enter');
  await expect(page.locator('[data-tradition-header]')).toHaveText(['Samaritan PentateuchChester Beatty 751 / Garizim 1source noteEdition & attributionText-Fabric SP', /Dead Sea Scrolls/, /Septuagint/, /Vulgate/, /Masoretic Text/]);
  const first = page.locator('[data-tradition="sp"]').first();
  await first.hover();
  for (const key of ['sp', 'dss', 'mt', 'lxx', 'vul']) {
    await expect(page.locator(`[data-tradition="${key}"][data-alignment-group="0"]`)).toHaveAttribute('data-highlighted', 'true');
  }
  await expect(page.locator('[data-tradition="lxx"]').first()).toHaveAttribute('data-highlighted', 'false');
  await page.locator('[data-tradition="mt"]').first().focus();
  await expect(first).toHaveAttribute('data-highlighted', 'true');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(first).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('Samaritan source page provides attribution and passage notes', async ({ page }) => {
  await page.goto('/samaritan-pentateuch');
  await expect(page.getByRole('heading', { name: 'Samaritan Pentateuch', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Creative Commons Attribution–NonCommercial 4.0' })).toBeVisible();
  await expect(page.getByText(/Exodus 30:1–10/)).toBeVisible();
});

test('DSS witnesses page renders', async ({ page }) => {
  await page.goto('/dss-fragments');
  await expect(page.getByRole('heading')).toContainText(/Dead Sea Scroll/i);
});

test('admin console renders protected controls', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Cache Review Console' })).toBeVisible();
  await expect(page.getByPlaceholder('x-cache-admin-secret')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Load cache' })).toBeDisabled();
});

test('lookup API exposes public cache count', async ({ request }) => {
  const response = await request.get('/api/lookup');
  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toHaveProperty('count');
});

test('public cache delete is forbidden', async ({ request }) => {
  const response = await request.delete('/api/lookup', {
    data: { all: true },
  });
  expect(response.status()).toBe(403);
  await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
});
