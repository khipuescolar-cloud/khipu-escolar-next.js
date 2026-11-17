# Revisión independiente · Primaria, Matemática, lote 31

Fecha: 2026-11-16. Revisor distinto del autor. Solo lectura sobre banco y recursos.

## Resumen

| Clave | Veredicto |
|---|---|
| `mat.p1.comparar-hasta-50` | APROBADA |
| `mat.p2.conservacion-longitud` | CAMBIOS |
| `mat.p3.comparar-reglas-patrones` | CAMBIOS |
| `mat.p4.comprobar-division` | APROBADA |
| `mat.p5.comun-denominador` | CAMBIOS |
| `mat.p6.comparar-ordenar-decimales` | CAMBIOS |

## Verificación técnica (E)

- `pnpm typecheck`: sin errores. `pnpm nudito:validar-banco`: banco válido (2 238 fichas, 27 034 ejercicios).
- Comparado con HEAD por JSON: en las seis claves solo difiere `claseGuiada`.
- SVG: 24 archivos, 4 por clave, todos referenciados una vez; sin huérfanos ni duplicados (búsqueda por prefijo en `public/`). Sin `<tspan>`, texto mínimo 26 px, todo `<text>` turquesa en `#0C706E` (el `#0F7C7A` que queda es solo relleno), ámbar `#8A5A00`.
- Rasterizados todos con Chrome headless y revisados.
- Cálculos recalculados: todos correctos. Respuesta única en las seis comprobaciones, letras a, c, b, a, c, b, opciones de longitud pareja (dif. <=3), correcta nunca la única más larga.
- G (ejercicios): revisados p3 e10-e12, p4 e04/e10, p5 e09/e12, p6 e08/e09/e12. Sin errores; coincido con el autor.

## mat.p1.comparar-hasta-50: APROBADA

Contenido, orden pedagógico, imágenes y alt/descripcion correctos; la situación no revela el resultado. Observación no bloqueante: en `situacion` las fichas de Luis quedan a ~11 px del borde interno de la tarjeta.

## mat.p2.conservacion-longitud: CAMBIOS

Archivo: `primaria-2/fichas/longitud.json`; SVG `public/nudito/diagramas/matematica/conservacion-longitud-*.svg`.

1. SVG `ejemplo-dos`: la cota azul se dibuja entre los extremos de la cuerda en U (la distancia en línea recta), justo bajo el título «La cuerda sigue midiendo 60 cm». Sugiere que 60 cm es esa distancia y contradice el contraejemplo y el paso 3 (no medir el atajo entre extremos). Quitar la cota o dibujarla siguiendo la curva; ajustar `descripcion` (hoy dice «una cota azul entre sus extremos»).
2. SVG `error` y momento `contraejemplo`: la narración habla de «cuerda enrollada» y de «los extremos»; el dibujo y el alt son una cinta y el óvalo es un lazo cerrado, sin extremos visibles. La línea roja punteada va debajo del óvalo, no entre extremos, y no se entiende como atajo. Dibujar una espiral o curva abierta con dos extremos visibles y la cuerda roja entre ellos; unificar «cinta» o «cuerda» en narración, alt y descripcion (hoy el momento dice cuerda y el recurso, cinta).
3. Pista de la comprobación («Piensa si la soga fue cortada o si recibió un pedazo nuevo»): aceptable, sin cambio requerido.

## mat.p3.comparar-reglas-patrones: CAMBIOS

Archivo: `primaria-3/fichas/c24-regularidad.json`; SVG `comparar-reglas-patrones-*.svg`.

1. SVG `error`: barra roja horizontal al pie del recuadro sin significado ni mención en alt/descripcion (parece un tachón perdido). Quitarla o explicarla; el recuadro además tiene un hueco vacío abajo.
2. SVG `ejemplo-dos`: el título «Cambian igual, pero en sentido opuesto» queda a ~17 px de cada borde (el propio autor corrigió casos a 15 px por lo mismo). Acortar, por ejemplo «Mismo cambio, sentido opuesto».
3. SVG `ejemplo-uno`: los rótulos «+4» de Luna y Bosque no están alineados (x distinta, ~12 px). Alinear en la misma columna.
4. Vocabulario oral: `ejemplo-1-guiado` («cuarenta, cuarenta y cuatro y cuarenta y ocho») y la pregunta de comprobación («treinta, treinta y cuatro y treinta y ocho») encadenan numerales compuestos con «y» y se oyen ambiguos. Separar en frases: «Bosque empieza en cuarenta. Después va cuarenta y cuatro. Luego, cuarenta y ocho.» Igual en `ejemplo-2-guiado` (Costa/Sierra) si se quiere margen.

## mat.p4.comprobar-division: APROBADA

Aritmética correcta (53=5·10+3; 47=6·7+5; 68=8·8+4; 74=9·8+2; contraejemplo 68÷6=10 resto 8). Imágenes coinciden con alt y descripcion; la situación no decide si está bien. Observaciones no bloqueantes: la `descripcion` de `ejemplo-uno` omite el texto al pie «El residuo es menor que seis»; en `ejemplo-uno` el rótulo «divisor × cociente + residuo» queda a ~12 px de los bordes de la tarjeta.

