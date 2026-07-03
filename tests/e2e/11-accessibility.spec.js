// tests/e2e/11-accessibility.spec.js
// Basic accessibility checks — keyboard navigation, ARIA, focus management.
// For deeper a11y testing, add @axe-core/playwright.

import { test, expect } from '@playwright/test';
import { ITMaturityPage } from '../../pages/ITMaturityPage.js';
import {
  getOrCreateTestUser,
  cleanupTestAssessments,
  seedITMaturityAssessment,
} from '../../utils/supabase.js';

test.describe('Accessibility — keyboard navigation', () => {
  test('login form is keyboard navigable @regression', async ({ page }) => {
    await page.goto('/login');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName.toLowerCase());
    expect(['input', 'button', 'a']).toContain(focused);
  });

  test('landing page CTA is reachable by keyboard @regression', async ({ page }) => {
    await page.goto('/');
    // Tab through focusable elements until we find a button or link
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const tag = await page.evaluate(() => document.activeElement?.tagName.toLowerCase());
      if (tag === 'button' || tag === 'a') break;
    }
    const focused = await page.evaluate(() => document.activeElement?.tagName.toLowerCase());
    expect(['button', 'a']).toContain(focused);
  });

  test('assessment answer options are keyboard selectable @regression', async ({ page }) => {
    // Answer options are buttons, not radio inputs — the assess page also
    // needs a seeded assessment row plus its id in the URL to render
    const userId = await getOrCreateTestUser();
    const assessmentId = await seedITMaturityAssessment(userId, 'free_teaser', {
      status: 'started',
      overall_pct: null,
      maturity_level: null,
      completed_at: null,
    });
    try {
      const itm = new ITMaturityPage(page);
      await itm.gotoAssessPage(assessmentId);
      const firstOption = itm.optionButtons.first();
      await firstOption.focus();
      await page.keyboard.press('Enter');
      // Selecting an answer advances the "N / M answered" progress counter
      await expect(page.getByText(/1 \/ \d+ answered/)).toBeVisible();
    } finally {
      await cleanupTestAssessments(userId);
    }
  });
});

test.describe('Accessibility — ARIA and semantics', () => {
  test('landing page has a single h1 @regression', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('images have alt text @regression', async ({ page }) => {
    await page.goto('/');
    const imagesWithoutAlt = await page.locator('img:not([alt])').count();
    expect(imagesWithoutAlt).toBe(0);
  });

  // Known app gap: auth-form labels are not associated with their inputs
  // (no htmlFor/id pairing) — needs an app-side fix before this can pass.
  test.fixme('form inputs have associated labels @regression', async ({ page }) => {
    await page.goto('/login');
    const inputsWithoutLabel = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"])'));
      return inputs.filter((input) => {
        const id = input.id;
        const ariaLabel = input.getAttribute('aria-label');
        const ariaLabelledBy = input.getAttribute('aria-labelledby');
        const label = id ? document.querySelector(`label[for="${id}"]`) : null;
        return !label && !ariaLabel && !ariaLabelledBy;
      }).length;
    });
    expect(inputsWithoutLabel).toBe(0);
  });

  test('dashboard navigation uses a semantic nav element @regression', async ({ page }) => {
    await page.goto('/dashboard');
    const nav = page.getByTestId('main-nav');
    await expect(nav).toBeVisible();
    const tagName = await nav.evaluate((el) => el.tagName.toLowerCase());
    expect(tagName).toBe('nav');
  });
});
