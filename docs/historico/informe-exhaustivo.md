# Auditoría exhaustiva del TFG

Fecha del análisis: 10 de agosto de 2026. Criterio dominante: preparación para defensa académica. Alcance: árbol de trabajo actual de la aplicación, memoria y PDF compilado, `tfg.zip`, requisitos, pruebas, seguridad, UX y coherencia cruzada.

## Dictamen ejecutivo

El proyecto demuestra una base técnica amplia y funcional: tipos, 385 pruebas unitarias, cobertura, build con entorno HTTPS correcto, 74 recorridos E2E funcionalmente verificados y compilación de una memoria de 154 páginas. La arquitectura multitenant usa RLS denegatorio por defecto, existe buena defensa en profundidad para objetivos y la memoria contiene los 77 requisitos en su matriz de trazabilidad.

No obstante, **el snapshot no está listo para presentarse como entrega final inmutable**. Hay cuatro bloqueos principales:

1. Existe una ventana de carrera durante el borrado de una organización que puede autorizar sesiones antiguas y dejar escrituras huérfanas. Dos revisiones estáticas independientes la confirmaron con confianza alta; falta todavía convertirla en prueba de integración.
2. `tfg.zip` contiene `.git/` y `.env.local`, reproduce el árbol sucio pero no puede reconstruirse desde el commit incluido. Es un riesgo grave de procedencia, privacidad histórica y reproducibilidad.
3. La memoria afirma un gate completamente verde, 47 ficheros/381 pruebas, un umbral de ramas del 65 % y una exportación CSV/Excel; el snapshot tiene 48/385, el gate falla, el umbral real es 55 % y la exportación no existe.
4. El PDF compila, pero presenta caracteres U+FFFD visibles, un flotante excesivo, desbordamientos y otros defectos de paginación impropios de una versión final.

La recomendación es no cambiar el alcance del proyecto antes de defender: cerrar los P0, congelar un commit, regenerar memoria/ZIP/evidencias y ensayar respuestas precisas sobre lo que se verificó y lo que no se validó con usuarios.

## Snapshot y cadena de evidencia

| Elemento | Identidad |
|---|---|
| Aplicación | rama `chore/deps-2026-08`, base `c07764d13786694cae5f569ead311369f527d502`, árbol deliberadamente sucio |
| Memoria | rama `main`, commit `a913337faebfe06b5ee2fe8c0f7965ff72beeb53` |
| PDF | SHA-256 `C4BD9CA3C1101DE1F15A12501ABB7946278A6ECAFD9751507EE15C5BFD5FAE9F`, 7.822.583 bytes, 154 páginas |
| ZIP | SHA-256 `0096CA725A8F0633F1E309BF99FE305BA9BBB47AEC7F8445E28C154F2FFD3977`, 134.521.522 bytes |
| Herramientas | Node 24.19.0; pnpm 11.20.0; Git 2.45.1; TeX Live 2025; Biber 2.20; D2 0.7.1-HEAD |

El manifiesto completo está en `evidencias/manifiesto-snapshot.md`; los resultados crudos resumidos, en `evidencias/resultados-comandos.md`; el inventario de pruebas, en `evidencias/inventario-tests.md`.

## Metodología y orquestación

Intervinieron ocho subagentes Codex, además del coordinador: un coordinador de arquitectura/backend, dos revisores especializados en autenticación/multitenencia y workflows/concurrencia, un revisor de seguridad, uno de frontend/producto, uno de calidad/pruebas/coherencia, uno de rigor académico/adversarial y uno de LaTeX/PDF. El coordinador ejecutó las comprobaciones, resolvió duplicados y exigió segunda revisión para el único hallazgo técnico alto.

Se leyeron las reglas locales de Next.js y Convex antes de juzgar sus APIs. Context7 no estaba disponible en la sesión; se usó documentación versionada instalada y fuentes primarias locales. No se modificó comportamiento, fuentes, tests, esquemas ni documentación del proyecto. Los únicos artefactos nuevos pertenecen a `analisis-tfg/`.

La evaluación combina:

- ejecución reproducible de gates, pruebas, cobertura, build, auditoría de dependencias, React Doctor, Docker/E2E y compilación XeLaTeX/Biber;
- inspección estática de autorización, concurrencia, datos, frontend, CI y trazabilidad;
- contraste completo de 77 requisitos y afirmaciones cuantitativas;
- renderizado e inspección visual de las 154 páginas;
- inspección no destructiva y comparación completa del ZIP.

