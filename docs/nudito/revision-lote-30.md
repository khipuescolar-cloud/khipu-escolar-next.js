# Revisión independiente · Primaria, Matemática, lote 30

Revisor: agente independiente (no escribió el lote). Fecha: 2026-11-16. Solo lectura sobre banco y recursos.

## Verificaciones comunes (las 6 claves)

- Técnico: `pnpm typecheck` sin errores; `pnpm nudito:validar-banco` válido (2238 fichas, 27034 ejercicios). En las 6 claves todo salvo `claseGuiada` es idéntico a `HEAD` (comparado por JSON): no hay ediciones de ejercicios ni de otros campos.
- Script: 10 momentos por clave; primer momento sin recurso; `recursoRef` ↔ `recursos` exactos y todos usados; títulos únicos; sin «parte N de M» (el «parte amarilla/blanca» de p4 es natural); sin dígitos ni letras sueltas en narración, títulos, alt, descripción ni comprobación (p5 dice «equis»); alt ≤ 111, descripción ≤ 310; ningún «dibujo/imagen/barra/recta…» en momentos sin recurso.
- SVG: 24 archivos en `public/nudito/diagramas/matematica/`, cada uno referenciado exactamente una vez en el banco; ninguno huérfano ni duplicado; ninguna ruta del banco apunta a un archivo inexistente. Los 4 SVG borrados (`colecciones-igual-cantidad-estrellas`, `centimetro-regla-lapiz-catorce`, `centimetro-regla-borrador-dos-siete`, `comprobar-solucion-ecuacion-error-intermedia`) no figuran en ningún JSON, TS ni test (solo se nombran en el informe del autor) y nunca estuvieron en `HEAD`: no rompe a otro lote. (Aparte, `igualdad-balanza-seis.svg` está referenciado dos veces en el banco: es de otro lote, no de este.)
- Rasterizados los 24 con Chrome headless y vistos: texto 26–44 px (mínimo 26), sin `<tspan>`, texto ámbar `#8A5A00` y turquesa `#0C706E` (ningún `#C98F1E`), rojo `#B5412A` solo en errores, sin desbordes ni solapes de texto, sin pegado al borde; escalas proporcionales (barras de p4, recta 6840-6900-7000, barras de p6, regla de p3: 7 arcos y 5 puntos rojos verificados). Dibujo = alt y descripción en todos.
- Cifras y símbolos dentro de los SVG con narración y descripción en palabras: **aceptable**. La voz lee `narracion`/`descripcion`, no el SVG; el alumno necesita ver las cifras; es el mismo criterio que aprobó el lote 24. No requiere corrección.
- Comprobaciones recalculadas: p1 b; p2 a; p3 14−6=8 (c); p4 6000−5750=250 (d); p5 30−9=21 (c; 20→11, 40→31); p6 b. Respuesta única en todas; letras b, a, c, d, c, b; diferencia de longitud de opciones ≤ 3 y correcta nunca la más larga.

## mat.p1.colecciones-igual-cantidad — CAMBIOS (menor)

Archivo: `primaria-1/fichas/igualdades-y-equivalencias.json`.

1. Momento `ejemplo-2-guiado` (sin recurso): dice «Cuenta cada grupo antes de responder», pero no hay nada visible ni ningún número que contar. Corrección mínima: «Un grupo tiene seis fichas pequeñas. El otro tiene seis fichas grandes. El tamaño puede engañar. Piensa: ¿cuál grupo tiene más?» (el ejemplo-1-guiado ya da sus cantidades; `ejemplo-2-razona` sigue funcionando).
2. Observación opcional (no bloquea): la `comprobacion` repite la situación (botones juntos frente a separados) y su enunciado ya dice «siete» y «siete». Si se desea más novedad: otro objeto (p. ej. semillas en una fila corta y otra larga). No cambia la letra ni las opciones.

Correcto: situación sin revelar (cinco y cinco, cantidades no dichas), parejas 4-4, fichas 6-6, contraejemplo de la fila separada; SVG fieles a alt y descripción.

## mat.p2.comparar-masas-balanza — APROBADA

Archivo: `primaria-2/fichas/medicion-masa-y-tiempo.json`.

Contenido correcto: sandía baja frente a naranja; mandarina < manzana < sandía comparando de dos en dos; contraejemplo pelota grande contra piedra pequeña; la situación muestra la balanza vacía y no adelanta el resultado. Comprobación: durazno más abajo ⇒ más masa (a), única.

Observaciones menores, no bloquean:
- `errores`: la pelota (radio 46) es más ancha que el platillo y tapa la parte alta del colgador; legible, pero se vería más limpio con radio ~38. No cambia alt ni descripción.
- `ejemplo-2-razona` narra las dos comparaciones y el recurso `orden-frutas` solo muestra el orden resultante; coincide con la descripción (no promete comparaciones), pero la voz dice «mira el orden», correcto.

## mat.p3.centimetro-regla — APROBADA

Archivo: `primaria-3/fichas/c26-forma-movimiento.json`.

Contenido correcto: 0→9 = 9; 4→11 = 7 saltos (7 arcos dibujados, 11−4); contraejemplo 0→4: cinco rayas (cinco puntos rojos) frente a cuatro espacios; comprobación 6→14 = 8 (c), distractores catorce y seis. Regla 0–12 coherente con las tres imágenes. Sin defectos.

## mat.p4.completar-millar — APROBADA

Archivo: `primaria-4/fichas/c23-redondeo-completar-millar.json`.

