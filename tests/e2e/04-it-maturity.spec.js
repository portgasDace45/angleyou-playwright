// tests/e2e/04-it-maturity.spec.js
// IT Maturity freemium flow end-to-end without touching Stripe.

import { test, expect } from '@playwright/test';
import { ITMaturityPage } from '../../pages/ITMaturityPage.js';
import {
  getOrCreateTestUser,
  cleanupTestAssessments,
  seedITMaturityAssessment,
} from '../../utils/supabase.js';

let testUserId;

// The assess page requires an existing assessment row + ?assessment_id= param
function seedStartedAssessment() {
  return seedITMaturityAssessment(testUserId, 'free_teaser', {
    status: 'started',
    overall_pct: null,
    maturity_level: null,
    completed_at: null,
  });
}

// All 8 domain titles as rendered in the results-page Domain Breakdown
const DOMAIN_TITLES =
  /^(Security|Infrastructure|Operations|Cloud & Connectivity|Data Management|Business Continuity|IT Governance|End User Computing)$/;

test.beforeAll(async () => {
  testUserId = await getOrCreateTestUser();
});

test.afterEach(async () => {
  await cleanupTestAssessments(testUserId);
});

test.describe('IT Maturity — product page', () => {
  test('product detail page loads with start button @smoke', async ({ page }) => {
    const itm = new ITMaturityPage(page);
    await itm.gotoProductPage();
    await expect(itm.startFreeButton).toBeVisible();
  });
});

test.describe('IT Maturity — assessment flow', () => {
  test('completing the free assessment reaches results @regression', async ({ page }) => {
    const assessmentId = await seedStartedAssessment();
    const itm = new ITMaturityPage(page);
    await itm.gotoAssessPage(assessmentId);
    await itm.answerAllQuestions('first');
    await itm.waitForResults();
    await expect(page).toHaveURL(/\/results\//);
  });

  test('progress advances as questions are answered @regression', async ({ page }) => {
    const assessmentId = await seedStartedAssessment();
    const itm = new ITMaturityPage(page);
    await itm.gotoAssessPage(assessmentId);

    // Progress renders as "N / M answered" next to the bar
    const progressText = page.getByText(/\d+ \/ \d+ answered/);
    await expect(progressText).toBeVisible();
    const initial = Number((await progressText.textContent()).match(/^(\d+)/)[1]);

    await itm.answerCurrentSection('first');

    const later = Number((await progressText.textContent()).match(/^(\d+)/)[1]);
    expect(later).toBeGreaterThan(initial);
  });
});

test.describe('IT Maturity — results tiers', () => {
  test('free_teaser shows 3 free domains and locks 5 @regression', async ({ page }) => {
    const assessmentId = await seedITMaturityAssessment(testUserId, 'free_teaser');
    await page.goto(`/dashboard/products/it-maturity/results/${assessmentId}`);

    // Unlocked free domains carry a FREE chip; locked domains show "?%"
    await expect(page.getByText('FREE', { exact: true })).toHaveCount(3);
    await expect(page.getByText('?%')).toHaveCount(5);
  });

  test('free_teaser shows the scores upgrade CTA @regression', async ({ page }) => {
    const assessmentId = await seedITMaturityAssessment(testUserId, 'free_teaser');
    await page.goto(`/dashboard/products/it-maturity/results/${assessmentId}`);
    const itm = new ITMaturityPage(page);
    await expect(itm.upgradeToScoresButton).toBeVisible();
  });

  test('free_launch shows all 8 domain scores @regression', async ({ page }) => {
    const assessmentId = await seedITMaturityAssessment(testUserId, 'free_launch');
    await page.goto(`/dashboard/products/it-maturity/results/${assessmentId}`);

    await expect(page.getByText(DOMAIN_TITLES)).toHaveCount(8);
    await expect(page.getByText('?%')).toHaveCount(0);
  });

  test('scores tier unlocks all 8 domain scores @regression', async ({ page }) => {
    const assessmentId = await seedITMaturityAssessment(testUserId, 'scores');
    await page.goto(`/dashboard/products/it-maturity/results/${assessmentId}`);

    await expect(page.getByText(DOMAIN_TITLES)).toHaveCount(8);
    await expect(page.getByText('?%')).toHaveCount(0);
  });

  test('scores tier does not offer a PDF download @regression', async ({ page }) => {
    const assessmentId = await seedITMaturityAssessment(testUserId, 'scores');
    await page.goto(`/dashboard/products/it-maturity/results/${assessmentId}`);

    await expect(page.getByTestId('itm-overall-score')).toBeVisible();
    await expect(page.getByRole('link', { name: /download pdf/i })).toHaveCount(0);
  });

  test('full tier shows recommendations @regression', async ({ page }) => {
    const assessmentId = await seedITMaturityAssessment(testUserId, 'full');
    await page.goto(`/dashboard/products/it-maturity/results/${assessmentId}`);

    await expect(page.getByRole('heading', { name: /top recommendation/i })).toBeVisible();
  });

  test('full tier offers a PDF download @regression', async ({ page }) => {
    const assessmentId = await seedITMaturityAssessment(testUserId, 'full');
    await page.goto(`/dashboard/products/it-maturity/results/${assessmentId}`);

    await expect(page.getByRole('link', { name: /download pdf/i }).first()).toBeVisible();
  });

  test('results show overall score and maturity level @regression', async ({ page }) => {
    const assessmentId = await seedITMaturityAssessment(testUserId, 'free_launch');
    await page.goto(`/dashboard/products/it-maturity/results/${assessmentId}`);

    await expect(page.getByTestId('itm-overall-score')).toBeVisible();
    await expect(page.getByTestId('itm-maturity-level')).toBeVisible();
  });

  test('DNS Security Check section loads on results page @regression', async ({ page }) => {
    const assessmentId = await seedITMaturityAssessment(testUserId, 'free_launch');
    await page.goto(`/dashboard/products/it-maturity/results/${assessmentId}`);
    const itm = new ITMaturityPage(page);
    // DNS check is async — wait for it to load
    await expect(itm.dnsCheckSection).toBeVisible({ timeout: 12_000 });
  });
});