## Matriz de evaluación

| Área | Estado | Evidencia decisiva |
|---|---|---|
| Funcionalidad y E2E | Favorable con reserva | 72 casos principales y 2 críticos multiplataforma pasan; no fue una única ejecución verde |
| Arquitectura/backend | Sólida con un riesgo alto | RLS y workflows robustos, pero carrera al borrar organización |
| Seguridad | Mejorable | Buenas fronteras internas; falta cerrar lifecycle, verificar cabeceras y limpiar entrega |
| Calidad/gates | No cerrada | tipos/tests/cobertura/build condicionado pasan; formato y lint fallan |
| Frontend/UX | Funcional con defectos P1/P2 | fechas civiles, errores como vacío, hidratación/accesibilidad |
| Rigor académico | No cerrado | buenas estructura y transparencia, pero evidencia desalineada y método sobredicho |
| PDF | Compila, no final | referencias resueltas; defectos visibles y PDF sin etiquetar |
| Entrega/reproducibilidad | No apta | ZIP contiene Git/entorno y no corresponde a un commit reconstruible |

## Hallazgos consolidados

### H-01 — Carrera de borrado de organización permite autorización y residuos huérfanos

- **Severidad / confianza:** alta técnica / 0,92; confirmada por dos revisiones estáticas independientes.
- **Ubicación:** `tfg/convex/platform/rls/authContext.ts:24-35,74-86`; `tfg/convex/auth.ts:578-592`; `tfg/convex/jobs/organizations/cascadeDeletion.ts:65-98,153-174`; `tfg/convex/jobs/notifications/deadlineNotifications.ts:26-97`; `tfg/convex/objectives.ts:193-250`.
- **Evidencia reproducible:** RLS acepta una membresía activa sin leer la organización. El callback inicia el cascade diferido y las membresías se eliminan al final. Tras terminar la fase `notifications`, el cron puede crear una notificación para un objetivo del tenant borrado; una sesión con membresía persistente puede autorizar escrituras después de la fase correspondiente.
- **Impacto técnico:** rompe integridad referencial y el invariante de baja total/aislamiento de tenant.
- **Impacto académico:** debilita una de las afirmaciones centrales de seguridad y consistencia.
- **Corrección propuesta:** estado duradero `deleting`, validación de existencia/estado en contexto RLS y jobs internos, rechazo de nuevas escrituras y barrido final idempotente.
- **Aceptación:** prueba intercalada cascade/cron/escritura; todas las escrituras fallan y no queda ninguna fila asociada tras drenar jobs.
- **Pendiente de validación:** confirmar dinámicamente la semántica exacta del hook de Better Auth y la retención temporal de memberships.

### H-02 — El ZIP expone historia y no constituye una release reproducible

- **Severidad / confianza:** alta de entrega y académica / alta.
- **Ubicación:** `tfg.zip`, entradas `tfg/.git/**` y `tfg/.env.local`.
- **Evidencia reproducible:** 2.163 entradas; contiene el repositorio Git completo y el entorno local. Los 1.350 ficheros no Git/no entorno comparados coinciden con el árbol sucio, pero `.git/HEAD` apunta al commit base, que no contiene esas modificaciones. El historial incluye un `.env` antiguo con URI de credencial aparente de entorno local/ejemplo. No se detectaron claves privadas ni tokens actuales.
- **Impacto técnico:** superficie innecesaria de fuga histórica y ambigüedad de instalación.
- **Impacto académico:** un tercero no puede reconstruir exactamente el artefacto desde el commit declarado.
- **Corrección propuesta:** commit/tag final, allowlist de empaquetado, excluir `.git`, `.env*`, dependencias/caches/resultados y añadir hashes/manifiesto.
- **Aceptación:** extracción limpia reconstruible byte a byte desde el tag, sin patrones secretos ni metadatos VCS.

### H-03 — La evidencia de cierre ya no corresponde al snapshot

