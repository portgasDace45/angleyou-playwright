// tests/api/01-gate-api.spec.js
// Pure API tests — no browser page required. Runs in the 'api' project
// with an empty storage state (no gate cookie, no auth) unless stated.

import { test, expect } from '@playwright/test';

test.describe('POST /api/gate', () => {
  test('returns 200 with ok body for correct password @smoke', async ({ request }) => {
    const res = await request.post('/api/gate', {
      data: { password: process.env.GATE_PASSWORD },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test('returns 401 with wrong password @smoke', async ({ request }) => {
    const res = await request.post('/api/gate', {
      data: { password: 'definitely_wrong_password' },
    });
    expect(res.status()).toBe(401);
  });

  test('returns 401 with missing password body @regression', async ({ request }) => {
    const res = await request.post('/api/gate', { data: {} });
    expect(res.status()).toBe(401);
  });

  test('sets httpOnly gate cookie on success @regression', async ({ request }) => {
    const res = await request.post('/api/gate', {
      data: { password: process.env.GATE_PASSWORD },
    });
    const setCookie = res.headers()['set-cookie'] || '';
    expect(setCookie).toMatch(/_gate/);
    expect(setCookie).toMatch(/httponly/i);
  });
});

test.describe('GET /api/keepalive', () => {
  test('returns 401 without auth header @regression', async ({ request }) => {
    const res = await request.get('/api/keepalive');
    expect(res.status()).toBe(401);
  });

  test('returns 200 for valid cron secret @regression', async ({ request }) => {
    test.skip(!process.env.CRON_SECRET, 'CRON_SECRET not set in test env');
    const res = await request.get('/api/keepalive', {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    expect(res.status()).toBe(200);
  });
});

test.describe('GET /api/dns-check — unauthenticated', () => {
  test.beforeEach(async ({ request }) => {
    // The middleware gates this route — pass the gate so we reach the
    // route's own auth check instead of a redirect to /gate
    await request.post('/api/gate', { data: { password: process.env.GATE_PASSWORD } });
  });

  test('returns 401 without a logged-in user @regression', async ({ request }) => {
    const res = await request.get('/api/dns-check?domain=google.com');
    expect(res.status()).toBe(401);
  });
});

test.describe('GET /api/dns-check — authenticated', () => {
  // Reuse the setup project's auth state (gate + Supabase session cookies)
  test.use({ storageState: 'fixtures/auth-state.json' });

  test('returns structured DNS results for a known domain @smoke', async ({ request }) => {
    const res = await request.get('/api/dns-check?domain=google.com');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('domain', 'google.com');
    expect(body).toHaveProperty('score');
    expect(body).toHaveProperty('summary');
    expect(body).toHaveProperty('checks.spf');
    expect(body).toHaveProperty('checks.dmarc');
    expect(body).toHaveProperty('checks.dkim');
    expect(typeof body.score).toBe('number');
    expect(body.score).toBeGreaterThanOrEqual(0);
    expect(body.score).toBeLessThanOrEqual(100);
  });

  test('google.com passes SPF and DMARC @regression', async ({ request }) => {
    const res = await request.get('/api/dns-check?domain=google.com');
    const body = await res.json();
    expect(body.checks.spf.pass).toBe(true);
    expect(body.checks.dmarc.pass).toBe(true);
  });

  test('returns score 0 for a nonexistent domain @regression', async ({ request }) => {
    const res = await request.get('/api/dns-check?domain=nonexistent-domain-xyz-playwright.com');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.score).toBe(0);
  });

  test('rejects an invalid domain format @regression', async ({ request }) => {
    const res = await request.get('/api/dns-check?domain=not-a-domain');
    expect(res.status()).toBe(400);
  });
});
