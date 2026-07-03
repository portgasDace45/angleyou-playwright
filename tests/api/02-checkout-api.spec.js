// tests/api/02-checkout-api.spec.js
// Checkout and webhook API endpoints. Requests carry the gate cookie
// (set in beforeEach) but NO Supabase auth, so routes must return 401.

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ request }) => {
  // Pass the middleware gate so requests reach the routes' own auth checks
  await request.post('/api/gate', { data: { password: process.env.GATE_PASSWORD } });
});

test.describe('POST /api/checkout/ai-readiness', () => {
  test('returns 401 when not authenticated @smoke', async ({ request }) => {
    const res = await request.post('/api/checkout/ai-readiness');
    expect(res.status()).toBe(401);
  });
});

test.describe('POST /api/checkout/it-maturity-scores', () => {
  test('returns 401 when not authenticated @regression', async ({ request }) => {
    const res = await request.post('/api/checkout/it-maturity-scores', {
      data: { assessmentId: 'fake-id' },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe('POST /api/checkout/it-maturity-full', () => {
  test('returns 401 when not authenticated @regression', async ({ request }) => {
    const res = await request.post('/api/checkout/it-maturity-full', {
      data: { assessmentId: 'fake-id' },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe('POST /api/webhooks/stripe', () => {
  test('rejects a request with no Stripe signature @regression', async ({ request }) => {
    const res = await request.post('/api/webhooks/stripe', {
      headers: { 'content-type': 'application/json' },
      data: { type: 'checkout.session.completed' },
    });
    expect(res.status()).toBe(400);
  });

  test('rejects an invalid Stripe signature @regression', async ({ request }) => {
    const res = await request.post('/api/webhooks/stripe', {
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 'invalid_sig',
      },
      data: { type: 'checkout.session.completed' },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe('GET /api/checkout/verify', () => {
  test('returns 400 for missing params @regression', async ({ request }) => {
    // Param validation runs before the auth check in this route
    const res = await request.get('/api/checkout/verify');
    expect(res.status()).toBe(400);
  });

  test('returns 401 for an unauthenticated request with params @regression', async ({ request }) => {
    const res = await request.get(
      '/api/checkout/verify?session_id=fake_session_123&assessment_id=fake-id'
    );
    expect(res.status()).toBe(401);
  });
});
