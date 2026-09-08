# Manifiesto del snapshot analizado

- Fecha local: 2026-08-10 (Europe/Madrid)
- Aplicación: `D:\repos\tfg-folder\tfg`
- Rama: `chore/deps-2026-08`
- Commit base: `c07764d13786694cae5f569ead311369f527d502`
- Estado: árbol de trabajo con 31 ficheros modificados, 232 inserciones y 191 eliminaciones, además de ficheros nuevos sin seguimiento.
- Memoria: `D:\repos\tfg-folder\metricas-memoria`
- Rama: `main`
- Commit: `a913337faebfe06b5ee2fe8c0f7965ff72beeb53`
- Estado de la memoria: limpio al inicio del análisis.
- Artefacto de entrega: `D:\repos\tfg-folder\tfg.zip` (134.521.522 bytes; 2026-08-08 20:21:51).

## Herramientas

- Node.js: `v24.19.0`
- pnpm: `11.20.0`
- Git: `2.45.1.windows.1`
- XeTeX: TeX Live 2025
- Biber: `2.20`
- D2: `0.7.1-HEAD`

## Entorno y orquestación

- Docker Desktop estaba apagado al comenzar; se arrancó y el stack E2E funcionó y se limpió al terminar.
- Se utilizaron ocho subagentes nativos de Codex: arquitectura/backend, dos especializaciones de autenticación/multitenencia y workflows/concurrencia, seguridad, frontend/producto, calidad/pruebas/coherencia, rigor académico/adversarial y LaTeX/PDF.
- Los runtimes Chromium, Firefox y WebKit no estaban inicialmente completos. Se instalaron; la ejecución principal produjo 72 casos verdes y los dos casos afectados se verificaron después en Firefox/WebKit.
- El build se validó con el entorno HTTPS sintético equivalente al CI; el `.env.local` incluido en la entrega no satisface por sí solo las precondiciones de build.

## Preservación

- Al finalizar, la aplicación conserva los mismos 31 ficheros modificados y los cuatro grupos sin seguimiento registrados al inicio; las pruebas solo generaron caches/resultados ignorados.
- La memoria conserva limpio su árbol de fuentes; la compilación generó únicamente salidas ignoradas.
