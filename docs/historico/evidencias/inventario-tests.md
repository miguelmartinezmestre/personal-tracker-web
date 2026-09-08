# Inventario real de pruebas y trazabilidad

Snapshot: 10 de agosto de 2026, árbol de trabajo actual de `tfg`.

## Vitest

- 48 ficheros ejecutados.
- 385 pruebas: 385 pasan, 0 fallan.
- Tiempo observado: 46,33 s.
- Cobertura: 80,20 % statements; 69,10 % branches; 83,89 % functions; 81,71 % lines.
- El umbral efectivo de ramas en `vitest.config.ts:34-39` es 55 %, no 65 % como indica la memoria.
- La cobertura instrumentada se concentra en `convex/`; no representa cobertura del frontend `src/`.

## Playwright

- 24 especificaciones de negocio con 71 casos en Chromium.
- Un setup de proyecto y dos réplicas `@cross-browser-critical` explican las 74 ejecuciones declaradas.
- Ejecución principal: 72 pasan; Firefox faltaba y `maxFailures=1` impidió iniciar WebKit.
- Tras instalar Firefox/WebKit: setup + los dos recorridos críticos, 3/3 pasan.
- Resultado funcional agregado: 74/74. No se presenta como una única ejecución verde.
- Walkthrough manual automatizado: 1/1 pasa; 51 capturas en 18 secciones.

## Requisitos

- 77 IDs en el catálogo y los mismos 77 en la tabla académica.
- 60 IDs aparecen literalmente como `@REQ` en fuentes/tests.
- 17 no tienen etiqueta literal: `REQ-ADMIN-002`, `REQ-CATEGORIAS-002`, `REQ-CATEGORIAS-004`, `REQ-COLABORACION-001`, `REQ-COLABORACION-002`, `REQ-LOGROS-004`, `REQ-LOGROS-007`, `REQ-LOGROS-008`, `REQ-NF-001`, `REQ-NF-006`, `REQ-NF-008`, `REQ-NF-010`, `REQ-NOTIFICACIONES-001`, `REQ-NOTIFICACIONES-004`, `REQ-OBJETIVOS-002`, `REQ-OBJETIVOS-005` y `REQ-PROGRESO-002`.
- `REQ-ADMIN-002` está cubierto en backend, pero la referencia E2E a ban/unban es imprecisa: `tests/e2e/admin/users.spec.ts` no contiene ese recorrido.
- La matriz fila por fila está en `matriz-requisitos.md`.

## Gates asociados

Tipos, unitarias, cobertura, contratos Convex, traducciones, peers y knip pasan. El gate agregado no pasa porque Prettier detecta 12 ficheros y lint trata como error un import sin usar.

