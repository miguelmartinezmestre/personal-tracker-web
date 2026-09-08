# Estado de implementación y entrega

Ejecución iniciada el 8 de septiembre de 2026. La fuente de verdad es el código de esta versión y
sus resultados de comprobación. Las auditorías de agosto son antecedentes, no certificados del
estado actual.

## Base preservada

- Aplicación: `a3c64c147b212cea3883dfcd2b926c460165343c`, con 265 archivos staged.
- Memoria: `a913337faebfe06b5ee2fe8c0f7965ff72beeb53`, sin modificaciones iniciales.
- Copia de diffs y hashes iniciales: `../../tmp/implementation-20260908/baseline/`.
- Se conservan los cambios de partida y el historial de ambos repositorios.

## Inventario

| ID  | Trabajo                                                     | Origen                                | Estado  | Evidencia de cierre                                                                   |
| --- | ----------------------------------------------------------- | ------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| T01 | Node/pnpm, dependencias, licencias, SBOM y Renovate         | Guía de dependencias; auditoría 20/08 | Cerrado | `.nvmrc`, `package.json`, `renovate.json`, `reports/verification/sbom.cdx.json`       |
| T02 | Aislamiento de stacks, credenciales persistentes y logs     | Auditoría 20/08                       | Cerrado | `scripts/lib/stack-environment.ts`, `scripts/lib/command.ts`, pruebas de scripts      |
| T03 | Organización operativa, cascadas y recuperación de sesiones | Auditorías 10/08 y 20/08              | Cerrado | `convex/domain/organizations/operational.ts`, suites de borrado y sesiones            |
| T04 | Categorías: creador/admin y referencias privadas            | Decisión 08/09; auditoría 20/08       | Cerrado | `convex/tests/category-ownership.test.ts`, pruebas de integridad                      |
| T05 | Autoridad administrativa y auditoría                        | Auditoría 20/08                       | Cerrado | `convex/domain/adminCapabilities.ts`, suites de administración y auditoría            |
| T06 | Serie de progreso completa y transiciones                   | Chat 27/07; reproducción 08/09        | Cerrado | Pruebas de 0, 500, 501 y 600 registros; `seriesStartValue` y transiciones comunes     |
| T07 | Dashboard exacto y migraciones                              | Auditoría 20/08                       | Cerrado | `convex/tests/dashboard-scale.test.ts` con 1.502 objetivos y cambios de visibilidad   |
| T08 | Cron, directorios, búsqueda y paginación                    | Auditoría 20/08                       | Cerrado | `convex/tests/visible-pagination.test.ts`, pruebas de jobs y listados paginados       |
| T09 | Limpieza de tipos, formularios y errores React              | Plan del chat 26/08                   | Cerrado | Tipado completo, lint sin avisos y React Doctor sin errores confirmados               |
| T10 | Estados de consulta, invitaciones y fechas                  | Auditorías; plan 26/08                | Cerrado | Pruebas frontend de estados, invitaciones, fecha civil UTC y reintento                |
| T11 | Accesibilidad, CSP e idiomas                                | Auditoría 20/08                       | Cerrado | Axe claro/oscuro, teclado multibrowser, CSP con nonce y 1.033 claves por idioma       |
| T12 | Tests frontend, E2E, trazabilidad y CI                      | Auditorías; Trello                    | Cerrado | 394 backend, 60 frontend, 77 requisitos y matriz Playwright sin reintentos            |
| T13 | Operación, backup/restauración y reversión local            | Auditoría 20/08                       | Cerrado | `reports/verification/operations.json` y `docs/operacion-local.md`                    |
| T14 | Wiki versionada y guía de defensa                           | Chats; Trello                         | Cerrado | `wiki/` y archivo histórico enlazado desde `docs/historico/README.md`                 |
| T15 | Memoria, diagramas, PDF y presentación                      | Auditorías; Trello                    | Cerrado | Repositorio de memoria, D2 regenerado, PDF revisado y presentación de 17 diapositivas |
| T16 | Commits, tags y paquete reproducible                        | Plan de entrega                       | Cerrado | `docs/entrega.md`, tags coordinados y manifiesto con los dos commits                  |

## Decisiones

- Todos los miembros pueden crear y utilizar categorías. Solo el creador o un administrador pueden
  modificarlas o borrarlas. Una referencia desde cualquier objetivo impide borrar la categoría,
  también si es privado o está en la papelera.
- Los datos privados continúan sujetos a los permisos actuales en dashboard y búsquedas.
- El código se distribuye bajo MIT; las plantillas y recursos conservan sus atribuciones.
- Móvil, MCP, OAuth/passkeys, calendarios, métricas avanzadas y exportación/importación permanecen
  como ampliaciones futuras.
- Rendimiento productivo, dispositivos físicos y evaluación SUS no están verificados.
- La ejecución prepara una entrega local. No publica ni modifica producción.

## Criterio de cierre

Cada fila necesita una implementación verificable o una reserva explícita. Los resultados finales
deben identificar la fecha y los commits correspondientes. No se trasladan cifras de los informes
históricos a la nueva memoria sin repetir las comprobaciones.
