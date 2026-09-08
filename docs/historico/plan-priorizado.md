# Plan priorizado para la defensa y la entrega

## P0 — cerrar antes de entregar o defender

| ID | Acción | Esfuerzo | Dependencias | Criterio de cierre |
|---|---|---:|---|---|
| P0-01 | Corregir las cuatro secuencias U+FFFD de `basedatos.tex:484,491,494,499`, ajustar la captura vertical de `desarrollo.tex:243-247` y revisar los 20 desbordamientos. | 1–2 h | TeX Live | `make win` sin caracteres ausentes ni flotante excesivo; revisión visual de las 154 páginas. |
| P0-02 | Dejar verde el gate actual: formatear los 12 ficheros y retirar/usar el import `api` de `convex/tests/audit-security.test.ts:2`. | 0,5–1 h | Ninguna | `pnpm checks` termina con código 0. |
| P0-03 | Congelar el alcance en un commit etiquetado y regenerar `tfg.zip` desde una lista de inclusión, sin `.git`, `.env*`, caches, dependencias ni resultados. | 1–2 h | P0-02 | Hash y manifiesto publicados; el commit del manifiesto reconstruye exactamente el ZIP. |
| P0-04 | Actualizar la memoria: 48 ficheros/385 tests y cobertura 80,20/69,10/83,89/81,71; sustituir capturas históricas y no afirmar que `pnpm checks` pasa hasta que pase. | 1–2 h | P0-02 | Texto, tablas y capturas coinciden con una ejecución fechada del commit final. |
| P0-05 | Probar la entrega desde extracción limpia: instalación congelada, checks, cobertura, build con variables documentadas, E2E y compilación de memoria. | 1–3 h de máquina | P0-03/P0-04; Docker | Un tercero puede seguir README/manifiesto sin conocer el entorno del autor; cada comando queda registrado. |
| P0-06 | Preparar una declaración honesta de alcance E2E: 72 casos principales + 2 recorridos focalizados multiplataforma, o repetir una única suite 74/74 tras instalar los tres navegadores. | 10–12 min | Playwright instalado | Una ejecución agregada verde o una explicación explícita, con reporte conservado. |
| P0-07 | Cerrar la ventana de borrado multitenant: marcar la organización en eliminación, exigir que exista/esté activa al resolver membresía y en jobs, y efectuar un barrido final. | 1–2 días | Diseño de lifecycle + Convex tests | Una prueba intercalada cascade/cron/escritura rechaza todas las operaciones y deja cero filas para el `organizationId` eliminado. |
| P0-08 | Corregir dos afirmaciones académicas especialmente vulnerables: umbral de ramas 65 % frente a 55 % real y exportación CSV/Excel inexistente/contradictoria con la matriz. | 1–2 h | Decisión sobre umbral y alcance | Configuración, texto, tabla y Figura 5.10 describen exactamente el producto congelado. |

## P1 — muy recomendable antes de la defensa

