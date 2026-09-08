# Matriz completa de requisitos

La memoria define 77 requisitos y los 77 aparecen en la tabla de trazabilidad de `verificacionyvalidacion.tex:335-529`. La columna “tag” indica si se encontró una etiqueta literal `@REQ-...` en código o tests; su ausencia no implica ausencia de pruebas, porque la memoria también traza por suite.

| Requisito | Familia | Capa declarada | Verificación actual | Tag literal |
|---|---|---|---|---|
| REQ-AUTENTICACION-001 | AUTENTICACION | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-AUTENTICACION-002 | AUTENTICACION | E2E | Playwright verificado | Sí |
| REQ-AUTENTICACION-003 | AUTENTICACION | E2E | Playwright verificado | Sí |
| REQ-AUTENTICACION-004 | AUTENTICACION | E2E | Playwright verificado | Sí |
| REQ-AUTENTICACION-005 | AUTENTICACION | E2E | Playwright verificado | Sí |
| REQ-AUTENTICACION-006 | AUTENTICACION | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-AUTENTICACION-007 | AUTENTICACION | E2E | Playwright verificado | Sí |
| REQ-AUTENTICACION-008 | AUTENTICACION | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-AUTENTICACION-009 | AUTENTICACION | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-OBJETIVOS-001 | OBJETIVOS | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-OBJETIVOS-002 | OBJETIVOS | Backend | Vitest 48/48 verde; asociación por suite | No |
| REQ-OBJETIVOS-003 | OBJETIVOS | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-OBJETIVOS-004 | OBJETIVOS | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-OBJETIVOS-005 | OBJETIVOS | Backend | Vitest 48/48 verde; asociación por suite | No |
| REQ-OBJETIVOS-006 | OBJETIVOS | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-OBJETIVOS-007 | OBJETIVOS | E2E | Playwright verificado | Sí |
| REQ-OBJETIVOS-008 | OBJETIVOS | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-PROGRESO-001 | PROGRESO | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-PROGRESO-002 | PROGRESO | Backend | Vitest 48/48 verde; asociación por suite | No |
| REQ-PROGRESO-003 | PROGRESO | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-PROGRESO-004 | PROGRESO | E2E parcial + Backend | Parcial declarado; E2E/Vitest ejecutados pasan | Sí |
| REQ-PROGRESO-005 | PROGRESO | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-DASHBOARD-001 | DASHBOARD | E2E parcial + Backend | Parcial declarado; E2E/Vitest ejecutados pasan | Sí |
| REQ-DASHBOARD-002 | DASHBOARD | E2E parcial + Backend | Parcial declarado; E2E/Vitest ejecutados pasan | Sí |
| REQ-DASHBOARD-003 | DASHBOARD | E2E parcial + Backend | Parcial declarado; E2E/Vitest ejecutados pasan | Sí |
| REQ-DASHBOARD-004 | DASHBOARD | Parcial | Parcial declarado; E2E/Vitest ejecutados pasan | Sí |
| REQ-DASHBOARD-005 | DASHBOARD | E2E parcial + Backend | Parcial declarado; E2E/Vitest ejecutados pasan | Sí |
| REQ-DASHBOARD-006 | DASHBOARD | E2E parcial + Backend | Parcial declarado; E2E/Vitest ejecutados pasan | Sí |
| REQ-EQUIPOS-001 | EQUIPOS | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-EQUIPOS-002 | EQUIPOS | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-EQUIPOS-003 | EQUIPOS | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-EQUIPOS-004 | EQUIPOS | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-EQUIPOS-005 | EQUIPOS | E2E | Playwright verificado | Sí |
| REQ-EQUIPOS-006 | EQUIPOS | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-EQUIPOS-007 | EQUIPOS | E2E | Playwright verificado | Sí |
| REQ-EQUIPOS-008 | EQUIPOS | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-NOTIFICACIONES-001 | NOTIFICACIONES | Backend | Vitest 48/48 verde; asociación por suite | No |
| REQ-NOTIFICACIONES-002 | NOTIFICACIONES | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-NOTIFICACIONES-003 | NOTIFICACIONES | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-NOTIFICACIONES-004 | NOTIFICACIONES | Backend | Vitest 48/48 verde; asociación por suite | No |
| REQ-ROLES-001 | ROLES | E2E | Playwright verificado | Sí |
| REQ-ROLES-002 | ROLES | E2E | Playwright verificado | Sí |
| REQ-LOGROS-001 | LOGROS | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-LOGROS-002 | LOGROS | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-LOGROS-003 | LOGROS | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-LOGROS-004 | LOGROS | Backend | Vitest 48/48 verde; asociación por suite | No |
| REQ-LOGROS-005 | LOGROS | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-LOGROS-006 | LOGROS | E2E | Playwright verificado | Sí |
| REQ-LOGROS-007 | LOGROS | Backend | Vitest 48/48 verde; asociación por suite | No |
| REQ-LOGROS-008 | LOGROS | Backend | Vitest 48/48 verde; asociación por suite | No |
| REQ-CATEGORIAS-001 | CATEGORIAS | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-CATEGORIAS-002 | CATEGORIAS | Backend | Vitest 48/48 verde; asociación por suite | No |
| REQ-CATEGORIAS-003 | CATEGORIAS | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-CATEGORIAS-004 | CATEGORIAS | Backend | Vitest 48/48 verde; asociación por suite | No |
| REQ-COLABORACION-001 | COLABORACION | Backend | Vitest 48/48 verde; asociación por suite | No |
| REQ-COLABORACION-002 | COLABORACION | Backend | Vitest 48/48 verde; asociación por suite | No |
| REQ-COLABORACION-003 | COLABORACION | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-COLABORACION-004 | COLABORACION | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-COLABORACION-005 | COLABORACION | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-COLABORACION-006 | COLABORACION | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-ADMIN-001 | ADMIN | E2E | Playwright verificado | Sí |
| REQ-ADMIN-002 | ADMIN | E2E parcial + Backend | Parcial declarado; E2E/Vitest ejecutados pasan | No |
| REQ-ADMIN-003 | ADMIN | E2E | Playwright verificado | Sí |
| REQ-ADMIN-004 | ADMIN | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-ADMIN-005 | ADMIN | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-NF-001 | NF | Estático/Backend | Inspeccionado; algoritmo concreto pendiente de validación independiente | No |
| REQ-NF-002 | NF | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-NF-003 | NF | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-NF-004 | NF | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-NF-005 | NF | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-NF-006 | NF | E2E/inspección | Confirmado por Chromium, Firefox, WebKit y walkthrough responsive | No |
| REQ-NF-007 | NF | E2E + Backend | Playwright y Vitest verificados | Sí |
| REQ-NF-008 | NF | Backend | Vitest 48/48 verde; asociación por suite | No |
| REQ-NF-009 | NF | E2E | Playwright verificado | Sí |
| REQ-NF-010 | NF | Inspección | Inventario estático; no hay aserción automática completa | No |
| REQ-NF-011 | NF | E2E | Playwright verificado | Sí |
| REQ-NF-012 | NF | E2E | Playwright verificado | Sí |

