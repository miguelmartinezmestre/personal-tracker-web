# Plan priorizado de remediación

Objetivo: dejar una release defendible y operable sin ampliar funcionalidades. Estimaciones:
**XS** <2 h, **S** 2–4 h, **M** 0,5–1 día, **L** 1–2 días.

## Orden obligatorio

1. Aislar tooling/E2E y cerrar advisories.
2. Corregir integridad y administración.
3. Hacer exactos/acotados dashboard, cron y directorios.
4. Cerrar error states, accesibilidad, i18n y pruebas.
5. Reejecutar desde cero; actualizar memoria/PDF; congelar tags y paquete.

## Ola 0 — seguridad de ejecución y release (P0)

### 0.1 Profundizar el módulo de entorno local/E2E — M

Sustituir `sanitizeEnv` por un módulo con interfaz explícita:

```ts
buildStackEnvironment({ mode: 'local' | 'e2e', ports, overrides }): NodeJS.ProcessEnv
```

- La implementación parte de una allowlist, no de `process.env` completo.
- E2E fuerza MySQL interno, orígenes loopback, SMTP MailHog y buckets vacíos.
- Rechaza `CONVEX_DEPLOYMENT`, `CONVEX_DEPLOY_KEY`, DB/MySQL externas y AWS/S3 salvo un
  `allowExternalResources: true` imposible de activar desde CI normal.
- `runCommand` recibe `stdin`, `sensitiveValues` y `useShell`; por defecto no usa shell.
- Todos los errores pasan por un redactor antes de loggear. `BETTER_AUTH_SECRET`, setup secret,
  admin key y JWKS nunca aparecen en argv ni texto.
- Renombrar scripts: `convex:local` conserva datos; `convex:local:reset` exige confirmación y es
  el único que elimina volúmenes.

**Tests:** unitarios de allowlist/redacción con sentinelas; E2E inspecciona el entorno del
contenedor y demuestra que ninguna variable externa entra. Forzar un fallo de `convex env set`
y comprobar que logs/errores no contienen el secreto.

### 0.2 Reparar supply chain — S

- Actualizar o aplicar overrides documentados para `nanoid >=3.3.18` y `lodash >=4.18.0`.
- Preferir actualización de Better Auth/auth sobre un override cuando el grafo ya la publique.
- Reducir excepciones wildcard de `minimumReleaseAge` a versiones concretas con fecha de retirada.
- Renombrar `deps:sbom` a `deps:licenses` y añadir un SBOM CycloneDX/SPDX real.

**Aceptación:** audit producción high y audit completo según política quedan verdes; lockfile
congelado, peers, build, auth HTTP y 74 E2E pasan.

## Ola 1 — integridad y autoridad (P1)

### 1.1 Organización operativa y cascade idempotente — M

Definir una única interfaz interna:

```ts
requireOperationalOrganization(ctx, organizationId): Promise<Doc<'organization'>>
```

- `resolveActiveMembership` devuelve tenant solo si existen organization **y** membership.
- Jobs/producers tenant-scoped, empezando por deadlines/logros, llaman al helper antes de insertar.
- Un cache por lote evita releer la misma organización.
- `finalize` del cascade inspecciona todas las tablas tenant-scoped; si encuentra residuos creados
  por una cola anterior, reentra en la fase adecuada y solo completa con cero filas.
- No añadir `deleting` a la entidad Better Auth: la existencia del documento es el invariante
  operativo y el adapter real ya borra org+memberships antes del hook.

**Aceptación:** ruta Better Auth real elimina org/memberships; sesión previa falla
`NO_ACTIVE_ORG`; intercalar delete→cron no crea notificación; doble cascade converge a cero filas.

### 1.2 Integridad de categorías — S/M

- Categorías son una taxonomía compartida: todos los miembros pueden leer/seleccionar y crear.
- Solo creador (`userId`) u org admin puede renombrar/borrar; categorías legacy sin creador quedan
  administrables solo por org admin.
- El módulo autoriza al actor mediante RLS y después consulta referencias con el adapter DB interno,
  sin filtrar objetivos privados.
- Borrar falla con `CATEGORY_HAS_OBJECTIVES` si cualquier objetivo activo o borrado la referencia.

**Aceptación:** matriz A/B creator/member/admin, privado/organization/cross-tenant; nunca queda un
`categoryId` huérfano.

### 1.3 Una sola autoridad administrativa — M

