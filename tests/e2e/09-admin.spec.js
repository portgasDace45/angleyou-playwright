// tests/e2e/09-admin.spec.js
// Admin page tests. The shared test user is a non-admin (redirect check).
// Admin-specific tests require a separate admin auth state file.

import { test, expect } from '@playwright/test';
import { AdminPage } from '../../pages/AdminPage.js';

test.describe('Admin page — non-admin access', () => {
  test('non-admin is redirected to /dashboard @smoke', async ({ page }) => {
    await page.goto('/dashboard/admin');
    await expect(page).toHaveURL('/dashboard', { timeout: 8_000 });
  });
});

// Admin-specific tests — only run when ADMIN_AUTH_FILE is set.
// Create a separate admin auth state by running the setup with the admin email.
test.describe('Admin page — admin access', () => {
  test.use({
    storageState: process.env.ADMIN_AUTH_FILE || 'fixtures/admin-auth-state.json',
  });

  test.skip(
    !process.env.ADMIN_AUTH_FILE && !process.env.RUN_ADMIN_TESTS,
    'Set ADMIN_AUTH_FILE or RUN_ADMIN_TESTS=true to run admin tests'
  );

  test('admin page loads with the assessments table @regression', async ({ page }) => {
    const admin = new AdminPage(page);
    await admin.goto();
    await expect(page).toHaveURL('/dashboard/admin');
    await expect(admin.assessmentsTable).toBeVisible();
  });

  test('total submissions stat is displayed @regression', async ({ page }) => {
    const admin = new AdminPage(page);
    await admin.goto();
    await expect(admin.totalSubmissions).toBeVisible();
    const text = await admin.totalSubmissions.textContent();
    expect(text).toMatch(/\d+/);
  });

  test('revenue stat card is displayed @regression', async ({ page }) => {
    const admin = new AdminPage(page);
    await admin.goto();
    await expect(admin.revenueEstimate).toBeVisible();
    const revText = await admin.revenueEstimate.textContent();
    expect(revText).toMatch(/\d+/);
  });

  test('table rows have View links @regression', async ({ page }) => {
    const admin = new AdminPage(page);
    await admin.goto();
    const rowCount = await admin.getRowCount();
    test.skip(rowCount === 0, 'No assessment rows to check');
    await expect(admin.viewLinks.first()).toBeVisible();
  });
});
