# Arquitectura

La interfaz usa Next.js 16.3.0 y React 19.2.8. Los componentes de servidor resuelven la sesión
inicial y los componentes cliente mantienen formularios, navegación y suscripciones. El proxy añade
la política CSP con nonce y las cabeceras defensivas a cada respuesta.

Convex 1.43.0 aloja el dominio, las funciones públicas y los trabajos por lotes. Better Auth 1.6.23
gestiona usuarios, sesiones y organizaciones. Las funciones públicas de negocio usan la capa RLS;
seis puntos de bootstrap y sesión tienen excepciones explícitas. El check de contratos recorre todos
los subdirectorios y detecta también alias y accesos con corchetes.

El dashboard usa dos componentes Aggregate 0.2.2. Cada generación separa objetivos de organización,
objetivos privados por usuario y la vista administrativa. Los cambios en objetivos, colaboradores y
progreso actualizan los agregados dentro de la mutación. El backfill avanza en lotes y mantiene las
lecturas bloqueadas hasta que la generación está completa. Después limpia las generaciones
anteriores.

El perfil Docker local incluye Convex, MySQL, su dashboard y MailHog. El perfil E2E usa volúmenes
propios y efímeros, direcciones loopback y credenciales sintéticas. No acepta destinos externos.