- **Severidad / confianza:** alta académica / alta.
- **Ubicación:** `metricas-memoria/verificacionyvalidacion.tex:54-67,101-121,246-272`; `metricas-memoria/conclusiones.tex:16-21`.
- **Evidencia reproducible:** la memoria dice 47 ficheros/381 tests y cobertura 79,56/68,14/83,43/81,08; la ejecución actual obtiene 48/385 y 80,20/69,10/83,89/81,71. Además, `pnpm checks` no está verde.
- **Impacto técnico:** ninguno directo; el código probado funciona.
- **Impacto académico:** la afirmación “todas las comprobaciones terminan correctamente” no es auditable para la versión entregada.
- **Corrección propuesta:** cerrar el gate, congelar SHA/entorno/fecha y regenerar texto, tablas, capturas y logs desde esa revisión.
- **Aceptación:** cada cifra del PDF se resuelve a un comando, reporte y commit inmutable.

### H-04 — Umbral de ramas documentado como 65 %, configurado al 55 %

- **Severidad / confianza:** alta académica / alta.
- **Ubicación:** `metricas-memoria/verificacionyvalidacion.tex:39-45`; `tfg/vitest.config.ts:34-39`.
- **Evidencia reproducible:** texto/tabla declaran 65 %; Vitest exige 55 %. La cobertura actual, 69,10 %, supera ambos, pero el criterio formal afirmado es falso.
- **Impacto técnico:** el gate permite una regresión de diez puntos mayor que la descrita.
- **Impacto académico:** discrepancia directa y fácil de cuestionar ante tribunal.
- **Corrección propuesta:** elevar el umbral a 65 % o corregir la memoria a 55 % con justificación.
- **Aceptación:** configuración, texto y ejecución coinciden.

### H-05 — La Figura 5.10 atribuye una exportación inexistente

- **Severidad / confianza:** alta académica / alta.
- **Ubicación:** `metricas-memoria/desarrollo.tex:262-269,951-958`; `metricas-memoria/state-of-the-art.tex:60-62`; `tfg/src/features/objectives/components/responsive-objectives-view.tsx:129-193,294-312`.
- **Evidencia reproducible:** la figura afirma CSV/Excel y muestra el estado antiguo `not_started`; la matriz comparativa marca exportación “No”, el modelo actual usa `active/completed` y la UI no contiene exportación. El walkthrough registra el rótulo de exportación aunque su búsqueda sea condicional.
- **Impacto técnico:** evidencia manual susceptible de falso positivo.
- **Impacto académico:** captura engañosa y contradicción interna visible.
- **Corrección propuesta:** sustituirla por captura del commit final y corregir texto/walkthrough, o implementar y probar la función si realmente pertenece al alcance.
- **Aceptación:** figura, matriz, código y test describen la misma capacidad.

### H-06 — El PDF contiene caracteres corruptos y maquetación no final

- **Severidad / confianza:** alta académica, media técnica / alta.
- **Ubicación:** `metricas-memoria/basedatos.tex:484,491,494,499`; `desarrollo.tex:243-247`; PDF físico 60–61, 72, 91–92, 111, 119 y bibliografía.
- **Evidencia reproducible:** U+FFFD visible como `�?ndice(s)` y ocho avisos de carácter ausente; flotante 84,51581 pt demasiado grande; 20 `Overfull`, máximo 55,55205 pt; código invade cabecera; páginas casi vacías; salto Tabla 6.5→6.7.
- **Impacto técnico:** ninguno en la aplicación.
- **Impacto académico:** reduce acabado profesional y delata una revisión visual incompleta.
- **Corrección propuesta:** corregir Unicode/fuentes, redimensionar figura, partir rutas/código/tablas y revisar numeración/paginación.
- **Aceptación:** compilación sin caracteres ausentes ni float excesivo, desbordamientos justificados/cero y revisión de las 154 páginas.

### H-07 — “Validación” y estado del arte exceden la evidencia metodológica

- **Severidad / confianza:** alta académica / alta.
- **Ubicación:** `metricas-memoria/verificacionyvalidacion.tex:4-37,533-558`; `state-of-the-art.tex:6-20,46-62,93-110,147-239`; `conclusiones.tex:16-21`.
- **Evidencia reproducible:** no hay estudio con usuarios, SUS, observación de tareas ni medida de utilidad/motivación. La comparación de productos tiene fecha de corte y `N/D`, pero no protocolo, criterios de inclusión/exclusión, extracción independiente ni fuentes archivadas.
- **Impacto técnico:** ninguno.
- **Impacto académico:** confunde verificación técnica con validación de la solución y presenta una exploración como evidencia comparativa más fuerte de lo que es.
- **Corrección propuesta:** separar explícitamente verificación de validación no realizada; declarar estudio exploratorio, método, criterios y límites; reforzar literatura académica.
- **Aceptación:** las conclusiones solo afirman resultados observados y el análisis es reproducible dentro de su alcance.

