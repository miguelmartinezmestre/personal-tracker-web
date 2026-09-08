# Auditoría exhaustiva del TFG

Fecha: **20 de agosto de 2026**. Alcance: aplicación, cambios staged, memoria, PDF,
infraestructura local/CI, dependencias, pruebas, seguridad, rendimiento, UX, accesibilidad y
coherencia entre los dos repositorios.

## Dictamen ejecutivo

El proyecto es técnicamente ambicioso y funcional. Sobre el snapshot actual pasan el gate
agregado, el build de producción, las 385 pruebas Vitest, los umbrales de cobertura y una suite
E2E completa de 74/74 casos. El recorrido crítico pasa tres veces en Chromium y una vez en
Firefox/WebKit. No se encontró un bypass actual de lectura o escritura entre tenants activos para
un usuario ordinario.

No obstante, **todavía no debe congelarse como entrega final**. Quedan cuatro bloqueos P0:

1. El runner E2E hereda variables de base de datos y cloud del shell y puede conectar el stack de
   pruebas a infraestructura externa.
2. El audit de dependencias productivas falla por una vulnerabilidad high de `nanoid`; el CI
   definido en el repositorio quedaría rojo hoy.
3. La memoria atribuye al estado final cifras, umbrales y una exportación que no corresponden al
   producto auditado.
4. El PDF compila, pero conserva caracteres corruptos, un flotante excesivo, desbordamientos y
   evidencia antigua visible.

La arquitectura de aislamiento es buena, pero oculta costes importantes: RLS ejecuta lecturas
por fila, dashboard y cron procesan prefijos/histórico en vez del conjunto correcto, y Better Auth
expone una segunda interfaz administrativa que no comparte todas las invariantes del dominio.

La recomendación es cerrar los P0, resolver los P1 de integridad y administración, repetir la
misma batería, actualizar memoria/PDF desde ese único snapshot y solo entonces crear tags y
artefactos de entrega.

## Estado verificable

| Área                                                       | Resultado                                                                            |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Formato, tipos, lint, Knip, traducciones, contratos, peers | Verde                                                                                |
| Vitest                                                     | 48 ficheros, 385 tests; 2/3 ejecuciones simples verdes y un flake interno del worker |
| Cobertura Convex S/B/F/L                                   | 79,58 / 68,65 / 86,04 / 79,54 %                                                      |
| Build Next.js 16.3                                         | Verde con configuración HTTPS sintética                                              |
| Playwright                                                 | 74/74 en 7,7 min; critical path 3/3 Chromium + Firefox + WebKit                      |
| Accesibilidad axe                                          | Rojo: 6 grupos serious y 44 nodos en objetivos/logros                                |
| Audit producción                                           | Rojo: `nanoid@3.3.17` high                                                           |
| PDF                                                        | Compila, 154 páginas; no apto todavía como versión final                             |

La evidencia detallada está en [resultados-comandos.md](evidencias/resultados-comandos.md) y el
snapshot en [manifiesto.md](evidencias/manifiesto.md).

## P0 — bloqueos de release y defensa

### P0-01 — El E2E puede heredar recursos externos

**Confianza: alta, confirmado por inspección.** `scripts/lib/command.ts:30-43` llama
`sanitizeEnv`, pero copia todas las variables string. `scripts/run-e2e-stack.ts:203-212` entrega
ese entorno a Compose y `docker-compose.e2e.yml:50,55,58-67` acepta `DATABASE_URL`, `MYSQL_URL`,
AWS y buckets S3.

Un shell con credenciales reales puede desplegar funciones de prueba o escribir contra una base
externa. La auditoría solo pudo ejecutar E2E de forma segura porque eliminó expresamente esas
variables y forzó MySQL local.

**Cierre:** allowlist de entorno, orígenes loopback y base local obligatoria; rechazo de variables
cloud salvo opt-in explícito; prueba con secretos centinela inspeccionando el entorno efectivo del
contenedor.

### P0-02 — El gate de supply chain está rojo

`pnpm audit --prod --audit-level high` encuentra `nanoid@3.3.17`, afectado por
[GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8) y corregido en 3.3.18.
La condición explotable requiere un tamaño cero controlado por atacante y no se reprodujo en la
aplicación; el bloqueo es de release/CI, no una explotación demostrada.

