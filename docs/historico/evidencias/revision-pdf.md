# Compilación y revisión visual del PDF

## Identidad y compilación

- Fuente: `D:\repos\tfg-folder\metricas-memoria`.
- Salida: `build/report.pdf`.
- SHA-256: `C4BD9CA3C1101DE1F15A12501ABB7946278A6ECAFD9751507EE15C5BFD5FAE9F`.
- Tamaño: 7.822.583 bytes; 154 páginas A4; PDF 1.5.
- `make win`: exit 0. No quedan citas ni referencias indefinidas al final.
- Todas las fuentes listadas están embebidas; el PDF no está cifrado ni contiene JavaScript.

## Avisos finales

- 20 `Overfull \\hbox`, máximo observado 55,55205 pt.
- 85 `Underfull \\hbox`.
- 8 avisos `Missing character` por U+FFFD.
- 1 flotante demasiado grande en 84,51581 pt (`desarrollo.tex:243-247`).
- Avisos benignos de compatibilidad de `biblatex` y `tracklang`.

## Revisión visual completa

Se renderizaron las 154 páginas a PNG a 90 dpi y se inspeccionaron diez hojas de contacto (páginas 1–16, 17–32, …, 145–154). Se ampliaron las páginas 20, 41–44, 60–62, 72, 124–126 y 154.

Hallazgos visuales confirmados:

1. En las páginas físicas 60–61, `basedatos.tex:484,491,494,499` imprime `�?ndices`, `�?ndice` y `�?ndices` en título, pie y cabeceras. También contamina el índice de tablas (página física 12).
2. La captura vertical del `sidebar` en la página física 72 ocupa prácticamente toda la altura y sitúa el pie en el límite inferior. Coincide con el aviso de flotante excesivo.
3. El mayor `Overfull`, 55,55205 pt, se manifiesta en la página física 111; también hay rutas largas desbordadas en bibliografía. Las páginas físicas 91–92 muestran bloques de código invadiendo visualmente la franja de cabecera.
4. Las páginas físicas 40 y 119 quedan casi vacías con un fragmento aislado. No son páginas ausentes, pero revelan una paginación mejorable.
5. La numeración visible de tablas salta de 6.5 a 6.7: no aparece una Tabla 6.6 en el PDF.
6. Las tablas apaisadas de trazabilidad (páginas físicas 124–126 y contiguas) son legibles al ampliar, pero su cuerpo es pequeño para proyección; conviene preparar una versión de defensa simplificada.
7. Diagramas y capturas se renderizan sin recursos ausentes.
8. La contraportada azul/negra de la página 154 parece intencional y no se clasifica como defecto.

## Accesibilidad del artefacto

`pdfinfo` informa `Tagged: no`. Por tanto, el PDF carece de estructura etiquetada para lectores de pantalla. Es una limitación de accesibilidad del documento, aunque la memoria declara que una auditoría WCAG completa queda fuera del alcance.
