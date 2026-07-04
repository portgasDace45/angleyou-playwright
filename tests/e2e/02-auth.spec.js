// tests/e2e/02-auth.spec.js

import { test, expect } from '@playwright/test';
import { AuthPage } from '../../pages/AuthPage.js';
import { GatePage } from '../../pages/GatePage.js';
import { DashboardPage } from '../../pages/DashboardPage.js';
import { getOrCreateTestUser, ensureUserProfile } from '../../utils/supabase.js';

async function passGate(page) {
  const gate = new GatePage(page);
  await gate.unlock(process.env.GATE_PASSWORD);
  await page.waitForURL('/', { timeout: 10_000 });
}

test.describe('Auth — Login page', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await passGate(page);
  });

  test('renders login form @smoke', async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoLogin();
    await expect(auth.emailInput).toBeVisible();
    await expect(auth.submitButton).toBeVisible();
  });

  // OTP submission is a regression test, not smoke — it depends on Supabase
  // not having been rate-limited (setup generates a link for the same email).
  test('submitting valid email results in OTP step or rate-limit feedback @regression', async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoLogin();
    await auth.submitEmail(process.env.TEST_USER_EMAIL);
    // Either the OTP step appeared, or Supabase rate-limited the request.
    // Both prove the form submission worked end-to-end.
    await expect(auth.successMessage.or(auth.errorMessage)).toBeVisible({ timeout: 10_000 });
  });

  test('invalid email is blocked by native validation @regression', async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoLogin();
    await auth.enterEmail('not-an-email');
    // type="email" validation marks the input invalid client-side
    await expect(page.locator('input:invalid')).toHaveCount(1);
  });

  test('email input is required @regression', async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoLogin();
    await expect(auth.emailInput).toHaveAttribute('required', '');
  });
});

test.describe('Auth — Signup page', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await passGate(page);
  });

  test('renders signup form @smoke', async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoSignup();
    await expect(auth.emailInput).toBeVisible();
  });

  test('existing email is directed to log in instead @regression', async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoSignup();
    await auth.submitEmail(process.env.TEST_USER_EMAIL);
    // The signup page probes for an existing account and shows a
    // "You already have an account" panel instead of sending a signup code
    await expect(page.getByText(/already have an account/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe('Auth — Protected routes redirect unauthenticated users', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await passGate(page);
  });

  for (const route of ['/dashboard', '/onboarding', '/dashboard/products']) {
    test(`${route} redirects to /login @smoke`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await expect(page).toHaveURL(/\/(login|gate)/, { timeout: 10_000 });
    });
  }
});

test.describe('Auth — Sign out', () => {
  // Signing out revokes the Supabase session globally, so this test uses a
  // DEDICATED user — never the shared test user whose session every other
  // authenticated test depends on.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('sign out redirects to /login @smoke', async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL.replace('@', '+signout@');
    const userId = await getOrCreateTestUser(email);
    await ensureUserProfile(userId, { email, org_name: 'Signout Test Org' });

    await passGate(page);
    // Mint a session for the dedicated user (staging-only route)
    const res = await page.request.post('/api/test-auth', { data: { email } });
    expect(res.ok()).toBe(true);

    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await page.waitForURL('/dashboard', { timeout: 10_000 });
    await dashboard.signOut();
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });
});
