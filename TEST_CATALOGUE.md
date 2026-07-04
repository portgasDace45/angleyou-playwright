# AngleYou Playwright — Test Catalogue

132 tests across 16 spec files. Every test is tagged `@smoke` or `@regression`.

**Smoke** — happy path, no DB seeding, fast (<60 s). Run on every PR.  
**Regression** — edge cases, error states, DB-seeded scenarios. Run before deploying.

---

## Summary

| Tag | Count |
|---|---|
| @smoke | 27 |
| @regression | 97 |
| Skipped / fixme | 8 |
| **Total** | **132** |

---

## E2E Tests

### `tests/e2e/01-gate-landing.spec.js` — Dev gate & landing page

| Tag | Test |
|---|---|
| @smoke | Correct password redirects to landing |
| @smoke | Wrong password shows error |
| @smoke | Landing page loads with headline |
| @smoke | AI Readiness product card is visible |
| @smoke | IT Maturity product card is visible |
| @smoke | /terms is publicly accessible without gate cookie |
| @regression | 8-domain expandable counter reveals all domains |
| @regression | Footer links to /terms and /privacy |
| @regression | Cookie consent banner appears and can be accepted |
| skip | Rate limiting — 5 wrong attempts triggers lockout *(manual only — poisons shared IP limiter for 15 min)* |

---

### `tests/e2e/02-auth.spec.js` — Authentication

Covers login, signup, route guards, and sign out. Unauthenticated tests use `storageState: { cookies: [], origins: [] }` and run their own gate bypass in `beforeEach`. The sign-out test uses a dedicated user alias so it never revokes the shared test-user session.

| Tag | Test |
|---|---|
| @smoke | Renders login form |
| @smoke | Renders signup form |
| @smoke | /dashboard redirects to /login (unauthenticated) |
| @smoke | /onboarding redirects to /login (unauthenticated) |
| @smoke | /dashboard/products redirects to /login (unauthenticated) |
| @smoke | Sign out redirects to /login |
| @regression | Submitting valid email results in OTP step or rate-limit feedback |
| @regression | Invalid email is blocked by native validation |
| @regression | Email input is required |
| @regression | Existing email is directed to log in instead |

---

### `tests/e2e/03-dashboard.spec.js` — Dashboard home & products catalogue

Runs with the shared authenticated storage state. No DB seeding.

| Tag | Test |
|---|---|
| @smoke | Dashboard loads with greeting |
| @smoke | Shows both assessment cards |
| @smoke | Nav is visible |
| @smoke | Products nav link navigates to the catalogue |
| @smoke | AI Readiness product card is visible with CTA |
| @smoke | IT Maturity product card is visible with CTA |
| @regression | AI Readiness card shows launch or full price ($49 / $99) |

---

### `tests/e2e/04-it-maturity.spec.js` — IT Maturity product, assessment flow & result tiers

Serial mode + per-ID cleanup (`deleteITMAssessmentById`) prevents cleanup from one test deleting another test's seeded row during parallel execution.

| Tag | Test |
|---|---|
| @smoke | Product detail page loads with start button |
| @regression | Completing the free assessment reaches results |
| @regression | Progress advances as questions are answered |
| @regression | free_teaser shows 3 free domain chips and locks 5 |
| @regression | free_teaser shows the scores upgrade CTA |
| @regression | free_launch shows all 8 domain scores |
| @regression | scores tier unlocks all 8 domain scores |
| @regression | scores tier does not offer a PDF download |
| @regression | full tier shows the improvement pathway |
| @regression | full tier offers a PDF download |
| @regression | Results show overall score and maturity level |
| @regression | DNS Security Check section loads on results page |

---

### `tests/e2e/05-ai-readiness.spec.js` — AI Readiness product, access control & results

The assess page verifies payment against a real Stripe session — DB-seeded `paid` rows cannot unlock it. The full assess flow is covered by `06-stripe-checkout.spec.js`.

