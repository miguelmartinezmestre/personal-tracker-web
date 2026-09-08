# Compilación y revisión visual del PDF

## Identidad

- Fuentes: `metricas-memoria` en `a913337faebfe06b5ee2fe8c0f7965ff72beeb53`.
- Compilación limpia en copia temporal con XeLaTeX, makeglossaries y Biber 2.20.
- Salida: 154 páginas A4, 7.822.585 bytes.
- SHA-256: `C256F04F7CCBD5B26C7DA8A78CD1DEBC6DCDCB79DA03133B64A657A1324C5B3C`.
- Fuentes embebidas: sí.
- PDF etiquetado: no.
- Referencias/citas sin resolver tras la pasada final: ninguna detectada.

## Avisos de compilación

| Tipo                       |      Cantidad / máximo |
| -------------------------- | ---------------------: |
| `Overfull \hbox`           | 20; máximo 55,55205 pt |
| `Underfull \hbox`          |                     85 |
| `Missing character` U+FFFD |                      8 |
| `Float too large`          |         1; 84,51581 pt |

## Inspección visual

Se renderizaron las 154 páginas a PNG a 90 dpi. Se revisaron 13 hojas de contacto y se abrieron
a resolución original las páginas sospechosas por log y contenido.

Hallazgos visibles:

1. **Caracteres corruptos.** La página física 60 (numeración impresa 47) muestra `?ndices
definidos`, `�ndice` en la tabla y el mismo glifo en el caption. Proviene de U+FFFD en
   `basedatos.tex` y también contamina el índice de tablas.
2. **Flotante/paginación.** La página física 71 (impresa 58) queda más de media página vacía antes
   de desplazar la captura del sidebar. La compilación confirma un exceso de 84,51581 pt.
3. **Desbordamientos.** Rutas e identificadores largos invaden márgenes, especialmente las
   descripciones del modelo, `getObjectivesWithMostProgress`, `convex/achievements.ts`, el
   inventario de tests y referencias técnicas.
4. **Arquitectura desactualizada.** En la página física 90 (impresa 77) el texto aún atribuye la
   política a `convex/platform/rls/policies.ts`, aunque el WIP la divide en reglas por tabla.
5. **Evidencia obsoleta.** Las páginas físicas 114–116 declaran 47 ficheros/381 tests, cobertura
   79,56/68,14/83,43/81,08 y umbral de ramas 65 %. El snapshot real obtiene 48/385,
   79,58/68,65/86,04/79,54 y configura 55 %.
6. **Capacidad inexistente.** La figura y el texto de exportación CSV/Excel permanecen aunque la
   aplicación actual no ofrece esa función.
7. **Composición irregular.** Hay páginas con grandes vacíos alrededor de aperturas de capítulo,
   figuras y secciones finales. No impide la lectura, pero reduce el acabado profesional.

Aspectos positivos:

- Portada, jerarquía, tipografía y color son consistentes.
- Las 47 figuras referenciadas existen y se renderizan.
- El modelo de datos conserva buena legibilidad general pese a los identificadores largos.
- Bibliografía: 31 claves citadas y 31 entradas, sin huérfanas.

## Accesibilidad del artefacto

`pdfinfo` informa `Tagged: no`. Las figuras no tienen un equivalente estructural verificable en
el árbol PDF y no se validó orden de lectura con lector de pantalla. Para una entrega académica
convencional puede no ser requisito formal, pero contradice una aspiración de accesibilidad
integral y debe aparecer como mejora, no como control ya satisfecho.

## Criterio de cierre

La versión final debe compilar sin U+FFFD ni float excesivo, eliminar o justificar cada overflow
material, actualizar cifras/figuras desde el mismo commit y repetir la inspección de las 154
páginas. El etiquetado PDF puede quedar como P2 si el plazo de defensa es prioritario.
