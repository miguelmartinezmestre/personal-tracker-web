# Self-host local (Convex + Next.js)

Guia para levantar el proyecto en modo self-hosted en local.

## Requisitos

- Docker Desktop activo
- Node.js >=22.21.1
- pnpm 10.11.0

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
locales.

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

# Solo para dev/test — habilita el endpoint /api/test/setup-platform
ALLOW_SETUP_TEST=true
```

Notas:

- Usa `.env.local` (no `.env`) para desarrollo local en Next.js.
- Si tienes `CONVEX_DEPLOYMENT` de cloud en `.env.local`, comentalo o eliminalo.

## 5) Primer acceso — Setup Wizard

Al acceder a la app por primera vez (sin usuarios), seras redirigido automaticamente a `/setup`. El
wizard guia la configuracion inicial: nombre de la plataforma, cuenta admin, organizacion,
categorias y politica de registro.

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
