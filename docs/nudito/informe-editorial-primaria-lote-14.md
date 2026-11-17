# Informe editorial · Lote 14 (Ciencia y Tecnología, 5.º de primaria)

Fecha: 2026-11-16. Autor: agente Sonnet (escritura). Estado: **escrito y validado técnicamente; pendiente de revisión independiente** (no aprobado, sin huellas, sin estado actualizado).

## Claves

| Clave | Archivo del banco | Momentos | Recursos | Respuesta correcta |
|---|---|---|---|---|
| `cyt.p5.celula-animal-vegetal` | `fichas/la-celula.json` | 10 | 2 SVG + 1 ilustración | b |
| `cyt.p5.formas-tamanos-celulas` | `fichas/la-celula.json` | 10 | 3 SVG | c |
| `cyt.p5.funciones-basicas-celula` | `fichas/la-celula.json` | 10 | 1 SVG + 2 ilustraciones | a |
| `cyt.p5.ecosistemas` | `fichas/ecosistemas.json` | 10 | 1 SVG + 2 ilustraciones | c |
| `cyt.p5.estructura-externa-tierra` | `fichas/estructura-externa-de-la-tierra.json` | 10 | 3 ilustraciones | b |
| `cyt.p5.materia-particulas` | `fichas/la-materia-y-sus-propiedades.json` | 10 | 1 SVG + 2 ilustraciones | a |

Solo se escribió el campo `claseGuiada` de cada clave (verificado por comparación clave a clave con una copia previa: no cambió ningún otro campo ni otra ficha, incluidas `cyt.p5.la-celula` y `cyt.p5.lupa-y-microscopio`). Estructura de cada clase: idea sin imagen; situación visual; ejemplo 1 (observa + razona); ejemplo 2 (observa + razona); «Error frecuente: …» como ejemplo; tres pasos; comprobación nueva con una sola respuesta correcta. Ejercicios, ids, respuestas y dificultad no se tocaron.

Nota: `estructura-externa-tierra` trata de los cambios de la superficie terrestre (cambios lentos y bruscos), no de las capas de la Tierra; la clase sigue el contenido de la ficha.

## Recursos

SVG (viewBox 640×480, texto ≥26 px, renderizados y revisados) en `public/nudito/diagramas/ciencia-tecnologia/`: `celula-animal-vegetal-partes`, `celula-animal-vegetal-dibujos-ab` (sin rótulos de tipo, para no dar la respuesta del ejemplo 1), `formas-tres-celulas`, `formas-neurona`, `formas-globulos-vaso-fino` (conducto más estrecho que un glóbulo; sin glóbulos dentro, no muestra la conclusión), `funciones-basicas-celula-mapa`, `ecosistemas-pecera-piedras`, `materia-particulas-modelo`. Se usó SVG para todo lo que exige exactitud (partes celulares, partículas).

Ilustraciones en `public/nudito/ilustraciones/ciencia-tecnologia/primaria-5/<id>-zimage-v1.webp` (1200×896). Procedencia: **Z-Image Turbo (Apache-2.0) vía ComfyUI local**, generador `~/comfyui-khipu/gen.py` (añade estilo escolar cálido sin texto). Todas inspeccionadas con Read antes de integrar.

| Id | Semilla | Prompt (resumen, inglés) |
|---|---|---|
| celula-animal-vegetal-quinua-brazo | 11 | girl in Andean field beside tall upright quinua plant with firm stem and red-orange head, bending her arm, mountains |
| funciones-celulas-rodilla | 12 | Peruvian schoolgirl on a bench with small clean bandage on knee, kind teacher kneeling beside her |
| funciones-celulas-agua-fria | 13 | boy touching cold running mountain stream with one hand, pulling back in surprise |
| ecosistemas-laguna-andina | 14 | Andean highland lagoon at sunrise, totora reeds, ducks, rocks, bright sun, snowy mountains |
| ecosistemas-chacra-maiz | 15 | maize field in Cajamarca highlands, dark soil, earthworm in foreground, light rain, green hills |
| superficie-valle-andino | 16 | wide Andean valley, winding river, steep rocky slopes, terraces, small bridge |
| superficie-dunas-costa | 17 | Peruvian coastal desert near Lima, wind-shaped golden dunes with ripples, low bushes, ocean |
| superficie-huaico-quebrada | 28 (reintento; la semilla 18 mostraba a dos niños junto al borde del huaico, imagen insegura, descartada) | muddy torrent with boulders down a dry ravine in heavy rain, empty hillside, no people |
| materia-azucar-vaso | 19 | girl stirring spoon in a glass of water with sugar grains at the bottom, sugar bowl |
| materia-perfume-salon | 20 | classroom, teacher opens small perfume bottle near the board, students at desks sniff |

