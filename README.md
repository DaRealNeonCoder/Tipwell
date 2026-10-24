# Tipwell

Tipwell is a mobile-first tipping calculator and shift record book. Diners can calculate, decode, split, and round a tip without an account. Tipped workers can calculate real hourly pay, split a pool, calculate tip-outs, and—after signing in—keep an exportable shift log.

The app uses Next.js App Router, strict TypeScript, Tailwind CSS, Neon serverless Postgres, Drizzle ORM, Better Auth, Zod, and Vitest. Money is stored and calculated as integer cents.

## Requirements

- Node.js 20.9 or newer
- Corepack-enabled pnpm

## Setup

```bash
corepack pnpm install
Copy-Item .env.example .env.local
corepack pnpm dev
```

The development server is available at <http://localhost:3000>.

The home page is the no-account diner calculator. Worker calculators are at `/worker`; account sign-in/sign-up is at `/auth`; the authenticated shift log is at `/log`; account preferences are at `/settings`.

On macOS or Linux, copy the environment file with:

```bash
cp .env.example .env.local
```

The environment template contains the server-only database, authentication, and Stripe settings. `DATABASE_URL` and a 32-character `BETTER_AUTH_SECRET` are required for authenticated/database requests. Google sign-in is enabled when both Google credentials are provided. To enable Pro billing, create a recurring Stripe Price and provide `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PRO_PRICE_ID`.

## Database and authentication

Better Auth owns its `user`, `session`, `account`, and `verification` tables. The generated Drizzle schema is kept in `src/db/auth-schema.ts`; regenerate it with:

```bash
corepack pnpm auth:generate
```

Application tables are defined only in `src/db/schema.ts`. Generate and apply the reproducible Drizzle migration with:

```bash
corepack pnpm db:generate
corepack pnpm db:migrate
corepack pnpm db:studio
```

The settings endpoint is account-scoped: `GET /api/settings` reads the current user's settings and `PATCH /api/settings` validates and updates them. An optional `localSettings` object can be submitted with the first update to merge calculator preferences saved in the browser.

Signed-in users can manage shifts at `/log` and preferences at `/settings`. Shift and workplace API requests are validated with Zod and scoped to the authenticated user. `GET /api/shifts/export?from=YYYY-MM-DD&to=YYYY-MM-DD` returns an account-scoped CSV; service-charge share remains a separate column from tips.

Pro subscriptions use Stripe Checkout and the Stripe billing portal. Configure a webhook endpoint at `/api/billing/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`. The endpoint verifies the raw Stripe signature, records every event ID, and upserts subscription state so retries are safe and out-of-order subscription events cannot roll back a newer state. The Stripe customer ID is stored on the Better Auth `user` record and reused for checkout and the portal. The checkout success redirect only displays a pending message; access is granted from a verified webhook subscription status.

`corepack pnpm db:migrate` needs a reachable Neon/Postgres `DATABASE_URL`; it is intentionally not run against a live database in this repository checkout. The app build and local calculation tests do not require database credentials.

## Product behavior

- The decoder presents tip bases as options, not advice. It reports the consequence of each base and warns when an included service charge may be double-counted.
- Included service-charge share is stored separately from cash/card tips. It is not included in tip totals, but is included as employer-paid compensation in worker hourly summaries.
- The service worker caches the calculator shell for installable, offline calculator use. Account-backed shift actions remain online-only.
- The diner calculator can save up to six complete bill setups in browser storage for quick reuse; saved bills stay on the device and can be restored or deleted from the home page.
- Billing uses Stripe for the Pro subscription. `plan` remains a projection used by the existing account settings, while the subscription row and verified webhook events are the billing source of truth. `canUseFeature` still returns available for the current product surface.

## Checks

Run the following from the repository root:

```bash
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```

TypeScript can also be checked directly:

```bash
corepack pnpm typecheck
```

## Project structure

```text
src/
├── app/       # Calculator, worker, auth, settings, log, API routes, and styles
├── components/# Shared client UI
├── db/        # Neon/Drizzle connection, app schema, generated auth schema
└── lib/       # Calculation library, validation, auth, settings, shift data

public/
└── sw.js, manifest.webmanifest, icon.svg

drizzle/
└── Generated Postgres migration and metadata
```

## Recommended next steps

1. Configure a development Neon database and run `corepack pnpm db:migrate`.
2. Add integration tests against a disposable Postgres database for auth, ownership, and shift CRUD.
3. Run a real mobile Lighthouse audit in a browser-backed CI environment and tune against the measured result.
4. Add Stripe Test Clock/CLI integration coverage for webhook retries, cancellations, payment failures, and out-of-order events before production launch.
