# Guía de defensa

## Relato de 18 minutos

| Tiempo      | Contenido                                 |
| ----------- | ----------------------------------------- |
| 0:00–1:20   | Problema, objetivo y alcance real         |
| 1:20–3:00   | Requisitos y usuarios del sistema         |
| 3:00–5:30   | Arquitectura y modelo multitenant         |
| 5:30–8:20   | Objetivos, progreso y colaboración        |
| 8:20–10:30  | Permisos, administración y borrados       |
| 10:30–13:10 | Agregados, paginación y jobs              |
| 13:10–15:50 | Verificación automatizada y accesibilidad |
| 15:50–17:10 | Operación reproducible y artefactos       |
| 17:10–18:00 | Limitaciones y trabajo futuro             |

## Respuestas breves

**¿Por qué Convex?** La reactividad reduce código de sincronización de interfaz y mantiene las
mutaciones transaccionales. El coste es depender de sus límites y diseñar índices, lotes y RLS de
forma explícita.

**¿Cómo se evita una fuga entre organizaciones?** La sesión solo elige una membresía cuya
organización existe. Las funciones de negocio usan RLS y las consultas paginadas vuelven a validar
cada documento. Los agregados separan audiencias de administración, organización y usuario.

**¿Por qué no se cuenta directamente?** Una lectura completa sobre miles de filas supera los
presupuestos de una función reactiva. Las mutaciones mantienen agregados exactos y el backfill
reanudable reconstruye datos anteriores.

**¿Qué significa "validado"?** La entrega tiene verificación técnica automatizada y ensayos locales.
No hubo estudio con usuarios, cuestionario SUS, dispositivos físicos ni medición de carga en
producción.

**¿Qué ocurre si falla la activación tras aceptar una invitación?** La aceptación no se repite. La
interfaz conserva la organización pendiente y reintenta solo la activación y la actualización de la
sesión.

**¿Qué protege al último administrador?** Un módulo común bloquea su eliminación, bloqueo o pérdida
de rol. También protege la propia cuenta del actor y el usuario que completó el setup.

**¿Cómo se recupera una copia?** Se restaura el snapshot en un backend local vacío, se despliega el
mismo código y se comparan filas y hashes. El ensayo sintético de esta entrega comparó las 23 tablas
de aplicación.
