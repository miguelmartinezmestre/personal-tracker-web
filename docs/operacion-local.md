# Operación local y recuperación

## Alcance del perfil

El perfil autoalojado documentado aquí sirve para desarrollo, pruebas y ensayos de recuperación. No
acredita un despliegue productivo. La aplicación usa Convex como API reactiva y MySQL como
almacenamiento interno del backend autoalojado.

## Arranque y detención

```bash
pnpm install --frozen-lockfile
pnpm run convex:local
pnpm run dev:front
```

`convex:local` conserva los volúmenes y las credenciales locales. Para detener los contenedores sin
borrar datos:

```bash
pnpm run convex:local:stop
```

El comando `pnpm run convex:local:reset` elimina los volúmenes gestionados y exige el argumento de
confirmación incluido en el script. Antes de usarlo, crea y comprueba una copia.

## Observación

- `docker compose -f infrastructure/docker-compose.yml ps` muestra la salud de los servicios.
- `docker compose -f infrastructure/docker-compose.yml logs --tail 200 backend` permite revisar los
  jobs y errores del backend. No publiques el log sin pasarlo por la redacción central de los
  scripts.
- MailHog muestra invitaciones, verificaciones y recuperación de contraseña en
  `http://127.0.0.1:8025`.
- `pnpm exec convex run maintenance:inspectOrphans '{"table":"objectives"}'` informa de datos
  huérfanos. El modo reparación exige una organización explícita y debe ejecutarse después de una
  copia.
- `pnpm exec convex run dashboard:rebuildAllDashboards '{}'` inicia una reconciliación aditiva de
  los agregados. Mientras queda trabajo pendiente, las lecturas responden `DASHBOARD_UPDATING` en
  lugar de mostrar cifras parciales.

## Copia y restauración

Con el entorno local seleccionado y antes de cualquier borrado:

```bash
pnpm exec convex export --include-file-storage --path .local-stack/backups/snapshot.zip
```

Guarda junto al fichero su hash SHA-256 y conserva también `.local-stack/credentials.json`. El
secreto de Better Auth y los JWKS intervienen en sesiones y datos cifrados. No copies estos ficheros
al repositorio ni al paquete de entrega.

Para restaurar en un backend local vacío:

```bash
pnpm exec convex import --replace-all --yes .local-stack/backups/snapshot.zip
```

Después de importar, despliega la misma versión de funciones, revisa los jobs y ejecuta las
consultas de salud. Compara el número de filas por tabla y un hash de los documentos ordenados. Las
copias corresponden al esquema de su versión; el código actual no incorpora migraciones de
documentos antiguos. `dashboard:rebuildAllDashboards` reconstruye los agregados de los documentos
del esquema vigente.

## Verificación de una entrega

1. Ejecuta `pnpm run ci` sobre la versión candidata. Incluye las comprobaciones estáticas, una sola
   pasada de las suites con cobertura, el build y los E2E.
2. Genera el SBOM, el inventario de licencias y el manifiesto de evidencias.
3. Etiqueta localmente el mismo commit que se usó para generar los artefactos.
4. Conserva las copias junto a la versión de código y las credenciales con las que se generaron.
5. Para repetir un ensayo, arranca un backend vacío con el esquema de esa versión.

La promoción real a Vercel o Convex Cloud y la gestión de TLS, monitorización, alertas y copias
externas quedan fuera del ensayo local.
