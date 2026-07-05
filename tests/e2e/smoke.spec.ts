import { expect, test } from '@playwright/test';

test('homepage renders the primary research tool', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Torah Textual Tradition Alignment' })).toBeVisible();
  await expect(page.getByPlaceholder(/Genesis 1:1/i)).toBeVisible();
  await expect(page.getByText(/Torah verses cached/i)).toBeVisible();
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
