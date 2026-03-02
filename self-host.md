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

## 2) Levantar Convex self-hosted

Desde la raiz del repo:

```bash
docker compose -f infrastructure/docker-compose.yml up -d
```

Comprobacion rapida:

```bash
docker compose -f infrastructure/docker-compose.yml ps
curl http://127.0.0.1:3210/version
```

## 3) Obtener la admin key de Convex

```bash
pnpm run generate-admin-key
```

Guarda el valor que empieza por `convex-self-hosted|...`.

## 4) Configurar .env.local

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

# Solo para dev/test
ALLOW_PROMOTE_DEV=true
```

Notas:

- Usa `.env.local` (no `.env`) para desarrollo local en Next.js.
- Si tienes `CONVEX_DEPLOYMENT` de cloud en `.env.local`, comentalo o eliminalo.

## 5) Configurar variables del backend (Convex)

Genera un secreto nuevo (no lo subas a Git):

```bash
node --input-type=module -e "import { randomBytes } from 'node:crypto'; console.log(randomBytes(32).toString('base64'))"
```

Configura variables en Convex (reemplaza el placeholder):

```bash
pnpm exec convex env set SITE_URL http://localhost:3000
pnpm exec convex env set BETTER_AUTH_SECRET "<TU_BETTER_AUTH_SECRET>"
pnpm run generate-jwks
```

Si `convex env set` falla por autenticacion, exporta en tu terminal:

```bash
export CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3210
export CONVEX_SELF_HOSTED_ADMIN_KEY=convex-self-hosted|<TU_ADMIN_KEY>
```

## 6) Arrancar entorno de desarrollo

Terminal 1:

```bash
pnpm dev:convex
```

Terminal 2:

```bash
pnpm dev
```

## 7) Verificacion

- App: http://localhost:3000
- Convex backend: http://127.0.0.1:3210/version
- Convex site proxy: http://127.0.0.1:3211
- Dashboard Convex: http://127.0.0.1:6791

## Problemas comunes

- CORS/Auth falla: revisa que `SITE_URL` y `NEXT_PUBLIC_SITE_URL` sean la misma URL.
- Convex CLI apunta al deploy incorrecto: valida `CONVEX_SELF_HOSTED_URL` y
  `CONVEX_SELF_HOSTED_ADMIN_KEY`.
- Cambiaste `BETTER_AUTH_SECRET`: vuelve a ejecutar `pnpm run generate-jwks`.

## Parar y limpiar stack

```bash
docker compose -f infrastructure/docker-compose.yml down -v --remove-orphans
```
