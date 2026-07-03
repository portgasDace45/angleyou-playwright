// playwright.config.js
// @ts-check
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['json', { outputFile: 'reports/results.json' }],
    ...(process.env.CI ? [['github']] : []),
  ],

  outputDir: 'reports/artifacts',

  use: {
    baseURL: process.env.BASE_URL || 'https://angleyou.com',

    // Auth state persisted after gate + login
    storageState: 'fixtures/auth-state.json',

    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',

    // Reasonable timeouts for a Vercel Hobby plan (cold starts)
    navigationTimeout: 15_000,
    actionTimeout: 10_000,
  },

  timeout: 45_000,
  expect: { timeout: 8_000 },

  projects: [
    // ── Setup: gate bypass + auth (runs first, not parallel) ──────────────
    {
      name: 'setup',
      testMatch: /.*\.setup\.js/,
      use: { storageState: undefined }, // No stored state yet
    },

    // ── Desktop browsers ──────────────────────────────────────────────────
    // API specs are excluded — they run only in the dedicated 'api' project,
    // otherwise their unauthenticated-401 assertions would run WITH cookies.
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
      testIgnore: /tests[\\/]api[\\/].*/,
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
      testIgnore: /tests[\\/]api[\\/].*/,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
      testIgnore: /tests[\\/]api[\\/].*/,
    },

    // ── Mobile viewports ──────────────────────────────────────────────────
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
      testIgnore: /tests[\\/]api[\\/].*/,
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
      dependencies: ['setup'],
      testIgnore: /tests[\\/]api[\\/].*/,
    },

    // ── API tests — no browser page needed ────────────────────────────────
    // Depends on setup so fixtures/auth-state.json exists for the
    // authenticated API tests (dns-check response shape, etc.)
    {
      name: 'api',
      testMatch: /tests[\\/]api[\\/].*/,
      dependencies: ['setup'],
      use: { storageState: { cookies: [], origins: [] } },
    },
  ],
});
