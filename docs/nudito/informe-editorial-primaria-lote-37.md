# Informe editorial · Primaria, Comunicación (1.º a 3.º), lote 37

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. No se tocaron estado, huellas, BD, specs ni componentes. Solo cambió el campo `claseGuiada` de cada clave (comparado con `HEAD`, el resto de cada clave es idéntico; ejercicios, ids, respuestas y dificultad intactos).

## Alcance

Archivos bajo `src/lib/nudito/conocimiento/banco/comunicacion/`. Todas con 10 momentos (el primero sin recurso) y 5 recursos (2 ilustraciones Z-Image + 3 tarjetas SVG).

| Clave | Archivo | Momentos | Recursos (id) | Comprobación |
|---|---|---:|---|---|
| `com.p3.a-quien-se-refiere` | `primaria-3/fichas/ubicar-informacion.json` | 10 | feria, ej1, ej2, tejidos, error | b |
| `com.p3.adivinanzas` | `primaria-3/fichas/comprension-de-textos-orales.json` | 10 | ronda, reloj, paraguas, paraguas-ill, error | c |
| `com.p3.adjetivaciones-al-leer` | `primaria-3/fichas/inferir-e-interpretar.json` | 10 | cuento, nora, patio, patio-ill, error | a |
| `com.p3.adjetivaciones-para-caracterizar` | `primaria-3/fichas/recursos-literarios.json` | 10 | cuaderno, gato, gato-ill, mercado, error | b |
| `com.p2.causa-y-efecto` | `primaria-2/fichas/inferir-e-interpretar.json` | 10 | lluvia, gato, fiebre, fiebre-ill, error | c |
| `com.p2.comentar-lo-que-dice-otro` | `primaria-2/fichas/dialogo-y-cortesia.json` | 10 | banca, beto, carla, huerta, error | a |

Estructura: idea (sin imagen) → situación con ilustración → ejemplo 1 (tarjeta con el texto y la pregunta; razonamiento sin recurso) → ejemplo 2 (tarjeta; razonamiento con ilustración) → error frecuente (tarjeta roja/verde) → tres pasos → comprobación nueva.

## Recursos

- Generador: **solo Z-Image local** (ComfyUI, `~/comfyui-khipu/gen.py`, 1200×896 WebP, una imagen a la vez; agy no usado). Ruta `public/nudito/ilustraciones/comunicacion/primaria-{2,3}/`. Todas vistas con Read; la de paraguas se regeneró una vez (la primera mostraba un paraguas flotando sin lluvia); la narración se ajustó a lo que muestra cada imagen (p. ej. una manta, no dos; gato sin ojos visibles; sin charcos).
- Prompts (se añade el estilo de `gen.py`: ilustración escolar cálida, sin texto), semilla:
  - referentes-feria (11): a Peruvian girl and a boy walking together in a sunny village street market, she carries a woven basket, he carries a wooden crate, colorful stalls behind them
  - referentes-tejidos (12): an Andean woman sitting at a market stall weaving wool, three knitted hats and two woven blankets displayed on a table, warm colors
  - adivinanzas-ronda (13): five Peruvian schoolchildren sitting in a circle on a school patio, one girl speaking with a hand raised, others thinking with curious faces, sunny day
  - adivinanzas-paraguas (31, reintento): a Peruvian child holding an open yellow umbrella while walking in the rain on a village street, raindrops falling around, grey blue sky, cheerful
  - adjetivos-leer-cuento (15): two Peruvian children sitting under a tree reading a colorful storybook together, grass and flowers, sunny afternoon
  - adjetivos-leer-patio (16): an empty quiet school courtyard on a gray rainy day, wet ground, puddles, a lone bench, nobody there, sad calm mood
  - adjetivos-caracterizar-cuaderno (17): a Peruvian boy sitting on a plaza bench writing in a notebook with a pencil, looking at a lively village square, thinking
  - adjetivos-caracterizar-gato (18): a fluffy gray cat with green eyes sleeping curled up on a soft cushion, cozy room, warm light
  - causa-lluvia (19): three Peruvian children in raincoats looking at rain from a school doorway, a big puddle in front, grey sky
  - causa-fiebre (20): a Peruvian girl in bed with a blanket and a thermometer in her mouth, looking sadly out the window at a sunny park, cozy bedroom
  - comentar-banca (21): two Peruvian schoolchildren sitting on a bench in a school yard chatting happily, one gesturing while telling something, the other listening smiling
  - comentar-huerta (22): a Peruvian grandfather and a child planting bean seedlings together in a small garden, watering can, sunny
- SVG como código en `public/nudito/diagramas/comunicacion/` (18 archivos, prefijos `referentes-`, `adivinanza-`, `adjetivos-leer-`, `adjetivos-caracterizar-`, `causa-efecto-`, `comentar-`): viewBox 640×480, texto ≥28 px, paleta de specs/18, texto ámbar `#8A5A00`, sin `<tspan>`, con `<title>`. Rasterizados con Chrome headless y vistos. El texto que se lee está visible en la tarjeta y citado en la narración; las tarjetas de situación y de ejemplo guiado no muestran la respuesta.

## Decisiones

