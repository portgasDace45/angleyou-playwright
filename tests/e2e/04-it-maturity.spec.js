// tests/e2e/04-it-maturity.spec.js
// IT Maturity freemium flow end-to-end without touching Stripe.
//
// Serial mode + per-ID cleanup prevents the cleanup from one test deleting
// another test's seeded assessment while both run in parallel workers.

import { test, expect } from '@playwright/test';
import { ITMaturityPage } from '../../pages/ITMaturityPage.js';
import {
  getOrCreateTestUser,
  seedITMaturityAssessment,
  deleteITMAssessmentById,
} from '../../utils/supabase.js';

// Serial mode: tests in this file run one-at-a-time in a single worker,
// preventing within-file cleanup races.
test.describe.configure({ mode: 'serial' });

let testUserId;

const DOMAIN_TITLES =
  /^(Security|Infrastructure|Operations|Cloud & Connectivity|Data Management|Business Continuity|IT Governance|End User Computing)$/;

function seedStarted() {
  return seedITMaturityAssessment(testUserId, 'free_teaser', {
    status: 'started',
    overall_pct: null,
    maturity_level: null,
    completed_at: null,
  });
}

test.beforeAll(async () => {
  testUserId = await getOrCreateTestUser();
});

// ── Product page ──────────────────────────────────────────────────────────────

test('IT Maturity product detail page loads with start button @smoke', async ({ page }) => {
  const itm = new ITMaturityPage(page);
  await itm.gotoProductPage();
  await expect(itm.startFreeButton).toBeVisible();
});

// ── Assessment flow ───────────────────────────────────────────────────────────

test('completing the free assessment reaches results @regression', { timeout: 90_000 }, async ({ page }) => {
  const assessmentId = await seedStarted();
  try {
    const itm = new ITMaturityPage(page);
    await itm.gotoAssessPage(assessmentId);
    await itm.answerAllQuestions('first');
    await itm.waitForResults();
    await expect(page).toHaveURL(/\/results\//);
  } finally {
    // Cleanup the result row (may have a new ID after completion redirected)
    await deleteITMAssessmentById(assessmentId);
  }
});

test('progress advances as questions are answered @regression', async ({ page }) => {
  const assessmentId = await seedStarted();
  try {
    const itm = new ITMaturityPage(page);
    await itm.gotoAssessPage(assessmentId);

    const progressText = page.getByText(/\d+ \/ \d+ answered/);
    await expect(progressText).toBeVisible();
    const initial = Number((await progressText.textContent()).match(/^(\d+)/)[1]);

    await itm.answerCurrentSection('first');

    const later = Number((await progressText.textContent()).match(/^(\d+)/)[1]);
    expect(later).toBeGreaterThan(initial);
  } finally {
    await deleteITMAssessmentById(assessmentId);
  }
});

// ── Results tiers ─────────────────────────────────────────────────────────────

test('free_teaser shows 3 free domain chips and locks 5 @regression', async ({ page }) => {
  const id = await seedITMaturityAssessment(testUserId, 'free_teaser');
  try {
    await page.goto(`/dashboard/products/it-maturity/results/${id}`);
    await expect(page.getByText('FREE', { exact: true })).toHaveCount(3);
    await expect(page.getByText('?%')).toHaveCount(5);
  } finally {
    await deleteITMAssessmentById(id);
  }
});

test('free_teaser shows the scores upgrade CTA @regression', async ({ page }) => {
  const id = await seedITMaturityAssessment(testUserId, 'free_teaser');
  try {
    await page.goto(`/dashboard/products/it-maturity/results/${id}`);
    const itm = new ITMaturityPage(page);
    await expect(itm.upgradeToScoresButton).toBeVisible();
  } finally {
    await deleteITMAssessmentById(id);
  }
});

test('free_launch shows all 8 domain scores @regression', async ({ page }) => {
  const id = await seedITMaturityAssessment(testUserId, 'free_launch');
  try {
    await page.goto(`/dashboard/products/it-maturity/results/${id}`);
    await expect(page.getByText(DOMAIN_TITLES)).toHaveCount(8);
    await expect(page.getByText('?%')).toHaveCount(0);
  } finally {
    await deleteITMAssessmentById(id);
  }
});

test('scores tier unlocks all 8 domain scores @regression', async ({ page }) => {
  const id = await seedITMaturityAssessment(testUserId, 'scores');
  try {
    await page.goto(`/dashboard/products/it-maturity/results/${id}`);
    await expect(page.getByText(DOMAIN_TITLES)).toHaveCount(8);
    await expect(page.getByText('?%')).toHaveCount(0);
  } finally {
    await deleteITMAssessmentById(id);
  }
});

test('scores tier does not offer a PDF download @regression', async ({ page }) => {
  const id = await seedITMaturityAssessment(testUserId, 'scores');
  try {
    await page.goto(`/dashboard/products/it-maturity/results/${id}`);
    await expect(page.getByTestId('itm-overall-score')).toBeVisible();
    await expect(page.getByRole('link', { name: /download pdf/i })).toHaveCount(0);
  } finally {
    await deleteITMAssessmentById(id);
  }
});

test('full tier shows the improvement pathway @regression', async ({ page }) => {
  // "Top Recommendations" heading requires computeResults() to return non-empty
  // recommendations, which only happens with real answer data. The Improvement
  // Pathway is always generated for the full tier regardless of answer data —
  // this is the primary value-add users see after upgrading.
  const id = await seedITMaturityAssessment(testUserId, 'full');
  try {
    await page.goto(`/dashboard/products/it-maturity/results/${id}`);
    await expect(
      page.getByRole('heading', { name: 'Your IT Maturity Improvement Pathway' })
    ).toBeVisible();
  } finally {
    await deleteITMAssessmentById(id);
  }
});

test('full tier offers a PDF download @regression', async ({ page }) => {
  const id = await seedITMaturityAssessment(testUserId, 'full');
  try {
    await page.goto(`/dashboard/products/it-maturity/results/${id}`);
    await expect(page.getByRole('link', { name: /download pdf/i }).first()).toBeVisible();
  } finally {
    await deleteITMAssessmentById(id);
  }
});

test('results show overall score and maturity level @regression', async ({ page }) => {
  const id = await seedITMaturityAssessment(testUserId, 'free_launch');
  try {
    await page.goto(`/dashboard/products/it-maturity/results/${id}`);
    await expect(page.getByTestId('itm-overall-score')).toBeVisible();
    await expect(page.getByTestId('itm-maturity-level')).toBeVisible();
  } finally {
    await deleteITMAssessmentById(id);
  }
});

test('DNS Security Check section loads on results page @regression', async ({ page }) => {
  const id = await seedITMaturityAssessment(testUserId, 'free_launch');
  try {
    await page.goto(`/dashboard/products/it-maturity/results/${id}`);
    const itm = new ITMaturityPage(page);
    await expect(itm.dnsCheckSection).toBeVisible({ timeout: 12_000 });
  } finally {
    await deleteITMAssessmentById(id);
  }
});
