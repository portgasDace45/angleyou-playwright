// tests/api/03-assessments-api.spec.js
// Assessment API routes — all check Supabase auth FIRST, so unauthenticated
// requests get 401 regardless of payload. Requests carry the gate cookie
// (set in beforeEach) so they reach the routes instead of the gate redirect.

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ request }) => {
  await request.post('/api/gate', { data: { password: process.env.GATE_PASSWORD } });
});

test.describe('POST /api/assessments/complete (AI Readiness)', () => {
  test('returns 401 when unauthenticated @smoke', async ({ request }) => {
    const res = await request.post('/api/assessments/complete', {
      data: { assessmentId: 'fake', answers: {} },
    });
    expect(res.status()).toBe(401);
  });

  test('returns 401 even with a missing assessment ID @regression', async ({ request }) => {
    // Auth is checked before payload validation
    const res = await request.post('/api/assessments/complete', {
      data: { answers: {} },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe('POST /api/assessments/it-maturity/start', () => {
  test('returns 401 when unauthenticated @regression', async ({ request }) => {
    const res = await request.post('/api/assessments/it-maturity/start');
    expect(res.status()).toBe(401);
  });
});

test.describe('POST /api/assessments/it-maturity/complete', () => {
  test('returns 401 when unauthenticated @regression', async ({ request }) => {
    const res = await request.post('/api/assessments/it-maturity/complete', {
      data: { assessmentId: 'fake', answers: {} },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe('POST /api/ai/commentary (legacy AI Readiness route)', () => {
  test('returns 401 when unauthenticated @regression', async ({ request }) => {
    const res = await request.post('/api/ai/commentary', {
      data: { assessmentId: 'fake' },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe('POST /api/ai/it-maturity-commentary (legacy route)', () => {
  test('returns 401 when unauthenticated @regression', async ({ request }) => {
    const res = await request.post('/api/ai/it-maturity-commentary', {
      data: { assessmentId: 'fake' },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe('GET /api/pdf/ai-readiness/[id]', () => {
  test('rejects an unauthenticated request @regression', async ({ request }) => {
    const res = await request.get('/api/pdf/ai-readiness/nonexistent-id');
    expect([401, 403, 404]).toContain(res.status());
  });
});

test.describe('GET /api/pdf/it-maturity/[id]', () => {
  test('rejects an unauthenticated request @regression', async ({ request }) => {
    const res = await request.get('/api/pdf/it-maturity/nonexistent-id');
    expect([401, 403, 404]).toContain(res.status());
  });
});
