// tests/visual/01-visual-regression.spec.js
// @regression
// Visual snapshot tests. Run `playwright test --update-snapshots` first time
// to create baselines. Subsequent runs compare against those baselines.
// These only run in chromium to avoid cross-browser rendering noise.

import { test, expect } from '@playwright/test';

// Only run visual tests in Chromium to avoid OS/font rendering differences
test.skip(({ browserName }) => browserName !== 'chromium', 'Visual tests: Chromium only');

const visualPages = [
  // Landing: wait for the typewriter headline to FINISH typing so
  // screenshots are stable (the second line renders last)
  { name: 'landing', path: '/', ready: (page) => page.getByText('your IT stands.') },
  { name: 'login', path: '/login', ready: (page) => page.getByTestId('email-input') },
  { name: 'signup', path: '/signup', ready: (page) => page.getByTestId('email-input') },
  { name: 'dashboard', path: '/dashboard', ready: (page) => page.getByTestId('main-nav') },
  { name: 'products', path: '/dashboard/products', ready: (page) => page.getByTestId('product-ai-readiness') },
  { name: 'ai-readiness-product', path: '/dashboard/products/ai-readiness', ready: (page) => page.getByRole('button', { name: /^purchase/i }) },
  { name: 'it-maturity-product', path: '/dashboard/products/it-maturity', ready: (page) => page.getByTestId('itm-start-free-btn') },
  { name: 'terms', path: '/terms', ready: (page) => page.getByRole('heading', { level: 1 }) },
  { name: 'privacy', path: '/privacy', ready: (page) => page.getByRole('heading', { level: 1 }) },
];

for (const { name, path, ready } of visualPages) {
  test(`${name} page visual snapshot @regression`, async ({ page }) => {
    await page.goto(path);
    // Wait for the key element so the page is fully rendered
    await ready(page).first().waitFor({ timeout: 10_000 });
    // toHaveScreenshot retries until two consecutive captures match,
    // which absorbs font loading and settling animations
    await expect(page).toHaveScreenshot(`${name}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.02, // Allow 2% pixel difference (anti-aliasing, etc.)
      animations: 'disabled',
    });
  });
}

test('Results page score ring renders correctly @regression', async ({ page }) => {
  // Requires a seeded assessment — this test uses a known fixture ID
  // Update FIXTURE_ASSESSMENT_ID in .env.test if needed
  const id = process.env.FIXTURE_ASSESSMENT_ID;
  if (!id) {
    test.skip(true, 'FIXTURE_ASSESSMENT_ID not set');
    return;
  }
  await page.goto(`/dashboard/products/ai-readiness/results/${id}`);
  await page.getByTestId('ai-score-ring').waitFor({ timeout: 10_000 });
  await expect(page).toHaveScreenshot('ai-readiness-results.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.02,
    animations: 'disabled',
  });
});