### M-01 — Gate agregado rojo pese a que sus componentes funcionales principales pasan

- **Severidad / confianza:** media técnica, alta de entrega / alta.
- **Ubicación:** 12 ficheros listados en `evidencias/resultados-comandos.md`; `tfg/convex/tests/audit-security.test.ts:2`.
- **Evidencia:** `pnpm checks` falla en Prettier; lint falla por un import no usado. Tipos, unitarias, cobertura, contratos, traducciones, peers y knip pasan.
- **Impacto:** impide afirmar una release verde y puede bloquear CI.
- **Corrección / aceptación:** formatear, eliminar/usar el import y exigir `pnpm checks` exit 0.

### M-02 — Sesión activa puede seleccionar una organización inexistente

- **Severidad / confianza:** media / 0,95.
- **Ubicación:** `tfg/convex/auth.ts:125-137,189-223,465-480`.
- **Evidencia:** el fallback devuelve la primera membership sin leer su organización; la recuperación inspecciona solo 20.
- **Impacto técnico/académico:** sesión inconsistente y agravamiento de H-01; debilita lifecycle documentado.
- **Corrección / aceptación:** paginar y elegir solo organizaciones existentes; con 20 memberships obsoletas y una válida posterior debe seleccionar la válida.

### M-03 — Fechas civiles cambian de día en gráficos según zona horaria

- **Severidad / confianza:** media-alta de producto / alta.
- **Ubicación:** `tfg/shared/civil-date.ts`; `objective-progress-timeline.tsx:37-53`; `objective-graph.tsx:42-46,87-90`.
- **Evidencia:** las fechas son medianoche UTC, pero los gráficos usan `Intl.DateTimeFormat` sin `timeZone: 'UTC'`.
- **Impacto técnico/académico:** tabla y gráfico pueden discrepar; una cronología mostrada puede ser falsa.
- **Corrección / aceptación:** reutilizar `formatCivilDate` o UTC; `2026-08-10` debe verse igual en Madrid y Nueva York.

### M-04 — Errores de consulta se muestran como colección vacía

- **Severidad / confianza:** media-alta de producto / alta.
- **Ubicación:** `tfg/src/components/data-table/components/table.tsx:23-35,158-163`; tablas de categorías/notificaciones; `achievements-layout.tsx:49-61,84-106`.
- **Evidencia:** no se lee `isError`; datos indefinidos se convierten a `[]` y aparecen “sin resultados”, “todo al día” o inicialización.
- **Impacto:** información falsa al usuario y falta de recuperación.
- **Corrección / aceptación:** estado error/reintento diferenciado; fallo simulado nunca debe producir el empty state.

### M-05 — Cobertura y evidencia de pruebas tienen huecos en fronteras críticas

- **Severidad / confianza:** media / alta.
- **Ubicación:** informe de cobertura; `.github/workflows/ci.yml`; `.gitignore`; `tests/e2e/admin/users.spec.ts:15-54`.
- **Evidencia:** `auth.ts` 26,22 % ramas, auditoría ~40 %, borrado ~46,87 %, SMTP 0 %; cobertura mide Convex, no frontend. CI no conserva coverage/Playwright. La matriz atribuye ban/unban E2E a un spec que no lo prueba, aunque backend sí lo cubre.
- **Impacto técnico:** regresiones en seguridad/errores/UI tienen baja detección.
- **Impacto académico:** trazabilidad correcta en agregado pero imprecisa a nivel de evidencia.
- **Corrección / aceptación:** métricas separadas frontend/backend, pruebas negativas y artefactos CI; cada fila apunta al caso literal.

### M-06 — El build local exige precondiciones no satisfechas por el entorno entregado

