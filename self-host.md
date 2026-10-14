# Desarrollo autoalojado local

Este perfil sirve para desarrollo y pruebas. La verificación local no acredita un despliegue
productivo, rendimiento bajo carga ni funcionamiento sobre dispositivos físicos.

## Preparación

Utiliza Node 24.19.0, pnpm 12.9.1 y Docker Desktop. Ejecuta desde la raíz de la aplicación:

```bash
pnpm install --frozen-lockfile
pnpm run convex:local
pnpm run dev:front
```

El segundo comando inicia MySQL, Convex, su dashboard y MailDev. Despliega las funciones y escribe
las conexiones locales en `.env.local`. El tercero sirve Next.js en `http://localhost:3000`.
Completa `/setup` con el primer usuario registrado.

| Servicio                | Dirección habitual    |
| ----------------------- | --------------------- |
| Aplicación              | http://localhost:3000 |
| API Convex              | http://127.0.0.1:3210 |
| Acciones HTTP de Convex | http://127.0.0.1:3211 |
| Dashboard Convex        | http://127.0.0.1:6791 |
| Bandeja MailDev         | http://127.0.0.1:1080 |

Las imágenes están fijadas por digest en `infrastructure/docker-compose.yml`. MySQL es el
almacenamiento del backend autoalojado. La aplicación accede a Convex, sin una capa SQL propia.

[MailDev](https://github.com/maildev/maildev) captura el correo. El backend se autentica por SMTP
con las credenciales `maildev`/`maildev`. `MAILDEV_SMTP_PORT` y `MAILDEV_WEB_PORT` cambian los
puertos publicados.

## Sin Docker

Opción alternativa al perfil anterior, que sigue siendo el predeterminado. El propio CLI de Convex
descarga el backend y lo ejecuta como despliegue local, sin MySQL ni contenedores. Guarda sus datos
en SQLite dentro de `.convex/local/default`, ignorado por Git. También sirve su propio dashboard.

```bash
nvm use                           # Node 24: el backend local ejecuta las acciones "use node" con él
pnpm run convex:local:no-docker
pnpm dev
pnpm mail:local                   # en otra terminal: MailDev captura el correo
```

`convex:local:no-docker` arranca el backend, configura sus variables, despliega las funciones y se
detiene. Escribe `CONVEX_DEPLOYMENT` en `.env.local` y quita las variables `CONVEX_SELF_HOSTED_*`. A
partir de ahí, `pnpm dev` levanta el backend con los mismos datos, el dashboard y Next.js. Al cerrar
`pnpm dev` se detiene todo. Mantén Node 24 activo también para `pnpm dev`.

| Servicio                | Dirección habitual    |
| ----------------------- | --------------------- |
| API Convex              | http://127.0.0.1:3210 |
| Acciones HTTP de Convex | http://127.0.0.1:3211 |
| Dashboard Convex        | http://127.0.0.1:6790 |
| Bandeja MailDev         | http://127.0.0.1:1080 |

Aquí MailDev se ejecuta desde la dependencia de desarrollo del proyecto, sin instalar nada más.
`pnpm mail:local` lo arranca solo en `127.0.0.1`, con SMTP en el puerto 1025 y las mismas
credenciales. `MAILDEV_SMTP_PORT` y `MAILDEV_WEB_PORT` cambian los puertos de ambos lados. Sin
MailDev en marcha, el envío falla y el resto de la aplicación sigue funcionando. Para borrar los
datos de este despliegue, con `pnpm dev` detenido:

```bash
pnpm run convex:local:no-docker:reset
```

Ambos perfiles conservan sus datos por separado. Para volver a Docker basta con ejecutar
`pnpm run convex:local`, que restaura las variables de `.env.local`.

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

Los procesos hijos heredan las variables del terminal. Los scripts superponen encima las del stack
(URL, claves de Convex, MailDev). Las claves, el secreto de Better Auth y los JWKS permanecen en
archivos locales ignorados por Git. Los cambios de secretos del backend se envían por entrada
estándar, fuera de los argumentos del proceso.

No añadas credenciales a variables `NEXT_PUBLIC_*`. Conserva los secretos originales al restaurar
una copia si necesitas mantener válidas las sesiones y claves cifradas. La rotación requiere un
procedimiento separado, porque puede invalidarlas.

MailDev captura el correo en local. Este perfil configura SMTP interno y no envía correo a Resend.

## E2E

```bash
pnpm run playwright:install
pnpm run test:e2e
```

Cada ejecución usa un proyecto Docker independiente, MySQL interno y MailDev (bandeja en
http://127.0.0.1:1081). Sus volúmenes son efímeros. Si la ejecución falla, conserva informes y logs
en `reports/e2e`, además de las trazas y capturas de Playwright; si pasa, los borra.

### E2E sin Docker

```bash
nvm use                           # Node 24, igual que en desarrollo sin Docker
pnpm run test:e2e:no-docker
```

El script arranca como procesos normales el binario del backend de Convex y MailDev, en los mismos
puertos. La base SQLite y los ficheros del backend viven en un directorio temporal que se borra al
terminar, también si se interrumpe con Ctrl+C. No toca el despliegue local de desarrollo. Acepta los
mismos argumentos que `test:e2e`, que se pasan a Playwright.

El binario es el mismo que usa el CLI de Convex y comparte su caché (`~/.cache/convex/binaries`). Si
falta, se descarga de las releases de GitHub y se descomprime con `unzip`. La versión está fijada
para que las ejecuciones sean reproducibles; `E2E_CONVEX_BACKEND_VERSION` la cambia. Los logs del
backend y de MailDev quedan en `reports/e2e` cuando la ejecución falla.

Los e2e corren solo en Chrome de escritorio (Chromium de Playwright).
