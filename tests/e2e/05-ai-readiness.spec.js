// tests/e2e/05-ai-readiness.spec.js
// AI Readiness product and results pages via DB seeding.
//
// NOTE: the assess page verifies payment against a REAL Stripe checkout
// session (`/api/checkout/verify` retrieves the session from Stripe), so a
// DB-seeded 'paid' row can never unlock it. The full paid assess flow is
// covered by 06-stripe-checkout.spec.js in Stripe-enabled environments.

import { test, expect } from '@playwright/test';
import { AIReadinessPage } from '../../pages/AIReadinessPage.js';
import { GatePage } from '../../pages/GatePage.js';
import {
  getOrCreateTestUser,
  cleanupTestAssessments,
  seedAIAssessment,
} from '../../utils/supabase.js';

let testUserId;

test.beforeAll(async () => {
  testUserId = await getOrCreateTestUser();
});

test.afterEach(async () => {
  await cleanupTestAssessments(testUserId);
});

test.describe('AI Readiness — product page', () => {
  test('product detail page loads with purchase button @smoke', async ({ page }) => {
    const ai = new AIReadinessPage(page);
    await ai.gotoProductPage();
    await expect(ai.purchaseButton).toBeVisible();
  });

  test('price shown is $49 or $99 @regression', async ({ page }) => {
    const ai = new AIReadinessPage(page);
    await ai.gotoProductPage();
    await expect(page.getByText(/\$(49|99)/).first()).toBeVisible();
  });
});

test.describe('AI Readiness — access control', () => {
  test('assess page without a paid session shows an error, not questions @regression', async ({ page }) => {
    // No session_id/assessment_id params — the page must refuse to render questions
    await page.goto('/dashboard/products/ai-readiness/assess');
    await expect(
      page.getByText(/invalid session|payment could not be verified/i)
    ).toBeVisible({ timeout: 8_000 });
  });

  test('another user cannot access a different user results page @regression', async ({ browser }) => {
    const id = await seedAIAssessment(testUserId);
    // Fresh context: gate cookie only, no Supabase auth
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    const gate = new GatePage(page);
    await gate.unlock(process.env.GATE_PASSWORD);
    await page.waitForURL('/');

    await page.goto(`/dashboard/products/ai-readiness/results/${id}`);
    await expect(page).toHaveURL(/\/(login|dashboard)$/, { timeout: 8_000 });
    await ctx.close();
  });
});

test.describe('AI Readiness — assessment page (post-payment)', () => {
  // Payment verification requires a live Stripe checkout session — the full
  // assess flow (questions → submit → results) runs in 06-stripe-checkout.spec.js
  test.fixme(
    true,
    'Assess page requires a real Stripe session_id — DB seeding cannot unlock it. Covered by 06-stripe-checkout.spec.js.'
  );

  test('assess page loads with questions @regression', async ({ page }) => {
    const ai = new AIReadinessPage(page);
    await ai.gotoAssessPage();
    await expect(ai.optionButtons.first()).toBeVisible({ timeout: 8_000 });
  });

  test('completing all 18 questions reaches results @regression', async ({ page }) => {
    const ai = new AIReadinessPage(page);
    await ai.gotoAssessPage();
    await ai.answerAllQuestions('first');
    await ai.waitForResults();
    await expect(page).toHaveURL(/\/results\//);
  });

  test('section tab indicators show all 5 sections @regression', async ({ page }) => {
    const ai = new AIReadinessPage(page);
    await ai.gotoAssessPage();
    await expect(ai.sectionTabs).toHaveCount(5);
  });
});

test.describe('AI Readiness — results page', () => {
  test('results show the score ring @regression', async ({ page }) => {
    const id = await seedAIAssessment(testUserId);
    await page.goto(`/dashboard/products/ai-readiness/results/${id}`);
    const ai = new AIReadinessPage(page);
    await expect(ai.scoreRing).toBeVisible();
  });

  test('results show the readiness level badge @regression', async ({ page }) => {
    const id = await seedAIAssessment(testUserId);
    await page.goto(`/dashboard/products/ai-readiness/results/${id}`);
    const ai = new AIReadinessPage(page);
    await expect(ai.readinessLevel).toBeVisible();
  });

  test('results show recommendations @regression', async ({ page }) => {
    const id = await seedAIAssessment(testUserId);
    await page.goto(`/dashboard/products/ai-readiness/results/${id}`);
    const ai = new AIReadinessPage(page);
    await expect(ai.recommendations.first()).toBeVisible();
  });

  test('domain breakdown bars render for each of the 5 sections @regression', async ({ page }) => {
    const id = await seedAIAssessment(testUserId);
    await page.goto(`/dashboard/products/ai-readiness/results/${id}`);
    const ai = new AIReadinessPage(page);
    await expect(ai.domainBars).toHaveCount(5);
  });

  test('PDF download button is visible @regression', async ({ page }) => {
    const id = await seedAIAssessment(testUserId);
    await page.goto(`/dashboard/products/ai-readiness/results/${id}`);
    const ai = new AIReadinessPage(page);
    await expect(ai.downloadPdfButton).toBeVisible();
  });

  test('PDF endpoint returns a PDF content-type @regression', async ({ page, request }) => {
    const id = await seedAIAssessment(testUserId);
    // Hit the PDF API directly — auth cookies are in the request context
    const res = await request.get(`/api/pdf/ai-readiness/${id}`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/pdf');
  });

  test('AI commentary section renders and finishes loading @regression', async ({ page }) => {
    const id = await seedAIAssessment(testUserId);
    await page.goto(`/dashboard/products/ai-readiness/results/${id}`);
    const ai = new AIReadinessPage(page);
    await expect(ai.aiCommentarySection).toBeVisible();
    // Seeded rows have no cached commentary, so the component generates it
    // on mount — the loading spinner must eventually resolve either way
    await expect(page.getByText('Analysing your results...')).not.toBeVisible({
      timeout: 30_000,
    });
  });
});
