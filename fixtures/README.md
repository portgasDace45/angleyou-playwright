# fixtures/

This directory holds Playwright auth state JSON files — these are generated
at runtime by global.setup.js and should NEVER be committed to git.

## Files created at runtime:
- auth-state.json       — test user session (gate cookie + Supabase auth)
- admin-auth-state.json — admin user session (only needed for admin tests)

## To regenerate:
  npx playwright test tests/global.setup.js

## To create admin auth state:
  SETUP_AS_ADMIN=true npx playwright test tests/global.setup.js
