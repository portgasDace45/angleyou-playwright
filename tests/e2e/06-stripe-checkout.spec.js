// tests/e2e/06-stripe-checkout.spec.js
// Stripe checkout UI flow.
//
// "redirect" tests (just check toHaveURL) run whenever STRIPE_TEST_CARD is set.
// "card filling" tests (fill form fields on checkout.stripe.com) additionally
// require STRIPE_FILL_CHECKOUT=true — Stripe's hosted checkout DOM changes
// frequently and the card-filling selectors need verification against the
// live checkout page before enabling.

import { test, expect } from '@playwright/test';
import { AIReadinessPage } from '../../pages/AIReadinessPage.js';
import { ITMaturityPage } from '../../pages/ITMaturityPage.js';
import { completeStripeCheckout, fillStripeCheckout } from '../../utils/stripe.js';
import {
  getOrCreateTestUser,
  seedITMaturityAssessment,
  deleteITMAssessmentById,
} from '../../utils/supabase.js';

test.describe.configure({ mode: 'serial' });

test.skip(!process.env.STRIPE_TEST_CARD, 'Stripe test card not configured — skipping checkout tests');

let testUserId;

test.beforeAll(async () => {
  testUserId = await getOrCreateTestUser();
});

test.describe('AI Readiness — Stripe checkout', () => {
  test('purchase button initiates Stripe checkout redirect @regression', async ({ page }) => {
    const ai = new AIReadinessPage(page);
    await ai.gotoProductPage();
    await ai.purchaseButton.click();
    await expect(page).toHaveURL(/checkout\.stripe\.com/, { timeout: 20_000 });
  });

  test('successful test payment redirects to the assessment @regression', async ({ page }) => {
    test.skip(!process.env.STRIPE_FILL_CHECKOUT, 'Card-filling tests require STRIPE_FILL_CHECKOUT=true');
    const ai = new AIReadinessPage(page);
    await ai.gotoProductPage();
    await ai.purchaseButton.click();
    await completeStripeCheckout(page);
    await expect(page).toHaveURL(/\/(assess|verify|results)/, { timeout: 30_000 });
  });

  test('declined card shows error in Stripe checkout @regression', async ({ page }) => {
    test.skip(!process.env.STRIPE_FILL_CHECKOUT, 'Card-filling tests require STRIPE_FILL_CHECKOUT=true');
    const ai = new AIReadinessPage(page);
    await ai.gotoProductPage();
    await ai.purchaseButton.click();
    await fillStripeCheckout(page, '4000000000000002');
    await expect(page.getByText(/declined/i).first()).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('IT Maturity — Stripe upgrade (scores tier)', () => {
  test('upgrade to scores button initiates Stripe checkout redirect @regression', async ({ page }) => {
    const id = await seedITMaturityAssessment(testUserId, 'free_teaser');
    try {
      await page.goto(`/dashboard/products/it-maturity/results/${id}`);
      const itm = new ITMaturityPage(page);
      await itm.upgradeToScoresButton.click();
      await expect(page).toHaveURL(/checkout\.stripe\.com/, { timeout: 20_000 });
    } finally {
      await deleteITMAssessmentById(id);
    }
  });
});
