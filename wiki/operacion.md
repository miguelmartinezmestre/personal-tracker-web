# Operación

La guía completa está en [operación local y recuperación](../docs/operacion-local.md). El arranque
normal conserva los volúmenes. El borrado exige `pnpm run convex:local:reset` y una confirmación
explícita del script.

Los secretos se guardan bajo `.local-stack`, que Git ignora. Los scripts pasan los valores sensibles
por entrada estándar, redactan salida y comprueban el código de cada proceso. El E2E rechaza
credenciales de nube, almacenes externos y URLs que no sean loopback.

La herramienta `maintenance:inspectOrphans` informa por defecto. El modo de reparación exige una
organización concreta. Las cascadas de organización son idempotentes, revisan residuos al final y
recuperan sesiones en lotes antes de declarar el borrado completo.

El perfil autoalojado actual es de desarrollo. Esta entrega no valida TLS, alta disponibilidad,
copias remotas, alertas, rendimiento productivo ni una restauración sobre infraestructura real.
