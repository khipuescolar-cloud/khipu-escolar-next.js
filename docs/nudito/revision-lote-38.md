# Revisión independiente · Lote 38 (Matemática, primaria)

Revisor: subagente Claude (no autor). Fecha: 2026-11-16. Solo lectura sobre banco y recursos.

## Resumen

| Clave | Veredicto |
|---|---|
| mat.p1.clasificar-por-forma | CAMBIOS (menor, SVG/descripcion) |
| mat.p2.antecesor-sucesor | CAMBIOS (trivial, descripcion) |
| mat.p3.cero-posicional | APROBADA (con una corrección de ejercicio existente, ver G) |
| mat.p4.comparar-angulos-recto | APROBADA |
| mat.p5.cm2-m2 | CAMBIOS (comprobación no evalúa el tema) |
| mat.p6.area-rectangulo-cuadrado | CAMBIOS (menor, visual) |

## E) Técnico (las 6 claves)

- `pnpm typecheck`: sin errores. `pnpm nudito:validar-banco`: «Banco válido: 2238 fichas activas; 27034 ejercicios».
- Comparado con `HEAD` por JSON (clave a clave): en las 6 claves solo cambió `claseGuiada`. Ejercicios, ids y respuestas intactos.
- Los 6 archivos tienen 10 momentos, primer momento sin recurso, 5 recursos usados, sin dígitos en narración, alt <= 200 y descripcion <= 500, sin «parte N de M», sin «dibujo/imagen/tarjeta» en momentos sin recurso.
- Todos los SVG (30) rasterizados en headless (HTML con SVG en línea) y mirados: texto >= 26 px, sin `<tspan>`, sin desbordes ni solapes, colores permitidos (turquesa #0C706E, ámbar #8A5A00, rojo #B5412A). Solo los defectos listados abajo.
- Cálculos recalculados: todos correctos (47 ± 1, 80 − 1 = 79, 29 + 1 = 30, 59 + 1 = 60, 407, 47 y 470 del contraejemplo, 8 × 5 = 40, 7 × 7 = 49, 5 × 4 = 20, perímetro 18, suma 9, 5 × 3 = 15, 6 × 4 = 24, 4 × 3 = 12). Respuesta correcta única en las seis comprobaciones.
- Longitudes de opciones (correcta subrayada por posición): p1 19/20/**18**, p2 **7**/9/8, p3 15/**14**/15, p4 21/18/**18**, p5 18/**16**/19, p6 **23**/25/22. Todas con diferencia <= 3 y la correcta nunca la más larga. Letras: c, a, b, c, b, a.

---

## mat.p1.clasificar-por-forma · CAMBIOS (menor)

Archivo: `src/lib/nudito/conocimiento/banco/matematica/primaria-1/fichas/formas-del-entorno.json`.
Contenido y pedagogía correctos (idea, situación, dos ejemplos, contraejemplo, tres pasos, comprobación coherente; el contraejemplo usa solo conceptos trabajados).

1. Recurso `cilindros` (`public/nudito/diagramas/matematica/clasificar-forma-cilindros.svg`): el rótulo «Tapa plana y redonda arriba y abajo» está partido; la primera línea queda en el recuadro (y=386) y «arriba y abajo» (y=440) cae fuera, debajo del borde del recuadro (rect y=340..410). Parece desborde y la `descripcion` («un recuadro dice: tapa plana y redonda arriba y abajo») no coincide con el dibujo. Corregir: agrandar el recuadro para que contenga las dos líneas (p. ej. alto 110) o dejar todo el texto fuera/dentro, y ajustar la descripcion si cambia.
2. (Opcional, coherencia) Recurso `errores`: el dado aparece turquesa para ilustrar «mismo color», pero en `objetos-pregunta` y `ruedan` el dado es blanco (y la descripcion de `objetos-pregunta` dice «dado blanco»). Aceptable porque la descripcion de `errores` dice «ambos turquesa»; si se quiere coherencia total, que el contraejemplo use una pelota y una canica de otro par de objetos del mismo color real.

Notas sin acción: la lata y el tarro son cilindros que también ruedan; la narración no lo contradice (el grupo «ruedan» del ejemplo 1 se arma con esferas), pero un alumno atento puede preguntar. No bloquea.

## mat.p2.antecesor-sucesor · CAMBIOS (trivial)

Archivo: `.../primaria-2/fichas/numeracion-hasta-100.json`. Contenido correcto; el cambio de decena (29 a 30, 80 a 79) está bien tratado; la comprobación (opciones de una palabra, 7 a 9 caracteres) es legible en audio y sin pista de forma.

1. Recurso `cajas-pregunta`: la `descripcion` dice «Tres cajas con una placa», pero el dibujo no tiene ninguna placa (solo tres cajas con «?», 47 y «?», más «Va antes», «Va después» y «¿Qué números faltan?»). Quitar «con una placa».

Notas sin acción: `errores` y `ochenta` coinciden exactamente con alt y descripcion; marcadores «?» no llevan valor falso.

## mat.p3.cero-posicional · APROBADA

Archivo: `.../primaria-3/fichas/c23-numeracion-fracciones-dinero.json`. Contenido riguroso (407, 605 frente a 650, 47 y 470 como errores), tabla de lápices coherente (4 cajas de cien, 0 decenas, 7 sueltos), todos los SVG coinciden con alt y descripcion, el ámbar #8A5A00 se lee bien. Comprobación: sin pista (15/14/15, correcta en la del medio).

Sugerencia no bloqueante (F, oído): en el momento `contraejemplo` se dicen seguidas «cuatrocientos siete», «cuarenta y siete» y «cuatrocientos setenta», casi homófonas para un niño que solo escucha. La imagen las desambigua. Si se quiere reducir riesgo: decir «la cifra cuatro queda sola en las decenas» en vez de «queda cuarenta y siete», o dejar solo un error por narración.

Ejercicio existente (G): ver más abajo.

## mat.p4.comparar-angulos-recto · APROBADA

Archivo: `.../primaria-4/fichas/poligonos.json`. Contenido correcto; geometría del SVG verificada (en `libro-abierto` la V mide 120 grados, la esquina amarilla comparte vértice y un lado con la tapa derecha, la izquierda queda fuera; coincide con alt y descripcion). `esquina-encima` coincide exactamente (menor, igual, mayor). `errores` coincide.

Respuesta a la pregunta del orquestador sobre la comprobación (opciones 21/18/18, correcta «c» empatada con «b»): no hay pista de forma. La más larga es la «a» (distractor) y la correcta empata en longitud con otro distractor, así que la longitud no delata la respuesta. La estructura tampoco: «Menor que el recto» y «Mayor que el recto» son simétricas y la que se distingue como diferente es la «a». Mejora opcional, no necesaria: unificar «Igual que el recto» (18) para que las tres sean paralelas y de la misma longitud.

Sugerencia menor (B): el momento `contraejemplo` se titula «Un error muy común» pero la narración no enuncia el error (qué creen los niños). Añadir una frase como «Muchos creen que el ángulo de lados largos es el mayor; no es así» refuerza el contraste. No bloquea.

## mat.p5.cm2-m2 · CAMBIOS

Archivo: `.../primaria-5/fichas/perimetro-y-superficie.json`. Momentos y SVG correctos (figurita 5 × 3 = 15 cuadritos, patio 6 × 4 = 24 cuadrados; las etiquetas, el cuadrito amarillo y las descripciones coinciden; el ámbar es legible). La falta de escala entre figurita y patio es aceptable porque la narración no la afirma numéricamente.

1. Comprobación (respuesta a la pregunta del orquestador: NO es suficiente). La ficha enseña a elegir la unidad por tamaño (cm² para lo pequeño, m² para lo grande), pero la comprobación solo contrasta «metros cuadrados» con «metros de longitud» y «metros de distancia» (dos distractores casi sinónimos). Se resuelve sin considerar el tamaño: basta con reconocer la palabra «cuadrados» (el enunciado además dice «superficie»). El contraste cm² / m² queda sin evaluar en el cierre. (Los ejercicios e01, e03, e05 y e08 sí lo practican, por lo que el tema no queda sin evaluar en la ficha; es el momento de comprobación el que no lo mide.)
   Corrección mínima: sustituir el distractor c «Metros de distancia» por «Centímetros cuadrados». Longitudes 18/16/21: la correcta sigue siendo la más corta, pero el distractor supera por 5 (más que el límite de 3; es inevitable con «centí»; el orquestador decide si acepta la excepción, porque lo que se quiere evitar es que la longitud delate la correcta y aquí es al revés). Alternativa que respeta la regla de longitud: opciones a «Cuadros de un metro» (19, correcta), b «Cuadros de un dedo» (18), c «Un metro de largo» (17), con pregunta «¿Con qué cubrirá el espacio para medirlo?», aunque «dedo» no es vocabulario de la ficha. Ajustar `mensajeCorrecto` y `pista` en consecuencia (la pista actual ya habla de tamaño).

Notas sin acción: en `contraejemplo` los dos «errores» no se presentan igual: la moneda no es un error de la persona sino de la unidad; se entiende, pero un solo hilo («error de tamaño» y «error de longitud») sería más claro. No bloquea.

## mat.p6.area-rectangulo-cuadrado · CAMBIOS (menor, visual)

Archivo: `.../primaria-6/fichas/longitud-perimetro-y-area.json`. Contenido riguroso; la comprobación (pared 5 × 4, distractores perímetro 18 y suma 9) es correcta y de respuesta única; longitudes 23/25/22 (diferencia 3).

1. Recurso `taller-pregunta` (`area-rectangulo-taller-pregunta.svg`): el rótulo «8 m» queda a solo 4 px bajo el borde del rectángulo (texto y=352 con fuente 28 px; borde inferior y=327), visiblemente pegado, a diferencia de `filas-baldosas` y `patio-cuadrado`, donde hay aire. Bajar el texto a y=366 aprox. (la leyenda de la baldosa empieza en y=392, hay espacio).

Ejercicio existente (G): ver más abajo.

---

## G) Errores de ejercicios existentes reportados por el autor (no editados)

1. `mat.p3.cero-posicional` e04 («¿Qué número tiene 0 unidades?»; opciones 046, 406, 460, 604). Confirmado: «046» no es un número de tres cifras y enseña justo lo contrario de la ficha (el cero inicial no se escribe). Afecta al alumno poco: la respuesta correcta (460) sigue siendo única, pero en audio se leería «cero cuarenta y seis». Corrección mínima: cambiar la opción a por «506». Sigue siendo la única que termina en 0 la opción c (406 y 604 y 506 no terminan en 0); longitud igual; retroalimentación y pistas no cambian.
2. `mat.p6.area-rectangulo-cuadrado` e11 (retroalimentación «42 m es la superficie expresada sin cuadrado»). Confirmado confuso: el alumno que acierta lee una frase que parece decir que escribió mal. Afecta al alumno (aparece siempre). Corrección mínima de la retroalimentación: «Debe medir 7 m de largo, porque 6 × 7 = 42. El 42 es el área en metros cuadrados, no el largo.» Pistas y respuesta intactas.
3. `mat.p5.cm2-m2` e06 (mesa de 120 por 60 cm, «¿qué unidad conviene para expresar el área calculada con esas medidas?»). No es error de respuesta: «cm²» es la unidad de lo que se calcula con centímetros, y el enunciado lo fija con «calculada con esas medidas». Pero la ficha enseña «elige por tamaño» y una mesa se ve como superficie mediana, por lo que m² puede parecer razonable y la pregunta induce a la contradicción con la ficha. Afecta al alumno de forma leve. Corrección mínima: reescribir el enunciado como «Una mesa mide 120 cm de largo y 60 cm de ancho. Si multiplicas esas dos medidas, ¿en qué unidad queda el resultado?», sin tocar opciones, respuesta (a, cm²) ni retroalimentación.

Otros ejercicios revisados de las 6 claves: sin errores de respuesta ni de grado. Detalle menor (no del autor): `mat.p4` e09 omite el signo «¿» («En cuántos de ellos...»).

---

## Ronda 2

Verificado: `pnpm nudito:validar-banco` (2 238 fichas, 27 034 ejercicios) y `pnpm typecheck` sin errores. Comparación por JSON con HEAD de las 5 fichas: fuera de `claseGuiada` solo cambian las tres ediciones autorizadas (p3 e04 opción a «046» a «506»; p5 e06 enunciado; p6 e11 retroalimentación); id, dificultad, opciones y respuestas intactos. SVG cambiados rasterizados en headless y vistos.

- mat.p1.clasificar-por-forma · APROBADA. `cilindros`: el recuadro contiene ahora las dos líneas del rótulo; la descripción coincide.
- mat.p2.antecesor-sucesor · APROBADA. Descripción de `cajas-pregunta` sin «placa».
- mat.p3.cero-posicional · APROBADA. Contraejemplo sin homófonos seguidos. e04: 506 es de tres cifras, no termina en 0 y no repite; 460 sigue siendo la única respuesta.
- mat.p5.cm2-m2 · APROBADA. Comprobación 19/20/21 (b correcta): respuesta única; contrasta m² con cm² y con longitud, así que evalúa el tema (la diferencia de 2 con el distractor más largo es aceptable). e06: «si multiplicas esas dos medidas» es coherente con a = cm² (120 × 60 = 7 200 cm²) y ya no contradice la ficha.
- mat.p6.area-rectangulo-cuadrado · APROBADA. «8 m» bajado a y=366, con aire bajo el borde y sin tocar la leyenda. e11: la retroalimentación es clara y correcta (6 × 7 = 42).

Sin defectos nuevos.
