# Resultados reproducibles de validación

Ejecución realizada sobre el snapshot descrito en `manifiesto.md`.

## Gate de aplicación

| Comprobación                     | Resultado actual                                                                                            |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile` | Pasa; 551 paquetes materializados desde el lockfile                                                         |
| `pnpm checks`                    | **Pasa**: formato, tipos app/Convex/Playwright, lint, Vitest, Knip, traducciones, contratos y peers         |
| `pnpm test` — repetición 1       | 48/48 ficheros y 385/385 aserciones pasan, pero exit 1 por un error interno no controlado del worker Vitest |
| `pnpm test` — repeticiones 2 y 3 | **Pasan**, 48/48 y 385/385, exit 0                                                                          |
| `pnpm test:coverage`             | **Pasa** y supera los umbrales configurados                                                                 |
| `pnpm build`                     | **Pasa** con tres URLs HTTPS sintéticas                                                                     |
| `pnpm knip`                      | Pasa                                                                                                        |
| `pnpm check-translations`        | Pasa: 1.008 claves EN y 1.008 ES                                                                            |
| `pnpm check-convex-contracts`    | Pasa: 79 archivos                                                                                           |
| `pnpm peers check`               | Pasa: sin conflictos declarados                                                                             |

La primera ejecución simple de Vitest terminó con `ReferenceError: process is not defined` en
`vitest/dist/chunks/init-forks.../executeTests`, después de pasar las 385 aserciones. No hubo
stack hacia código de aplicación. Las otras dos ejecuciones simples, cobertura y el gate final
pasaron. Se clasifica como **flake del runner/tooling (1 de 3)**, no como fallo funcional, pero
impide considerar el test runner completamente determinista.

## Cobertura

| Métrica    |              Cubierto | Umbral actual |
| ---------- | --------------------: | ------------: |
| Statements | 79,58 % (2.499/3.140) |          70 % |
| Branches   | 68,65 % (1.233/1.796) |          55 % |
| Functions  |     86,04 % (592/688) |          70 % |
| Lines      | 79,54 % (2.465/3.099) |          70 % |

La instrumentación solo incluye `convex/**/*.ts`. Por tanto, estos porcentajes **no miden** los
251 archivos TypeScript/TSX de `src/`. Entre las zonas sensibles con menor cobertura aparecen
`auth.ts` (43,66 % branches), `authAuditTriggers.ts` (36,36 %), la plataforma auth (19,17 %),
setup (57,57 %) y jobs de borrado de objetivos (53,96 %).

## Dependencias y supply chain

- `pnpm audit --prod --audit-level high`: **falla** por `nanoid@3.3.17`.
  [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8) afecta a
  `<3.3.18`; el riesgo concreto requiere invocar generadores personalizados con tamaño cero.
  No se demostró ese vector en la aplicación, pero el gate CI de auditoría queda rojo.
- Auditoría completa desde `moderate`: añade `lodash@4.17.23` en la cadena de la CLI `auth`,
  afectado por advisories high/moderate, incluido
  [GHSA-r5fr-rjxr-66jc](https://github.com/advisories/GHSA-r5fr-rjxr-66jc).
- `pnpm peers check` pasa. El lock resuelve `react-is@16.13.1` con React 19.2.8; Recharts
  documenta que ambos deben coincidir, pero build, gráficos y E2E actuales pasan. Se conserva
  como deuda de compatibilidad, no como vulnerabilidad confirmada.

## Playwright y Docker

- Inventario: **74 ejecuciones en 25 archivos**.
- Suite completa: **74/74 pasan en 7,7 minutos**.
- Chromium: 71 casos funcionales, más el setup compartido.
- Firefox y WebKit: un único smoke `@cross-browser-critical` en cada navegador.
- Recorrido crítico Chromium: dos repeticiones adicionales, ambas verdes; total **3/3**.
- Walkthrough visual: un test, exit 0, 24 capturas de setup, escritorio y móvil.

Los tests etiquetados `@cross-browser` no se seleccionan en Firefox/WebKit porque la
configuración busca exclusivamente `@cross-browser-critical`. La cifra 74 no debe interpretarse
como 74 casos ejecutados en tres navegadores.

## Diagnósticos dirigidos

Los siguientes tests se añadieron solo a la copia temporal y se eliminaron después:

1. **Categoría privada huérfana — confirmado.** Un miembro B no administrador y no colaborador
   borró por la función pública una categoría compartida usada por un objetivo privado de A.
   La categoría desapareció y el objetivo conservó el `categoryId` eliminado. 1/1, 2,15 s.
2. **Dashboard a escala — confirmado.** Con 1.002 objetivos, el top omitió el único objetivo al
   99 % situado en la fila 1.002 y próximos vencimientos omitió el único deadline activo situado
   tras 1.001 filas completadas. 2/2, 2,23 s.
3. **Cron de deadlines — confirmado.** La primera invocación leyó 100 objetivos activos vencidos
   fuera de la ventana y creó cero avisos; la continuación completó 102 lecturas y creó un único
   aviso actual. 1/1, 2,01 s.
4. **Borrado real de organización — revalidado.** Better Auth eliminó organización y memberships
   antes de devolver; una sesión previa quedó sin tenant efectivo y la mutación pública rechazó
   `NO_ACTIVE_ORG`. No persiste la ventana pública descrita el 10/08. Sí se reprodujo 2/2 que el
   cron inserta una notificación huérfana entre el delete y la fase correspondiente del cascade.

## Accesibilidad y renderizado UI

El harness temporal Playwright + axe 4.13.0 examinó home, objetivos y logros en escritorio, y
objetivos a 390×844:

- Home: cero violaciones.
- Objetivos desktop: un progressbar sin nombre y un nodo con contraste insuficiente.
- Logros desktop: 13 progressbars sin nombre y 27 nodos con contraste insuficiente.
- Objetivos móvil: un progressbar sin nombre y un nodo con contraste insuficiente.

Resultado agregado: **6 grupos de violación serious, 44 nodos afectados**. El test falló como
estaba previsto al exigir cero impactos serious/critical. La revisión visual también mostró la
clave literal `Objectives.trash.empty` en móvil, aunque las claves EN/ES estén sincronizadas.

React Doctor completó con 32/100 y 543 avisos sobre 178/461 archivos. La mayoría son heurísticas
o afectan generados/tests; no se contabilizan como 543 defectos. Sí sirvió para localizar casos
que se verificaron después manualmente, como recuperación RSC y posibles waterfalls.

## PDF

- Compilación XeLaTeX/Biber: exit 0, 154 páginas.
- SHA-256: `C256F04F7CCBD5B26C7DA8A78CD1DEBC6DCDCB79DA03133B64A657A1324C5B3C`.
- 20 `Overfull \hbox`, 85 `Underfull \hbox`, 8 caracteres U+FFFD ausentes y un flotante
  84,51581 pt demasiado alto.
- `Tagged: no`; todas las fuentes están embebidas.
- Las 154 páginas fueron renderizadas e inspeccionadas; el detalle está en `revision-pdf.md`.

## Limitaciones

- No se probó producción, carga real, backups/restore, rotación JWKS, SMTP externo ni cabeceras
  del proveedor.
- Los benchmarks usaron `convex-test`; confirman semántica y crecimiento, no facturación o
  latencia de Convex Cloud.
- Las capturas y axe no sustituyen lector de pantalla, usuarios reales ni una matriz completa de
  dispositivos.
