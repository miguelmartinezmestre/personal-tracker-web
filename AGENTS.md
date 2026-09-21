# Repository Guidelines

## Project Structure & Module Organization

`src/` contains the Next.js app and shared frontend code. Use `src/app/` for routes, `src/features/`
for domain modules such as `auth`, `sessions`, and `objectives`, `src/components/` for reusable UI,
and `src/lib/`, `src/hooks/`, `src/i18n/`, and `src/styles/` for shared utilities. `convex/`
contains backend functions, workflows, helpers, and backend tests. End-to-end coverage lives in
`tests/e2e/` and smoke checks in `tests/smoke/`. Manual Playwright flows are under `tests/manual/`.
Infrastructure files and Docker Compose stacks live in `infrastructure/`.

## Build, Test, and Development Commands

Use `pnpm` with Node `>=24.19.0`.

- `pnpm build` / `pnpm start`: build and serve production output.
- `pnpm lint`: run ESLint across the repo.
- `pnpm check-types`: `check-types:frontend-tests`, `check-types:app`, `check-types:tests`,
  `check-types:playwright`, and `check-types:scripts`.
- `pnpm test`: `test:backend` then `test:frontend`.
- `pnpm test:coverage`: both Vitest suites with coverage.
- `pnpm test:e2e`: run Playwright against the local Docker e2e stack through
  `scripts/run-e2e-stack.ts`.
- `pnpm format`: format supported files with Prettier.
- `pnpm ci`: `checks:static`, `test:coverage`, `build`, and `test:e2e`.

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
before commit. CI also checks types and executes both suites with coverage.

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

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your
training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code.
Heed deprecation notices.

<!-- END:nextjs-agent-rules -->
