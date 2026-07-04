# AngleYou Playwright — How to Run the Tests

This suite tests [staging.angleyou.com](https://staging.angleyou.com) using Playwright. It covers browser E2E flows, raw API contracts, and visual snapshots.

---

## 1. Prerequisites

**Install dependencies and browsers:**

```bash
cd C:\Users\myRig\angleyou-playwright
npm install
npx playwright install chromium
```

For Firefox and Safari too:

```bash
npx playwright install
```

---

## 2. Environment setup

Create `.env.test` in the playwright project root by copying `.env.test.example` and filling in every value:

| Variable | Description |
|---|---|
| `BASE_URL` | `https://staging.angleyou.com` |
| `GATE_PASSWORD` | Dev gate password (from Vercel env vars — `GATE_PASSWORDS`) |
| `TEST_USER_EMAIL` | Email of the test user on the **staging** Supabase project |
| `SUPABASE_URL` | `https://vwyuzqsqbrcbohovwrrl.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Service-role key for the staging Supabase project |
| `STRIPE_TEST_CARD` | `4242424242424242` (Stripe standard success card) |
| `STRIPE_TEST_EXPIRY` | `12/26` |
| `STRIPE_TEST_CVC` | `123` |
| `CRON_SECRET` | Value of `CRON_SECRET` in Vercel (used by the keepalive API test) |

> **Never commit `.env.test`.** It is already in `.gitignore`.

---

## 3. One-time setup — create the auth session

Run this once before any test run (or whenever the session expires):

```bash
npx playwright test --project=setup
```

This logs in as `TEST_USER_EMAIL` via the staging-only `/api/test-auth` route and saves cookies to `fixtures/auth-state.json`. All subsequent browser tests load that file instead of going through OTP login every time.

---

## 4. Common run commands

### Smoke suite — run on every PR

Fast (~30 s). Happy-path checks only, no DB seeding.

```bash
npx playwright test --grep "@smoke" --project=chromium
```

### Regression suite — run before deploying to production

Full suite including DB-seeded edge cases (~1.5 min).

```bash
npx playwright test --grep "@regression" --project=chromium
```

### All browsers (chromium + firefox + webkit)

```bash
npx playwright test --grep "@smoke"
```

### API tests only

No browser window needed. Uses the `api` project which runs without stored auth.

```bash
npx playwright test --project=api
```

### Visual regression only

```bash
npx playwright test tests/visual --project=chromium
```

### A single spec file

```bash
npx playwright test tests/e2e/04-it-maturity.spec.js --project=chromium
```

### A single test by name

```bash
npx playwright test --grep "free_teaser shows 3 free domain" --project=chromium
```

### Mobile viewports

```bash
npx playwright test --grep "@regression" --project=mobile-chrome
npx playwright test --grep "@regression" --project=mobile-safari
```

### Headed browser (visible window)

```bash
npx playwright test --grep "@smoke" --project=chromium --headed
```

### Debug mode — step through test interactively

```bash
npx playwright test tests/e2e/02-auth.spec.js --project=chromium --debug
```

---

## 5. Viewing results

Open the HTML report after any run:

```bash
npx playwright show-report reports/html
```

| Output | Path |
|---|---|
| HTML report | `reports/html/` |
| JSON results | `reports/results.json` |
| Screenshots & traces on failure | `reports/artifacts/` |

---

## 6. Unlocking gated test groups

Some tests are skipped by default and require extra env vars or setup.

### Admin page tests

The admin tests need a separate auth-state file generated for an admin email.

```bash
# Step 1 — generate an admin session file
# (temporarily set TEST_USER_EMAIL to an admin email, run setup, then rename the file)
TEST_USER_EMAIL=vijaybasnet41@gmail.com npx playwright test --project=setup
mv fixtures/auth-state.json fixtures/admin-auth-state.json

# Step 2 — run the admin tests
ADMIN_AUTH_FILE=fixtures/admin-auth-state.json \
  npx playwright test tests/e2e/09-admin.spec.js --project=chromium
```

Or set `RUN_ADMIN_TESTS=true` if the admin auth file is already at the default path `fixtures/admin-auth-state.json`.

### Stripe card-filling tests

The standard run already checks that the purchase button redirects to `checkout.stripe.com`. The card-filling tests (filling in card number, expiry, CVC on Stripe's hosted page) additionally require:

```bash
STRIPE_FILL_CHECKOUT=true \
  npx playwright test tests/e2e/06-stripe-checkout.spec.js --project=chromium
```

> Note: Stripe's hosted checkout DOM changes occasionally. If these tests start failing, inspect the live checkout page and update the selectors in `utils/stripe.js`.

### Visual results-page snapshot

Seed a completed AI Readiness assessment, copy its UUID from the Supabase dashboard, then:

```bash
FIXTURE_ASSESSMENT_ID=<uuid> \
  npx playwright test tests/visual --project=chromium
```

### Keepalive cron endpoint

```bash
CRON_SECRET=<value from Vercel> \
  npx playwright test tests/api/01-gate-api.spec.js --project=api
```

---

## 7. Visual baseline management

Visual baselines are PNG files stored in `tests/visual/01-visual-regression.spec.js-snapshots/`. They must be committed to git.

**After any intentional UI change**, regenerate baselines:

```bash
npx playwright test tests/visual --update-snapshots --project=chromium
git add tests/visual/01-visual-regression.spec.js-snapshots/
git commit -m "chore: update visual baselines"
```

> **Do not run `--update-snapshots` on a failing test run** — it will overwrite the correct baseline with a broken screenshot.

The following pages are intentionally excluded from visual testing because their content changes based on the test user's assessment history (dynamic CTAs, score rings), which makes baselines unstable:
- Dashboard (`/dashboard`)
- Products catalogue (`/dashboard/products`)
- IT Maturity product (`/dashboard/products/it-maturity`)

---

## 8. CI integration (GitHub Actions)

```yaml
# .github/workflows/playwright.yml

name: Playwright tests

on:
  pull_request:
  push:
    branches: [release, main]

jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Node deps
        run: npm ci
        working-directory: angleyou-playwright

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
        working-directory: angleyou-playwright

      - name: Run smoke tests
        run: npx playwright test --grep "@smoke" --project=chromium --reporter=github,html
        working-directory: angleyou-playwright
        env:
          BASE_URL: https://staging.angleyou.com
          GATE_PASSWORD: ${{ secrets.GATE_PASSWORD }}
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          STRIPE_TEST_CARD: 4242424242424242

      - name: Upload report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: angleyou-playwright/reports/
```

For the full regression suite, change the test command to:

```bash
npx playwright test --grep "@regression" --project=chromium --reporter=github,html
```

---

## 9. Project structure

```
angleyou-playwright/
├── .env.test                    # secrets — never commit
├── playwright.config.js         # projects, timeouts, base URL
├── fixtures/
│   └── auth-state.json          # gate + Supabase session (generated by setup)
├── pages/                       # Page Object classes
│   ├── GatePage.js              # /gate
│   ├── AuthPage.js              # /login, /signup
│   ├── LandingPage.js           # /
│   ├── DashboardPage.js         # /dashboard
│   ├── OnboardingPage.js        # /onboarding
│   ├── AIReadinessPage.js       # /dashboard/products/ai-readiness/*
│   ├── ITMaturityPage.js        # /dashboard/products/it-maturity/*
│   └── AdminPage.js             # /dashboard/admin
├── utils/
│   ├── supabase.js              # seed / delete / tier helpers
│   └── stripe.js                # Stripe checkout fill helpers
├── tests/
│   ├── global.setup.js          # gate bypass + Supabase auth → auth-state.json
│   ├── e2e/                     # 12 browser spec files
│   ├── api/                     # 4 API spec files
│   └── visual/                  # 1 snapshot spec + baseline PNGs
└── reports/
    ├── html/                    # open with: npx playwright show-report reports/html
    ├── results.json             # machine-readable for CI
    └── artifacts/               # screenshots & traces on failure
```

---

## 10. Troubleshooting

**`fixtures/auth-state.json` not found or session expired**  
Re-run `npx playwright test --project=setup`.

**`Page: error: page.goto: net::ERR_CONNECTION_REFUSED`**  
Check `BASE_URL` in `.env.test` and confirm staging is reachable.

**`getOrCreateTestUser` fails with Supabase error**  
Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` point to the staging project (`vwyuzqsqbrcbohovwrrl`), not production.

**Smoke test `sign out redirects to /login` fails**  
This test uses a dedicated user alias (`+signout@`). If that alias doesn't exist in the staging Supabase project it will be auto-created on first run; if creation fails check the service-role key permissions.

**Visual test fails with pixel-ratio error after a UI change**  
Run `--update-snapshots`, review the diff PNGs in `reports/artifacts/`, commit the new baselines.

**Stripe redirect test passes but card-filling tests fail**  
Stripe's hosted checkout DOM changes periodically. Inspect the live checkout page and update selectors in `utils/stripe.js`.
