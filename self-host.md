# Desarrollo autoalojado local

Este perfil sirve para desarrollo y pruebas. La verificación local no acredita un despliegue
productivo, rendimiento bajo carga ni funcionamiento sobre dispositivos físicos.

## Preparación

Utiliza Node 24.19.0, pnpm 12.3.4 y Docker Desktop. Ejecuta desde la raíz de la aplicación:

```bash
pnpm install --frozen-lockfile
pnpm run convex:local
pnpm run dev:front
```

El segundo comando inicia MySQL, Convex, su dashboard y MailHog. Despliega las funciones y escribe
las conexiones locales en `.env.local`. El tercero sirve Next.js en `http://localhost:3000`.
Completa `/setup` con el primer usuario registrado.

| Servicio                | Dirección habitual    |
| ----------------------- | --------------------- |
| Aplicación              | http://localhost:3000 |
| API Convex              | http://127.0.0.1:3210 |
| Acciones HTTP de Convex | http://127.0.0.1:3211 |
| Dashboard Convex        | http://127.0.0.1:6791 |
| Bandeja MailHog         | http://127.0.0.1:8025 |

Las imágenes están fijadas por digest en `infrastructure/docker-compose.yml`. MySQL es el
almacenamiento del backend autoalojado. La aplicación accede a Convex, sin una capa SQL propia.

## Detención, reinicio y borrado explícito

```bash
pnpm run convex:local:stop
pnpm run convex:local
```

La detención y el arranque normales conservan los volúmenes y reutilizan las credenciales de
`.local-stack/credentials.json`. No borres este archivo para solucionar un fallo de arranque. Si hay
una base anterior sin credenciales guardadas, aporta su contraseña existente mediante el entorno
antes de adoptarla.

Para eliminar deliberadamente los datos de desarrollo y empezar de nuevo:

```bash
pnpm run convex:local:reset
```

Este último comando incluye `--reset --confirm`. Elimina únicamente los volúmenes y directorios
locales que gestiona el perfil. Comprueba antes que dispones de la copia que quieras conservar.

## Variables y secretos

Los scripts construyen el entorno mediante listas permitidas. No copian indiscriminadamente las
variables del terminal. Las claves de Convex, el secreto de Better Auth y los JWKS permanecen en
archivos locales ignorados por Git. Los cambios de secretos del backend se envían por entrada
estándar, fuera de los argumentos del proceso y de los mensajes de error.

No añadas credenciales a variables `NEXT_PUBLIC_*`. Conserva los secretos originales al restaurar
una copia si necesitas mantener válidas las sesiones y claves cifradas. La rotación requiere un
procedimiento separado, porque puede invalidarlas.

MailHog captura el correo en local. Este perfil configura SMTP interno y no envía correo a Resend.

## E2E

```bash
pnpm run playwright:install
pnpm run test:e2e
```

Cada ejecución usa un proyecto Docker independiente, MySQL interno, direcciones loopback y MailHog.
Sus volúmenes son efímeros. El ejecutor rechaza configuración de servicios externos y crea secretos
sintéticos propios para el bootstrap. Al terminar conserva informes y logs redactados en
`reports/e2e`, además de las trazas y capturas de Playwright.

Los proyectos incluyen Chromium, Firefox, WebKit y `mobile-webkit`. El perfil móvil es emulado.
Consulta el [procedimiento operativo](docs/operacion-local.md) para copias y restauración de la
misma versión, reconstrucción de agregados, observación y verificación de entregas.
