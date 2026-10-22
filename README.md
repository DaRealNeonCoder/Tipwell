# Tipwell

Tipwell is a Next.js App Router application using TypeScript, Tailwind CSS, Vitest, and ESLint. Milestone 1 establishes the application shell and development tooling; product features, database access, and authentication are intentionally not included yet.

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

The environment template contains placeholders for the future database and authentication setup. No values are required for the current app shell.

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
