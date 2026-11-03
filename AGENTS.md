# Repository Guidelines

## Project Structure & Module Organization

`src/` contains the Next.js app and shared frontend code. Use `src/app/` for routes, `src/features/`
for domain modules such as `auth`, `organizations`, and `objectives`, `src/components/` for reusable UI,
and `src/lib/`, `src/hooks/`, `src/i18n/`, and `src/styles/` for shared utilities. The root of
`convex/` only holds files that register Convex functions (queries, mutations, actions) and the files
Convex needs there (`schema.ts`, `http.ts`, `httpPolyfills.ts`, `convex.config.ts`,
`auth.config.ts`). Everything else goes in `convex/features/<feature>/` (`validators.ts` for `v`
validators, topic files for logic), or in `convex/shared/` when it is small and feature-agnostic;
`shared/` never imports from `features/`. Backend tests live in `convex/tests/`. End-to-end coverage lives in
`tests/e2e/`. Manual Playwright flows are under `tests/manual/`.
Infrastructure files and Docker Compose stacks live in `infrastructure/`.

## Build, Test, and Development Commands

Use `pnpm` with Node `>=24.19.0`.

- `pnpm build` / `pnpm start`: build and serve production output.
- `pnpm lint`: type-aware oxlint across the repo, with the project rule `tfg/require-readable-spacing`
  from `tools/oxlint/`, then ESLint on `convex/`.
- `pnpm check-types`: `check-types:frontend-tests`, `check-types:app`, `check-types:tests`,
  `check-types:playwright`, `check-types:scripts`, and `check-types:tools`.
- `pnpm test`: `test:backend` then `test:frontend`.
- `pnpm run checks`: `checks:static` (format, types, lint, Knip, translations, and peer
  dependencies) then `pnpm test`.
- `pnpm test:coverage`: both Vitest suites with coverage.
- `pnpm test:e2e`: run Playwright against the local Docker e2e stack through
  `scripts/run-e2e-stack.ts`. `pnpm test:e2e:no-docker` runs the same suite with the Convex backend
  binary and MailDev as plain processes.
- `pnpm convex:local` / `pnpm convex:local:no-docker`: prepare the local Convex deployment with
  Docker (default) or with the Convex CLI's own local backend; see `self-host.md`.
- `pnpm format`: format supported files with Prettier.
- `pnpm run ci`: `checks:static`, `test:coverage`, `build`, and `test:e2e` (plain `pnpm ci` is
  pnpm's own clean install).

## Coding Style & Naming Conventions

Prettier is the formatting source of truth: 4-space indentation, semicolons, single quotes, trailing
commas (`es5`), and 100-column line width. Prefer TypeScript for app and backend code. Keep feature
code grouped by domain under `src/features/<feature>`. Name React components in `PascalCase`, hooks
in `camelCase` with a `use` prefix, and tests as `*.test.ts` or `*.spec.ts`. Use the `@/` alias for
`src` imports and `@/convex` for backend aliases where configured.

## Testing Guidelines

Vitest covers backend logic in `convex/tests/**/*.test.ts`; Playwright covers UI and integration
flows in `tests/e2e/**/*.spec.ts`. Add or update tests alongside behavior changes. Run `pnpm test`
for backend work and `pnpm test:e2e` for user-facing flows. Husky runs `format:check` and `lint`
before commit.

Tag each test with the `@REQ-…`/`@INH-…` identifiers it covers (`{ tag: [...] }` in Playwright, the
test name in Vitest).

A test exists only to verify one of those requirements through a realistic scenario on the public
surface (UI, public Convex functions, HTTP endpoints), asserting what the user would notice. Don't
test config parsing, internal batching or races, query shapes, or inputs no user would type. Test
each behavior once, in the cheapest layer that proves it. Coverage is not a goal.

## Security & Configuration Tips

Start from `.env.example` and keep local secrets in `.env.local`. Do not commit generated
credentials, admin keys, or deployment-specific URLs. Use the Docker Compose files in
`infrastructure/` only for local and test environments unless a deployment change is intentional.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for
important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.

<!-- convex-ai-end -->

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
