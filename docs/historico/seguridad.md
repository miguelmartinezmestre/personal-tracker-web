# Informe especializado de seguridad

Fecha: 10 de agosto de 2026. Alcance: revisión estática de TypeScript/Next.js/Convex/Better Auth, autorización multitenant, sesiones, invitaciones, jobs, secretos/entrega, cadena de suministro y controles de navegador. No se realizó pentest sobre producción.

## Resumen

La arquitectura parte de decisiones acertadas: wrappers RLS con denegación por defecto, tenant e identidad derivados en servidor, comprobaciones de usuario baneado/eliminado, defensa en profundidad para objetivos, workflows idempotentes y pruebas de aislamiento entre organizaciones. La auditoría de dependencias de producción a nivel alto no encontró vulnerabilidades conocidas.

El riesgo prioritario no es un bypass RLS directo entre dos tenants activos, sino el **lifecycle de un tenant que acaba de ser borrado**. Una membresía puede seguir siendo aceptada mientras el cascade borra tablas por fases, lo que permite intercalados que dejan datos huérfanos. Dos revisiones estáticas independientes coinciden; debe cerrarse con una prueba de integración. El segundo riesgo de seguridad de entrega es empaquetar `.git/` y `.env.local`.

En sentido estricto se consideran **vulnerabilidades confirmadas** SEC-001 y SEC-004. SEC-002, SEC-003 y SEC-005 son defectos de diseño/consistencia con implicaciones de seguridad; SEC-006 es hardening de despliegue pendiente, y SEC-007/008 son debilidades de baja gravedad. No se presenta ninguna de ellas como acceso confirmado entre dos tenants activos no relacionados.

| Severidad | Confirmados | Hardening/pendientes |
|---|---:|---:|
| Alta | 1 | 0 |
| Media | 1 vulnerabilidad + 3 defectos de diseño | 2 |
| Baja | 2 | 1 |

## SEC-001 — Ventana de autorización y escritura durante borrado de organización

- **Severidad:** alta.
- **Confianza:** 0,92; doble revisión estática independiente.
- **CWE orientativa:** CWE-284 (control de acceso impropio) y CWE-367 (TOCTOU).
- **Ubicación:** `tfg/convex/platform/rls/authContext.ts:24-35,74-86`; `tfg/convex/auth.ts:578-592`; `tfg/convex/jobs/organizations/cascadeDeletion.ts:65-98,153-174`; `tfg/convex/jobs/notifications/deadlineNotifications.ts:26-97`; `tfg/convex/objectives.ts:193-250`.
- **Evidencia:** `resolveActiveMembership` acepta la membership sin comprobar que el documento organization exista. El borrado inicia un cascade diferido y elimina memberships cerca del final. Las fases eliminan notificaciones antes que objetivos; el cron puede insertar una notificación después de la fase que debía borrarla. La misma frontera permite que una sesión antigua siga autorizada durante la ventana.
- **Reproducción propuesta:** borrar O; ejecutar cascade hasta finalizar `notifications`; antes de `objectives`, ejecutar el cron sobre un objetivo de O y una mutación con sesión/membership aún existentes; drenar la cadena y consultar por `organizationId`.
- **Impacto técnico:** residuos que referencian tenant/objetivo inexistente, pérdida de integridad y autorización basada en una entidad borrada.
- **Impacto académico:** invalida la formulación absoluta de aislamiento/baja completa si no se delimita.
- **Mitigación:** marcar O como `deleting` antes de cualquier fase; resolver contexto solo con organización existente y activa; exigir ese invariante en jobs internos; impedir nuevas escrituras; cierre con barrido idempotente y telemetría.
- **Prueba de aceptación:** ambos intercalados se rechazan; tras drenar jobs hay cero filas para O. Repetir también con reintentos del cascade.
- **Posible falso positivo / pendiente:** la ventana pública depende de la retención exacta de memberships por el adaptador Better Auth. El vector del cron no depende de una petición pública y sigue siendo válido estáticamente. Debe confirmarse el orden real del hook en integración.

## SEC-002 — Selección de organización activa obsoleta o incompleta

- **Severidad:** media.
- **Confianza:** 0,95.
- **Ubicación:** `tfg/convex/auth.ts:125-137,189-223,465-480`.
- **Evidencia:** el fallback de sesión toma la primera membership sin leer la organización. La recuperación que sí lee organizaciones limita el escaneo a 20.
- **Impacto técnico:** sesión apuntando a un tenant inexistente; disponibilidad degradada; amplifica SEC-001.
- **Impacto académico:** lifecycle de sesión no preserva siempre el invariante documentado.
- **Mitigación:** paginar hasta organización válida o mantener referencia canónica; no persistir IDs de organizaciones inexistentes/en borrado.
- **Aceptación:** 20 memberships obsoletas seguidas de una válida seleccionan la válida; una única obsoleta nunca llega a sesión activa.
- **Falso positivo:** ninguno para el comportamiento; su explotabilidad depende de cómo se creen memberships obsoletas.

