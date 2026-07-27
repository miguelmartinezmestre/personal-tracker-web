# Self-host local (Convex + Next.js)

Guia para levantar el proyecto en modo self-hosted en local.

## Requisitos

- Docker Desktop activo
- Node.js >=22.21.1
- pnpm 11.0.8

## 1) Instalar dependencias

```bash
pnpm install
```

## 2) Levantar Convex self-hosted + MailHog

Ruta recomendada desde la raiz del repo:

```bash
pnpm run convex:local
```

Este script levanta MySQL, Convex backend, Convex dashboard y MailHog. Tambien genera la admin key,
configura las variables de Convex, despliega las funciones y actualiza `/.env.local` con las URLs
locales, incluida `NEXT_PUBLIC_SITE_URL`.

> ⚠️ **Destructivo:** `pnpm run convex:local` borra la base de datos local en cada ejecucion
> (`docker compose down -v` + limpieza de `infrastructure/mysql-data*`) y regenera un
> `BETTER_AUTH_SECRET` nuevo, lo que invalida todas las sesiones. No lo uses para reiniciar un stack
> con datos que quieras conservar.
>
> Ademas, el script **fuerza el proveedor de correo a MailHog** (sobrescribe
> `EMAIL_PROVIDER`/`SMTP_*` en el deployment), asi que la ruta de Resend no se puede probar con este
> script.

Comprobacion rapida:

```bash
docker compose -f infrastructure/docker-compose.yml ps
curl http://127.0.0.1:3210/version
curl http://127.0.0.1:8025/api/v2/messages
```

MailHog queda disponible en:

- SMTP interno para Convex: `mailhog:1025`
- UI local: http://127.0.0.1:8025

## 3) Ruta manual: obtener la admin key de Convex

Solo necesitas estos pasos manuales si decides levantar el stack con `docker compose` en lugar de
`pnpm run convex:local`:

Genera una contraseña local y pásala tanto a MySQL como al backend. El compose no contiene
credenciales por defecto y todos los puertos publicados se enlazan exclusivamente a `127.0.0.1`:

```bash
export MYSQL_ROOT_PASSWORD="$(node --input-type=module -e "import { randomBytes } from 'node:crypto'; console.log(randomBytes(24).toString('hex'))")"
export DATABASE_URL="mysql://root:${MYSQL_ROOT_PASSWORD}@mysql:3306/convex_self_hosted"
export MYSQL_URL="mysql://root:${MYSQL_ROOT_PASSWORD}@mysql:3306"
docker compose -f infrastructure/docker-compose.yml up -d mysql mailhog backend dashboard
```

Estas variables solo viven en la terminal actual. No reutilices esta configuración HTTP local para
un despliegue expuesto a Internet.

```bash
pnpm run generate-admin-key
```

Guarda el valor que empieza por `convex-self-hosted|...`.

## 4) Ruta manual: configurar .env.local

Crea o actualiza `/.env.local` con:

```env
# Convex self-hosted
CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3210
CONVEX_SELF_HOSTED_ADMIN_KEY=convex-self-hosted|<TU_ADMIN_KEY>

# Frontend -> Convex
NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210
NEXT_PUBLIC_CONVEX_SITE_URL=http://127.0.0.1:3211

# URL de la app
NEXT_PUBLIC_SITE_URL=http://localhost:3000

```

Notas:

- Usa `.env.local` (no `.env`) para desarrollo local en Next.js.
- Si tienes `CONVEX_DEPLOYMENT` de cloud en `.env.local`, comentalo o eliminalo.
- El stack local usa HTTP y `DO_NOT_REQUIRE_SSL=1`; una instalación de producción debe usar TLS y
  `DO_NOT_REQUIRE_SSL=0`.

## 5) Primer acceso — Setup Wizard

Al acceder a la app por primera vez (sin usuarios), seras redirigido automaticamente a `/setup`. El
wizard guia la configuracion inicial: nombre de la plataforma, cuenta admin, organizacion,
categorias y politica de registro. Con `SITE_URL` en `localhost`, el campo `SETUP_SECRET` se puede
dejar vacio.

Si expones la instalacion en un host que no sea loopback, antes de desplegar las funciones debes
configurar un secreto de bootstrap independiente. No reutilices `BETTER_AUTH_SECRET`:

```bash
SETUP_SECRET="$(node --input-type=module -e "import { randomBytes } from 'node:crypto'; console.log(randomBytes(32).toString('base64url'))")"
pnpm exec convex env set SETUP_SECRET "$SETUP_SECRET"
```

Introduce ese mismo valor en el campo `SETUP_SECRET` del wizard. El backend exige la cabecera
durante el primer registro y deja de usarla cuando ya existen los ajustes de plataforma. No guardes
el valor en una variable `NEXT_PUBLIC_*`.

## 6) Configurar variables del backend (Convex)

`pnpm run convex:local` configura estas variables automaticamente. Si sigues la ruta manual,
configuralas con los comandos siguientes.

Genera un secreto nuevo (no lo subas a Git):

```bash
node --input-type=module -e "import { randomBytes } from 'node:crypto'; console.log(randomBytes(32).toString('base64'))"
```

