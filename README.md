# AngleYou — Playwright Automation Framework

End-to-end, API, and visual regression test suite for [angleyou.com](https://angleyou.com).

---

## Architecture

```
angleyou-playwright/
├── playwright.config.js          # Multi-browser projects, reporters, timeouts
├── .env.test.example             # Environment variable template (copy → .env.test)
│
├── tests/
│   ├── global.setup.js           # Gate bypass + Supabase magic link auth (runs once)
│   ├── e2e/
│   │   ├── 01-gate-landing.spec.js     # Dev gate + landing page
│   │   ├── 02-auth.spec.js             # Login, signup, sign out, route protection
│   │   ├── 03-dashboard.spec.js        # Dashboard + products catalogue
│   │   ├── 04-it-maturity.spec.js      # IT Maturity free flow + tier results
│   │   ├── 05-ai-readiness.spec.js     # AI Readiness assess + results
│   │   ├── 06-stripe-checkout.spec.js  # Real Stripe test card flows
│   │   ├── 07-onboarding.spec.js       # Onboarding form validation
│   │   ├── 08-responsive.spec.js       # Mobile layout checks
│   │   ├── 09-admin.spec.js            # Admin page (redirect + admin access)
│   │   ├── 10-it-maturity-upgrade.spec.js  # Tier upgrade DB-driven flows
│   │   ├── 11-accessibility.spec.js    # ARIA, keyboard nav, focus
│   │   └── 12-performance.spec.js      # Load budgets, console errors, broken links
│   ├── api/
│   │   ├── 01-gate-api.spec.js         # /api/gate, /api/keepalive, /api/dns-check
│   │   ├── 02-checkout-api.spec.js     # /api/checkout/*, /api/webhooks/stripe
│   │   ├── 03-assessments-api.spec.js  # /api/assessments/*, /api/ai/*, /api/pdf/*
│   │   └── 04-email-api.spec.js        # /api/email/results
│   └── visual/
│       └── 01-visual-regression.spec.js  # Screenshot baselines for all key pages
│
├── pages/                        # Page Object Models
│   ├── GatePage.js
│   ├── LandingPage.js
│   ├── AuthPage.js
│   ├── OnboardingPage.js
│   ├── DashboardPage.js
│   ├── AIReadinessPage.js
│   ├── ITMaturityPage.js
│   └── AdminPage.js
│
├── utils/
│   ├── stripe.js                 # completeStripeCheckout(), simulateWebhook()
│   └── supabase.js               # seedAIAssessment(), setITMaturityTier(), cleanup
│
├── fixtures/
│   └── README.md                 # Auth state files land here (git-ignored)
│
└── .github/workflows/
    └── playwright.yml            # CI: smoke on PR, regression nightly
```

---

## Quick Start

### 1. Install

```bash
cd e2e   # or wherever you place this folder relative to the main repo
npm install
npx playwright install
```

### 2. Configure

```bash
cp .env.test.example .env.test
# Fill in: GATE_PASSWORD, TEST_USER_EMAIL, SUPABASE_SERVICE_KEY, etc.
```

### 3. Generate auth state (one-time setup)

```bash
npx playwright test tests/global.setup.js
# Creates fixtures/auth-state.json
```

### 4. Run tests

```bash
# Smoke suite only (fast, ~2 min)
npm run test:smoke

# Full regression
npm run test:regression

# Specific product area
npx playwright test tests/e2e/04-it-maturity.spec.js

# API tests only (no browser)
npm run test:api

# Single browser debug mode
npx playwright test --headed --project=chromium tests/e2e/03-dashboard.spec.js

# With Playwright UI (interactive)
npx playwright test --ui
```

### 5. View reports

```bash
npm run report
```

---

## Test Tags

Every test is tagged `@smoke` or `@regression`:

| Tag | Purpose | Speed | Run on |
|---|---|---|---|
| `@smoke` | Critical happy paths only | ~2 min | Every PR |
| `@regression` | Full coverage including edge cases | ~15 min | Nightly + manual |

---

## Auth Strategy

The framework uses **Supabase Admin API** to generate magic links without sending real emails:

1. `global.setup.js` bypasses the gate cookie via `/api/gate`
2. Creates (or reuses) a test user via `supabase.auth.admin.createUser`
3. Generates a magic link via `supabase.auth.admin.generateLink`
4. Follows the link in the browser → saves storage state to `fixtures/auth-state.json`
5. All subsequent tests load from that state — zero email dependency

---

## Supabase Test Data

Use helpers in `utils/supabase.js` to seed and clean up test data:

```js
import { seedAIAssessment, seedITMaturityAssessment, cleanupTestAssessments } from '../utils/supabase.js';

// In beforeAll:
const userId = await getOrCreateTestUser();

// Seed specific states:
const id = await seedAIAssessment(userId, { status: 'paid' });
const itId = await seedITMaturityAssessment(userId, 'free_teaser');

// Upgrade tier (simulates Stripe webhook):
await setITMaturityTier(itId, 'scores');

// Clean up:
await cleanupTestAssessments(userId);
```

---

## Stripe Testing

Stripe tests in `06-stripe-checkout.spec.js` hit real Stripe test endpoints.
They are skipped unless `STRIPE_TEST_CARD` is set in `.env.test`.

Test cards:
| Card | Behaviour |
|---|---|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Declined |
| `4000 0025 0000 3155` | 3DS required |

---

## CI Setup

Add these secrets to your GitHub repository (`Settings → Secrets → Actions`):

```
BASE_URL
GATE_PASSWORD
TEST_USER_EMAIL
SUPABASE_URL
SUPABASE_SERVICE_KEY
STRIPE_TEST_CARD
STRIPE_TEST_EXPIRY
STRIPE_TEST_CVC
ADMIN_EMAIL
```

The workflow:
- **Smoke** runs on every PR (Chromium only, fast)
- **Regression** runs nightly across all browsers
- **Manual trigger** lets you pick smoke/regression/all

---

## Adding New Tests

1. Create your spec in `tests/e2e/` or `tests/api/`
2. Tag each test with `@smoke` or `@regression`
3. Use an existing Page Object or add a new one to `pages/`
4. Seed required DB state in `beforeAll` / `beforeEach` using `utils/supabase.js`
5. Clean up in `afterEach`

---

## Known Limitations

- Visual regression baselines must be generated on first run with `--update-snapshots`
- Admin tests require a separate `fixtures/admin-auth-state.json` (set `RUN_ADMIN_TESTS=true`)
- Stripe checkout tests are slower (~30s each) and skipped in quick runs
- Vercel Hobby cold starts can add 3–5s to first-request timings