## SEC-003 — Semántica de autorización de categorías ambigua

- **Severidad:** media.
- **Confianza:** alta en el comportamiento, media en que sea defecto.
- **Ubicación:** `tfg/convex/platform/rls/policies.ts:431-446`; `tfg/convex/domain/categories.ts:123-192`; `tfg/convex/schema.ts:199-209`; `tfg/convex/tests/rls.test.ts:282-300`.
- **Evidencia:** un miembro no administrador puede modificar o borrar la categoría creada por otro miembro del mismo tenant; el test “another user” solo prueba organizaciones diferentes.
- **Impacto técnico:** alteración intratenant si las categorías son personales; mínimo privilegio insuficiente si son taxonomía común.
- **Impacto académico:** `userId` sugiere propiedad, pero la política no la expresa.
- **Mitigación:** decidir modelo. Personal: propietario o admin. Compartido: renombrar/eliminar propiedad y limitar mutación a rol explícito.
- **Aceptación:** prueba con A/B dentro de la misma organización y matriz allow/deny por rol.
- **Posible falso positivo:** si el requisito real es colaboración plena de todos los miembros, no es bypass; sigue siendo deuda de especificación y test.

## SEC-004 — El ZIP incluye VCS e historial de entorno

- **Severidad:** media de seguridad; alta de entrega.
- **Confianza:** alta.
- **Ubicación:** `tfg.zip:tfg/.git/**`, `tfg.zip:tfg/.env.local`.
- **Evidencia:** repositorio completo con 917 commits y entorno local. El entorno actual solo contiene dos URLs públicas; el historial incluye una URI `mysql://user:password@...` de apariencia local/ejemplo. No se detectaron tokens actuales, claves privadas ni credenciales en el remoto.
- **Impacto técnico:** revela historial, nombres/rutas/configuración eliminada y aumenta el riesgo de secretos históricos.
- **Impacto académico:** artefacto innecesariamente pesado y no reproducible desde su commit.
- **Mitigación:** empaquetado por allowlist desde tag limpio; excluir `.git`, `.env*`, resultados, caches y dependencias; escaneo de secretos antes de publicar.
- **Aceptación:** listado del ZIP sin esos paths, escaneo limpio y correspondencia byte a byte con el tag.
- **Falso positivo:** no se afirma que la cadena histórica sea una credencial real; el problema confirmado es la exposición innecesaria.

## SEC-005 — Cron interno no valida existencia del tenant y su ventana es mutable

- **Severidad:** media.
- **Confianza:** 0,90 para el escaneo histórico; 0,82 para cruce de medianoche.
- **Ubicación:** `tfg/convex/jobs/notifications/deadlineNotifications.ts:20-55,67-109`.
- **Evidencia:** consulta todos los activos anteriores al límite superior, incluidos vencidos antiguos que luego descarta; cada continuación recalcula la ventana con `Date.now()` y no valida organización.
- **Impacto técnico:** coste O(histórico), retrasos, mezcla/omisión temporal y vector interno de SEC-001.
- **Impacto académico:** comportamiento programado no totalmente reproducible bajo carga.
- **Mitigación:** rango inferior/indexado, exclusión en consulta, snapshot inmutable de ventana/run-id y validación del tenant.
- **Aceptación:** volumen escaneado proporcional a elegibles y prueba con más de 100 objetivos cruzando medianoche.
- **Falso positivo:** el cruce requiere una cadena larga justo a medianoche; es riesgo de concurrencia, no incidente observado.

## SEC-006 — Cabeceras de navegador no verificadas

- **Severidad:** media de hardening, condicionada.
- **Confianza:** media.
- **Ubicación:** `tfg/next.config.ts:8-20`; despliegue no inspeccionado.
- **Evidencia:** no se observa una política completa en repositorio. No se midieron respuestas del despliegue.
- **Impacto técnico:** si proveedor/proxy tampoco las añade, faltaría defensa en profundidad contra XSS, framing, sniffing, referrer y APIs innecesarias.
- **Impacto académico:** una defensa no demostrada no debe presentarse como control existente.
- **Mitigación:** medir producción y configurar CSP con `frame-ancestors`, `X-Content-Type-Options: nosniff`, Referrer-Policy y Permissions-Policy; probar flujo auth/Convex.
- **Aceptación:** cabeceras observables en todas las rutas productivas y E2E/CSP sin violaciones inesperadas.
- **Posible falso positivo:** Vercel o un proxy puede inyectarlas. Hasta observar producción se clasifica “pendiente de validación”, no vulnerabilidad confirmada.