La auditoría completa añade `lodash@4.17.23` en la CLI `auth`, incluido
[GHSA-r5fr-rjxr-66jc](https://github.com/advisories/GHSA-r5fr-rjxr-66jc), corregido en 4.18.0.

**Cierre:** actualizar/override a versiones parcheadas, regenerar lockfile y repetir checks,
build, auth HTTP y E2E. Mantener por separado el riesgo productivo y el de tooling/CI.

### P0-03 — La memoria no corresponde al snapshot

La memoria afirma 47 ficheros/381 tests, cobertura 79,56/68,14/83,43/81,08, umbral de ramas 65 %
y 73 ficheros de contratos. El snapshot real tiene 48/385, cobertura
79,58/68,65/86,04/79,54, umbral configurado 55 % y 79 archivos comprobados.

`desarrollo.tex:262-268` y la Figura 5.10 presentan exportación CSV/Excel inexistente. La figura
arquitectónica todavía incluye `@repo/backend` y capas “Prepared”; otra secuencia atribuye Zod al
backend, aunque Convex usa sus propios validadores. Ningún capítulo vincula las cifras a un SHA
inmutable.

**Cierre:** decidir el umbral, recalcular desde el commit candidato, retirar la exportación del
relato, regenerar figuras/capturas y añadir SHA, fecha, comando y artefacto a cada afirmación. La
[matriz de requisitos](evidencias/matriz-requisitos.md) muestra los 23 requisitos parciales.

### P0-04 — El PDF no tiene acabado final

La compilación nueva produce 154 páginas, pero registra 20 overfull, 85 underfull, 8 caracteres
U+FFFD y un float 84,51581 pt demasiado alto. La página física 60 muestra `?ndices definidos` y
`�ndice`; varias páginas tienen grandes vacíos o rutas fuera de margen. `Tagged: no`.

**Cierre:** corregir encoding/fuentes, redimensionar el sidebar, partir identificadores/tablas,
actualizar la evidencia y revisar de nuevo las 154 páginas. Detalle en
[revision-pdf.md](evidencias/revision-pdf.md).

## P1 — riesgos altos de producto y mantenibilidad

### P1-01 — Dos interfaces administrativas con invariantes diferentes

El handler Better Auth genérico y su plugin admin conservan acciones `set-role`, `ban`,
`set-password`, `set-email` e impersonación (`shared/platform-admin-access.ts:11-28`). Esas rutas
no pasan por los guards de `convex/admin.ts:169-189,210-247`, que impiden auto-democión, ban del
usuario de setup o eliminar el último administrador.

No es escalada externa: exige global admin. Sí permite lockout o saltarse auditoría/cleanup desde
la segunda interfaz.

**Cierre:** una sola autoridad de capacidades; retirar acciones BA no usadas y migrar la UI de
sesiones a mutations Convex, o reutilizar exactamente el mismo módulo de invariantes en el adapter.
Pruebas HTTP directas para self/setup/last-admin.

### P1-02 — Secretos incluidos en argv y mensajes de error

`BETTER_AUTH_SECRET` se pasa como argumento en `scripts/lib/convex-stack.ts:149-156`; el helper
incluye los argumentos en la excepción y el runner la imprime. La salida cruda del generador de
admin key puede seguir la misma ruta si el formato cambia. Durante E2E Node emitió además
`DEP0190` por concatenar argumentos con `shell: true`.

**Cierre:** stdin para todos los secretos, ejecución sin shell cuando sea posible y redactor
central de argv/stdout/stderr probado con sentinelas.

### P1-03 — Categorías pueden quedar huérfanas

Reproducido dinámicamente: A crea una categoría y un objetivo privado que la usa; B, miembro de la
misma organización sin colaboración, borra la categoría por la función pública. La categoría
desaparece y el objetivo conserva el ID inexistente.

La comprobación de referencias usa la base RLS, que oculta el objetivo privado al actor.

**Cierre:** autorizar primero la operación de categoría y comprobar integridad después mediante
una lectura interna no filtrada. Mantener las categorías como taxonomía compartida, pero hacer
explícito quién puede mutarlas. Añadir casos A/B privado, compartido y cross-tenant.

### P1-04 — Borrado de organización deja una carrera interna

La revalidación con la ruta Better Auth real corrige el diagnóstico antiguo: Better Auth elimina
organización y memberships antes del hook; la sesión restante no obtiene tenant y una mutation
protegida falla con `NO_ACTIVE_ORG`. **No hay ventana pública post-handler confirmada.**

Sí se reprodujo 2/2 que el cron de deadlines inserta una notificación para la organización ya
eliminada mientras los objetivos esperan su fase del cascade.

**Cierre:** todo productor interno tenant-scoped debe exigir que la organización exista; cachear
la comprobación por lote y añadir un barrido final idempotente para residuos creados por colas
anteriores.

### P1-05 — RLS genera N+1 y falsos denegados potenciales

La lectura RLS de cada usuario carga hasta 1.000 memberships del actor y del destino; listados de
miembros/collaborators hacen además `get('user')` por fila. Objetivos calculan colaborador por
documento y progreso vuelve a cargar el objetivo.

La interfaz del módulo RLS oculta un coste que forma parte de su contrato: una página puede
convertirse en decenas de miles de documentos leídos y una organización compartida situada tras
la fila 1.000 puede producir un falso denegado.

**Cierre:** DTO/read-model de miembro por organización para directorios, memoización por request y
una representación consultable de accesos. Benchmark 100×100 antes/después.

### P1-06 — Dashboard incorrecto más allá de 1.000 filas

Los tests diagnósticos con 1.002 objetivos demostraron que:

- Top 5 devuelve cinco objetivos al 1 % y omite el de 99 % situado en la fila 1.002.
- Próximos vencimientos devuelve vacío si 1.001 completados ocupan el prefijo antes del activo.

`isTruncated` advierte, pero no hace correcto el resultado prometido por los requisitos.

**Cierre:** usar el índice existente para deadlines y materializar el progreso/ranking y los
contadores exactos que no pueden resolverse por índice simple.

### P1-07 — El cron de deadlines crece con todo el histórico

El diagnóstico leyó 100 objetivos activos vencidos >7 días, creó cero avisos y necesitó una
continuación para alcanzar el único elegible. El job terminó con 102 leídos/1 creado.

**Cierre:** rango inferior indexado, `deletedAt` en la consulta y `runAt` inmutable propagado por
continuaciones. Los objetivos fuera de ventana no deben incrementar `scanned`.

### P1-08 — Incumplimientos WCAG serios

Axe encontró 44 nodos serious: barras sin nombre accesible y contraste insuficiente en objetivos
y logros, desktop/móvil. Además, `--destructive` y `--destructive-foreground` son idénticos en
tema claro para un diálogo compartido. Home no presentó violaciones.

**Cierre:** nombre contextual obligatorio en la interfaz del módulo `Progress`, tokens de color
AA (4,5:1) y test axe permanente en light/dark, desktop/mobile.

### P1-09 — Los errores de query se disfrazan de vacío/loading

Objetivos, progreso, notificaciones y categorías ignoran ramas de error. Preferencias muestra
switches activados que no responden y logros puede mantener un skeleton infinito si `progress`
queda `undefined`. El error boundary del dashboard usa `reset`, aunque la documentación actual de
[Next.js recomienda `unstable_retry`](https://nextjs.org/docs/app/getting-started/error-handling)
para volver a solicitar RSC/datos.

**Cierre:** contrato uniforme `loading/error/empty/ready`, `QueryErrorFallback` con retry y
`unstable_retry` en el boundary. Nunca afirmar “sin datos” tras fallo.

### P1-10 — Señal de pruebas incompleta

La cobertura excluye todo `src/`; Firefox/WebKit solo ejecutan un smoke porque los tags
`@cross-browser` no coinciden con el grep; reset de contraseña no cubre el flujo positivo; varios
helpers reejecutan la mutación bajo prueba y algunas aserciones aceptan errores genéricos.

**Cierre:** tests de componentes/hooks críticos, tags coherentes, reset MailHog completo,
aserciones por ID/efecto único y reintentos solo de infraestructura.

## P2 — deuda relevante

- **Paginación y privacidad:** el listado pagina antes de aplicar RLS y devuelve cursor/isDone del
  conjunto oculto; produce páginas vacías e inferencia de metadatos. Search tampoco pagina tras 50.
- **Sesiones:** fallback de organización examina solo 20 memberships; `getCurrentSession` debe
  compartir la puerta de ban/borrado con `resolveAuthContext`.
- **Auditoría:** actor/sujeto no es uniforme y faltan create/update de organization/member
  efectuados directamente por Better Auth.
- **i18n:** el walkthrough móvil mostró `Objectives.trash.empty` literal; registro/setup fuerzan
  inglés en ciertas rutas de error.
- **Módulos superficiales:** lifecycle de objetivo reparte scheduling, logros, notificaciones y
  reconciliación entre callers; RLS y permisos de dominio son autoridades solapadas. Un módulo
  profundo de transición/capacidades daría más locality.
- **Coste estructural:** 27 índices sobre objectives, doble auditoría por progreso, backfill
  `earlyBirdCompleted` indefinido y evaluaciones de logros que recorren históricos completos.
- **Operación:** no hay CD coordinado, backup/restore ensayado, migraciones versionadas, SLOs o
  artefactos CI de Playwright. Self-host es local, no un perfil productivo.
- **Tooling/documentación:** `AGENTS.md` dice Node ≥22.21.1 mientras proyecto/CI exigen 24.19;
  `deps:sbom` genera licencias, no un SBOM; falta LICENSE de software.
- **Compatibilidad:** el [README oficial de Recharts](https://github.com/recharts/recharts/blob/main/README.md)
  indica que `react-is` debe coincidir con React; el lock usa 16.13.1 frente a React 19.2.8. Como
  build/E2E pasan, se clasifica como deuda preventiva.
- **Flake Vitest:** una de tres ejecuciones simples terminó con error interno del worker después
  de 385/385; el gate final pasó, pero conviene reproducir en CI/Windows y fijar la causa.

## Fortalezas verificadas

- Wrappers RLS default-deny y defensa en profundidad de objetivos.
- No se encontró acceso entre tenants activos no relacionados.
- Better Auth elimina organization/memberships de forma atómica desde la perspectiva del handler;
  la sesión obsoleta queda sin tenant efectivo.
- Setup protegido fuera de loopback, cuenta eliminada mediante reautenticación y cascades por lotes.
- 385 tests backend, 74 E2E verdes y critical path repetible.
- Build, tipos, lint, traducciones, contratos, Knip y peers pasan.
- CI usa lockfile congelado, acciones fijadas por SHA e imágenes por digest.
- UI visualmente consistente, clara y responsive; setup y navegación principal están bien resueltos.
- Modelo de datos de 20 tablas y bibliografía 31/31 coherentes con la memoria.

## Evolución respecto al informe del 10/08

| Hallazgo anterior                        | Estado actual                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| Carrera pública tras borrar organización | **Mitigada/refutada dinámicamente**; memberships se eliminan antes de devolver |
| Residuos internos por cron/cascade       | **Persiste**, reproducido 2/2                                                  |
| Gate agregado rojo por formato/lint      | **Resuelto**; `pnpm checks` pasa                                               |
| E2E sin ejecución única 74/74            | **Resuelto**; 74/74 en 7,7 min                                                 |
| Memoria y cobertura desalineadas         | **Persiste** con cifras nuevas                                                 |
| Umbral 65 % vs 55 %                      | **Persiste**                                                                   |
| Exportación inexistente                  | **Persiste**                                                                   |
| PDF corrupto/no final                    | **Persiste**                                                                   |
| Categorías ambiguas                      | **Confirmado dinámicamente** como integridad huérfana                          |
| Cabeceras/productivo                     | **No verificado**, fuera del alcance local elegido                             |
| ZIP anterior inseguro                    | No hay ZIP actual que reauditar; debe regenerarse desde un tag limpio          |

## Límites

No se realizó pentest, benchmark de Convex Cloud, auditoría del despliegue real, restauración de
backup, rotación JWKS ni entrega SMTP externa. Los diagnósticos de escala usaron `convex-test` y
demuestran semántica/crecimiento, no coste de facturación. La revisión de accesibilidad no incluyó
lector de pantalla ni usuarios reales.

El conjunto completo Standards/Spec está en [revision-diff.md](evidencias/revision-diff.md).