## mat.p5.comun-denominador: CAMBIOS

Archivo: `primaria-5/fichas/fracciones.json`; SVG `comun-denominador-*.svg`.

1. SVG `error`: el «1/6» queda casi ilegible bajo la equis roja grande. Reducir la equis o desplazarla para que se lea «1/6». Debe verse lo que se tacha.
2. `ejemplo-dos` `descripcion`: dice «multiplicado por dos medios» y «cinco quintos». El alt dice «dos sobre dos». Al oído «dos medios» se confunde con 1/2, que aparece en el mismo recurso. Usar «dos sobre dos» y «cinco sobre cinco».
3. SVG `situacion`: la narración dice «representa dos tercios» y «representa tres cuartos», pero las barras están sin sombrear (el alt lo admite). Sombrear 2 de 3 y 3 de 4, o cambiar la narración a «una barra dividida en tres partes, rotulada dos tercios».
4. SVG `ejemplo-uno`: las listas «4: 4, 8, 12» y «6: 6, 12» no dicen que son múltiplos. Rotular «Múltiplos de 4», «Múltiplos de 6» (cuidar 26 px) y alinear con el recuadro.

## mat.p6.comparar-ordenar-decimales: CAMBIOS

Archivo: `primaria-6/fichas/numeros-decimales.json`; SVG `comparar-ordenar-decimales-*.svg`.

1. SVG `ejemplo-dos` (riesgo señalado por el autor): SÍ engaña. En una recta numérica, la posición implica valor. 3,08, 3,18 y 3,8 están a ~120, 265 y 505 px de 75 a 565. A escala 3,18 debería estar a ~173 px (a 0,10 de 3,08), no casi a mitad de camino; el alumno puede concluir que 3,18 es «casi igual de lejos» de ambos y reforzar la idea de que más cifras es más distancia. Corregir: colocar a escala (3,08 y 3,18 cerca; 3,8 lejos; alternar rótulos arriba y abajo para que no choquen), o quitar la recta y usar tres fichas ordenadas sin sugerir distancia. Si se mantiene la recta, el alt/descripcion pueden quedar igual.
2. SVG `error`: la equis roja tapa el signo «>» y parte del «45». La descripcion dice «0,45 mayor que 0,5» pero el signo no se ve. Hacer la equis más pequeña o tachar con una diagonal fuera del signo.
3. SVG `situacion`: «S/ 2,56» queda a ~12 px del borde de la tarjeta. Ensanchar tarjetas o bajar el tamaño dentro de lo permitido.
4. Opcional: en `ejemplo-dos` la recta rotula «3,8» y la cadena inferior «3,80»; está explicado en la narración, pero coherencia visual mejoraría con «3,80» en ambos.

## Defectos conocidos revisados sin hallazgo

(1) `recursoRef` coincide con lo narrado en todas; (2) ningún recurso de situación revela la respuesta, sin «?» falsos; (3) sin «el dibujo/la imagen» en momentos sin recurso; (4) sin repetición de letra, sin pista que entregue la respuesta; (5) sin «parte N de M», sin letras o dígitos sueltos, sin títulos repetidos; (6) alt <=200, descripcion <=500.

## Ronda 2

Fecha: 2026-11-16. Solo lectura. `pnpm nudito:validar-banco` (2 238 fichas, 27 034 ejercicios) y `pnpm typecheck`: sin errores. Comparado con HEAD: en las 4 claves solo cambia `claseGuiada`. SVG cambiados rasterizados con Chrome headless y revisados: texto >=26 px, sin solapes ni desbordes.

| Clave | Veredicto |
|---|---|
| `mat.p2.conservacion-longitud` | APROBADA |
| `mat.p3.comparar-reglas-patrones` | APROBADA |
| `mat.p5.comun-denominador` | APROBADA |
| `mat.p6.comparar-ordenar-decimales` | APROBADA |

- p2: `ejemplo-dos` sin cota; `error` con espiral abierta de dos extremos visibles y línea roja punteada entre ellos; «cuerda» unificada en narración, alt y descripcion (ejemplo-uno y situación siguen con «cinta», coherente con su dibujo).
- p3: barra roja quitada, título acortado a «Mismo cambio, sentido opuesto», «+4» alineados, numerales separados en frases cortas.
- p5: «1/6» legible bajo raya fina; barras de `situacion` sombreadas 2/3 y 3/4 (el alt solo describe lo ya rotulado; no revela la respuesta, que es el denominador común); «dos sobre dos» y «cinco sobre cinco» solo aparecen en el ejemplo resuelto; listas rotuladas «Múltiplos de…».
- p6: recta a escala (x = 118, 173, 505: 3,08 y 3,18 a 55 px, 3,80 a ~387 px; desviación ~2 %), rótulos arriba y abajo sin choque, «3,80» coherente; `error` con signo «>» visible (la raya cruza las cifras pero se leen); precio de `situacion` con margen holgado.
- Observación no bloqueante: en p6 `error` la raya roja atraviesa ambos números en vez de solo el signo.
