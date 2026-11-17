# Informe editorial · Lote 15 (Ciencia y Tecnología 5.º, bloque «La célula» y afines)

Fecha: 2026-11-16. Autor: agente Claude (Sonnet 5.5). Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. No se actualizaron huellas, estado, specs ni BD.

## Claves y recursos

Cada clase tiene 10 momentos: idea inicial sin imagen, recurso de situación o mapa, ejemplo 1 (situación y razonamiento), ejemplo 2 (situación y razonamiento), «Error frecuente», tres pasos y comprobación nueva con una sola respuesta correcta.

| Clave | Archivo del banco | Momentos | Recursos (3 por clave) | Correcta |
|---|---|---|---|---|
| `cyt.p5.lupa-y-microscopio` (elevada desde borrador) | `la-celula.json` | 10 | SVG partes, SVG lentes 10×/4×-10×-40×, SVG campos de menor y mayor aumento | b |
| `cyt.p5.partes-de-la-celula` | `la-celula.json` | 10 | SVG mapa rotulado, SVG intercambio agua/desechos, SVG célula con marcas 1-2-3 | c |
| `cyt.p5.pared-cloroplastos-vacuola` | `la-celula.json` | 10 | SVG célula vegetal rotulada, SVG hoja con ampliación, SVG dos plantas con y sin riego | a |
| `cyt.p5.nutrientes-oxigeno-celulas` | `la-celula.json` | 10 | SVG camino, SVG vaso-célula, Z-Image niño con lentejas | b |
| `cyt.p5.observacion-celulas-cebolla` | `la-celula.json` | 10 | Z-Image preparación de muestra, SVG campos cebolla/mucosa, SVG preparación en tres paneles | c |
| `cyt.p5.reproduccion-seres-vivos` | `reproduccion-de-los-seres-vivos.json` | 10 | SVG 1 o 2 progenitores, Z-Image llama y cría, SVG papa con brotes | a |
| `cyt.p5.variables-experimento` | `hipotesis-y-variables.json` | 10 | SVG organizador de variables, Z-Image tres macetas, SVG rampa con carrito | b |

Solo se editó el campo `claseGuiada` de cada clave (se recargó el archivo justo antes de escribir). No se tocaron ids, ejercicios, respuestas ni dificultad, ni las claves de otros autores.

Rutas: SVG en `public/nudito/diagramas/ciencia-tecnologia/cyt-p5-<clave>-<tema>.svg` (17 archivos); WebP en `public/nudito/ilustraciones/ciencia-tecnologia/primaria-5/<clave>-<tema>-zimage-v1.webp` (4 archivos).

## Imágenes generadas

Procedencia: Z-Image Turbo (licencia Apache-2.0) vía ComfyUI local (`~/comfyui-khipu/gen.py`), 1200×896, sin texto. Cada imagen se inspeccionó con Read antes de redactar alt y descripción.

| Archivo | Prompt (resumen, inglés) | Semilla |
|---|---|---|
| `observacion-celulas-cebolla-preparar-zimage-v1.webp` | child's hands laying a thin transparent onion skin on a glass slide, dropper bottle, tweezers, half onion, microscope | 11 |
| `reproduccion-seres-vivos-llamas-zimage-v1.webp` | adult llama and baby llama side by side on an Andean meadow | 12 |
| `variables-experimento-macetas-zimage-v1.webp` | three identical flowerpots with bean seedlings on a sunny shelf, ruler, notebook, watering can | 13 |
| `nutrientes-oxigeno-celulas-lentejas-zimage-v1.webp` | boy at a kitchen table eating lentil stew with rice using a metal spoon, glass of water | 21 (intento 1, semilla 14, descartado: comía con palillos) |

## Decisiones

- Orgánulos, partes rotuladas, aumentos y esquemas: SVG como código (viewBox 640×480, texto ≥26 px). Escenas: ilustración generada.
- Los recursos de las situaciones de los ejemplos no llevan rótulos de la respuesta (membrana, cloroplastos, tipo de variable); los rótulos aparecen en el recurso-mapa del segundo momento y en los pasos.
- Los momentos sin recurso adecuado (ej. 2 de nutrientes, error de reproducción, pasos 1 y 2 de reproducción y 3 de pared) no llevan `recursoRef` ni aluden a imágenes.
- Rigor: las células de plantas y animales comparten tres partes (no se generaliza a bacterias); la vacuola explica el marchitamiento por pérdida de turgencia; la cebolla no muestra cloroplastos; la mucosa se toma con palito limpio y permiso docente; el oxígeno y los nutrientes viajan siempre por la sangre; la papa es reproducción asexual por un solo progenitor.
- Comprobaciones nuevas, distintas de los ejercicios y ejemplos: 10×4 (b), actividades en el citoplasma (c), pared en un tallo (a), recorrido por la sangre (b), cubreobjetos (c), gallina y gallo (a), variable dependiente con azúcar (b).

## Validación

- `pnpm nudito:validar-banco`: 2 238 fichas activas, 27 034 ejercicios. `pnpm typecheck` y `git diff --check`: sin errores.
- Script propio: ids únicos, idea sin recurso, `recursoRef` sin roturas, recursos todos usados, alt ≤200, archivos existentes, tipos admitidos: todo correcto en las 7 claves.
- Las 17 SVG se renderizaron a 360 px y se corrigieron solapes y cortes.

## Riesgos y pendientes

- Revisión independiente factual, pedagógica, visual y de audio; recorrido en navegador (audio, móvil, movimiento reducido) sin hacer.
- Z-Image dibuja la cara de la persona de la ilustración de cebolla solo parcialmente; revisar si se prefiere otra toma.
- El recurso SVG antiguo `lupa-y-microscopio.svg` ya no se referencia desde esta clave.
- Archivos compartidos: `la-celula.json` pudo ser modificado por otros autores durante el lote; se reescribió con la misma serialización (indent 2).

## Ronda 2 (correcciones de la revisión independiente)

- `reproduccion-seres-vivos`: opciones de la comprobación igualadas (56, 58 y 54 caracteres).
- `pared-cloroplastos-vacuola`: en el SVG `mapa` el núcleo y el cloroplasto inferior se movieron hacia dentro (la vacuola se acortó); el SVG `plantas` y su situación dicen «dos plantas», sin «maíz».
- `partes-de-la-celula`: la marca 2 del SVG `numeros` pasó al interior gelatinoso; opciones igualadas (55, 56 y 58).
- `lupa-y-microscopio`: paso 1 usa `lentes` y narra solo los números que ese recurso muestra; paso 3 usa `partes` (tornillos) y se quitó la alusión a los círculos de campo.
- Revalidado: banco, typecheck y `git diff --check`; SVG tocados re-renderizados a 360 px.