| Tag | Test |
|---|---|
| @smoke | Product detail page loads with purchase button |
| @regression | Price shown is $49 or $99 |
| @regression | Assess page without a paid session shows error, not questions |
| @regression | Another user cannot access a different user's results page |
| @regression | Results show the score ring |
| @regression | Results show the readiness level badge |
| @regression | Results show recommendations |
| @regression | Domain breakdown bars render for each of the 5 sections |
| @regression | PDF download button is visible |
| @regression | PDF endpoint returns a PDF content-type |
| @regression | AI commentary section renders and finishes loading |
| fixme | Assess page loads with questions *(needs real Stripe session — covered by 06-stripe-checkout)* |

---

### `tests/e2e/06-stripe-checkout.spec.js` — Stripe checkout

Entire file skips unless `STRIPE_TEST_CARD` is set. Card-filling tests additionally require `STRIPE_FILL_CHECKOUT=true` because Stripe's hosted checkout DOM changes frequently.

| Tag | Test |
|---|---|
| @regression | AI Readiness purchase button initiates Stripe checkout redirect |
| @regression | IT Maturity upgrade to scores initiates Stripe checkout redirect |
| skip | Successful test payment redirects to assessment *(requires `STRIPE_FILL_CHECKOUT=true`)* |
| skip | Declined card shows error in Stripe checkout *(requires `STRIPE_FILL_CHECKOUT=true`)* |

---

### `tests/e2e/07-onboarding.spec.js` — Onboarding form

Submission tests use dedicated user aliases (not the shared test user) so completing onboarding never overwrites the shared user's profile mid-run.

| Tag | Test |
|---|---|
| @smoke | Onboarding page renders all fields |
| @regression | Requires org name to submit |
| @regression | Single account type completes and redirects to dashboard |
| @regression | MSP account type completes and redirects to dashboard |
| @regression | Optional domain field is accepted |

---

### `tests/e2e/08-responsive.spec.js` — Mobile layout

All tests skip automatically on desktop viewports (`viewport.width > 500`). Meaningful only when run under `--project=mobile-chrome` or `--project=mobile-safari`.

| Tag | Test |
|---|---|
| @regression | 9 pages have no horizontal scroll on mobile *(Landing, Login, Signup, Dashboard, Products, AI Readiness, IT Maturity, Terms, Privacy)* |
| @regression | Landing page hero is readable on mobile (width > 200px) |
| @regression | Dashboard nav links are visible on mobile |
| @regression | Product cards stack vertically on mobile |

---

### `tests/e2e/09-admin.spec.js` — Admin page

Non-admin redirect test runs with the shared user. Admin-specific tests are gated behind `ADMIN_AUTH_FILE` or `RUN_ADMIN_TESTS=true`.

| Tag | Test |
|---|---|
| @smoke | Non-admin is redirected to /dashboard |
| skip | Admin page loads with assessments table *(requires `ADMIN_AUTH_FILE` or `RUN_ADMIN_TESTS=true`)* |
| skip | Total submissions stat is displayed *(same gate)* |
| skip | Revenue stat card is displayed *(same gate)* |
| skip | Table rows have View links *(same gate)* |

---

### `tests/e2e/10-it-maturity-upgrade.spec.js` — IT Maturity tier upgrades

Uses `setITMaturityTier()` to simulate Stripe webhooks directly in the DB, then reloads the results page to verify UI state changes.

| Tag | Test |
|---|---|
| @regression | free_teaser → scores unlocks all 8 domain scores |
| @regression | scores → full unlocks the improvement pathway |
| @regression | scores → full unlocks AI commentary and PDF |
| @regression | Upgrade to scores CTA redirects to Stripe checkout |
| @regression | Upgrade to full CTA is shown on scores tier |
| @regression | free_launch shows everything unlocked with only the full-report upsell |

---

### `tests/e2e/11-accessibility.spec.js` — Accessibility

| Tag | Test |
|---|---|
| @regression | Login form is keyboard navigable |
| @regression | Landing page CTA is reachable by keyboard |
| @regression | Assessment answer options are keyboard selectable |
| @regression | Landing page has a single h1 |
| @regression | Images have alt text |
| @regression | Dashboard navigation uses a semantic nav element |
| fixme | Form inputs have associated labels *(known app gap — inputs lack htmlFor/id pairing)* |

