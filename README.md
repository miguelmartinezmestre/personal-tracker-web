# Métricas TFG

Full-stack objectives & metrics tracker: **Next.js 16 (App Router, React 19)** frontend, **Convex**
backend, **better-auth** for authentication, **next-intl** (en/es) for i18n. Users create
objectives, log time-series progress, collaborate within organizations, and earn gamified
achievements.

## Requirements

- Node `>=22.21.1`
- pnpm `11.0.8` (`corepack enable` recommended)
- Docker (for the local self-hosted Convex + MySQL + MailHog stack)

## Quick start

```bash
pnpm install          # installs project dependencies
pnpm run convex:local # brings up the local self-hosted stack (see self-host.md) ⚠️ wipes local data
pnpm dev:front        # starts Next after the local Convex deployment is ready
```

Then open http://localhost:3000 and complete the first-run setup wizard at `/setup` (the first
registered account becomes the platform admin). A loopback deployment does not require a setup
secret.

For every non-loopback deployment, configure an independent `SETUP_SECRET` in the Convex runtime
before deploying the functions (32–256 characters), then paste that value into the setup wizard.
Generate it separately from `BETTER_AUTH_SECRET`, for example with
`node --input-type=module -e "import { randomBytes } from 'node:crypto'; console.log(randomBytes(32).toString('base64url'))"`.
The backend accepts it only while platform setup has not yet been completed; never expose either
secret as a `NEXT_PUBLIC_*` variable.

Install Playwright browsers only when you need E2E tests: `pnpm run playwright:install`.

## Common commands

- `pnpm dev` — Convex + Next in dev.
- `pnpm checks` — full pre-merge gate: format, types, lint, tests, knip, translations, Convex
  contract checks, and peer-dependency compatibility.
- `pnpm test` / `pnpm exec vitest run convex/tests/<file>.test.ts` — backend tests.
- `pnpm test:e2e` — Playwright against the Docker e2e stack.
- `pnpm run convex:local` — local self-hosted stack (**destructive**, see `self-host.md`).

## Documentation

- `AGENTS.md` — project structure, coding style, and the full command reference.
- `self-host.md` — the local Docker stack and its environment variables.
- `convex/_generated/ai/guidelines.md` — Convex conventions (read before editing backend code).

## Testing note

The e2e stack uses `E2E_SETUP_SECRET` only as a **local-only runner flag** that permits production
mode over a loopback HTTP URL. It also configures a separate test `SETUP_SECRET` so the global setup
exercises the protected bootstrap request. Do not set `E2E_SETUP_SECRET` in a real deployment.