- **Severidad / confianza:** media de reproducibilidad / alta.
- **Ubicación:** `.env.local`, validación de entorno y `.github/workflows/ci.yml:43-48`.
- **Evidencia:** build falla por `NEXT_PUBLIC_SITE_URL` ausente y después por URLs HTTP; pasa con tres URLs HTTPS sintéticas, como CI.
- **Impacto:** un evaluador no puede ejecutar literalmente `pnpm build` con el ZIP.
- **Corrección / aceptación:** documentar plantilla HTTPS/loopback segura; build desde extracción limpia siguiendo README.

### M-07 — Evidencia manual, licencia y procedencia visual no son auditables

- **Severidad / confianza:** media-alta académica / alta.
- **Ubicación:** `verificacionyvalidacion.tex:487-496`; `state-of-the-art.tex:60-62`; `tfg/package.json:2-5`; figuras y capturas.
- **Evidencia:** falta `docs/loading-indicators-validation.md` y no hay logs/manifiesto de capturas; las 51 capturas actuales no se vinculan binariamente a figuras. Se dice “software libre”, pero el paquete es privado y no hay `LICENSE`.
- **Impacto:** afirmaciones no verificables y precisión legal dudosa.
- **Corrección / aceptación:** publicar evidencia con hashes y mapa figura–captura–commit; añadir licencia o retirar la etiqueta.

### M-08 — Categorías: propiedad y política de mutación son ambiguas

- **Severidad / confianza:** media; comportamiento confirmado, intención pendiente.
- **Ubicación:** `tfg/convex/platform/rls/policies.ts:431-446`; `convex/domain/categories.ts:123-192`; `convex/schema.ts:199-209`.
- **Evidencia:** cualquier miembro del tenant puede modificar/borrar una categoría de otro; `userId` sugiere propiedad y el test de “otro usuario” solo usa organizaciones distintas.
- **Impacto:** posible alteración no autorizada intratenant o modelo compartido mal documentado.
- **Corrección / aceptación:** decidir personal vs compartido; prueba de dos miembros del mismo tenant con excepción admin explícita.

### M-09 — Cron de deadlines puede escalar con el histórico y cambiar ventana entre lotes

- **Severidad / confianza:** media / 0,90 y 0,82.
- **Ubicación:** `tfg/convex/jobs/notifications/deadlineNotifications.ts:20-55,103-109`.
- **Evidencia:** no hay límite inferior de fecha y cada continuación recalcula el día con `Date.now()`.
- **Impacto:** coste O(histórico), retraso y omisiones/mezcla al cruzar medianoche.
- **Corrección / aceptación:** consulta acotada y ventana/run-id inmutable; test con más de 100 objetivos cruzando medianoche.

### M-10 — Defectos de accesibilidad, hidratación y flujo parcial en frontend

- **Severidad / confianza:** media / alta.
- **Ubicación:** `mobile-pagination.tsx:24-42`; `update-progress-table.tsx:234-252`; `use-mobile.ts:6-8`; `sidebar.tsx:174-197`; `accept-invitation.ts:18-31`.
- **Evidencia:** botones de icono sin nombre, snapshot SSR/cliente distinto, y aceptación seguida de `setActive` puede informar error tras haber aceptado.
- **Impacto:** lectores de pantalla, mismatch/parpadeo móvil y usuario bloqueado en estado contradictorio.
- **Corrección / aceptación:** nombres accesibles, snapshot de hidratación estable y fases recuperables; pruebas axe, móvil y fallo de red intermedio.

### M-11 — Cabeceras defensivas no son verificables desde el repositorio

- **Severidad / confianza:** media de hardening / media.
- **Ubicación:** `tfg/next.config.ts:8-20` y despliegue no inspeccionado.
- **Evidencia:** no se observa una política CSP/cabeceras completa en el código. El proveedor o proxy podría inyectarlas; por tanto, no se afirma una vulnerabilidad desplegada.
- **Impacto:** si tampoco existen en producción, menor defensa frente a XSS, framing, MIME sniffing y fuga de referrer.
- **Corrección / aceptación:** comprobar respuestas productivas y añadir CSP/`frame-ancestors`, `nosniff`, Referrer-Policy y Permissions-Policy sin romper Next/Convex.

## Hallazgos menores y pendientes