---

### `tests/e2e/12-performance.spec.js` — Performance

| Tag | Test |
|---|---|
| @regression | Landing page loads within 8000ms |
| @regression | Login page loads within 8000ms |
| @regression | Dashboard page loads within 8000ms |
| @regression | Products page loads within 8000ms |
| @regression | Landing page has no console errors |
| @regression | Dashboard has no console errors |
| @regression | No broken internal links on landing page |

---

## Visual Tests

### `tests/visual/01-visual-regression.spec.js` — Visual snapshots

Chromium only. Baselines stored in `tests/visual/01-visual-regression.spec.js-snapshots/`. Run `--update-snapshots` after any intentional UI change. Dashboard, products, and IT Maturity product pages are excluded because their content varies with the shared test user's assessment history, making baselines unstable across runs.

| Tag | Test |
|---|---|
| @regression | landing page visual snapshot |
| @regression | ai-readiness-product page visual snapshot |
| @regression | terms page visual snapshot |
| @regression | privacy page visual snapshot |
| skip | Results page score ring renders correctly *(requires `FIXTURE_ASSESSMENT_ID`)* |

---

## API Tests

### `tests/api/01-gate-api.spec.js` — Gate & DNS check endpoints

| Tag | Test |
|---|---|
| @smoke | POST /api/gate — returns 200 with correct password |
| @smoke | POST /api/gate — returns 401 with wrong password |
| @smoke | GET /api/dns-check — returns structured DNS results for google.com |
| @regression | POST /api/gate — returns 401 for missing password body |
| @regression | POST /api/gate — sets httpOnly gate cookie on success |
| @regression | GET /api/keepalive — returns 401 without auth header |
| @regression | GET /api/keepalive — returns 200 for valid cron secret |
| @regression | GET /api/dns-check — returns 401 without logged-in user |
| @regression | GET /api/dns-check — google.com passes SPF and DMARC |
| @regression | GET /api/dns-check — returns score 0 for nonexistent domain |
| @regression | GET /api/dns-check — rejects invalid domain format |

---

### `tests/api/02-checkout-api.spec.js` — Checkout & webhook endpoints

| Tag | Test |
|---|---|
| @smoke | POST /api/checkout/ai-readiness — returns 401 unauthenticated |
| @regression | POST /api/checkout/it-maturity-scores — returns 401 unauthenticated |
| @regression | POST /api/checkout/it-maturity-full — returns 401 unauthenticated |
| @regression | POST /api/webhooks/stripe — rejects request with no signature |
| @regression | POST /api/webhooks/stripe — rejects invalid Stripe signature |
| @regression | GET /api/checkout/verify — returns 400 for missing params |
| @regression | GET /api/checkout/verify — returns 401 unauthenticated with params |

---

### `tests/api/03-assessments-api.spec.js` — Assessment & PDF endpoints

| Tag | Test |
|---|---|
| @smoke | POST /api/assessments/complete — returns 401 unauthenticated |
| @regression | POST /api/assessments/complete — returns 401 even with missing ID |
| @regression | POST /api/assessments/it-maturity/start — returns 401 unauthenticated |
| @regression | POST /api/assessments/it-maturity/complete — returns 401 unauthenticated |
| @regression | POST /api/ai/commentary — returns 401 unauthenticated |
| @regression | POST /api/ai/it-maturity-commentary — returns 401 unauthenticated |
| @regression | GET /api/pdf/ai-readiness/[id] — rejects unauthenticated request |
| @regression | GET /api/pdf/it-maturity/[id] — rejects unauthenticated request |

---

### `tests/api/04-email-api.spec.js` — Email results endpoint

| Tag | Test |
|---|---|
| @regression | POST /api/email/results — returns 401 unauthenticated |
| @regression | POST /api/email/results — returns 401 even with missing payload |
