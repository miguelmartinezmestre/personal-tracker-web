# Dominio y permisos

Un usuario puede pertenecer a varias organizaciones, pero cada petición trabaja con una membresía
activa y una organización existente. Las cuentas eliminadas, bloqueadas o con sesión caducada
reciben la misma exigencia de autenticación antes de entrar en el dominio.

Los objetivos pueden ser privados o visibles para la organización. El propietario mantiene las
acciones sobre su objetivo. Los administradores de organización y el administrador global tienen las
capacidades previstas por la política. Los colaboradores privados reciben rol de lectura o de
edición de progreso. El backend calcula las capacidades y la interfaz solo muestra las acciones
permitidas.

Todos los miembros pueden crear y utilizar categorías de la organización. Solo el creador o un
administrador pueden cambiarlas o borrarlas. Las categorías sin creador son administrables solo por
administradores. Antes de borrar, el backend comprueba referencias después de autorizar al actor e
incluye objetivos privados y objetivos en la papelera.

Las operaciones globales comparten un módulo que protege al propio administrador, al usuario de
setup y al último administrador activo. La interfaz no usa las rutas administrativas genéricas de
Better Auth. La auditoría guarda actor, sujeto y diferencias sanitizadas.

Las transiciones de objetivos concentran el valor acumulado, estado, notificaciones, logros y
sincronización del workflow. Los trabajos comprueban que la organización y el actor siguen activos
antes de producir efectos.