Todos los prompts terminan con el estilo fijo del script. Ninguna imagen necesitó más de un reintento.

## Decisiones

- Las narraciones no repiten la descripción de la imagen (el sistema la añade al narrar); aportan la lectura didáctica.
- Los ejemplos observan sin dar la conclusión (A/B sin tipo, vaso sanguíneo sin glóbulos dentro, pecera sin seres vivos, escenas macroscópicas de azúcar y perfume); la conclusión llega en el momento «razona».
- Cuando una ilustración añadió elementos (niños observando la laguna y el valle, pupitres con estudiantes de espaldas, niño en el arroyo), se ajustó la narración a lo que se ve, p. ej. los niños cuentan como factor biótico.
- Letras correctas de comprobación distribuidas: b, c, a, c, b, a; opciones de longitud parecida (tierra: 80/82/73 tras corregir una opción correcta demasiado larga).
- Rigor: glóbulo rojo 7-8 micras; óvulo humano cerca de 0,1 mm; prolongación de neurona hasta ~1 m; raíz sin cloroplastos pero con pared celular; entre partículas, espacio vacío (no aire).
- Sin «Atención:», sin «recuerda», sin «¿Es verdad que…?» en introducciones; sin aludir a imágenes en momentos sin recurso.

## Validación

`pnpm nudito:validar-banco` (2 238 fichas, 27 034 ejercicios) y `pnpm typecheck` aprobados; `git diff --check` sin avisos; script propio: ids únicos, idea sin recurso, `recursoRef` resuelve y no hay recursos sin usar, alt ≤200, descripción ≤500, archivos existentes.

## Riesgos y pendientes

- Revisión independiente pendiente (factual, pedagógica, visual, oral y navegador): no se ejecutó recorrido de navegador ni audio.
- Laguna: al fondo hay una arboleda de coníferas poco típica de una laguna altoandina; patos de aspecto genérico. Quinua: panoja estilizada. Niña del azúcar de aspecto muy pequeño para 5.º.
- La niña de la quinua flexiona el brazo con el puño alzado; la narración habla solo de «la piel del brazo se dobla».
- No se actualizó `estado-refuerzo-primaria.json`, specs ni bitácora (fuera de alcance de este encargo); el integrador debe hacerlo.
- Archivos temporales de trabajo en el scratchpad compartido (`n5/`), fuera del repositorio.

Comandos: `python3 n5/svgs.py` (SVG), `gen.py` por imagen (ver tabla), `python3 n5/clases.py [clave]` (escribe `claseGuiada`), `pnpm nudito:validar-banco`, `pnpm typecheck`, `git diff --check`.

## Correcciones tras la revisión independiente (2026-11-16)

Aprobadas y no tocadas: `ecosistemas`, `estructura-externa-tierra`. Corregidas las otras cuatro:

1. `materia-particulas`, SVG `modelo`: círculo de aumento reducido (cx 450, r 150, ya no toca el borde), 9 partículas, rótulos «Partícula» (arriba) y «Espacio vacío» (abajo, con círculo punteado) sin cruces ni roces; descripción actualizada a nueve partículas. Re-renderizado y revisado.
2. `funciones-basicas-celula`, `error-frecuente`: se quitó el `recursoRef` `mapa` (narra raíz y absorción de agua, que el mapa no muestra). El recurso sigue usado en otros momentos.
3. «raíz de papa» sustituido por «raíz de la planta de papa» en `celula-animal-vegetal` (error frecuente) y en `funciones-basicas-celula` (error frecuente y comprobación; opciones 42/44/44 caracteres, una sola correcta).
4. `formas-tamanos-celulas`, `ejemplo-2-observa`: «apenas cabe» pasó a «son más angostos que un glóbulo rojo», alineado con el SVG `vaso-fino` y su alt.

Revalidado: `pnpm nudito:validar-banco`, `pnpm typecheck` y `git diff --check` sin errores; recursos sin roturas ni sin usar.