- Extraer `AdminCapabilities` como módulo profundo con invariantes self/setup/last-admin.
- La interfaz pública de negocio será `convex/admin.ts`; migrar la UI de sesiones y usuarios desde
  `authClient.admin.*` a esas mutations/queries.
- Retirar del access control Better Auth `set-role`, ban, set-password/email, impersonation y
  acciones no usadas. Si alguna ruta BA debe mantenerse, su adapter llama a `AdminCapabilities`.
- Cada operación registra actor, sujeto, recurso y before/after sanitizado.

**Aceptación:** pruebas HTTP y Convex rechazan auto-ban/democión, setup user y último admin por
ambas rutas; un admin legítimo conserva operaciones soportadas.

## Ola 2 — exactitud y escala (P1/P2)

### 2.1 Cron de deadlines acotado — M

- Añadir índice global `by_status_deletedAt_deadline`.
- Extender la ventana con `scanLowerBound = UTC day start - 7 días` y consultar
  `[scanLowerBound, scanUpperBound)` con `status=active`, `deletedAt=undefined`.
- Primera invocación fija `runAt`; continuaciones propagan ese valor y no recalculan fecha.
- Mantener args opcionales una release para tolerar continuaciones antiguas.

**Aceptación:** 100.000 deadlines antiguos no incrementan `scanned`; 100 elegibles generan una
única notificación; cruce de medianoche y tenant borrado son deterministas.

### 2.2 Dashboard exacto — L

- Añadir `progressBasisPoints` (0–10.000) a objectives, actualizado transaccionalmente junto a
  current/target y backfill idempotente.
- Índice `by_organization_deletedAt_status_progressBasisPoints` para top exacto.
- Usar el índice existente `by_organization_deletedAt_status_deadline` para próximos vencimientos.
- Crear `organizationMetrics` y buckets mensuales por organización para counters/gráfico; todas
  las mutations de objective/progress ajustan el read-model en la misma transacción.
- Mantener durante una release un job de reconciliación que compare read-model con fuentes; luego
  retirar el cron de backfill permanente.

**Aceptación:** diagnósticos con 1.500+ filas incluyen candidatos posteriores al primer millar;
crear/editar/borrar/restaurar/reabrir mantiene counters y buckets exactos.

### 2.3 Directorios sin N+1 — L

Crear un módulo `MemberDirectory` cuya interfaz recibe un organization ya autorizado y devuelve
DTOs mínimos. Su implementación consulta member+user con el adapter DB interno; no atraviesa la
regla genérica de visibilidad de `user` por cada fila.

- Memoizar roles de collaborator/objetivo dentro de una query.
- No exponer token de sesión ni documentos auth completos; solo DTOs explícitos.
- Paginar organizations, invitations y collaborators o imponer un límite de dominio validado y
  devolver `isTruncated`.

**Aceptación:** 100 miembros ×100 memberships conserva permisos y coste proporcional a la página,
sin falsos denegados tras 1.000.

### 2.4 Paginación visible y search — M

- Search devuelve el mismo `PaginationResult` que list, con cursor opaco.
- Estado/categoría/deletedAt se filtran en el search index; el rango temporal se resuelve mediante
  cursor compuesto y batches acotados, sin `query['filter']` ni bypass del linter.
- RLS llena una página visible dentro de un presupuesto server-side; no devuelve metadata cruda
  de filas ocultas. Si alcanza presupuesto, devuelve un estado explícito de continuación.

**Aceptación:** >50 coincidencias navegables; no hay páginas vacías debidas solo a privados ni
inferencia de cardinalidad; el guardrail detecta cualquier `.filter` nuevo, también en subdirectorios.

## Ola 3 — UX, accesibilidad e i18n (P1)

### 3.1 Contrato único de query — M

Cada hook de datos devuelve una unión discriminada `loading | error | empty | ready`. Reutilizar
`QueryErrorFallback`; DataTable acepta error+retry con prioridad sobre empty. Dashboard error usa
`unstable_retry`, que vuelve a pedir RSC/datos en Next 16.

Aplicar a categorías, objetivos/list/search/trash, progreso, notificaciones, preferencias,
sesiones y logros. Un error nunca inventa defaults ni deja skeleton permanente.

### 3.2 WCAG AA como gate — M

- La interfaz compartida `Progress` exige `ariaLabel` o `aria-labelledby`; cada caller aporta
  contexto (“Progreso de {objetivo}: 35 %”).
