// tests/e2e/10-it-maturity-upgrade.spec.js
// IT Maturity upgrade journey, driven by DB tier changes (simulating the
// Stripe webhook) rather than real payments:
//   free_teaser → scores → full

import { test, expect } from '@playwright/test';
import { ITMaturityPage } from '../../pages/ITMaturityPage.js';
import {
  getOrCreateTestUser,
  cleanupTestAssessments,
  seedITMaturityAssessment,
  setITMaturityTier,
} from '../../utils/supabase.js';

let testUserId;

test.beforeAll(async () => {
  testUserId = await getOrCreateTestUser();
});

test.afterEach(async () => {
  await cleanupTestAssessments(testUserId);
});

test.describe('Tier upgrade — UI state transitions (DB-driven)', () => {
  test('free_teaser → scores unlocks all 8 domain scores @regression', async ({ page }) => {
    const id = await seedITMaturityAssessment(testUserId, 'free_teaser');
    await page.goto(`/dashboard/products/it-maturity/results/${id}`);

    // Verify locked state first — locked domains render "?%"
    await expect(page.getByText('?%').first()).toBeVisible();

    // Simulate a successful Stripe webhook by upgrading the tier in the DB
    await setITMaturityTier(id, 'scores');
    await page.reload();

    await expect(page.getByText('?%')).toHaveCount(0);
  });

  test('scores → full unlocks recommendations @regression', async ({ page }) => {
    const id = await seedITMaturityAssessment(testUserId, 'scores');
    await setITMaturityTier(id, 'full');
    await page.goto(`/dashboard/products/it-maturity/results/${id}`);

    await expect(page.getByRole('heading', { name: /top recommendation/i })).toBeVisible();
  });

  test('scores → full unlocks AI commentary and PDF @regression', async ({ page }) => {
    const id = await seedITMaturityAssessment(testUserId, 'scores');
    await setITMaturityTier(id, 'full');
    await page.goto(`/dashboard/products/it-maturity/results/${id}`);

    await expect(page.getByRole('heading', { name: 'AI Analysis' })).toBeVisible();
    await expect(page.getByRole('link', { name: /download pdf/i }).first()).toBeVisible();
  });

  test('upgrade to scores CTA redirects to Stripe checkout @regression', async ({ page }) => {
    const id = await seedITMaturityAssessment(testUserId, 'free_teaser');
    await page.goto(`/dashboard/products/it-maturity/results/${id}`);

    const itm = new ITMaturityPage(page);
    await expect(itm.upgradeToScoresButton).toBeVisible();
    await itm.upgradeToScoresButton.click();

    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 20_000 });
  });

  test('upgrade to full CTA is shown on scores tier @regression', async ({ page }) => {
    const id = await seedITMaturityAssessment(testUserId, 'scores');
    await page.goto(`/dashboard/products/it-maturity/results/${id}`);

    const itm = new ITMaturityPage(page);
    await expect(itm.upgradeToFullButton).toBeVisible();
  });
});

test.describe('IT Maturity — free_launch tier', () => {
  test('free_launch shows everything unlocked with only the full-report upsell @regression', async ({ page }) => {
    // Tier assignment (first 10 completions globally) is verified by seeding
    // the tier directly rather than racing to be an early completion.
    const id = await seedITMaturityAssessment(testUserId, 'free_launch');
    await page.goto(`/dashboard/products/it-maturity/results/${id}`);

    await expect(page.getByText('?%')).toHaveCount(0);
    const itm = new ITMaturityPage(page);
    await expect(itm.upgradeToFullButton).toBeVisible();
  });
});
