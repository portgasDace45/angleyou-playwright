// tests/api/04-email-api.spec.js
// Results email route — auth is checked first, so unauthenticated requests
// get 401. Requests carry the gate cookie (set in beforeEach).

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ request }) => {
  await request.post('/api/gate', { data: { password: process.env.GATE_PASSWORD } });
});

test.describe('POST /api/email/results', () => {
  test('returns 401 when unauthenticated @regression', async ({ request }) => {
    const res = await request.post('/api/email/results', {
      data: { assessmentId: 'fake' },
    });
    expect(res.status()).toBe(401);
  });

  test('returns 401 for a missing payload too — auth is checked first @regression', async ({ request }) => {
    const res = await request.post('/api/email/results', { data: {} });
    expect(res.status()).toBe(401);
  });
});
