# Manifiesto del snapshot auditado

Fecha de cierre: **20 de agosto de 2026**. Zona horaria: Europe/Madrid.

## Identidad

| Elemento                 | Identidad auditada                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| Aplicación               | `tfg`, rama `main`, `HEAD a3c64c147b212cea3883dfcd2b926c460165343c`                            |
| Trabajo local            | 265 archivos staged, 8.098 inserciones y 6.108 eliminaciones                                   |
| Hash Git del diff staged | `1a496230520200a1ea7a86a9a30d3f53b8010400`                                                     |
| Memoria                  | `metricas-memoria`, rama `main`, `HEAD a913337faebfe06b5ee2fe8c0f7965ff72beeb53`, árbol limpio |
| PDF recompilado          | 154 páginas, SHA-256 `C256F04F7CCBD5B26C7DA8A78CD1DEBC6DCDCB79DA03133B64A657A1324C5B3C`        |

El estado de trabajo completo, incluidos todos los cambios sin commit, se copió a
`D:\repos\tfg-folder\.audit-work-20260820`. `HEAD` se empleó únicamente para atribuir
regresiones del diff staged, no para limitar el alcance.

## Entorno

| Herramienta   |                 Versión |
| ------------- | ----------------------: |
| Node.js       |                 24.19.0 |
| pnpm          |                 11.20.0 |
| Git           |        2.45.1.windows.1 |
| Docker Engine |                  29.5.2 |
| Next.js       |                  16.3.0 |
| Vitest        |                  4.1.10 |
| Playwright    |                  1.62.1 |
| TeX           | TeX Live 2025 / XeLaTeX |
| Biber         |                    2.20 |

La instalación se hizo con `pnpm install --frozen-lockfile`. Chromium, Firefox y WebKit
correspondieron a los binarios fijados por Playwright 1.62.1.

## Aislamiento

- La copia excluyó `.git`, `.env*`, `node_modules`, caches, builds y resultados anteriores.
- `.env.example` se copió expresamente; no se leyó ni copió `.env.local`.
- Los stacks E2E usaron MySQL, Convex y MailHog locales y efímeros.
- Antes de cada E2E se eliminaron del proceso `CONVEX_DEPLOYMENT`, claves Convex, AWS/S3 y
  URLs cloud; `DATABASE_URL` y `MYSQL_URL` se fijaron al contenedor MySQL local.
- Se comprobó que no existía un proyecto Compose `metricas-e2e` previo. Todos los
  contenedores y redes creados por la auditoría se retiraron al finalizar.
- No se accedió a producción ni a cuentas reales.
- Un escaneo de patrones de claves privadas, tokens GitHub/Slack/Stripe y credenciales AWS
  no encontró coincidencias en el árbol de aplicación auditado.

## Fuentes de criterio

Se aplicaron `AGENTS.md`, la guía Convex versionada del repositorio, la documentación local
instalada de las dependencias y fuentes primarias oficiales. Context7 no estaba disponible en
la sesión; no se sustituyó por memoria del modelo. Para hechos cambiantes se consultaron, entre
otras, la documentación oficial de [Next.js sobre error boundaries](https://nextjs.org/docs/app/getting-started/error-handling),
las [buenas prácticas de Convex](https://docs.convex.dev/understanding/best-practices), la
[paginación de Convex](https://docs.convex.dev/database/pagination) y la base oficial de
advisories de GitHub.

## Preservación

Los únicos cambios deliberados fuera de la copia temporal son los documentos de esta carpeta.
Los tests diagnósticos, el harness axe y la dependencia temporal de axe se crearon únicamente
en la copia y se eliminaron o descartaron con ella.
