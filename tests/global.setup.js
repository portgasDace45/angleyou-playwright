import { test as setup, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { GatePage } from '../pages/GatePage.js';
import { OnboardingPage } from '../pages/OnboardingPage.js';

const AUTH_FILE = path.join(__dirname, '../fixtures/auth-state.json');

setup('authenticate and bypass gate', async ({ page, context, request }) => {
  // ── Step 1: Bypass dev gate ────────────────────────────────────────────
  const gate = new GatePage(page);
  await gate.unlock(process.env.GATE_PASSWORD);
  await page.waitForURL('/', { timeout: 10_000 });

  // ── Step 2: Create / retrieve test user via Supabase Admin ────────────
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
  let testUser = userList?.users?.find(
    (u) => u.email === process.env.TEST_USER_EMAIL
  );

  if (!testUser) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: process.env.TEST_USER_EMAIL,
      email_confirm: true,
      user_metadata: { org_name: 'Playwright Test Org', org_size: '11-50' },
    });
    if (error) throw new Error('Failed to create test user: ' + error.message);
    testUser = data.user;
  }

  // ── Step 2b: Ensure user exists in users table ────────────────────────
  const { data: existingProfile } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', testUser.id)
    .single();

  if (!existingProfile) {
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: testUser.id,
        email: process.env.TEST_USER_EMAIL,
        org_name: 'Playwright Test Org',
        org_size: '11-50',
      });
    if (profileError) throw new Error('Failed to create user profile: ' + profileError.message);
  }

  // ── Step 3: Get OTP token ──────────────────────────────────────────────
  const { data: otpData, error: otpError } =
    await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: process.env.TEST_USER_EMAIL,
    });
  if (otpError) throw new Error('Failed to generate OTP: ' + otpError.message);

  const { access_token, refresh_token } = otpData.properties;

  // ── Step 4: Set session via test API route ────────────────────────────
  await page.goto('/');
  const res = await page.request.post('/api/test-auth', {
    data: { email: process.env.TEST_USER_EMAIL },
  });
  const resBody = await res.json();
  console.log('Test auth status:', res.status());
  console.log('Test auth response:', JSON.stringify(resBody));

  // ── Step 5: Navigate to dashboard to verify auth ──────────────────────
  await page.goto('/dashboard');
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15_000 });

  if (page.url().includes('/onboarding')) {
    const onboarding = new OnboardingPage(page);
    await onboarding.complete({
      orgName: 'Playwright Test Org',
      orgSize: '11-50',
      fullName: 'Playwright Test User',
    });
  }

  // ── Step 6: Save auth state ────────────────────────────────────────────
  await context.storageState({ path: AUTH_FILE });
  console.log('Auth state saved to ' + AUTH_FILE);
});