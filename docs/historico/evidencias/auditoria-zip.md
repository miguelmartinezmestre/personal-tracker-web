# Auditoría de `tfg.zip`

## Identidad

- Ruta: `D:\repos\tfg-folder\tfg.zip`
- Tamaño: 134.521.522 bytes.
- SHA-256: `0096CA725A8F0633F1E309BF99FE305BA9BBB47AEC7F8445E28C154F2FFD3977`.
- Entradas: 2.163; tamaño descomprimido: 195.778.708 bytes.
- Directorio raíz: `tfg/`.

## Correspondencia

Se compararon por bytes las 1.350 entradas ajenas a `.git/` y `.env.local` con el árbol de trabajo analizado: 1.350 idénticas, 0 distintas y 0 ausentes. Por tanto, el ZIP representa el árbol sucio actual con precisión de contenido.

Sin embargo, `tfg/.git/HEAD` apunta a `refs/heads/chore/deps-2026-08` y la referencia embebida resuelve a `c07764d13786694cae5f569ead311369f527d502`, que no incluye las 31 modificaciones seguidas ni los cuatro grupos de archivos no seguidos. El archivo es fiel a los bytes, pero no es reproducible a partir del commit que lleva dentro.

## Higiene y seguridad

- Incluye toda la carpeta `.git/`: 917 commits accesibles, objetos, reflogs, índice, configuración y URL remota.
- Incluye `.env.local`. En la versión actual solo contiene `NEXT_PUBLIC_CONVEX_URL` y `NEXT_PUBLIC_CONVEX_SITE_URL`; son variables públicas y no se observó un secreto actual.
- El historial contiene un `.env` en el commit inicial con una `DATABASE_URL` de forma `mysql://usuario:contraseña@...`; parece un valor local/de ejemplo, pero demuestra que el ZIP hace recuperable contenido borrado del historial.
- La URL remota no contiene credenciales embebidas.
- No se encontraron patrones actuales de claves privadas, tokens `ghp_`, claves `AKIA` o secretos `sk-` fuera de `.git`.

## Conclusión

El ZIP no debe entregarse así. Debe generarse desde un commit etiquetado, mediante una lista de inclusión, sin `.git`, `.env*`, caches, resultados ni dependencias. El cierre se acepta cuando un ZIP regenerado tiene manifiesto, hash, commit coincidente y una extracción limpia que instala, valida y compila siguiendo instrucciones documentadas.

