// tests/visual/01-visual-regression.spec.js
// Visual snapshot tests — Chromium only to avoid OS/font rendering noise.
//
// First run: `npx playwright test tests/visual --update-snapshots --project=chromium`
// to create baselines. Subsequent runs compare against those baselines.
//
// Login and signup are excluded: middleware redirects authenticated users
// (from the shared auth-state) to /dashboard, so email-input is never visible.

import { test, expect } from '@playwright/test';

test.skip(({ browserName }) => browserName !== 'chromium', 'Visual tests: Chromium only');

// Excluded pages (dynamic content — baseline unstable across test runs):
//   dashboard     — score rings + "View results" vs "Start" cards vary by assessment state
//   products      — "View results →" vs "Get started →" CTAs vary by completed assessments
//   it-maturity-product — "Start free" button only renders when user has no completed ITM
//                         assessments; parallel tests can create a completed row mid-run
const visualPages = [
  { name: 'landing', path: '/', ready: (p) => p.getByText('your IT stands.') },
  // AI Readiness product shows the Purchase button when no incomplete assessment exists.
  // After 2026-07-05 the page also shows an amber resume banner if the user has a
  // paid-but-unfinished row — that would change the snapshot. The DB was reset on
  // 2026-07-05 so this is currently stable. Re-run --update-snapshots if the banner
  // appears and causes a diff.
  { name: 'ai-readiness-product', path: '/dashboard/products/ai-readiness', ready: (p) => p.getByRole('button', { name: /^purchase/i }).or(p.getByText('unfinished assessment')) },
  // /terms and /privacy bypass the gate and don't require auth
  { name: 'terms', path: '/terms', ready: (p) => p.getByRole('heading', { level: 1 }) },
  { name: 'privacy', path: '/privacy', ready: (p) => p.getByRole('heading', { level: 1 }) },
];

for (const { name, path, ready } of visualPages) {
  test(`${name} page visual snapshot @regression`, async ({ page }) => {
    await page.goto(path);
    await ready(page).first().waitFor({ timeout: 10_000 });
    await expect(page).toHaveScreenshot(`${name}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    });
  });
}

test('Results page score ring renders correctly @regression', async ({ page }) => {
  const id = process.env.FIXTURE_ASSESSMENT_ID;
  test.skip(!id, 'FIXTURE_ASSESSMENT_ID not set');
  await page.goto(`/dashboard/products/ai-readiness/results/${id}`);
  await page.getByTestId('ai-score-ring').waitFor({ timeout: 10_000 });
  await expect(page).toHaveScreenshot('ai-readiness-results.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.02,
    animations: 'disabled',
  });
});
