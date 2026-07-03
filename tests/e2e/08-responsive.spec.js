// tests/e2e/08-responsive.spec.js
// Mobile layout checks — meaningful only in the mobile-chrome/mobile-safari
// projects (Pixel 5 / iPhone 13 viewports); skipped on desktop viewports.

import { test, expect } from '@playwright/test';

test.skip(
  ({ viewport }) => !viewport || viewport.width > 500,
  'Mobile viewports only'
);

const mobilePages = [
  { name: 'Landing', path: '/' },
  { name: 'Login', path: '/login' },
  { name: 'Signup', path: '/signup' },
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Products', path: '/dashboard/products' },
  { name: 'AI Readiness Product', path: '/dashboard/products/ai-readiness' },
  { name: 'IT Maturity Product', path: '/dashboard/products/it-maturity' },
  { name: 'Terms', path: '/terms' },
  { name: 'Privacy', path: '/privacy' },
];

for (const { name, path } of mobilePages) {
  test(`${name} page has no horizontal scroll on mobile @regression`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll, `${path} has horizontal overflow on mobile`).toBe(false);
  });
}

test('Landing page hero is readable on mobile @regression', async ({ page }) => {
  await page.goto('/');
  const h1 = page.getByRole('heading', { level: 1 });
  await expect(h1).toBeVisible();
  const box = await h1.boundingBox();
  // Headline must have meaningful width (not clipped off-screen)
  expect(box?.width).toBeGreaterThan(200);
});

test('Dashboard nav links are visible on mobile @regression', async ({ page }) => {
  await page.goto('/dashboard');
  const nav = page.getByTestId('main-nav');
  await expect(nav).toBeVisible();
  // The app has no hamburger menu — nav links must remain visible on mobile
  await expect(nav.getByRole('link', { name: 'Products' })).toBeVisible();
});

test('Product cards stack vertically on mobile @regression', async ({ page }) => {
  await page.goto('/dashboard/products');
  const aiCard = page.getByTestId('product-ai-readiness');
  const itmCard = page.getByTestId('product-it-maturity');
  await expect(aiCard).toBeVisible();
  await expect(itmCard).toBeVisible();

  const box1 = await aiCard.boundingBox();
  const box2 = await itmCard.boundingBox();

  // On a phone viewport the second card must sit BELOW the first
  expect(box2.y).toBeGreaterThan(box1.y + box1.height - 1);
});
