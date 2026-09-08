# Revisión formal del WIP staged

Punto fijo: `HEAD a3c64c147b212cea3883dfcd2b926c460165343c`.

Comando: `git diff --cached HEAD`. No hay commits posteriores: el cambio completo está staged.

## Standards

### Incumplimientos documentados

1. **Uso deliberadamente oculto de `filter` en Convex.**
   `convex/domain/objectives/list.ts:297-310` usa `query['filter'](...)` y explica que así evita
   `@convex-dev/no-filter-in-query`. Contradice la guía Convex del repositorio: las consultas
   potencialmente grandes deben modelarse con índices y `withIndex`.
2. **Contratos internos degradan IDs a strings.**
   `convex/auth.ts:100-106,268-284` y `convex/admin.ts:476-486` reciben `userId`, `actorUserId` y
   `organizationId` como `v.string()` y normalizan después. La guía exige `Id<'tabla'>`/`v.id`
   dentro del dominio. La conversión del formato Better Auth debería concentrarse en su adapter.

### Juicios de diseño

- **Mysterious Name / Primitive Obsession:** `src/features/lib/table-id.ts:4-37` y
  `accountDeletionPlugin.ts:13-15` llaman “validación” a comprobar solo que un string no esté
  vacío. `app-route.ts:3-11` hace equivalente con cualquier ruta que empiece por `/`.
- **Duplicated Code:** gates de sesión, notificaciones y colaboradores se repiten entre reglas
  read/insert/modify en los nuevos módulos RLS.
- **Data Clumps:** `CreateRlsRulesArgs` y `RlsHelpers` transportan el mismo bloque de identidad y
  contexto; una base interna compartida reduciría cambios paralelos.

Se omitieron asuntos ya gobernados automáticamente por Prettier, TypeScript, ESLint y Oxlint.

## Spec

Fuente elegida por el usuario: los 77 requisitos de `metricas-memoria/requisitos.tex`.

1. **Dashboard parcial a escala.** REQ-DASHBOARD-001/002/003/005 prometen estadísticas,
   agregación, top y vencimientos representativos, pero `convex/dashboard.ts:35-53,87-119,
150-177,212-229` calcula sobre un prefijo de 1.000. Los diagnósticos dinámicos demostraron
   resultados incorrectos en la fila 1.002.
2. **Búsqueda no paginada.** REQ-OBJETIVOS-008 y REQ-NF-008 quedan parciales: la búsqueda fija
   un límite de 50 y la UI elimina paginación durante search
   (`use-objective-list-state.ts:45-57`, `responsive-objectives-view.tsx:100-126`).
3. **Regresión en logros ante error.** REQ-LOGROS-006/REQ-NF-010 quedan parciales porque
   `achievements-layout.tsx:43-47` confunde `progress === undefined` tras error con loading y
   puede mantener el skeleton indefinidamente.
4. **Scope creep de alto riesgo.** El diff mezcla migración de lint, refactor Auth/RLS y cambios
   funcionales en 265 archivos sin una especificación única que justifique la combinación. No
   es un defecto de producto por sí mismo, pero dificulta revisión, rollback y atribución.

## Resumen de ejes

- Standards: 2 incumplimientos duros y 4 juicios/smells; el peor es ocultar `filter` al guardrail.
- Spec: 3 requisitos parciales/regresivos y 1 observación de scope; el peor es la inexactitud
  demostrada del dashboard.

Los ejes se mantienen separados deliberadamente: seguir estándares no demuestra cumplir la
especificación, ni cumplir un requisito justifica romper las reglas del repositorio.
