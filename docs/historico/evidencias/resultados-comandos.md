# Resultados reproducibles de validación

Fecha de ejecución: 2026-08-10 (Europe/Madrid). Snapshot: árbol de trabajo actual de `tfg`.

| Comprobación | Resultado | Evidencia esencial |
|---|---|---|
| `pnpm checks` | **FALLA** | Se detiene en `format:check`: 12 archivos no cumplen Prettier. |
| `pnpm run check-types` | **PASA** | App, Convex/tests y Playwright pasan `tsc --noEmit`. |
| `pnpm run lint` | **FALLA** | `convex/tests/audit-security.test.ts:2:10`, importación `api` sin usar; `--max-warnings=0`. |
| `pnpm run test` | **PASA** | 48 ficheros, 385 pruebas, 0 fallos, 46,33 s. |
| `pnpm run test:coverage` | **PASA** | 80,20 % statements; 69,10 % branches; 83,89 % functions; 81,71 % lines. |
| `pnpm run knip` | **PASA con pista** | Sin código muerto reportado; avisa que `.css` está excluido del proyecto. |
| `pnpm run check-translations` | **PASA** | 1008 claves EN y 1008 ES, sin ausencias. |
| `pnpm run check-convex-contracts` | **PASA** | 73 ficheros comprobados. |
| `pnpm run check-peers` | **PASA** | Sin problemas de peer dependencies. |
| `pnpm run build` con `.env.local` entregado | **FALLA** | Falta `NEXT_PUBLIC_SITE_URL`; después se detecta HTTP en las dos URLs Convex. |
| `pnpm run build` con tres URLs HTTPS sintéticas | **PASA** | Compilación, tipos, datos de páginas y 23 rutas completados. |
| `pnpm run deps:audit` | **PASA** | `No known vulnerabilities found` para producción, nivel `high`. |
| `pnpm run deps:outdated` | **INFORMATIVO / exit 1** | 9 paquetes obsoletos; tres saltos mayores son de desarrollo (`@convex-dev/eslint-plugin`, `@types/node`, `typescript`). |
| React Doctor actual, diff | **78/100** | 53 archivos; 2 hipótesis de invalidación de caché. Requieren revisión manual por la reactividad de Convex. |
| React Doctor local 0.2.1, full | **FALLA / 509 avisos** | 170/425 archivos. Gran parte son estilo, tests o heurísticas; no equivalen a 509 defectos confirmados. |
| `pnpm run test:e2e`, primer intento | **LIMITACIÓN AMBIENTAL** | Stack levantado; faltaba Chromium. |
| `pnpm run test:e2e`, segundo intento | **72 PASAN; 2 no completados** | 72/74 pasan en 8,4 min; faltaba Firefox y `maxFailures=1` impidió WebKit. |
| E2E focalizado Firefox + WebKit | **PASA** | Setup + los dos recorridos críticos: 3/3, 31,4 s. Resultado funcional agregado: 74/74. |
| `pnpm run test:e2e:tfg` | **PASA** | 1 recorrido, 1,5 min; genera 51 capturas en 18 secciones. |
| `make win` | **PASA con avisos** | XeLaTeX/Biber producen PDF de 154 páginas. |

## Archivos que fallan Prettier

`AGENTS.md`, `convex/achievements.ts`, `convex/categories.ts`, `convex/platform/rls/wrappers.ts`, `convex/tests/accept-invitation.test.ts`, `convex/tests/achievements.test.ts`, `convex/tests/categories-integrity.test.ts`, `README.md`, `shared/accept-invitation.ts`, `src/features/organizations/components/invitations-list.tsx`, `src/features/organizations/lib/accept-invitation.ts` y `tests/manual/setup-ui-screenshots.spec.ts`.

## Cobertura con mayor riesgo

- `convex/auth.ts`: 45,40 % statements, 26,22 % branches, 43,58 % functions.
- `convex/auditTriggers.ts`: 49,35 % statements y 40 % branches/functions.
- `convex/jobs/objectives/deleteObjective.ts`: 46,87 % statements y 37,5 % functions.
- `convex/jobs/email/smtpDelivery.ts` y `convex/emailSmtp.ts`: 0 %.
- `convex/platform/rls/policies.ts`: 72,76 % statements y 70,52 % branches; es razonable, pero no exhaustivo para una frontera de autorización.

## Interpretación

Los E2E quedan funcionalmente verificados al combinar la ejecución principal (72 casos) con la repetición focalizada de los dos casos bloqueados únicamente por navegadores ausentes. No se presenta como una única ejecución verde de `pnpm test:e2e`: el comando agregado terminó con `exit 1` por la carencia ambiental; el cierre de Firefox y WebKit fue una ejecución posterior con el mismo stack.

