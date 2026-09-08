# Calidad y pruebas

`pnpm run checks` ejecuta formato, cinco proyectos TypeScript, lint, pruebas backend y frontend,
código sin uso, traducciones, contratos Convex, trazabilidad de requisitos y dependencias pares.
`pnpm run test:coverage` conserva informes separados. El backend exige 70 % en sentencias, funciones
y líneas, y 65 % en ramas.

El inventario `docs/requirements.json` contiene los 77 requisitos de la memoria. Cada requisito
enlaza una prueba automatizada o una revisión de código existente. El check rechaza identificadores
desconocidos y ficheros de evidencia ausentes. Esta trazabilidad no sustituye una evaluación con
usuarios.

Playwright cubre Chromium y replica registro, rutas protegidas e idiomas en Firefox y WebKit. El
proyecto `mobile-webkit` usa un iPhone 13 emulado. El restablecimiento de contraseña recorre
MailHog, inicia sesión con la clave nueva y rechaza la anterior. Axe revisa las rutas principales en
tema claro y oscuro; el criterio automatizado rechaza incidencias serias o críticas.

React Doctor se usa como diagnóstico. Sus avisos genéricos sobre invalidación no se aplican a las
suscripciones reactivas de Convex si no existe una reproducción. Los errores de hidratación, estado
derivado y nombres accesibles sí se corrigen y se verifican por separado.

CI publica durante 90 días cobertura, resultados, trazas, capturas y logs redactados, incluso si
falla un job. También comprueba la deriva del código generado y crea un manifiesto de evidencias.