## SEC-007 — `getCurrentSession` mantiene temporalmente una cuenta revocada

- **Severidad:** baja.
- **Confianza:** alta.
- **Ubicación:** `tfg/convex/organizations.ts:64-102`; `tfg/convex/platform/rls/authContext.ts:38-78`; `tfg/convex/jobs/users/cascadeDeletion.ts:58-79`.
- **Evidencia:** las wrappers rechazan banned/deleted, pero la query pública devuelve sesión/usuario sin esa comprobación hasta que el job asíncrono borra la sesión.
- **Impacto técnico:** UI puede mostrar autenticación residual, aunque las operaciones RLS críticas estén bloqueadas.
- **Impacto académico:** contradice un cierre “inmediato” sin matiz.
- **Mitigación:** devolver `null` si banned/deleted/expired.
- **Aceptación:** ban/soft-delete hace `getCurrentSession === null` antes de drenar jobs.
- **Falso positivo:** no se confirmó acceso a datos protegidos; el impacto principal es coherencia/filtración limitada del perfil actual.

## SEC-008 — Guardarraíl de APIs públicas no recorre subdirectorios

- **Severidad:** baja.
- **Confianza:** alta.
- **Ubicación:** `tfg/convex/tests/public-functions-guardrail.test.ts:21-53`.
- **Evidencia:** `readdirSync` solo inspecciona ficheros del primer nivel.
- **Impacto técnico:** una futura función pública raw anidada podría escapar a la allowlist preventiva.
- **Impacto académico:** cobertura del guardarraíl menor que la descrita.
- **Mitigación:** recorrido recursivo o AST/export registry, excluyendo generados/tests.
- **Aceptación:** una query raw de prueba en subdirectorio hace fallar el test.
- **Falso positivo:** no se halló hoy una función pública anidada insegura; es debilidad preventiva.

## Controles positivos verificados

- Wrappers RLS centralizadas y `default: deny`.
- Identidad, `createdBy`, propietario y `organizationId` derivados en servidor al crear objetivos.
- Doble control RLS + autorización de dominio para objetivos.
- Usuarios baneados/eliminados rechazados por el contexto protegido.
- `purgeToken` invalida continuaciones obsoletas; workflow antiguo no borra el ID del nuevo.
- Mutación transaccional de progreso y valor denormalizado.
- Concesión de logros relee estado y comprueba duplicado antes de insertar.
- Pruebas existentes de cruce de tenant para objetivos, progreso, notificaciones y logros.
- Auditoría de dependencias de producción a severidad alta: sin vulnerabilidades conocidas en la ejecución actual.
- No se detectaron en el ZIP actual tokens, claves privadas o secretos vigentes; las URLs de `.env.local` son públicas.

## Riesgos no verificados

Se marcan expresamente **pendientes de validación**: cabeceras reales del despliegue; configuración/rotación de JWKS; secretos productivos; rate limiting efectivo extremo a extremo; entrega SMTP real; comportamiento bajo carga; dependencias transitivas de desarrollo a severidades inferiores; pentest de XSS/CSRF/abuso; semántica exacta del hook Better Auth al borrar organizaciones.

- Better Auth mantiene limitación en memoria por defecto en producción y la eliminación de cuenta añade un límite específico, pero no se verificó almacenamiento compartido ni WAF en una topología distribuida.
- No se hallaron flags que desactiven protección de origen/CSRF; las cookies esperadas son `SameSite=Lax` y `Secure` bajo HTTPS, y Convex usa token. Esto es un control positivo estático, no un pentest.
- No se localizaron sinks de HTML peligroso ni tokens en Web Storage. El callback se restringe a ruta relativa en `shared/auth-security.ts:14-34`.
- La invitación pública revela únicamente validez asociada a un identificador opaco; no se confirmó enumeración práctica.

## Prioridad de remediación

1. SEC-001 y SEC-002 con pruebas de integración/concurrencia.
2. Regenerar entrega sin Git/entorno y con tag/manifiesto.
3. Resolver intención/política de categorías y endurecer jobs.
4. Verificar cabeceras productivas y cerrar las debilidades preventivas.
