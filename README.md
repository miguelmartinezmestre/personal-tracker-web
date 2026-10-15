# Métricas TFG

Full-stack objectives & metrics tracker: **Next.js 16 (App Router, React 19)** frontend, **Convex**
backend, **better-auth** for authentication, **next-intl** (en/es) for i18n. Users create
objectives, log time-series progress, collaborate within organizations, and earn gamified
achievements.

## Requirements

- Node `24.19.0` for reproducible verification (see `.nvmrc`)
- pnpm `12.9.1` (`packageManager` field)
- Docker (for the local self-hosted Convex + MySQL + MailDev stack), or none with
  `convex:local:no-docker` (see [self-host.md](./self-host.md#sin-docker))

## Quick start

```bash
pnpm install --frozen-lockfile
pnpm run convex:local # starts or resumes the persistent local development stack
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

- `pnpm dev` — Convex + Next in dev (`convex dev` starts the frontend via `dev:front`).
- `pnpm dev:front` / `pnpm dev:convex` — Next or Convex alone.
- `pnpm checks` — `checks:static` then `test`.
- `pnpm checks:static` — format, types, lint, knip, translations, and peer-dependency compatibility.
- `pnpm run ci` — `checks:static`, `test:coverage`, `build`, and `test:e2e`. Use `run`: plain
  `pnpm ci` is pnpm's own clean install.
- `pnpm test` — `test:backend` then `test:frontend`.
- `pnpm test:coverage` — both Vitest suites with coverage thresholds.
- `pnpm test:e2e` — Playwright against the Docker e2e stack (includes MailDev SMTP).
- `pnpm test:e2e:no-docker` — same suite against a throwaway Convex backend binary and MailDev run
  as plain processes (Node 24 required; see [self-host.md](./self-host.md#e2e-sin-docker)).
- `pnpm run convex:local` starts development services and preserves data. `convex:local:stop` stops
  them; only `convex:local:reset` deletes the managed local data. See
  [self-host.md](./self-host.md).
- `pnpm run convex:local:no-docker` — same setup without Docker: the Convex CLI runs a local
  deployment under `.convex/local/default`; then use `pnpm dev`, plus `pnpm mail:local` (MailDev,
  `:1080`) to capture email. `convex:local:no-docker:reset` deletes that deployment's data.
- `pnpm build` / `pnpm start` — production Next build and serve (needs a configured Convex
  deployment).

## Documentation

- [`AGENTS.md`](./AGENTS.md) — project structure, coding style, and the full command reference.
- [`self-host.md`](./self-host.md) — local Docker stack (Convex self-hosted, MySQL, MailDev) and
  environment variables.
- `convex/_generated/ai/guidelines.md` — Convex conventions (read before editing backend code).

## Deployment design (Convex Cloud + Vercel)

The intended production architecture, not validated by the local delivery rehearsal, is: **Vercel**
hosts Next.js; **Convex Cloud** hosts the reactive backend. Use `npx convex dev` while developing
against a personal/dev deployment. Use `npx convex deploy` **only** for production (or CI with
`CONVEX_DEPLOY_KEY`).

### 1) Convex Cloud

1. Create/link the project (`npx convex dev` once, or the Convex dashboard).
2. Set backend environment variables (dashboard or `npx convex env set …`):

| Variable                                                                  | Where  | Notes                                                              |
| ------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------ |
| `SITE_URL`                                                                | Convex | Public app origin (`https://…`), no trailing slash                 |
| `BETTER_AUTH_URL`                                                         | Convex | Public app origin, same as `SITE_URL`                              |
| `BETTER_AUTH_SECRET`                                                      | Convex | Long random secret; not a `NEXT_PUBLIC_*` value                    |
| `SETUP_SECRET`                                                            | Convex | 32–256 chars; required before first `/setup` on non-loopback hosts |
| `EMAIL_FROM`                                                              | Convex | Sender address for transactional email                             |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASSWORD` | Convex | SMTP server that delivers the email (Nodemailer)                   |
| `JWKS`                                                                    | Convex | Optional; caches Better Auth's signing keys                        |

3. Deploy functions: `npx convex deploy` (or `CONVEX_DEPLOY_KEY=… npx convex deploy` in CI).
4. Open the app URL, complete `/setup` once with `SETUP_SECRET`, then treat that secret as
   bootstrap-only (the API rejects it after `platformSettings` exists).

### 2) Vercel (Next.js)

1. Import the repo and set the build command to `pnpm build` (or the Vercel preset for Next).
2. Configure frontend env:

| Variable                      | Where  | Notes                               |
| ----------------------------- | ------ | ----------------------------------- |
| `NEXT_PUBLIC_CONVEX_URL`      | Vercel | Convex cloud URL from the dashboard |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Vercel | Convex HTTP actions / site URL      |
| `NEXT_PUBLIC_SITE_URL`        | Vercel | Same public origin as `SITE_URL`    |

3. Redeploy after Convex URL or site URL changes so the client bundle picks them up.

### 3) Sanity checks

- Auth redirects and CORS: `SITE_URL` and `NEXT_PUBLIC_SITE_URL` must match the browser origin.
- Mail: send a password-reset or invitation and confirm delivery (SMTP inbox).

Local self-hosting remains documented in [`self-host.md`](./self-host.md); MailDev (`:1080`) is for
dev/e2e SMTP capture, not production.
