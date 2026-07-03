// tests/e2e/06-stripe-checkout.spec.js
// Full Stripe checkout UI flow using test cards on Stripe's hosted page.
// These tests are slower (hit real Stripe test endpoints) and only run
// where STRIPE_TEST_CARD is set.

import { test, expect } from '@playwright/test';
import { AIReadinessPage } from '../../pages/AIReadinessPage.js';
import { ITMaturityPage } from '../../pages/ITMaturityPage.js';
import { completeStripeCheckout, fillStripeCheckout } from '../../utils/stripe.js';
import {
  getOrCreateTestUser,
  cleanupTestAssessments,
  seedITMaturityAssessment,
} from '../../utils/supabase.js';

test.skip(!process.env.STRIPE_TEST_CARD, 'Stripe test card not configured — skipping checkout tests');

let testUserId;

test.beforeAll(async () => {
  testUserId = await getOrCreateTestUser();
});

test.afterEach(async () => {
  await cleanupTestAssessments(testUserId);
});

test.describe('AI Readiness — Stripe checkout', () => {
  test('purchase button initiates Stripe checkout @regression', async ({ page }) => {
    const ai = new AIReadinessPage(page);
    await ai.gotoProductPage();
    await ai.purchaseButton.click();
    await expect(page).toHaveURL(/checkout\.stripe\.com/, { timeout: 20_000 });
  });

  test('successful test payment redirects to the assessment @regression', async ({ page }) => {
    const ai = new AIReadinessPage(page);
    await ai.gotoProductPage();
    await ai.purchaseButton.click();
    await completeStripeCheckout(page);
    await expect(page).toHaveURL(/\/(assess|verify|results)/, { timeout: 30_000 });
  });

  test('declined card shows error in Stripe checkout @regression', async ({ page }) => {
    const ai = new AIReadinessPage(page);
    await ai.gotoProductPage();
    await ai.purchaseButton.click();
    // Stripe's standard decline test card
    await fillStripeCheckout(page, '4000000000000002');
    await expect(page.getByText(/declined/i).first()).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('IT Maturity — Stripe upgrade (scores tier)', () => {
  test('upgrade to scores button initiates Stripe checkout @regression', async ({ page }) => {
    const id = await seedITMaturityAssessment(testUserId, 'free_teaser');
    await page.goto(`/dashboard/products/it-maturity/results/${id}`);

    const itm = new ITMaturityPage(page);
    await itm.upgradeToScoresButton.click();
    await expect(page).toHaveURL(/checkout\.stripe\.com/, { timeout: 20_000 });
  });
});
