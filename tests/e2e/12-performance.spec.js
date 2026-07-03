// tests/e2e/12-performance.spec.js
// Lightweight performance checks — ensures Vercel cold starts don't
// cause pages to exceed reasonable load budgets.

import { test, expect } from '@playwright/test';

const PAGE_LOAD_BUDGET_MS = 8_000; // Generous for Vercel cold starts

const criticalPages = [
  { name: 'Landing', path: '/' },
  { name: 'Login', path: '/login' },
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Products', path: '/dashboard/products' },
];

for (const { name, path } of criticalPages) {
  test(`${name} page loads within ${PAGE_LOAD_BUDGET_MS}ms @regression`, async ({ page }) => {
    const start = Date.now();
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(PAGE_LOAD_BUDGET_MS);
  });
}

test('Landing page has no console errors @regression', async ({ page }) => {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  // Filter out known third-party errors
  const appErrors = errors.filter(
    (e) => !e.includes('stripe') && !e.includes('turnstile') && !e.includes('chrome-extension')
  );
  expect(appErrors).toHaveLength(0);
});

test('Dashboard has no console errors @regression', async ({ page }) => {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  const appErrors = errors.filter(
    (e) => !e.includes('stripe') && !e.includes('turnstile') && !e.includes('chrome-extension')
  );
  expect(appErrors).toHaveLength(0);
});

test('No broken internal links on landing page @regression', async ({ page }) => {
  await page.goto('/');
  const links = await page.locator('a[href^="/"]').all();
  const broken = [];

  for (const link of links) {
    const href = await link.getAttribute('href');
    if (!href || href === '/') continue;
    try {
      const res = await page.request.get(href);
      if (res.status() >= 400) broken.push(`${href} → ${res.status()}`);
    } catch (err) {
      broken.push(`${href} → request failed (${err.message})`);
    }
  }
  expect(broken, `Broken links: ${broken.join(', ')}`).toHaveLength(0);
});
