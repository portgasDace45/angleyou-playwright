// tests/e2e/03-dashboard.spec.js
// Runs with the shared authenticated storage state from setup.

import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../pages/DashboardPage.js';

test.describe('Dashboard home', () => {
  test('loads with greeting @smoke', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await expect(page).toHaveURL('/dashboard');
    await expect(dashboard.greeting).toBeVisible();
  });

  test('shows both assessment cards @smoke', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await expect(dashboard.aiReadinessSummaryCard).toBeVisible();
    await expect(dashboard.itMaturitySummaryCard).toBeVisible();
  });

  test('nav is visible @smoke', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await expect(dashboard.nav).toBeVisible();
  });

  test('Products nav link navigates to the catalogue @smoke', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await dashboard.navigateToProducts();
    await expect(page).toHaveURL('/dashboard/products');
  });
});

test.describe('Products catalogue', () => {
  test('AI Readiness product card is visible with CTA @smoke', async ({ page }) => {
    await page.goto('/dashboard/products');
    await expect(page.getByTestId('product-ai-readiness')).toBeVisible();
    await expect(page.getByTestId('ai-readiness-cta')).toBeVisible();
  });

  test('IT Maturity product card is visible with CTA @smoke', async ({ page }) => {
    await page.goto('/dashboard/products');
    await expect(page.getByTestId('product-it-maturity')).toBeVisible();
    await expect(page.getByTestId('it-maturity-cta')).toBeVisible();
  });

  test('AI Readiness card shows launch or full price @regression', async ({ page }) => {
    await page.goto('/dashboard/products');
    const price = page.getByTestId('product-ai-readiness').getByText(/\$(49|99)/).first();
    await expect(price).toBeVisible();
  });
});
