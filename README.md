# Tipwell

Tipwell is a Next.js App Router application using TypeScript, Tailwind CSS, Vitest, and ESLint. Milestone 6 adds account-owned shift and workplace records, CSV export, worker summaries, and account settings while keeping the diner and worker calculators available without sign-in.

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

On macOS or Linux, copy the environment file with:

```bash
cp .env.example .env.local
```

The environment template contains the server-only database and authentication settings. `DATABASE_URL` and a 32-character `BETTER_AUTH_SECRET` are required for authenticated/database requests. Google sign-in is enabled when both Google credentials are provided.

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
├── app/       # App Router entry points, layout, and global styles
└── lib/       # Shared application configuration and utilities
```
