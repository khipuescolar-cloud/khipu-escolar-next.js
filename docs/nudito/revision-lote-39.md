# Revisión independiente · Primaria, Matemática, lote 39

Revisor: subagente independiente (no escribió el lote). Solo lectura sobre banco y recursos.

## Verificación técnica

- `pnpm nudito:validar-banco`: válido (2 238 fichas, 27 034 ejercicios). `pnpm typecheck`: sin errores.
- Las 6 claves: el resto de la ficha (incluidos los 12 ejercicios) es idéntico a `HEAD`; solo cambió `claseGuiada`. Coincide con el informe del autor.
- 10 momentos por clave, primer momento sin recurso, todos los `recursoRef` resuelven, alt ≤ 200 (máx. 154) y descripcion ≤ 500 (máx. 417).
- Letras correctas b, c, a, b, c, a. Cálculos recalculados y correctos (10−6, 2600+1800, 6000−2350, 3650+6000=9650, 5·4+4, 20÷4, 6×2,5, 3·5−2). Ángulos medidos sobre los SVG: 70°, 130°, 140°, 40° exactos.
- Rasterizados y vistos los 30 SVG (Chrome headless, sin ventanas). Texto ≥ 26 px, sin desbordes ni solapes graves, ámbar `#8A5A00` con buen contraste, sin `<tspan>`. Detalles abajo.
- Dato clave: la voz lee título + narración + «La imagen relacionada con esta parte muestra lo siguiente: » + `descripcion` (`narracionAccesibleDeMomento`). Todo lo que diga la descripción se oye.

## Riesgos del autor

- p6, letras c, p, e en las descripciones: SÍ se oirán, porque la descripción se lee. «cinco c más cuatro», «p dividido entre cuatro», «seis e igual quince» suenan a letras sueltas y «seis e» se oye como «seis y». Hay que corregirlo (defecto p6-1).
- p5, cifras y «°» en el SVG frente a palabras en narración y descripción: aceptable. Lo que sí falla es otra cosa (dos escalas no dibujadas, defecto p5-1).
- e01 de p5: la correcta es mucho más larga (62 frente a 41-45 caracteres), delata la respuesta. Afecta al alumno; ver corrección en p5-4.
- e08 de p5: correcto, pero exige imaginar un transportador con dos escalas, que la ficha no dibuja. Se resuelve con p5-1; sin edición propia del ejercicio.

## Veredictos

### mat.p1.comparar-masa-balanza: CAMBIOS (menores)

1. `lapiz-borrador-pregunta`: el título dibujado dice «¿Cuánto pesa cada uno?» y la descripción repite «Arriba se pregunta cuánto pesa cada uno». Una balanza compara, no da pesos, y la narración pregunta otra cosa («¿Qué podemos decir de lo que pesan?»). Cambiar el título del SVG y la frase de la descripción a «¿Qué podemos decir?» o «¿Qué pesa más?».
2. `ejemplo-1-guiado` usa `recursoRef: situacion` (balanza vacía y pareja), pero la narración cuenta que «el platillo de la papa baja». La voz, además, repite la descripción completa de `situacion` por segunda vez. Mínimo: reordenar la narración para que solo pida predecir («Doña Rosa pone la papa en un platillo y la cebolla en el otro. ¿Cuál platillo baja y cuál pesa más?») y no adelante el resultado que `papa-cebolla` muestra después. Esto evita además revelar la respuesta antes de la pregunta.
3. Menor visual: en `globo-piedra` el brazo y las cuerdas se cruzan con el globo; legible, sin cambio obligatorio.

### mat.p2.clasificar-por-lados: CAMBIOS

1. Incoherencia narrativa: la situación presenta tres figuras (turquesa, amarilla, azul). La turquesa se resuelve en el ejemplo 1; la azul reaparece en el contraejemplo; la amarilla (trapecio) nunca se cuenta. El ejemplo 2 introduce «pañuelo y ventana», que no son las figuras de Mateo. Mínimo: en `ejemplo-2-guiado`/`ejemplo-2-razona` cambiar los objetos por la figura amarilla (necesita nuevo SVG) o, sin SVG, añadir en `contraejemplo` o en el paso 3 una frase que cierre la amarilla («la figura amarilla también tiene cuatro lados y va con el pañuelo y la ventana») y cambiar en `ejemplo-2-guiado` «Mateo tiene un pañuelo…» por «Mateo también guarda un pañuelo cuadrado y una ventana larga».
2. `situacion`: la descripción «La azul tiene una punta arriba y esquinas más parejas» es imprecisa al oído; mejor «La azul se parece a una casita de cinco esquinas» sin nombrar el pentágono.
3. El resto correcto: triangulo/pañuelo-ventana/salto coinciden con alt y descripción; numeración horaria correcta; comprobación c correcta, opciones parejas.

### mat.p3.comparar-capacidades: APROBADA (con observación opcional)

- Contenido correcto: rebalse implica mayor capacidad; 10−6=4; contraejemplo alto/ancho; comprobación a única (jarra de seis en botella de cuatro).
- Observación: `ejemplo-1-guiado` reutiliza `situacion` (recipientes vacíos) mientras narra el trasvase; es el mismo patrón que p1-2. Aceptable aquí porque no adelanta la respuesta con la imagen.
- Visual: los 5 SVG limpios; textos y gotas correctos.

### mat.p4.comprobar-suma-resta: CAMBIOS

1. Comprobación sin respuesta única: la opción a «Sumar otra vez los dos sumandos» también es una forma válida de revisar la suma; la lección enseña la operación contraria, pero el enunciado «¿Qué cuenta lo comprueba?» no la restringe. Cambiar a por un distractor claramente erróneo, p. ej. «Sumar los sumandos con el total» (31 caracteres; b tiene 30 y c 33).
2. Menor: las descripciones de barras omiten los títulos dibujados («Volvemos a formar el total», «Quitamos un sumando», «Dos comprobaciones»). Opcional.
3. Visual y cálculo correctos (9 650 de la comprobación errónea incluido). Cantidades largas en palabras son pesadas al oído pero no ambiguas.