- Corregir tokens destructive/foreground y badges blue/green/muted hasta 4,5:1 en light/dark.
- Eliminar landmarks `<main>` anidados, IDs repetidos y controles icon-only sin nombre.
- Añadir equivalente textual/tabular a gráficas y `aria-sort` a encabezados.
- Conservar el harness axe para home, objetivos, logros, admin y formularios, desktop/mobile.

**Aceptación:** cero serious/critical axe, navegación completa por teclado, foco visible y
contraste AA medido en ambos temas.

### 3.3 i18n y feedback — S

- Reproducir y corregir el runtime que muestra `Objectives.trash.empty` pese a existir la clave.
- Eliminar `'en'` hardcodeado en registro/setup; todos los errores pasan por el locale activo.
- El verificador de traducciones añade un test de render de claves críticas, no solo paridad JSON.

## Ola 4 — calidad, módulos y operación (P2)

### 4.1 Estrategia de tests

- Añadir `vitest.frontend.config.ts` con Testing Library/jsdom y cobertura separada de `src/`;
  empezar por query states, formularios, error resolver, i18n y hooks.
- Cambiar cross-browser grep a `@cross-browser` o `@cross-browser-critical`; registro, rutas,
  formularios e i18n corren en Firefox/WebKit.
- Añadir reset positivo MailHog→token→password nueva funciona/antigua falla.
- Aserciones E2E correlacionan IDs/actor/recurso y verifican exactamente una petición/mutación.
- Reintentos solo envuelven infraestructura; nunca repiten el comportamiento bajo prueba.
- Ejecutar Vitest 10 veces en Windows y Linux; fijar pool/edge-runtime hasta 10/10 exit 0.

### 4.2 Profundizar lifecycle de objetivo

Un módulo `transitionObjective(command)` concentra validación, patch, workflow, notificación,
auditoría y logros. Callers conocen una operación y un resultado, no el orden de efectos. Mantener
seams internos solo para adapters externos/jobs y probar a través de la interfaz.

Revisar después 27 índices, doble auditoría y evaluaciones históricas con métricas reales; no
eliminar índices solo por búsqueda estática.

### 4.3 CI/operación

- Subir coverage, reportes/trazas/capturas Playwright y logs Docker redactados con `if: always()`.
- Añadir comprobación codegen→hash sin deriva y SBOM real.
- Documentar promoción: Convex backward-compatible→smoke staging→Vercel→post-deploy→rollback.
- Definir SLOs, errores y métricas de jobs/email; runbook backup cifrado/restauración con RPO/RTO.
- Aclarar self-host como solo desarrollo o crear un perfil productivo separado con TLS y hardening.
- Alinear `AGENTS.md`, README, `.nvmrc`, CI y engines en Node 24; explicar que Convex runtime 22 es
  independiente. Añadir LICENSE o retirar “software libre”.

## Ola 5 — memoria y congelación (P0 académico)

Solo después de que las olas 0–3 estén verdes:

1. Ejecutar instalación frozen, checks, cobertura, audit, build, 74 E2E, cross-browser ampliado,
   axe y PDF desde una extracción limpia.
2. Actualizar 48/385, cobertura, umbrales, 79 contratos, fechas y capturas desde ese SHA.
3. Retirar CSV/Excel, redibujar arquitectura/RLS y corregir validación Zod/Convex.
4. Corregir U+FFFD, float y overflows; inspeccionar las 154 páginas.
5. Registrar una tabla `afirmación/figura → comando → artefacto → SHA → fecha`.
6. Dividir el WIP de 265 archivos en commits revisables: tooling, Auth/RLS, backend/domain,
   frontend/UX, tests y documentación. Cada commit mantiene tipos/lint/tests verdes.
7. Crear tags coordinados; la memoria registra el tag de aplicación.
8. Generar el código con `git archive` desde el tag, no desde el worktree. Excluir por construcción
   `.git`, `.env*`, deps, caches y resultados; publicar hashes de ZIP/PDF.

## Definición de terminado

- Cero P0 y todos los P1 con test de regresión.
- `pnpm checks`, cobertura, audit, build y E2E exit 0 en un único SHA.
- Cero axe serious/critical en rutas críticas.
- PDF sin caracteres ausentes ni float excesivo y cifras idénticas a la evidencia.
- Repositorios limpios, tags coordinados y paquete reconstruible desde esos tags.
