# Entrega reproducible

La entrega se genera únicamente desde los tags coordinados `tfg-v1.0.0` de la aplicación y la
memoria. El script usa `git archive`, por lo que excluye dependencias, secretos, bases de datos,
volúmenes y cualquier archivo local no versionado. Los ejemplos y la configuración necesarios para
instalar el proyecto sí quedan incluidos.

Desde PowerShell, en el repositorio de la aplicación:

```powershell
./scripts/build-release-package.ps1 `
  -ThesisRepository ../metricas-memoria `
  -OutputDirectory ../release
```

El resultado contiene:

- `codigo-aplicacion/`: código, wiki, documentación e inventario de evidencias;
- `memoria-fuentes/`: fuentes LaTeX, figuras D2 y presentación versionada;
- `entregables/`: PDF y PPTX finales;
- `evidencias/`: logs redactados, cobertura e informe Playwright de la ejecución etiquetada;
- `manifest.json`: ambos tags, commits, tamaños y hashes SHA-256;
- `SHA256SUMS.txt`: comprobación independiente de todos los archivos;
- `metricas-tfg-1.0.0.zip.sha256`: hash del paquete comprimido.

Para verificar una copia extraída, se instala con Node 24.19.0 y pnpm 12.3.4 y se ejecutan
`pnpm run checks` y `pnpm run build`. La matriz E2E se ejecuta desde el tag sobre el stack Docker
efímero descrito en [operación local](operacion-local.md).
