# Decisiones

## Categorías compartidas con propiedad

Los miembros comparten el catálogo de la organización. La propiedad limita la modificación y el
borrado, mientras el uso sigue abierto a todos los miembros. Esta decisión evita duplicar categorías
y conserva un responsable claro.

## Agregados con generaciones

El dashboard no recorta los primeros 1.000 registros. Las mutaciones mantienen proyecciones por
audiencia y los backfills crean una generación nueva. La aplicación no mezcla datos parciales con
datos definitivos ni reconstruye eliminando el origen.

## Cursores cifrados y ligados al ámbito

La búsqueda y los listados largos usan cursores opacos que incluyen el usuario, la organización y
los filtros. El servidor consume candidatos ocultos hasta llenar la página o agotar un presupuesto
de lectura. Un cambio en el texto de una coincidencia almacenada invalida el cursor y fuerza una
lectura nueva.

## Licencias y dependencias

El código propio usa MIT. Las plantillas y recursos conservan sus atribuciones. El SBOM CycloneDX
1.6 y el inventario de licencias son artefactos separados. Renovate agrupa cambios, pero no integra
automáticamente versiones mayores ni cambios en autenticación, Convex o Next.js.

## Alcance aplazado

Aplicación móvil nativa, MCP, OAuth, passkeys, calendarios, métricas avanzadas y exportación o
importación de datos de usuario quedan como trabajo futuro. La copia operativa de Convex no se
presenta como función de exportación de la aplicación.