## Resultado agregado

- 77/77 requisitos están incluidos en la trazabilidad académica.
- 60/77 tienen etiqueta literal `@REQ` en código/tests; 17 se trazan únicamente por suite, inspección o evidencia estática.
- Ocho requisitos declaran verificación parcial o no automatizada. El caso más explícito es `REQ-DASHBOARD-004`: la propia memoria reconoce que falta contrastar automáticamente los días mostrados.
- Las suites ejecutadas están verdes funcionalmente, pero `pnpm checks` no está verde por formato y lint; por ello no puede afirmarse que el snapshot completo haya superado el gate agregado.

## Afirmaciones cuantitativas relevantes

| Afirmación de la memoria | Snapshot actual | Estado |
|---|---:|---|
| 47 ficheros Vitest | 48 | Desactualizada |
| 381 pruebas Vitest | 385 | Desactualizada |
| Cobertura 79,56 / 68,14 / 83,43 / 81,08 | 80,20 / 69,10 / 83,89 / 81,71 | Desactualizada, aunque mejora |
| 24 especificaciones de negocio E2E | 24 | Coherente |
| 74 ejecuciones E2E | 74 funcionalmente verificadas | Coherente tras instalar runtimes |
| `pnpm checks` OK | Falla formato y lint | Contradicha por el snapshot |
| `pnpm build` OK | Pasa con tres URLs HTTPS; falla con el `.env.local` empaquetado | Requiere precondición no explicitada |
| Umbral de ramas 65 % | `vitest.config.ts:34-39` exige 55 % | Contradicha; el resultado actual supera ambos |
| Figura 5.10: exportación CSV/Excel | No existe en `responsive-objectives-view.tsx`; la matriz del estado del arte dice “No” | Contradicción interna y con el producto actual |
