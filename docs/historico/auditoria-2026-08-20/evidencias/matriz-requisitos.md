# Matriz de los 77 requisitos

Leyenda: **V** verificado en la ejecución actual; **P** parcial o con defecto confirmado;
**I** cubierto por inspección/suite, sin prueba literal dedicada. La presencia de una etiqueta
`@REQ` no demuestra por sí sola cumplimiento.

| Requisito              | Estado | Evidencia o reserva actual                                                    |
| ---------------------- | ------ | ----------------------------------------------------------------------------- |
| REQ-AUTENTICACION-001  | V      | Registro positivo/negativo y double-submit E2E; backend                       |
| REQ-AUTENTICACION-002  | V      | Login dentro del critical path; E2E 3/3                                       |
| REQ-AUTENTICACION-003  | P      | Solicitud neutral y token inválido; falta reset positivo MailHog→login        |
| REQ-AUTENTICACION-004  | V      | Perfil y contraseña E2E                                                       |
| REQ-AUTENTICACION-005  | V      | Logout y protección de rutas E2E                                              |
| REQ-AUTENTICACION-006  | V      | Listado/revocación de sesiones backend y E2E                                  |
| REQ-AUTENTICACION-007  | V      | Sesión actual protegida y cierre de otras                                     |
| REQ-AUTENTICACION-008  | V      | Revocación masiva probada                                                     |
| REQ-AUTENTICACION-009  | V      | Borrado de cuenta reautenticado, backend y E2E                                |
| REQ-OBJETIVOS-001      | V      | Creación E2E/backend                                                          |
| REQ-OBJETIVOS-002      | I      | Tipos y métricas cubiertos por backend; sin tag literal                       |
| REQ-OBJETIVOS-003      | V      | Edición E2E/backend                                                           |
| REQ-OBJETIVOS-004      | V      | Categoría/deadline/atributos E2E/backend                                      |
| REQ-OBJETIVOS-005      | I      | Estados y transiciones en suite backend                                       |
| REQ-OBJETIVOS-006      | V      | Completado automático E2E/backend                                             |
| REQ-OBJETIVOS-007      | V      | Detalle y progreso E2E                                                        |
| REQ-OBJETIVOS-008      | P      | Search funciona, pero solo devuelve hasta 50 y no pagina resultados           |
| REQ-PROGRESO-001       | V      | Alta de progreso E2E/backend                                                  |
| REQ-PROGRESO-002       | I      | Historial backend; sin tag literal                                            |
| REQ-PROGRESO-003       | V      | Editar/eliminar E2E/backend                                                   |
| REQ-PROGRESO-004       | P      | Gráficas positivas; no hay cobertura de error ni accesibilidad equivalente    |
| REQ-PROGRESO-005       | V      | Reconciliación/completado E2E/backend                                         |
| REQ-DASHBOARD-001      | P      | Contadores correctos en pequeño; truncan y pueden ser inexactos >1.000        |
| REQ-DASHBOARD-002      | P      | Top 5 omite dinámicamente la fila 1.002 más relevante                         |
| REQ-DASHBOARD-003      | P      | Agregación mensual usa prefijo acotado; exactitud global no garantizada       |
| REQ-DASHBOARD-004      | P      | Representación positiva; la propia memoria declara verificación parcial       |
| REQ-DASHBOARD-005      | P      | Próximos vencimientos omite dinámicamente un candidato tras 1.001 filas       |
| REQ-DASHBOARD-006      | V      | Actividad reciente visible y probada en el alcance acotado                    |
| REQ-EQUIPOS-001        | V      | Crear organización E2E/backend                                                |
| REQ-EQUIPOS-002        | V      | Invitar miembro con SMTP MailHog                                              |
| REQ-EQUIPOS-003        | V      | Roles y listado de miembros E2E/backend                                       |
| REQ-EQUIPOS-004        | V      | Eliminar miembro y restricciones de owner                                     |
| REQ-EQUIPOS-005        | V      | Invitaciones pendientes E2E                                                   |
| REQ-EQUIPOS-006        | V      | Aceptación crea membership y activa organización                              |
| REQ-EQUIPOS-007        | V      | Edición de organización E2E                                                   |
| REQ-EQUIPOS-008        | P      | Borrado positivo E2E; lifecycle concurrente pendiente de cierre definitivo    |
| REQ-NOTIFICACIONES-001 | P      | Generación funciona; cron reescanea histórico fuera de ventana                |
| REQ-NOTIFICACIONES-002 | V      | Listado E2E/backend                                                           |
| REQ-NOTIFICACIONES-003 | V      | Marcar, borrar y navegar E2E/backend                                          |
| REQ-NOTIFICACIONES-004 | I      | Preferencias backend; UI oculta fallos de query                               |
| REQ-ROLES-001          | V      | Protección de rutas y datos personales E2E                                    |
| REQ-ROLES-002          | P      | Panel restringido, pero rutas admin Better Auth eluden invariantes propias    |
| REQ-LOGROS-001         | V      | Definiciones y cálculo backend/E2E                                            |
| REQ-LOGROS-002         | V      | Niveles y puntos visibles                                                     |
| REQ-LOGROS-003         | V      | Logros individuales/organización                                              |
| REQ-LOGROS-004         | I      | Definiciones y cálculo en suite backend                                       |
| REQ-LOGROS-005         | V      | Progreso de logros backend/E2E                                                |
| REQ-LOGROS-006         | P      | Galería positiva; error de query puede dejar skeleton infinito                |
| REQ-LOGROS-007         | I      | Notificación de logro en suite backend                                        |
| REQ-LOGROS-008         | I      | Cálculo de streak en suite backend                                            |
| REQ-CATEGORIAS-001     | V      | Crear/asignar categoría E2E/backend                                           |
| REQ-CATEGORIAS-002     | I      | Categorías predeterminadas idempotentes en backend                            |
| REQ-CATEGORIAS-003     | P      | CRUD funciona, pero borrado puede dejar referencia privada huérfana           |
| REQ-CATEGORIAS-004     | I      | Filtro/uso por categoría cubierto por suite                                   |
| REQ-COLABORACION-001   | I      | Visibilidad y ownership en backend                                            |
| REQ-COLABORACION-002   | I      | Roles de colaborador en backend                                               |
| REQ-COLABORACION-003   | V      | Objetivo de organización visible a miembros                                   |
| REQ-COLABORACION-004   | V      | Private/organization en E2E/backend                                           |
| REQ-COLABORACION-005   | V      | Editor/viewer y progreso multiusuario E2E                                     |
| REQ-COLABORACION-006   | V      | Transferencia de ownership E2E/backend                                        |
| REQ-ADMIN-001          | P      | Panel protegido; plugin Better Auth permite otra interfaz administrativa      |
| REQ-ADMIN-002          | P      | Gestión existe; cobertura E2E parcial y búsqueda/aserciones mejorables        |
| REQ-ADMIN-003          | P      | Cambio de rol E2E; faltan invariantes HTTP directas de último/setup admin     |
| REQ-ADMIN-004          | V      | Sesiones por usuario backend/E2E                                              |
| REQ-ADMIN-005          | P      | Audit log visible, pero E2E no correlaciona recurso y faltan eventos BA       |
| REQ-NF-001             | I      | Política de contraseña verificada; implementación hash delegada a Better Auth |
| REQ-NF-002             | V      | Rutas, sesión y aislamiento principal E2E/backend                             |
| REQ-NF-003             | P      | No hay bypass cross-tenant hallado; sí integridad intra-org en categorías     |
| REQ-NF-004             | P      | Audit logs existen; cobertura de actor/eventos no es uniforme                 |
| REQ-NF-005             | V      | Validación frontend/backend y casos negativos                                 |
| REQ-NF-006             | P      | Responsive verificado visualmente; sin matriz móvil/axe completa              |
| REQ-NF-007             | P      | EN/ES sincronizados; se observó `Objectives.trash.empty` literal en móvil     |
| REQ-NF-008             | P      | Paginación principal existe; search y varias listas `take(1000)` no paginan   |
| REQ-NF-009             | V      | Tema cambia y persiste E2E                                                    |
| REQ-NF-010             | P      | Loading existe, pero varias queries convierten error en vacío/skeleton        |
| REQ-NF-011             | V      | Confirmaciones destructivas E2E; contraste destructivo requiere corrección    |
| REQ-NF-012             | V      | Command palette E2E                                                           |

## Resultado agregado

- 77/77 requisitos están inventariados.
- 60/77 tienen etiqueta literal `@REQ` en código o tests.
- 42 se clasifican **V**, 23 **P** y 12 **I** en esta auditoría. “P” no significa que toda la
  capacidad falte: identifica una condición de escala, error, seguridad o evidencia que impide
  formular el requisito de forma absoluta.
- La mayor discrepancia funcional está en dashboard/search a escala; la mayor discrepancia de
  calidad está en estados de error/accesibilidad; la mayor discrepancia académica son las cifras
  y evidencias no vinculadas al snapshot.

## Cifras que debe adoptar la memoria tras el cierre técnico

| Métrica                         |                        Snapshot 20/08/2026 |
| ------------------------------- | -----------------------------------------: |
| Ficheros Vitest                 |                                         48 |
| Tests Vitest                    |                                        385 |
| Cobertura S/B/F/L               |            79,58 / 68,65 / 86,04 / 79,54 % |
| Umbral real de ramas            |                                       55 % |
| Contratos Convex inspeccionados |                                79 archivos |
| Playwright                      | 74 ejecuciones / 25 archivos, 74/74 verdes |
| Traducciones                    |                        1.008 EN / 1.008 ES |
