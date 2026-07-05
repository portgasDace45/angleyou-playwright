// tests/e2e/07-onboarding.spec.js
// Onboarding form tests. Submission tests use DEDICATED users (via the
// staging-only /api/test-auth route) because completing onboarding rewrites
// the logged-in user's profile — doing that to the shared test user would
// flip its account_type mid-run and break other tests.

import { test, expect } from '@playwright/test';
import { OnboardingPage } from '../../pages/OnboardingPage.js';
import { GatePage } from '../../pages/GatePage.js';
import { getOrCreateTestUser } from '../../utils/supabase.js';

test.describe('Onboarding — form rendering (shared user)', () => {
  test('onboarding page renders required fields for Single Company (default) @smoke', async ({ page }) => {
    // Single Company is the default account type — size, industry, and domain are all shown.
    // MSP mode hides size and industry; tested separately in the submission tests.
    const onboarding = new OnboardingPage(page);
    await onboarding.goto();
    await expect(onboarding.orgNameInput).toBeVisible();
    await expect(onboarding.orgSizeSelect).toBeVisible();
    await expect(onboarding.domainInput).toBeVisible();
    await expect(onboarding.continueButton).toBeVisible();
  });

  test('requires org name to submit @regression', async ({ page }) => {
    const onboarding = new OnboardingPage(page);
    await onboarding.goto();
    // Leave required fields empty — native validation blocks submission
    await onboarding.orgSizeSelect.selectOption('11-50');
    await onboarding.continueButton.click();
    await expect(page).toHaveURL('/onboarding');
  });
});

test.describe('Onboarding — submission (dedicated users)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  async function loginAsDedicatedUser(page, alias) {
    const email = process.env.TEST_USER_EMAIL.replace('@', `+${alias}@`);
    await getOrCreateTestUser(email);
    const gate = new GatePage(page);
    await gate.unlock(process.env.GATE_PASSWORD);
    await page.waitForURL('/', { timeout: 10_000 });
    const res = await page.request.post('/api/test-auth', { data: { email } });
    expect(res.ok()).toBe(true);
  }

  test('single account type completes and redirects to dashboard @regression', async ({ page }) => {
    await loginAsDedicatedUser(page, 'onboard-single');
    const onboarding = new OnboardingPage(page);
    await onboarding.goto();
    await onboarding.complete({
      orgName: 'Playwright Test Org',
      orgSize: '11-50',
      accountType: 'single',
    });
    await expect(page).toHaveURL('/dashboard');
  });

  test('MSP account type completes and redirects to client management @regression', async ({ page }) => {
    await loginAsDedicatedUser(page, 'onboard-msp');
    const onboarding = new OnboardingPage(page);
    await onboarding.goto();
    await onboarding.complete({
      orgName: 'MSP Test Org',
      accountType: 'msp',
      // orgSize/industry intentionally omitted — hidden for MSP accounts
    });
    // MSP redirects to /dashboard/msp/clients, not /dashboard
    await expect(page).toHaveURL('/dashboard/msp/clients');
  });

  test('optional domain field is accepted @regression', async ({ page }) => {
    await loginAsDedicatedUser(page, 'onboard-domain');
    const onboarding = new OnboardingPage(page);
    await onboarding.goto();
    await onboarding.complete({
      orgName: 'Domain Test Org',
      orgSize: '1-10',
      domain: 'example.com',
      accountType: 'single',
    });
    await expect(page).toHaveURL('/dashboard');
  });
});
