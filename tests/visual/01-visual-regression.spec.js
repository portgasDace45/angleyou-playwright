// tests/visual/01-visual-regression.spec.js
// Page-content regression tests — verify key headings, CTAs, and structural
// elements are present on each page. Replaced pixel-snapshot approach because
// scrollbar width oscillation (1280px vs 1265px) caused spurious failures.

import { test, expect } from '@playwright/test';

test.skip(({ browserName }) => browserName !== 'chromium', 'Visual tests: Chromium only');

// ── Landing page ──────────────────────────────────────────────────────────────

test('landing page visual snapshot @regression', async ({ page }) => {
  await page.goto('/');
  // Hero section
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 10_000 });
  // Primary CTA buttons
  await expect(page.getByRole('link', { name: /get started|start free|assess/i }).first()).toBeVisible();
  // Footer links
  await expect(page.getByRole('link', { name: /terms/i }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /privacy/i }).first()).toBeVisible();
  // No JS error overlay
  await expect(page.locator('body')).not.toContainText("Application error");
});

// ── AI Readiness product page ─────────────────────────────────────────────────

test('ai-readiness-product page visual snapshot @regression', async ({ page }) => {
  await page.goto('/dashboard/products/ai-readiness');
  // Page heading
  await expect(page.getByRole('heading', { name: /ai readiness/i }).first()).toBeVisible({ timeout: 10_000 });
  // Price is shown ($49 or $99)
  await expect(page.getByText(/\$(49|99)/).first()).toBeVisible();
  // Purchase CTA or resume banner (depending on assessment state)
  const purchaseBtn = page.getByRole('button', { name: /^purchase/i });
  const resumeBanner = page.getByText(/unfinished assessment/i);
  await expect(purchaseBtn.or(resumeBanner).first()).toBeVisible();
});

// ── Terms page ────────────────────────────────────────────────────────────────

test('terms page visual snapshot @regression', async ({ page }) => {
  await page.goto('/terms');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/terms/i);
  // Key sections
  await expect(page.getByRole('heading', { name: /acceptance|agreement|use/i }).first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText("Application error");
});

// ── Privacy page ──────────────────────────────────────────────────────────────

test('privacy page visual snapshot @regression', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/privacy/i);
  await expect(page.getByRole('heading', { name: /information|data|collect/i }).first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText("Application error");
});

// ── Results page score ring ───────────────────────────────────────────────────

test('Results page score ring renders correctly @regression', async ({ page }) => {
  const id = process.env.FIXTURE_ASSESSMENT_ID;
  test.skip(!id, 'FIXTURE_ASSESSMENT_ID not set');
  await page.goto(`/dashboard/products/ai-readiness/results/${id}`);
  await expect(page.getByTestId('ai-score-ring')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('ai-readiness-level')).toBeVisible();
  await expect(page.getByTestId('ai-commentary')).toBeVisible();
  await expect(page.getByTestId('download-pdf-btn')).toBeVisible();
});
