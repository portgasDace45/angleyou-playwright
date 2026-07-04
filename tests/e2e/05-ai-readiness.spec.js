// tests/e2e/05-ai-readiness.spec.js
// AI Readiness product and results pages via DB seeding.
//
// NOTE: The assess page verifies payment against a real Stripe checkout session
// so a DB-seeded 'paid' row can never unlock it. Covered by 06-stripe-checkout.

import { test, expect } from '@playwright/test';
import { AIReadinessPage } from '../../pages/AIReadinessPage.js';
import { GatePage } from '../../pages/GatePage.js';
import {
  getOrCreateTestUser,
  seedAIAssessment,
  deleteAIAssessmentById,
} from '../../utils/supabase.js';

test.describe.configure({ mode: 'serial' });

let testUserId;

test.beforeAll(async () => {
  testUserId = await getOrCreateTestUser();
});

// ── Product page ──────────────────────────────────────────────────────────────

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

// ── Access control ────────────────────────────────────────────────────────────

test('assess page without a paid session shows an error, not questions @regression', async ({ page }) => {
  await page.goto('/dashboard/products/ai-readiness/assess');
  await expect(
    page.getByText(/invalid session|payment could not be verified/i)
  ).toBeVisible({ timeout: 8_000 });
});

test('another user cannot access a different user results page @regression', async ({ browser }) => {
  const id = await seedAIAssessment(testUserId);
  try {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    const gate = new GatePage(page);
    await gate.unlock(process.env.GATE_PASSWORD);
    await page.waitForURL('/');
    await page.goto(`/dashboard/products/ai-readiness/results/${id}`);
    await expect(page).toHaveURL(/\/(login|dashboard)$/, { timeout: 8_000 });
    await ctx.close();
  } finally {
    await deleteAIAssessmentById(id);
  }
});

// ── Assessment page (post-payment) ────────────────────────────────────────────
// These tests require a real Stripe session_id. Covered by 06-stripe-checkout.

test.describe('AI Readiness — assessment page (post-payment)', () => {
  test.fixme(
    true,
    'Assess page requires a real Stripe session_id — covered by 06-stripe-checkout.spec.js.'
  );

  test('assess page loads with questions @regression', async ({ page }) => {
    const ai = new AIReadinessPage(page);
    await ai.gotoAssessPage();
    await expect(ai.optionButtons.first()).toBeVisible({ timeout: 8_000 });
  });
});

// ── Results page ──────────────────────────────────────────────────────────────

test('results show the score ring @regression', async ({ page }) => {
  const id = await seedAIAssessment(testUserId);
  try {
    await page.goto(`/dashboard/products/ai-readiness/results/${id}`);
    const ai = new AIReadinessPage(page);
    await expect(ai.scoreRing).toBeVisible();
  } finally {
    await deleteAIAssessmentById(id);
  }
});

test('results show the readiness level badge @regression', async ({ page }) => {
  const id = await seedAIAssessment(testUserId);
  try {
    await page.goto(`/dashboard/products/ai-readiness/results/${id}`);
    const ai = new AIReadinessPage(page);
    await expect(ai.readinessLevel).toBeVisible();
  } finally {
    await deleteAIAssessmentById(id);
  }
});

test('results show recommendations @regression', async ({ page }) => {
  const id = await seedAIAssessment(testUserId);
  try {
    await page.goto(`/dashboard/products/ai-readiness/results/${id}`);
    const ai = new AIReadinessPage(page);
    await expect(ai.recommendations.first()).toBeVisible();
  } finally {
    await deleteAIAssessmentById(id);
  }
});

test('domain breakdown bars render for each of the 5 sections @regression', async ({ page }) => {
  const id = await seedAIAssessment(testUserId);
  try {
    await page.goto(`/dashboard/products/ai-readiness/results/${id}`);
    const ai = new AIReadinessPage(page);
    await expect(ai.domainBars).toHaveCount(5);
  } finally {
    await deleteAIAssessmentById(id);
  }
});

test('PDF download button is visible @regression', async ({ page }) => {
  const id = await seedAIAssessment(testUserId);
  try {
    await page.goto(`/dashboard/products/ai-readiness/results/${id}`);
    const ai = new AIReadinessPage(page);
    await expect(ai.downloadPdfButton).toBeVisible();
  } finally {
    await deleteAIAssessmentById(id);
  }
});

test('PDF endpoint returns a PDF content-type @regression', async ({ page, request }) => {
  const id = await seedAIAssessment(testUserId);
  try {
    const res = await request.get(`/api/pdf/ai-readiness/${id}`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/pdf');
  } finally {
    await deleteAIAssessmentById(id);
  }
});

test('AI commentary section renders and finishes loading @regression', async ({ page }) => {
  const id = await seedAIAssessment(testUserId);
  try {
    await page.goto(`/dashboard/products/ai-readiness/results/${id}`);
    const ai = new AIReadinessPage(page);
    await expect(ai.aiCommentarySection).toBeVisible();
    await expect(page.getByText('Analysing your results...')).not.toBeVisible({
      timeout: 30_000,
    });
  } finally {
    await deleteAIAssessmentById(id);
  }
});