Cuentas verificadas: 5000−4300 = 700 (no mostrado, «?» sin valor falso); 3000−2700 = 300; 6840+60 = 6900, +100 = 7000, total 160; 6000−5400 = 600; 6000−5750 = 250. Barras y recta a escala. Contraejemplo correcto y sin conceptos no trabajados. Comprobación: cuatro opciones de 19–21 caracteres, correcta (d) no la más larga; «Doscientas cuarenta/cincuenta» son distinguibles al oído.

Observación del autor sobre `e06` (cuatro opciones): no es error. Otros ejercicios del banco de matemática (p5 e02, e05, e09; p6 e05, e09, e12) ya usan cuatro opciones; 1010/100/9000/10 km tiene respuesta única (10 km). No afecta al alumno; sin corrección.

## mat.p5.comprobar-solucion-ecuacion — APROBADA

Archivo: `primaria-5/fichas/ecuaciones.json`.

Cuentas: 46+24 = 70; 6×11 = 66, 6×12 = 72; contraejemplo x−15 = 40 con 25 (25−15 = 10; solución real 55, no dicha); comprobación 30−9 = 21 (c). La caja «x = ?» no muestra un valor falso y la voz da el 46: coherente. «equis» en toda la voz.

Observaciones menores, no bloquean:
- `error-operacion`: la segunda tarjeta lleva borde y texto turquesa con una cruz roja; en el resto del lote turquesa = correcto. Coincide con la descripción («tarjeta turquesa … otra cruz»), pero si se quiere evitar la señal mixta, pasar su borde a índigo. Opcional.
- En la comprobación, «Veinte» (opción) y «veintiuno» (pregunta) suenan parecidos al oído; es un distractor legítimo, no un error.

Observación del autor sobre `e04` («Si sustituyes k = 8 en la expresión 5 × k…»): evalúa una expresión, no una ecuación. No afecta al alumno: la respuesta (40) es única, el enunciado es claro y reproduce el paso «calcular el lado con la letra» que enseña la ficha (igual que `e03`). Sin corrección obligatoria. Si el orquestador la quiere dentro de una ecuación: «Pruebas k = 8 en la ecuación 5 × k = 45. ¿Cuánto da el lado izquierdo? Escribe solo el número.» (respuesta 40 intacta; retro «5 × 8 = 40, y 40 no es 45»).

Fuera del alcance del lote (preexistente, solo informativo): `e11` incluye en el enunciado las dos cuentas (185−48 y 175−48), de modo que la respuesta se deduce sin pensar.

## mat.p6.comparar-fraccion-decimal-porcentaje — CAMBIOS

Archivo: `primaria-6/fichas/porcentajes.json`.

1. `comprobacion`: el par «tres cuartos contra cero coma setenta» es el mismo par del `ejemplo-1` (tres cuartos y cero coma siete, con el resultado dicho en `ejemplo-1-razona`), así que se contesta de memoria. Además «cero coma setenta» introduce un cero final (0,70 = 0,7) que la lección no trabaja. Corrección mínima, sin tocar opciones ni letra: pregunta «Rosa avanzó un medio del camino y Luis avanzó cero coma cuatro. ¿Quién avanzó más?»; `mensajeCorrecto` «Correcto. Un medio es cincuenta por ciento, y cero coma cuatro es cuarenta por ciento.» (respuesta b, opciones idénticas; «un medio = 0,5 = 50 %» está en `idea`). La alternativa del autor (cero coma siete contra tres cuartos) no sirve: repetiría el ejemplo-1 exacto.

Correcto: 3/4 = 75 %, 0,7 = 70 %, 65 % → orden 65 < 70 < 75; 3/10 = 30 % > 0,25; 0,5 = 50 % > 0,25 (contraejemplo bien formulado); situación 1/4, 0,2, 30 % (respuesta 30 %, no revelada); barras proporcionales (30 % y 25 % sobre 480 px); texto turquesa sobre blanco legible.

## Resumen

- APROBADAS: mat.p2.comparar-masas-balanza, mat.p3.centimetro-regla, mat.p4.completar-millar, mat.p5.comprobar-solucion-ecuacion (con observaciones opcionales).
- CAMBIOS: mat.p1.colecciones-igual-cantidad (1 fix de una frase), mat.p6.comparar-fraccion-decimal-porcentaje (reemplazar comprobación).

## Ronda 2

- mat.p1.colecciones-igual-cantidad — APROBADA. `ejemplo-2-guiado` sin recurso es coherente («seis fichas pequeñas / seis grandes») y no pide contar algo invisible; `ejemplo-2-razona` conserva `fichas-tamanos`. Comprobación nueva (cajas con cuatro lápices, parados/acostados): tres opciones de longitud pareja, respuesta única (b), pista sin entregar la respuesta, no repite la situación.
- mat.p6.comparar-fraccion-decimal-porcentaje — APROBADA. Rosa un medio (50 %) vs Luis cero coma cuatro (40 %): la letra b «Rosa avanzó más que Luis» es correcta; opciones coherentes y de longitud pareja; `mensajeCorrecto` correcto; pista sin dar la respuesta; no repite el par del ejemplo 1 ni usa cero final.
- `pnpm nudito:validar-banco`: válido (2238 fichas, 27034 ejercicios). `pnpm typecheck`: sin errores. No verifiqué por diff que solo cambió `claseGuiada` (los archivos tienen cambios de otros lotes); el resto de campos no fue inspeccionado.
