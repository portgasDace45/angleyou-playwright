// tests/api/02-checkout-api.spec.js
// Checkout and webhook API endpoints. Requests carry the gate cookie
// (set in beforeEach) but NO Supabase auth, so routes must return 401.
//
// Note on 503: all three checkout routes and /api/checkout/verify return 503
// if STRIPE_SECRET_KEY is not set — that check runs before auth/param validation.
// The webhook route additionally returns 503 if STRIPE_WEBHOOK_SECRET is not set.
// Tests that assert 401/400 implicitly require Stripe to be configured; they are
// skipped when STRIPE_TEST_CARD is absent (a reliable proxy for "Stripe env vars
// not present in this environment").

import { test, expect } from '@playwright/test';

const stripeConfigured = !!process.env.STRIPE_TEST_CARD;

test.beforeEach(async ({ request }) => {
  // Pass the middleware gate so requests reach the routes' own auth checks
  await request.post('/api/gate', { data: { password: process.env.GATE_PASSWORD } });
});

test.describe('POST /api/checkout/ai-readiness', () => {
  test('returns 401 when not authenticated @smoke', async ({ request }) => {
    test.skip(!stripeConfigured, 'Stripe not configured — route returns 503 before auth check');
    const res = await request.post('/api/checkout/ai-readiness');
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  test('returns 503 when Stripe is not configured @regression', async ({ request }) => {
    test.skip(stripeConfigured, 'Stripe is configured in this env');
    const res = await request.post('/api/checkout/ai-readiness');
    expect(res.status()).toBe(503);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });
});

test.describe('POST /api/checkout/it-maturity-scores', () => {
  test('returns 401 when not authenticated @regression', async ({ request }) => {
    test.skip(!stripeConfigured, 'Stripe not configured — route returns 503 before auth check');
    const res = await request.post('/api/checkout/it-maturity-scores', {
      data: { assessmentId: 'fake-id' },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });
});

test.describe('POST /api/checkout/it-maturity-full', () => {
  test('returns 401 when not authenticated @regression', async ({ request }) => {
    test.skip(!stripeConfigured, 'Stripe not configured — route returns 503 before auth check');
    const res = await request.post('/api/checkout/it-maturity-full', {
      data: { assessmentId: 'fake-id' },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });
});

test.describe('POST /api/webhooks/stripe', () => {
  // The webhook route returns 503 if STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET is
  // not set, before it can reach the signature check. Both must be present for the
  // 400 tests below to be meaningful.
  const webhookReachable = stripeConfigured;

  test('rejects a request with no Stripe signature @regression', async ({ request }) => {
    test.skip(!webhookReachable, 'Stripe not configured — route returns 503 before signature check');
    const res = await request.post('/api/webhooks/stripe', {
      headers: { 'content-type': 'application/json' },
      data: { type: 'checkout.session.completed' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  test('rejects an invalid Stripe signature @regression', async ({ request }) => {
    test.skip(!webhookReachable, 'Stripe not configured — route returns 503 before signature check');
    const res = await request.post('/api/webhooks/stripe', {
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 'invalid_sig',
      },
      data: { type: 'checkout.session.completed' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  test('returns 200 for an unrecognised event type (Stripe expects 200 for all received events) @regression', async ({ request }) => {
    // Without a valid signature we cannot reach the event-dispatch logic, so this
    // test only applies when the webhook secret is present and usable. It is listed
    // here as documentation of the expected behaviour; gated behind the same flag.
    test.skip(!webhookReachable, 'Stripe not configured');
    // A missing signature produces 400 — the 200 fall-through for unknown event
    // types can only be fully tested with a valid signed payload (out of scope for
    // this API suite). The webhook route's final `return { received: true }` is
    // covered by the Stripe end-to-end test in 06-stripe-checkout.spec.js.
    test.fixme(true, 'Requires a valid Stripe-signed payload — covered by e2e checkout flow');
  });
});

test.describe('GET /api/checkout/verify', () => {
  test('returns 400 for missing params @regression', async ({ request }) => {
    // Param validation runs before the auth check in this route, but the Stripe
    // guard runs first — skip if Stripe is not configured.
    test.skip(!stripeConfigured, 'Stripe not configured — route returns 503 before param check');
    const res = await request.get('/api/checkout/verify');
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ error: 'Missing parameters' });
  });

  test('returns 401 for an unauthenticated request with params @regression', async ({ request }) => {
    test.skip(!stripeConfigured, 'Stripe not configured — route returns 503 before auth check');
    const res = await request.get(
      '/api/checkout/verify?session_id=fake_session_123&assessment_id=fake-id'
    );
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });
});
