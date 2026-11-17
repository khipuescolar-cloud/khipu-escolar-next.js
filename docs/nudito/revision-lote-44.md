# Revisión independiente · Primaria, Matemática, lote 44

Revisor distinto del autor. Solo lectura sobre banco y recursos. SVG rasterizados en headless y vistos uno por uno (29). Archivos JSON en `src/lib/nudito/conocimiento/banco/matematica/` (ruta por clave en el informe del autor).

## Técnico (E)

- `pnpm typecheck`: sin errores. `pnpm nudito:validar-banco`: banco válido (2238 fichas, 27034 ejercicios).
- Comparado con HEAD por JSON: en las 6 claves solo cambió `claseGuiada` (HEAD no la tenía); ejercicios, ids y respuestas intactos.
- `recursoRef` ↔ recursos: coincidencia exacta en las 6. alt máx 109, descripcion máx 241. Sin `<tspan>`, sin `#C98F1E`, texto mínimo 26 px en todos los SVG. Sin «parte N de M» (solo «partes iguales» en p3, vocabulario matemático). Sin títulos repetidos en la narración.
- Letras correctas a, c, b, a, c, b; opciones con diferencia ≤3 y correcta nunca la más larga (verificado a mano).
- Cálculos recalculados: todos correctos (8 globos 4/3/1; 6 stickers 3/2/1; 4×90=360... crayón cabe 4; 9/3=3; 12/4=3; 20/5=4; 30/6=5; 7294; 6403; 9035; 4605; 12+21+9+8=50; 9+4+3+4+5=25; 15+6+9=30).

## mat.p1.datos-por-categorias — CAMBIOS

1. `recursos[id=grupos]` (`datos-categorias-grupos.svg`): el nudo del cuarto globo azul se solapa con el rótulo «Azul: 4» (la columna azul baja hasta pisar el texto). Subir la columna o bajar los rótulos de las tres columnas unos 20 px; después revisar que descripcion («Debajo de cada columna se lee su color y su cantidad») siga cierta.
2. (Opcional, sin bloquear) `comprobacion.pregunta`: lista oral de seis dibujos («sol, nube, sol, lluvia, nube, sol») sin imagen exige memoria de trabajo alta en 1.º; considerar cinco días. Contenido y respuesta (a, tres) correctos.

Resto correcto: primer momento sin imagen, situación sin revelar, contraejemplo correcto, descripcion coincide con el dibujo.

## mat.p2.cuantas-veces-mas-largo — APROBADA

Sin defectos. Dibujos coinciden con alt y descripcion (crayón 90 px × 4 = cordón 360 px; cintas 3 y 9 cuadritos). Situación y guiados no revelan el número de veces. Comprobación única (doce; siete es distractor plausible).

## mat.p3.division — APROBADA

Sin defectos. Reparto 12/4, 20/5, 6-4-2 correcto y visible; comprobación única (cinco).

## mat.p4.descomponer-cuatro-cifras — CAMBIOS

1. `recursos[id=valores].descripcion`: «un recuadro: siete mil, doscientos, noventa y cuatro» se oye como tres valores con «noventa y cuatro» = 94; son cuatro recuadros (7000, 200, 90, 4). Corregir, por ejemplo: «De cada columna baja una flecha hacia un recuadro: siete mil, doscientos, noventa, y el último, cuatro. Debajo, la suma de esos cuatro valores.» (ya dice cuatro valores; el problema es la lista ambigua).
2. (Nota, sin bloquear) las siglas UM/C/D/U están en el dibujo pero la descripcion y narración usan nombres completos: correcto. Opciones de la comprobación «seiscientos cinco» / «sesenta y cinco» son distinguibles en audio.

## mat.p5.decisiones-con-datos — CAMBIOS

1. `recursos[id=situacion].descripcion`: ver decisión del riesgo reportado abajo. Corregir para que diga las alturas relativas de las barras sin números ni conclusión.
2. Ejercicio e09 (ver G): corrección mínima propuesta, el orquestador decide.

Resto correcto: cifras 12/21/9/8 = 50, 9/4/3/4/5 = 25; contraejemplo correcto; comprobación única (c). Nota menor: en `error`, el globo «Me gusta» queda a ~5 px de la barra de pelotas; aceptable, mejor correrlo 10 px a la derecha.

### Riesgo del autor: descripción de la situación de p5

Decisión: NO es aceptable tal cual. Razones: (a) el dibujo ya muestra visualmente cuál barra es más alta, así que describirlo no revela nada que el vidente no vea; «sin adelantar» solo penaliza a quien escucha (la descripcion debe coincidir exactamente con el dibujo); (b) `ejemplo-1-guiado` pregunta «¿Qué opción eligieron más alumnos?» y «Fíjate cuál es la más alta», imposible de razonar solo con audio; (c) es inconsistente con `tabla-pregunta`, cuya descripcion sí da todos los datos. Lo que debe quedar fuera es la conclusión («conviene comprar pelotas») y los votos, no el orden de alturas.