- Comunicación: el texto se lee en pantalla (tarjeta blanca) y la pregunta va aparte (tarjeta amarilla). Las ilustraciones aportan contexto sin texto ni respuesta; la imagen de «razona» muestra el escenario, no la regla.
- Ejemplos nuevos, distintos de los de los ejercicios y de `ejemplos` de la ficha. La respuesta no siempre está en la primera oración (referentes: «estos» = gorros aunque «mantas» está más cerca; causa y efecto: la causa va al final con «porque»).
- Casos ficticios (Tomás, Elena, Lucía, Carla, Beto…) son personajes imaginarios; no hay noticias ni datos reales en este lote.
- Comprobaciones nuevas; opciones con diferencia de longitud ≤3 y la correcta nunca la más larga; letras b, c, a, b, c, a; pistas orientan sin dar la respuesta.
- Voz: sin dígitos en narración, opciones, alt ni descripciones; sin «parte N de M»; frases cortas.

## Verificaciones

- Script: `recursoRef` ↔ recursos exactos, 10 momentos, primer momento sin recurso, alt ≤200, descripción ≤500 (la mayor, 212), archivos existentes, longitud de opciones, resto de cada clave idéntico a `HEAD`.
- `pnpm nudito:validar-banco`: válido (2238 fichas, 27034 ejercicios). `pnpm typecheck`: sin errores. `git diff --check` sobre los JSON y SVG del lote: limpio.

## Errores/observaciones en ejercicios existentes (sin editar)

- `com.p3.adjetivaciones-al-leer` e12: dice «cómo está la abuela por la noticia», pero el texto no menciona ninguna noticia (el motivo es la llegada del nieto).
- `com.p3.adjetivaciones-al-leer` e07: pide «el adjetivo que muestra que el camino da miedo» y la respuesta es «oscuro»; «silencioso» también podría defenderse.
- `com.p3.adjetivaciones-al-leer`, ejemplo del campo `ejemplos`: la respuesta «concurrido y bullicioso» usa palabras que el texto no tiene («lleno y ruidoso»).
- `com.p3.adjetivaciones-para-caracterizar` e10: el enunciado lista los cuatro adjetivos, así que el conteo no exige leer el texto.
- Sin errores factuales ni de respuesta en las demás claves.

## Riesgos y pendientes

- Sin revisión independiente ni recorrido en navegador (audio, móvil, movimiento reducido).
- Las descripciones repiten el texto de las tarjetas (necesario para quien no ve la pantalla).
- Las ilustraciones son de IA: revisar a mano rasgos finos (manos, rostros) en revisión visual; no tienen texto.
- No se actualizaron `estado-refuerzo-primaria.json`, specs ni bitácora (fuera del encargo).

## Correcciones tras la revisión independiente (`revision-lote-37.md`)

`com.p2.causa-y-efecto` aprobada: sin cambios. `com.p3.adjetivaciones-al-leer` aprobada en su `claseGuiada`, pero se tocó su ficha por la autorización de abajo, así que las cuatro claves de 3.º y `com.p2.comentar-lo-que-dice-otro` vuelven a revisión.

- `com.p3.a-quien-se-refiere`: ejemplo 2 ahora «Doña Aurora tejió dos mantas y tres gorros. Estas son de lana de alpaca» (pregunta «estas»; respuesta única: las mantas, aunque «gorros» está más cerca). Narración, alt, descripción y SVG `referentes-ej2-pregunta.svg` actualizados. `referentes-tejidos-zimage-v1.webp` regenerada con Z-Image (semilla 41; prompt: an Andean woman sitting at a table weaving wool with knitting needles, on the table exactly two folded woven blankets with colorful stripes and three knitted wool hats in a row, warm colors); vista con Read: tres gorros y dos mantas, una mujer y una niña tejiendo; alt y descripción coinciden.
- `com.p3.adivinanzas`: «cuando llueve, te protejo» en narración, descripciones y los dos SVG (`adivinanza-paraguas-pregunta`, `adivinanza-error`); descripción de `ronda`: «Al fondo del círculo, una niña levanta la mano»; títulos de ejemplo unificados a «lee».
- `com.p3.adjetivaciones-para-caracterizar`: contraejemplo con un solo error (palabra vaga) y dato que lo justifica (SVG `adjetivos-caracterizar-error.svg`: «El niño comparte su pan con todos» → «lindo» frente a «generoso»); se quitó la concordancia del contraejemplo y del paso 3 (ahora: que cada adjetivo diga algo claro y encaje con lo que se sabe); «gordito» eliminado de la narración del gato.
- `com.p2.comentar-lo-que-dice-otro`: `paso-3` con «¿Y qué pasó después?»; `ejemplo-2-razona` dice «Una respuesta posible es…». Descripción de `comentar-huerta`: «coletas» en vez de «trenzas».
- Ejercicios existentes corregidos (autorizado por coordinación; sin tocar ids, respuestas ni dificultad):
  - `com.p3.adjetivaciones-al-leer` e12: «por la noticia» → «al ver a su nieto».
  - e07: enunciado «¿qué adjetivo muestra que el camino no tiene luz y da miedo?».
  - `ejemplos[2].respuesta`: «El mercado está lleno y ruidoso.»
  - `com.p3.adjetivaciones-para-caracterizar` e10: sin el paréntesis con los cuatro adjetivos; pista 3 ahora «Cuenta los adjetivos de cada oración que hablan del perro y júntalos.» (respuesta 4 única).
- Revalidado: `pnpm nudito:validar-banco` válido (2238 fichas, 27034 ejercicios), `pnpm typecheck` sin errores, `git diff --check` limpio.