| ID | Acción | Esfuerzo | Dependencias | Criterio de cierre |
|---|---|---:|---|---|
| P1-01 | Añadir cabeceras de seguridad de aplicación, especialmente una CSP probada, `frame-ancestors`, `nosniff`, Referrer-Policy y Permissions-Policy; verificar primero las de Vercel/proxy. | 0,5–1 día | Decisión de despliegue | Respuestas productivas verificadas; CSP sin romper Next/Convex ni depender de `unsafe-eval` en producción. |
| P1-02 | Ampliar tests en fronteras: ramas de `convex/auth.ts`, triggers de auditoría, borrado en cascada, SMTP y políticas RLS. | 1–3 días | Infra de test | Cobertura y casos negativos específicos; cada regla de autorización tiene allow/deny y cruce de tenant. |
| P1-03 | Incorporar tests de componentes/frontend y accesibilidad automática (axe), separados de la cobertura Convex. | 1–2 días | Entorno DOM/browser | Métricas separadas para `src/` y `convex/`; cero violaciones axe críticas/serias en rutas principales. |
| P1-04 | Publicar en CI `coverage/`, `playwright-report/` y `test-results/` con `if: always()` y retención limitada. | 1–2 h | GitHub Actions | Un fallo deja reporte, traza y cobertura descargables. |
| P1-05 | Ampliar Firefox/WebKit más allá de un único smoke: autenticación, formularios, i18n y rutas críticas. | 0,5–1 día | Tiempo de CI | Matriz explícita de riesgos por navegador y set verde estable. |
| P1-06 | Resolver o justificar los dos avisos actuales de React Doctor sobre invalidación de caché, comprobando la semántica reactiva de Convex. | 1–3 h | Prueba UI | Tras mutar, la vista se actualiza sin recarga; diagnóstico cerrado como fix o falso positivo documentado. |
| P1-07 | Añadir una matriz de trazabilidad mantenible y validada: requisito → caso → capa → evidencia CI. | 0,5–1 día | Requisitos congelados | 77/77 requisitos con estado explícito; los huérfanos o IDs desconocidos fallan CI. |
| P1-08 | Documentar una ruta de build local/autoalojada coherente con la exigencia HTTPS, manteniendo el rechazo de HTTP remoto. | 2–4 h | Decisión de despliegue | `pnpm build` funciona según documentación tanto en CI como en loopback controlado. |
| P1-09 | Unificar el tratamiento de fechas civiles y distinguir error de consulta de colección vacía; revisar hidratación móvil, paginación accesible y aceptación parcial de invitaciones. | 1–2 días | Tests de componentes/E2E | Fecha estable en varias zonas, error con reintento, cero mismatch móvil, botones nombrados y recuperación tras fallo de `setActive`. |
| P1-10 | Definir si las categorías son personales o compartidas y aplicar una política de mutación coherente; añadir prueba de dos miembros del mismo tenant. | 2–4 h | Decisión de producto | El miembro B no modifica la categoría de A salvo excepción administrativa explícita y probada. |
| P1-11 | Declarar una licencia real o retirar “software libre”; publicar también la evidencia manual citada y un manifiesto figura–captura–commit. | 2–4 h | Decisión legal/documental | Licencia inequívoca o redacción corregida; todas las evidencias citadas son localizables y tienen hash. |
| P1-12 | Reencuadrar “validación” como verificación técnica y documentar el estado del arte como análisis exploratorio con protocolo, criterios y limitaciones. | 0,5–1 día | Revisión académica | El texto no atribuye evidencia de usuarios inexistente y el método comparativo resulta reproducible en su alcance declarado. |

## P2 — mejora posterior

| ID | Acción | Esfuerzo | Criterio de cierre |
|---|---|---:|---|
| P2-01 | Actualizar dependencias obsoletas por lotes, con atención a TypeScript 7, Node types 26 y ESLint Convex 3. | 1–2 días | Renovate/PRs pequeños, checks y E2E verdes. |
| P2-02 | Reducir waterfalls confirmados y cargar `recharts` dinámicamente donde mejore el bundle; no aplicar masivamente heurísticas de React Doctor. | 1 día | Perfil antes/después y ausencia de regresión. |
| P2-03 | Etiquetar el PDF para accesibilidad y validar orden de lectura/alternativas de figuras. | 1–3 días | `pdfinfo` muestra `Tagged: yes`; validación manual con lector. |
| P2-04 | Medir repetición/flakiness E2E y duración, manteniendo un worker si la base compartida lo exige. | 0,5 día | Varias ejecuciones consecutivas, tasa de reintentos y duración registradas. |
| P2-05 | Generar SBOM/licencias como artefacto y programar un audit completo que incluya devDependencies y severidades menores. | 2–4 h | Política y alcance documentados. |

## Orden recomendado

1. Cerrar la carrera de borrado multitenant y sus pruebas de intercalado.
2. Corregir gate, PDF y contradicciones documentales objetivas.
3. Congelar commit y actualizar métricas/documentación.
4. Regenerar y validar el ZIP limpio.
5. Repetir validación desde cero y guardar evidencias.
6. Preparar respuestas de defensa; abordar P1 por riesgo, no por volumen.