- `getCurrentSession` puede devolver temporalmente un usuario baneado/eliminado hasta la revocación asíncrona (`organizations.ts:64-102`); debería devolver `null` inmediatamente.
- El guardarraíl de funciones públicas solo inspecciona el primer nivel de `convex/`; una función futura anidada escaparía al test.
- El estado “vencido” captura `Date.now()` al montar y puede congelarse en sesiones largas.
- React Doctor actual puntúa 78/100 y plantea dos hipótesis de caché; deben confirmarse, no contarse como defectos. El escaneo local antiguo produce 509 avisos mayoritariamente heurísticos.
- El PDF no está etiquetado (`Tagged: no`), por lo que su accesibilidad estructural es limitada.
- Fuentes web sin `urldate`/versión y ODS sin fuentes primarias reducen trazabilidad bibliográfica.
- Las prioridades de requisitos no son totalmente individuales y varias formulaciones absolutas (“100 %”) carecen de universo de prueba.

## Coherencia requisitos–implementación–pruebas–memoria

La matriz completa está en `evidencias/matriz-requisitos.md`.

- Los mismos 77 IDs aparecen en requisitos y trazabilidad académica.
- 60/77 tienen etiqueta literal `@REQ`; 17 dependen de suite, inspección o evidencia estática.
- No se detectaron IDs de test ajenos al catálogo.
- Las versiones documentadas principales, separación `src/`/`convex/`/`tests`, 12 tablas propias + 8 de autenticación y arquitectura general coinciden con el repositorio.
- La cifra E2E de 24 specs, 71 casos de negocio y 74 ejecuciones es estructuralmente coherente.
- No son coherentes el inventario unitario/cobertura, el estado del gate, el umbral de ramas, la exportación, la procedencia de capturas y una referencia manual ausente.

## Resultados de ejecución

- `pnpm checks`: falla por formato; lint separado falla por un import no usado.
- tipos, unitarias 48/48 (385/385), cobertura, knip, traducciones, contratos y peers: pasan.
- build: pasa con tres URLs HTTPS válidas; falla con el entorno empaquetado.
- audit de producción, severidad alta: sin vulnerabilidades conocidas; no equivale a auditoría completa de devDependencies/cadena de suministro.
- E2E: 72 casos pasan en ejecución principal; Firefox/WebKit faltantes se instalaron y sus dos recorridos críticos pasan después. Resultado funcional 74/74, no una única ejecución verde.
- walkthrough TFG: pasa y produce 51 capturas.
- `make win`: pasa; 154 páginas y referencias resueltas, con avisos/defectos descritos.

## Fortalezas que conviene defender

- RLS centralizado y denegatorio por defecto, identidad/tenant derivados del servidor y defensa en profundidad en objetivos.
- Workflows con token de purga, continuaciones acotadas y protección específica contra finalización obsoleta.
- Progreso y métrica denormalizada se actualizan transaccionalmente.
- Pruebas de aislamiento intertenant para objetivos, progreso, notificaciones y logros.
- Internacionalización completa EN/ES y responsive real con tabla/tarjetas.
- Memoria honesta sobre ausencia de carga, auditoría WCAG, hardware físico y estudio de usuarios.
- Fecha de corte y uso prudente de `N/D` en el estado del arte.
- Declaración de IA transparente y responsabilidad final atribuida al autor.

## Limitaciones del análisis

- No se inspeccionó un despliegue productivo ni sus cabeceras, secretos, JWKS o rotación.
- H-01 está confirmado estáticamente por dos revisores, pero la reproducción intercalada es todavía criterio de aceptación, no un test ejecutado.
- La primera ejecución E2E quedó afectada por navegadores ausentes; los casos restantes se cerraron en ejecución focalizada posterior.
- No se realizó pentest, prueba de carga, auditoría WCAG formal ni estudio con usuarios.
- Las modificaciones locales forman parte deliberada del snapshot; por eso algunas diferencias con el PDF pueden ser posteriores a su generación.

## Conclusión

El TFG tiene sustancia técnica suficiente para una buena defensa, pero la versión actual mezcla un producto funcional con una cadena de evidencia y entrega todavía abierta. La prioridad no es añadir más funcionalidad: es cerrar el invariante multitenant, hacer verde el gate, corregir contradicciones objetivas, producir un PDF limpio y entregar un ZIP reconstruible. Tras esos P0, el discurso puede apoyarse con credibilidad en las fortalezas reales y delimitar con precisión las validaciones no realizadas.

Documentos complementarios: `seguridad.md`, `plan-priorizado.md`, `preguntas-tribunal.md` y `evidencias/`.