Configura variables en Convex (reemplaza el placeholder):

```bash
pnpm exec convex env set SITE_URL http://localhost:3000
pnpm exec convex env set BETTER_AUTH_SECRET "<TU_BETTER_AUTH_SECRET>"
pnpm run generate-jwks
pnpm exec convex env set EMAIL_PROVIDER smtp
pnpm exec convex env set EMAIL_FROM "Metricas <noreply@metricas.local>"
pnpm exec convex env set SMTP_HOST mailhog
pnpm exec convex env set SMTP_PORT 1025
pnpm exec convex env set SMTP_SECURE false
pnpm exec convex env set SMTP_USER mailhog
pnpm exec convex env set SMTP_PASSWORD mailhog
```

### Opciones de email

El backend envia correos transaccionales desde Convex. Actualmente se usan para reset de contrasena
e invitaciones de organizacion.

El proveedor se selecciona con `EMAIL_PROVIDER`:

| Opcion             | Uso recomendado                            | Variables principales                                                               |
| ------------------ | ------------------------------------------ | ----------------------------------------------------------------------------------- |
| `smtp` con MailHog | Desarrollo local y e2e                     | `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` |
| `resend`           | Produccion sencilla con dominio verificado | `EMAIL_FROM`, `RESEND_API_KEY`                                                      |
| `smtp` generico    | Produccion con un proveedor SMTP externo   | `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` |

#### MailHog local

MailHog es la configuracion usada por `pnpm run convex:local`. Captura los correos en una UI local y
no envia mensajes reales.

```bash
pnpm exec convex env set EMAIL_PROVIDER smtp
pnpm exec convex env set EMAIL_FROM "Metricas <noreply@metricas.local>"
pnpm exec convex env set SMTP_HOST mailhog
pnpm exec convex env set SMTP_PORT 1025
pnpm exec convex env set SMTP_SECURE false
pnpm exec convex env set SMTP_USER mailhog
pnpm exec convex env set SMTP_PASSWORD mailhog
```

#### Resend

Resend es la opcion mas directa para produccion si tienes un dominio verificado. Si `EMAIL_PROVIDER`
no se configura, el codigo usa `resend` por defecto.

```bash
pnpm exec convex env set EMAIL_PROVIDER resend
pnpm exec convex env set EMAIL_FROM "Metricas <noreply@tu-dominio.com>"
pnpm exec convex env set RESEND_API_KEY "<TU_RESEND_API_KEY>"
```

#### SMTP generico

Usa esta opcion si ya tienes un proveedor con SMTP, como Brevo, SendGrid, Mailgun, Amazon SES,
Postmark, Gmail SMTP o un servidor propio.

```bash
pnpm exec convex env set EMAIL_PROVIDER smtp
pnpm exec convex env set EMAIL_FROM "Metricas <noreply@tu-dominio.com>"
pnpm exec convex env set SMTP_HOST smtp.example.com
pnpm exec convex env set SMTP_PORT 587
pnpm exec convex env set SMTP_SECURE false
pnpm exec convex env set SMTP_USER "<TU_SMTP_USER>"
pnpm exec convex env set SMTP_PASSWORD "<TU_SMTP_PASSWORD>"
```

Notas:

- Para puerto `465`, usa normalmente `SMTP_SECURE true`.
- Para puerto `587`, usa normalmente `SMTP_SECURE false`.
- Proveedores por API propia, como SendGrid API, Mailgun API o SES SDK, requeririan ampliar el
  codigo. Ahora mismo `EMAIL_PROVIDER` solo soporta `resend` y `smtp`.

Si `convex env set` falla por autenticacion, exporta en tu terminal:

```bash
export CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3210
export CONVEX_SELF_HOSTED_ADMIN_KEY=convex-self-hosted|<TU_ADMIN_KEY>
```

## 7) Arrancar entorno de desarrollo

Si ya ejecutaste `pnpm run convex:local`, arranca Next.js:

```bash
pnpm dev:front
```

Si quieres que Convex redespliegue funciones al editar backend, usa otro terminal:

```bash
pnpm dev:convex
```

## 8) Probar envios con MailHog

1. Abre http://127.0.0.1:8025.
2. Desde la app, solicita un reset de contrasena o envia una invitacion de organizacion.
3. Verifica el mensaje capturado en MailHog. No se envia ningun correo real.

## 9) Verificacion

- App: http://localhost:3000
- Convex backend: http://127.0.0.1:3210/version
- Convex site proxy: http://127.0.0.1:3211
- Dashboard Convex: http://127.0.0.1:6791
- MailHog UI: http://127.0.0.1:8025

## Problemas comunes

- CORS/Auth falla: revisa que `SITE_URL` y `NEXT_PUBLIC_SITE_URL` sean la misma URL.
- Convex CLI apunta al deploy incorrecto: valida `CONVEX_SELF_HOSTED_URL` y
  `CONVEX_SELF_HOSTED_ADMIN_KEY`.
- Cambiaste `BETTER_AUTH_SECRET`: vuelve a ejecutar `pnpm run generate-jwks`.

## Parar y limpiar stack

```bash
docker compose -f infrastructure/docker-compose.yml down -v --remove-orphans
```
