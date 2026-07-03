// utils/supabase.js
// Admin helpers for setting up and tearing down test data in Supabase.

import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Gets or creates the Playwright test user.
 * Returns the user's UUID.
 */
export async function getOrCreateTestUser(email = process.env.TEST_USER_EMAIL) {
  const supabase = getAdminClient();
  const { data } = await supabase.auth.admin.listUsers();
  let user = data?.users?.find((u) => u.email === email);

  if (!user) {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (error) throw error;
    user = created.user;
  }
  return user.id;
}

/**
 * Seeds a completed AI Readiness assessment in the DB with a given status/tier.
 * Returns the assessment ID.
 */
export async function seedAIAssessment(userId, overrides = {}) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('ai_assessments')
    .insert({
      user_id: userId,
      status: 'completed',
      overall_pct: 72,
      readiness_level: 'AI Ready',
      answers: { q1: 2, q2: 1, q3: 3 },
      recommendations: [
        { title: 'Formalise AI governance policy', priority: 'high' },
        { title: 'Evaluate data pipeline tooling', priority: 'medium' },
        { title: 'Upskill team on prompt engineering', priority: 'low' },
      ],
      completed_at: new Date().toISOString(),
      ...overrides,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Seeds a completed IT Maturity assessment with a given tier.
 */
export async function seedITMaturityAssessment(userId, tier = 'free_teaser', overrides = {}) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('it_maturity_assessments')
    .insert({
      user_id: userId,
      status: 'completed',
      tier,
      overall_pct: 58,
      maturity_level: 'Managed',
      answers: {},
      recommendations: [],
      completed_at: new Date().toISOString(),
      ...overrides,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Ensures a row exists in the users profile table so the dashboard
 * doesn't bounce the user to /onboarding.
 */
export async function ensureUserProfile(userId, fields = {}) {
  const supabase = getAdminClient();
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single();
  if (!existing) {
    const { error } = await supabase.from('users').insert({
      id: userId,
      org_name: 'Playwright Test Org',
      org_size: '1-10',
      ...fields,
    });
    if (error) throw error;
  }
}

/**
 * Deletes all assessments for the test user — call in afterAll / afterEach.
 */
export async function cleanupTestAssessments(userId) {
  const supabase = getAdminClient();
  await supabase.from('ai_assessments').delete().eq('user_id', userId);
  await supabase.from('it_maturity_assessments').delete().eq('user_id', userId);
}

/**
 * Hard-sets the IT Maturity tier for an assessment (simulates a successful Stripe webhook).
 */
export async function setITMaturityTier(assessmentId, tier) {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from('it_maturity_assessments')
    .update({ tier })
    .eq('id', assessmentId);
  if (error) throw error;
}
