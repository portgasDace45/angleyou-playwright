// tests/e2e/10-it-maturity-upgrade.spec.js
// IT Maturity upgrade journey driven by DB tier changes (simulating Stripe webhook).

import { test, expect } from '@playwright/test';
import { ITMaturityPage } from '../../pages/ITMaturityPage.js';
import {
  getOrCreateTestUser,
  seedITMaturityAssessment,
  deleteITMAssessmentById,
  setITMaturityTier,
} from '../../utils/supabase.js';

test.describe.configure({ mode: 'serial' });

let testUserId;

test.beforeAll(async () => {
  testUserId = await getOrCreateTestUser();
});

test('free_teaser → scores unlocks all 8 domain scores @regression', async ({ page }) => {
  const id = await seedITMaturityAssessment(testUserId, 'free_teaser');
  try {
    await page.goto(`/dashboard/products/it-maturity/results/${id}`);
    await expect(page.getByText('?%').first()).toBeVisible();

    await setITMaturityTier(id, 'scores');
    await page.reload();

    await expect(page.getByText('?%')).toHaveCount(0);
  } finally {
    await deleteITMAssessmentById(id);
  }
});

test('scores → full unlocks the improvement pathway @regression', async ({ page }) => {
  // The Improvement Pathway is always generated for full tier — it is the
  // primary gated content. "Top Recommendations" additionally requires
  // computeResults() to return data, which needs non-empty answer seeds.
  const id = await seedITMaturityAssessment(testUserId, 'scores');
  await setITMaturityTier(id, 'full');
  try {
    await page.goto(`/dashboard/products/it-maturity/results/${id}`);
    await expect(
      page.getByRole('heading', { name: 'Your IT Maturity Improvement Pathway' })
    ).toBeVisible();
  } finally {
    await deleteITMAssessmentById(id);
  }
});

test('scores → full unlocks AI commentary and PDF @regression', async ({ page }) => {
  const id = await seedITMaturityAssessment(testUserId, 'scores');
  await setITMaturityTier(id, 'full');
  try {
    await page.goto(`/dashboard/products/it-maturity/results/${id}`);
    await expect(page.getByRole('heading', { name: 'AI Analysis' })).toBeVisible();
    await expect(page.getByRole('link', { name: /download pdf/i }).first()).toBeVisible();
  } finally {
    await deleteITMAssessmentById(id);
  }
});

test('upgrade to scores CTA redirects to Stripe checkout @regression', async ({ page }) => {
  const id = await seedITMaturityAssessment(testUserId, 'free_teaser');
  try {
    await page.goto(`/dashboard/products/it-maturity/results/${id}`);
    const itm = new ITMaturityPage(page);
    await expect(itm.upgradeToScoresButton).toBeVisible();
    await itm.upgradeToScoresButton.click();
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 20_000 });
  } finally {
    // Assessment row still exists (only tier changes in Stripe flow)
    await deleteITMAssessmentById(id);
  }
});

test('upgrade to full CTA is shown on scores tier @regression', async ({ page }) => {
  const id = await seedITMaturityAssessment(testUserId, 'scores');
  try {
    await page.goto(`/dashboard/products/it-maturity/results/${id}`);
    const itm = new ITMaturityPage(page);
    await expect(itm.upgradeToFullButton).toBeVisible();
  } finally {
    await deleteITMAssessmentById(id);
  }
});

test('free_launch shows everything unlocked with only the full-report upsell @regression', async ({ page }) => {
  const id = await seedITMaturityAssessment(testUserId, 'free_launch');
  try {
    await page.goto(`/dashboard/products/it-maturity/results/${id}`);
    await expect(page.getByText('?%')).toHaveCount(0);
    const itm = new ITMaturityPage(page);
    await expect(itm.upgradeToFullButton).toBeVisible();
  } finally {
    await deleteITMAssessmentById(id);
  }
});