Corrección mínima (solo `descripcion`, 300 caracteres):
«Gráfico de barras con dos ejes y sin números. Sogas, altura media; Pelotas, la barra más alta; Ajedrez, más baja que Sogas; Ligas, la más baja de las cuatro. Arriba el título Qué comprar para el recreo; abajo, la pregunta: ¿Qué conviene comprar?»
(Ajedrez es apenas más alta que Ligas en el SVG; la frase lo refleja.) alt puede quedar igual.

## mat.p6.croquis-planos — CAMBIOS

1. `ejemplo-1-razona` / `situacion` / `cruce`: ambigüedad de ubicación. La biblioteca está a la izquierda del jirón Ica y el parque a la derecha del mismo jirón, ambos pegados al cruce Ica–Sucre; «junto al cruce» no distingue cuál es la biblioteca. Corregir narración y descripcion de `cruce` con la referencia lateral: «la biblioteca está a la izquierda del jirón Ica, arriba de la avenida Sucre, junto al cruce». (O mover el parque a la derecha del cruce de Piura, pero cambia SVG.)
2. `contraejemplo` narración: «en este croquis hay dos postas junto a esa avenida» contradice la situación («cinco lugares… posta», una sola posta) y el SVG `error` es otro croquis. Corregir a «en otro croquis hay dos postas junto a esa avenida, una arriba y otra abajo».
3. `comprobacion.pregunta`: el enunciado ya dice «entre el jirón Ica y el jirón Piura» y la respuesta repite «Entre ambos jirones»; no evalúa comprensión. Reformular sin la palabra «entre», por ejemplo: «En un plano, el banco está sobre la avenida Sucre. Para llegar, Rosa cruza el jirón Ica y todavía no llega al jirón Piura. ¿Dónde queda el banco?» (opciones iguales; revisar longitudes ≤3: 19/19/22 se mantienen).
4. (Menor) color de la posta distinto entre `situacion` (índigo) y `error` (turquesa); unificar.

## G. Errores de ejercicios existentes (p5)

- e09 (resfrío en Cusco), respuesta «Abril o mayo»: única correcta (junio, julio y agosto no son «antes del pico»; la opción c es disyuntiva, así que no depende de elegir abril o mayo). No daña la respuesta, pero hay dos fallos de enunciado: (i) «vacunación preventiva» contra «resfrío» es incorrecto factualmente: no existe vacuna contra el resfrío común; (ii) «más oportuno» invita a elegir un solo mes. Corrección mínima en `enunciado`: «…casos de gripe infantil… La posta debe realizar la vacunación preventiva antes de que se presente el mes con mayor cantidad de enfermos. ¿Cuándo conviene aplicar la campaña?» Opciones, respuesta y pistas intactas.
- e02 (menor): la pista 2 menciona «la barra más alta en el gráfico» pero el enunciado no trae gráfico. Cambiar «en el gráfico» por «entre los votos».
- e05 y e12: la correcta es la opción más larga (patrón conocido); no afecta la clase guiada; corrección opcional.

## Resumen

Aprobadas: p2, p3. Con cambios: p1 (1 defecto visual), p4 (1 descripcion ambigua al oído), p5 (descripcion de situación + e09), p6 (3 defectos de contenido).

## Ronda 2

Validación: `pnpm nudito:validar-banco` (2238 fichas, 27034 ejercicios) y `pnpm typecheck` sin errores. SVG rasterizados con Chrome headless y vistos.

- `mat.p1.datos-por-categorias` — APROBADA. Rótulos de `grupos` a y=445, sin tocar el nudo del cuarto globo; descripcion coincide.
- `mat.p4.descomponer-cuatro-cifras` — APROBADA. `valores`.descripcion: «siete mil, doscientos, noventa, y el último, cuatro»; sin ambigüedad.
- `mat.p5.decisiones-con-datos` — APROBADA. `situacion` da alturas relativas sin cifras ni conclusión; globo «Me gusta» despejado de las barras; e09 solo cambia el enunciado («gripe», «¿Cuándo conviene aplicar la campaña?»), resto intacto y «Abril o mayo» única correcta.
- `mat.p6.croquis-planos` — APROBADA. Referencia lateral biblioteca/parque en `ejemplo-1-razona` y `cruce`; «en otro croquis»; comprobación nueva sin «entre» (opciones 19/19/22, respuesta b única, pista sin entregar); postas en índigo en `situacion` y `error`; descripcion de `error` coincide con el SVG.
