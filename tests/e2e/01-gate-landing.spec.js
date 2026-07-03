// tests/e2e/01-gate-landing.spec.js

import { test, expect } from '@playwright/test';
import { GatePage } from '../../pages/GatePage.js';
import { LandingPage } from '../../pages/LandingPage.js';

test.describe('Dev Gate', () => {
  // Gate tests start from a clean slate — no gate cookie, no auth
  test.use({ storageState: { cookies: [], origins: [] } });

  test('correct password redirects to landing @smoke', async ({ page }) => {
    const gate = new GatePage(page);
    await gate.unlock(process.env.GATE_PASSWORD);
    await expect(page).toHaveURL('/');
  });

  test('wrong password shows error @smoke', async ({ page }) => {
    const gate = new GatePage(page);
    await gate.unlock('wrong_password_xyz');
    await expect(gate.errorMessage).toBeVisible();
  });

  // Deliberately triggering the lockout poisons the shared per-IP rate
  // limiter for 15 minutes and breaks every later gate unlock in the run.
  // Run it manually in isolation when needed.
  test.skip('rate limiting — 5 wrong attempts triggers lockout @regression', async ({ page }) => {
    const gate = new GatePage(page);
    await gate.goto();
    for (let i = 0; i < 5; i++) {
      await gate.enterPassword('wrong');
      await gate.submit();
      await expect(gate.errorMessage).toBeVisible();
    }
    await gate.enterPassword('wrong_again');
    await gate.submit();
    await expect(gate.errorMessage).toContainText(/locked|too many|wait/i);
  });
});

test.describe('Landing Page', () => {
  // These run WITH the stored gate cookie from the setup project

  test('page loads with headline @smoke', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    await expect(landing.headline).toBeVisible();
  });

  test('8-domain expandable counter reveals all domains @regression', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    await landing.expandDomains();
    await expect(landing.domainCards).toHaveCount(8);
  });

  test('AI Readiness product card is visible @smoke', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    await expect(landing.aiReadinessCard).toBeVisible();
  });

  test('IT Maturity product card is visible @smoke', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    await expect(landing.itMaturityCard).toBeVisible();
  });

  test('footer links to /terms and /privacy @regression', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    await expect(landing.termsLink).toBeVisible();
    await expect(landing.privacyLink).toBeVisible();
  });

  test('cookie consent banner appears and can be accepted @regression', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    // Clear any stored consent, then reload to trigger the banner
    await page.evaluate(() => localStorage.removeItem('ay_cookie_consent'));
    await page.reload();
    await expect(landing.cookieBanner).toBeVisible();
    await landing.acceptCookies();
    await expect(landing.cookieBanner).not.toBeVisible();
  });

  test('/terms is publicly accessible without gate cookie @smoke', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    await page.goto('/terms');
    await expect(page).toHaveURL('/terms');
    await ctx.close();
  });
});