### mat.p5.construir-angulos: CAMBIOS

1. Falla central: la idea, el paso 3, el contraejemplo («el otro número de la misma raya») y la comprobación dependen de que el transportador tiene dos escalas, pero ningún SVG las dibuja (solo 0° a la derecha y 180° a la izquierda). En `escala-equivocada` 140° y 40° están en posiciones distintas, no «en la misma raya», así que la narración no coincide con el dibujo. Mínimo sin SVG: reescribir el contraejemplo como «se pedía cuarenta grados, pero se contó desde el cero del lado equivocado y la marca quedó en ciento cuarenta» (coincide con el dibujo) y en idea/paso 3 decir «cuenta desde el cero que queda sobre tu rayo» en lugar de «la escala correcta». Mejor solución: dibujar en `transportador-pregunta` la segunda numeración (0° a la izquierda en el arco interior) con texto ≥ 26 px.
2. `ejemplo-1-guiado` pregunta «¿En qué número hay que hacer la marca?» cuando la narración de la situación ya dijo setenta: pregunta trivial. Cambiar a «¿Desde qué cero contamos y hasta qué número?».
3. `situacion` y `ejemplo-1-guiado` usan el mismo recurso con la voz repitiendo la descripción íntegra. Aceptable, sin cambio obligatorio.
4. Ejercicio e01 (opcional, el orquestador decide): la correcta c «Trazar un rayo o lado inicial con la regla y señalar el vértice» (62) es mucho más larga que las demás (41-45); un alumno la elige por longitud. Corrección mínima: c = «Trazar un rayo con regla y marcar el vértice» (44) y ajustar la retroalimentación sin cambios. e08 no requiere edición si se cumple el punto 1.
5. Visual: transportador bien trazado y ángulos exactos; el texto inferior queda algo pegado a «0°/180°» en `abanico-pregunta` y `marca-*` (≈ 40 px), legible. El rótulo rojo `#B5412A` pasa contraste.

### mat.p6.comprobar-solucion-ecuacion: CAMBIOS

1. Las descripciones de `situacion`, `panes-pregunta`, `cuadernos`, `panes` y `sentido` contienen las letras c, p, e sueltas que la voz leerá: «cinco c más cuatro», «p dividido entre cuatro», «seis e igual quince», «c igual cuatro». «seis e» se oirá «seis y». Mínimo: reescribir las descripciones con palabras («cinco veces la cantidad de cuadernos, más cuatro, igual veinticuatro», «la letra c vale cuatro» solo una vez) y mantener las letras en el SVG.
2. Menor: `cuadernos` y `panes` omiten en la descripción el título dibujado «Reemplazamos c por 4» / «Reemplazamos p por 20».
3. Contenido, ejemplos, contraejemplo (2,5 entradas) y comprobación a (5 caramelos; 7 y 3 fallan) correctos; opciones de longitud equivalente.
4. Visual limpio: cruz y marca verde separadas, símbolo ≠ claro, texto ≥ 26 px.

## Resumen

APROBADA: p3. CAMBIOS: p1, p2, p4, p5, p6. Ningún defecto es de cálculo; todos son de coherencia narración-imagen o de lectura oral, salvo p4-1 (respuesta única) y p5-4 (e01).

## Ronda 2

Verificación: `pnpm nudito:validar-banco` válido (2 238 fichas, 27 034 ejercicios); `pnpm typecheck` sin errores. Comparado con `HEAD` por JSON, en las 5 claves solo cambió `claseGuiada`, salvo p5 e01 (edición autorizada): solo la opción c (62 a 44 caracteres, «Trazar un rayo con regla y marcar el vértice»); id, dificultad, respuesta `c`, pistas y retroalimentación intactos; respuesta única (a, b, d siguen siendo claramente falsas, longitudes parejas); pista y retro coherentes.

- **mat.p1.comparar-masa-balanza: APROBADA.** Título del SVG y descripción ahora «¿Qué podemos decir?»; `ejemplo-1-guiado` solo pide predecir y no adelanta el resultado.
- **mat.p2.clasificar-por-lados: APROBADA.** «Mateo también guarda…», la amarilla se cierra en `ejemplo-2-razona` (cuatro lados, es trapecio sin nombrarlo), azul descrita como «casita»; coherente con `salto` (cinco lados).
- **mat.p4.comprobar-suma-resta: APROBADA.** Única correcta b «Restar mil doscientos del total»; a «Sumar los sumandos con el total» y c son falsas; longitudes 31, 30, 33.
- **mat.p5.construir-angulos: APROBADA.** Rasterizados y medidos los 5 SVG (headless): ceros exteriores a la derecha (sobre el rayo) e interiores a la izquierda, 180° opuestos, 90° arriba; ángulos 70°, 130° y 140°/40° exactos (atan sobre las coordenadas); coinciden con alt/descripcion y con «cuenta desde el cero que queda sobre tu rayo». `escala-equivocada` es coherente: el rojo a 40° desde el cero izquierdo cae a 140° del rayo. Contraejemplo y ejemplo-1-guiado corregidos. Sin defectos nuevos.
- **mat.p6.comprobar-solucion-ecuacion: APROBADA.** Alt y descripciones sin letras sueltas (c, p, e); títulos dibujados mencionados en `cuadernos` y `panes`; cálculos y respuesta a intactos.

Resumen: las 5 claves APROBADA (p3 ya lo estaba). Sin defectos nuevos.
