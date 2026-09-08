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
consultas de salud. Compara el número de filas por tabla y un hash de los documentos ordenados. El
ensayo registrado en `reports/verification/operations.json` realizó esta comparación sobre las 23
tablas de aplicación y no encontró diferencias.

## Promoción y reversión

1. Ejecuta los checks, cobertura, build y E2E sobre el commit candidato.
2. Genera el SBOM, el inventario de licencias y el manifiesto de evidencias.
3. Etiqueta localmente el mismo commit que se usó para generar los artefactos.
4. Antes de promover una instalación existente, conserva una copia de sus datos y la versión de sus
   secretos.
5. Si la observación posterior muestra una regresión, vuelve a desplegar el tag anterior. Restaura
   los datos solo si la nueva versión los modificó de forma incompatible. Las migraciones de esta
   entrega son aditivas y no borran los datos de origen para construir agregados.

La promoción real a Vercel o Convex Cloud y la gestión de TLS, monitorización, alertas y copias
externas quedan fuera del ensayo local.
