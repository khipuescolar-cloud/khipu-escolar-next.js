# Revisión independiente · Primaria, Matemática, lote 23

Revisor: subagente Claude (no autor del lote). Solo lectura sobre banco y SVG. Informe del autor: `docs/nudito/informe-editorial-primaria-lote-23.md`.

## Verificaciones técnicas (E)

- `pnpm typecheck`: sin errores.
- `pnpm nudito:validar-banco`: **válido** (2238 fichas, 27034 ejercicios) al momento de revisar; el error ajeno de `c24-regularidad.json` ya no aparece. Sin errores en las claves del lote.
- `git diff` de los seis JSON: en cada archivo solo se añade `claseGuiada` (más la coma de la línea anterior). En `primaria-5/fichas/fracciones.json` hay además el cambio ajeno en `mat.p5.suma-resta-fracciones` (ignorado).
- 24 SVG: sin `<tspan>`, texto mínimo 26 px, todos con `<title>`. Rasterizados con Chrome headless y revisados uno por uno (hojas de 4 en 4 y ampliaciones).
- `alt` ≤ 153 caracteres en todos; descripciones ≤ 432. Sin dígitos ni «parte N de M» en narraciones; sin «imagen/dibujo/tarjeta» en momentos sin recurso (las palabras «esquemas», «gráficos» y «pictograma» de p4 nombran el tema, no un recurso).
- Matemática del lote recalculada: todas las cuentas son correctas (398+257=655; 25×16=400; 704−296=408; 3/4=9/12, 5/6=10/12; 2×10=20<3×7=21; 2/3=10/15>3/5=9/15; 8+7=15; 6+7=13+7=20; cubo 6/12/8; prisma 5 caras, 9 aristas; pirámide 5/8/5; 4 canastas=12; 4 gotas×3=12). Letras correctas: c, b, a, c, b, a. Longitudes de opciones: ninguna correcta es la más larga (p5: 16/16/19, diferencia 3, en el límite).

## Resumen de veredictos

| Clave | Veredicto |
|---|---|
| `mat.p1.ayer-hoy-manana` | CAMBIOS |
| `mat.p2.calendario` | CAMBIOS |
| `mat.p3.caras-aristas-vertices` | CAMBIOS |
| `mat.p4.cambio-dibujos-graficos` | CAMBIOS |
| `mat.p5.comparar-fracciones-heterogeneas` | CAMBIOS |
| `mat.p6.calculo-mental-naturales` | APROBADA (dos observaciones opcionales) |

---

## mat.p1.ayer-hoy-manana · CAMBIOS

Archivo: `primaria-1/fichas/medicion-masa-y-tiempo.json`.

Correcto: estructura idea→situación→2 ejemplos→contraejemplo→pasos→comprobación; primer momento sin imagen; ejemplos guiados sin recurso; situación no revela la respuesta (los «?» son incógnitas, no valores falsos); comprobación con una sola correcta (martes), opciones 7/5/6 caracteres; vocabulario oral limpio; las tres imágenes de ejemplo coinciden con alt y descripción.

1. **Recurso `domingo-lunes` (momento `paso-3`) y SVG `ayer-hoy-manana-domingo-lunes.svg`: la línea punteada curva va del lunes de vuelta hacia el sábado.** Eso dice «regresa a sábado», no «la semana vuelve a empezar», y contradice lo que se quiere enseñar (después del domingo viene el lunes). La narración de `paso-3` dice «una línea que vuelve al principio» y la descripción «del lunes de vuelta hacia el sábado»; el niño verá un retroceso. Corregir: dibujar la curva/flecha que sale del domingo y entra al lunes (o un rótulo «otra semana» sobre el lunes) y reescribir narración y descripción acordes («una flecha lleva del domingo al lunes: otra semana empieza»). Sin curva de regreso a sábado.
2. Mismo SVG: las flechas entre tarjetas (sábado→domingo→lunes) son puntas de ~10 px casi invisibles. Alargar la flecha o agrandar la punta para que se vea en móvil.

## mat.p2.calendario · CAMBIOS

Archivo: `primaria-2/fichas/medicion-masa-y-tiempo.json`.

Evaluación del mes de 30 días que empieza en jueves (pedida): **es coherente con los ejercicios**. Comprobado contra `e05` (10 = sábado), `e07` (domingos 4, 11, 18, 25 = 4), `e10` (8 + 14 = 22), `e11` (29 = jueves; «el 28 es miércoles»), y con las pistas («segunda fila de números», «última fila»). El riesgo es otro: los ejercicios no tienen imagen (`lectura` sin recurso), así que en práctica el niño leerá «Mira el calendario» sin calendario a la vista.

Correcto: matemática de ejemplos y pasos, meses en orden, comprobación 5 + 7 = 12 con opciones 6/4/5 caracteres.

1. **`paso-1` (sin recurso) debería usar `mes-completo`.** Es el paso que explica «busca el número y fíjate en su columna» y es el momento natural para mostrar el calendario que los ejercicios `e05/e07/e10/e11` dan por supuesto. Añadir `recursoRef: "mes-completo"` y una frase que diga que es el calendario del mes de los ejercicios. Hoy el calendario solo aparece una vez, en `ejemplo-1-razona`, y solo como apoyo del jueves.
2. **`paso-1` dice «Mira el nombre del mes», pero ningún SVG muestra nombre de mes.** `calendario-mes-completo.svg` no tiene título. Rotular el calendario (por ejemplo «Un mes de treinta días») o quitar la frase.
3. **Iniciales L M M J V S D en `calendario-semana-pregunta.svg` y `calendario-mes-completo.svg`: la M se repite (martes/miércoles) y para 2.º las iniciales sueltas son ambiguas.** En `situacion` la narración dice «las letras de los días» sin deletrearlas. Cambiar a abreviaturas de tres letras (Lun, Mar, Mié, Jue, Vie, Sáb, Dom; cabe a 26 px en columnas de 78 px) y actualizar descripciones. Además `e07` ya habla de «la columna de Dom.».
4. SVG `calendario-suma-semanas.svg`: los rótulos «una semana» y «dos semanas» (y28, anchos ~160 y ~175 px) quedan separados solo ~22 px y se leen como una sola línea; «dos semanas» termina a ~42 px del borde derecho. Acortar a «1 semana»/«2 semanas» no vale (dígitos); bajar «dos semanas» a otra línea o separar las columnas.
5. SVG `calendario-meses-orden.svg`: «septiembre» (28 px, `font-family="sans-serif"`) ocupa casi todo su recuadro de 180 px (~8 px de holgura por lado); con otra fuente del sistema se desborda. Ensanchar el recuadro o bajar a 26 px.
6. Comprobación: el distractor «Quince» repite el número de la situación inicial (el 15) y puede leerse como eco; sustituirlo por otro valor no relacionado (por ejemplo «Diez»). Opcional.

## mat.p3.caras-aristas-vertices · CAMBIOS

Archivo: `primaria-3/fichas/c26-forma-movimiento.json`.

Respuesta pedida sobre `caja-pregunta`: arista (borde vertical atrás-derecha) y vértice (esquina abajo-adelante-derecha) **no están cerca**; son claros. El problema real es otro: el trazo de la etiqueta «una cara».

Correcto: cubo 6/12/8 y pirámide 5/8/5 bien dibujados y coinciden con alt y descripción; prisma 5 caras, 9 aristas; la situación no da cantidades; opciones 13/12/14 caracteres, correcta no es la más larga; narración sin letras sueltas.

1. **SVG `caras-aristas-vertices-caja-pregunta.svg`: la línea de «una cara» (de x 355 a 292, y 138) termina en la esquina superior derecha de la cara azul y cruza la punta de la arista amarilla (x 310, y 130-290).** Puede leerse como si «una cara» señalara la arista o la esquina. Mover la punta de esa línea al centro de la cara superior (aprox. x 195, y 160) o terminarla antes de la arista con un punto en el interior de la cara, y mantener una línea limpia sin cruces. Lo demás se puede quedar.
2. **`paso-3` (recurso `piramide-conteo`) entrega 5 caras, 8 aristas y 5 vértices de la pirámide, y esos son exactamente los ejercicios `e09` (8 aristas), `e10` (pirámide 5 caras vs cubo) y el ejemplo 3 de la ficha.** La lección resuelve la práctica. Preferible: en `paso-3` no dar las cifras («compara con otro cuerpo, como una pirámide de base cuadrada; la imagen la muestra con sus vértices marcados») o usar otro cuerpo no usado en los ejercicios.
3. Comprobación (`pregunta`): el enunciado ya parte las aristas en 3 + 3 + 3, de modo que solo queda sumar; baja el nivel de la comprobación y hace innecesario el recurso. Reformular a «Un prisma triangular tiene dos triángulos en los extremos. ¿Cuántas aristas tiene en total?» y mantener la pista sobre contar por grupos. Menor.
4. Ningún recurso muestra el prisma triangular armado (solo sus cinco caras sueltas), pero la comprobación pregunta por sus aristas. Aceptable si se corrige el punto 3 con la pista de grupos; si no, añadir un recurso del prisma con aristas.

## mat.p4.cambio-dibujos-graficos · CAMBIOS

Archivo: `primaria-4/fichas/relaciones-de-cambio.json`.

Correcto: aritmética (3, 6, 9, 12; 3 × 2 = 6; 4 × 3 = 12), cuatro recursos coherentes con alt/descripción, «?» solo en la incógnita, la jaula llamada «uno» (sin letra suelta), opciones 13/12/11 (correcta c, la más corta), comprobación nueva y bien redactada.

1. **Contradicción en `situacion`, `ejemplo-1-guiado`, `ejemplo-1-razona`, `paso-3` y SVG `canastas-pregunta/-resuelto/-cuatro`.** La narración dice «cada canasta lleva el mismo número de mazorcas», pero luego «La canasta dos tiene seis» y «La canasta tres llega a nueve»; a la vez «en tres canastas habrá nueve». Las filas son totales acumulados, no canastas individuales: si cada canasta lleva tres, la canasta dos no tiene seis. Un niño de 4.º atento lo notará. Corregir: decir que cada **canasta nueva trae tres mazorcas**, y rotular las filas como acumulado («1 canasta», «2 canastas», «3 canastas» o «Con una canasta», «Con dos canastas») en los SVG, alt y descripciones; y en la narración «con dos canastas hay seis», «con tres, nueve».
2. `contraejemplo`: «tres estrellas de cinco soles» es ambiguo para la voz. Decir «cada estrella vale cinco soles; con tres estrellas hay quince soles, no tres». Menor.
3. `idea` es el único título distinto de la clave («Cambio en esquemas y gráficos»); aceptable, solo vigilar que el banco/curriculum no espere el nombre «dibujos».

## mat.p5.comparar-fracciones-heterogeneas · CAMBIOS

Archivo: `primaria-5/fichas/fracciones.json` (cambio ajeno en `mat.p5.suma-resta-fracciones` ignorado).

Correcto: doceavos 9 y 10 bien dibujados; múltiplos de 4 y 6 con el 12 resaltado; contraejemplos correctos (3/8 < 3/4; 5/9 < 3/4); la situación no sombrea barras ni revela; comprobación con una correcta (2/3 > 3/5); fracciones en palabras, sin símbolos en la voz; opciones 16/16/19 (diferencia 3, límite).

1. **`ejemplo-2-razona` y SVG `comparar-fracciones-heterogeneas-cruzados.svg`: el método de productos cruzados se da sin explicar a qué fracción pertenece cada producto.** «Dos por diez son veinte y tres por siete son veintiuno. Como veintiuno es mayor, siete décimos es mayor» es una regla sin justificar (¿por qué 21 es de 7/10?). Añadir en `ejemplo-2-guiado`/`razona` que el producto del numerador de una fracción por el denominador de la otra queda **del lado de esa primera fracción** («dos por diez va con dos tercios; tres por siete va con siete décimos») y que el mayor producto indica la fracción mayor. En el SVG, rotular cada producto bajo su fracción ya coincide; basta decirlo y reflejarlo en la descripción.
2. `ejemplo-1-guiado` es el único guiado que no termina en pregunta («Con él convertiremos cada fracción.»). Cerrar con una pregunta al niño, por ejemplo «¿Cuál es el menor número que está en las dos tablas?». Menor.
3. Vocabulario inconstante: `ejemplo-1-guiado` dice «tabla del cuatro/del seis» y `paso-2` dice «múltiplos». Unificar con una frase puente («la tabla del cuatro, o múltiplos de cuatro»). Menor.

## mat.p6.calculo-mental-naturales · APROBADA

Archivo: `primaria-6/fichas/numeros-naturales-y-operaciones.json`.

Correcto: 398+257 por compensación, 25×16 por doble y mitad, 704−296 por suma igual a ambos; contraejemplos acertados (duplicar ambos factores; sumar sin quitar); recursos coinciden con alt/descripción; ningún SVG con problemas de texto; letras de la voz limpias (números en palabras); correcta «a», opciones 16/17/15, la más larga es un distractor.

Observaciones opcionales (no bloquean):

1. `alt` de `colecta-pregunta`: «trescientos noventa y ocho tapitas y doscientos cincuenta y siete tapitas» está en masculino; la narración ya dice «trescientas noventa y ocho tapitas». Igualar a «trescientas noventa y ocho tapitas y doscientas cincuenta y siete tapitas».
2. `paso-2` introduce por primera vez la resta compensada con cuatro números hablados en una sola oración; es pesado de escuchar. Partir la oración en dos o dar solo la regla y dejar la cuenta para la imagen. La idea menciona «separar números» y ningún momento lo trabaja; reformular la idea o añadir una frase.
3. Comprobación: el enunciado ya dice qué hacer (duplicar y reducir a la mitad), de modo que solo se calcula 15 × 2 y 12 ÷ 2; aceptable, pero subiría su valor preguntando «¿Cuál multiplicación da lo mismo que quince por doce y es más fácil?».

---

Pendientes generales no cubiertos: recorrido en navegador (audio, móvil, movimiento reducido); no se verificó qué fuente muestra el alumno si hay lección publicada con prioridad sobre el JSON del banco.

---

## Ronda 2

Revisor independiente (solo lectura). Verificado: `pnpm nudito:validar-banco` válido (2238 fichas, 27034 ejercicios); `pnpm typecheck` sin errores; en las 5 claves solo cambia `claseGuiada` (comparado contra HEAD por JSON). Rasterizados con Chrome headless los 10 SVG modificados: texto ≥26 px, sin `<tspan>`, sin solapes ni desbordes. Letras correctas c, b, a, c, b; longitudes de opciones dentro de diferencia ≤3 y correcta nunca la más larga.

| Clave | Veredicto |
|---|---|
| `mat.p1.ayer-hoy-manana` | APROBADA |
| `mat.p2.calendario` | APROBADA |
| `mat.p3.caras-aristas-vertices` | APROBADA |
| `mat.p4.cambio-dibujos-graficos` | APROBADA |
| `mat.p5.comparar-fracciones-heterogeneas` | APROBADA |

- p1: `domingo-lunes` ahora sábado→domingo→lunes con flechas gruesas, sin curva de regreso; narración y descripción coherentes. Flechas cortas pero visibles.
- p2: Lun/Mar/Mié/Jue/Vie/Sáb/Dom legibles a 26 px y sin desbordar; `mes-completo` con título y usado en `paso-1`; «dos semanas» en dos líneas; «septiembre» cabe; distractor «Diez». Observación menor (no bloquea): en `mes-completo` el título y la fila de días, y la ecuación y la última fila, quedan muy juntos.
- p3: `caja-pregunta` con línea limpia hasta un punto dentro de la cara; `paso-3` y `piramide-conteo` no dan cifras (e09/e10 no resueltos); comprobación reformulada, respuesta única 9 (3+3+3).
- p4: filas «1 canasta»…«4 canastas» acumuladas (3, 6, 9, 12) coherentes en narración, SVG, alt y descripciones; contraejemplo «cada estrella vale cinco soles; con tres estrellas hay quince soles, no tres».
- p5: ejemplo-2 explica a qué fracción pertenece cada producto y lo justifica en treintavos (20/30 < 21/30); `ejemplo-1-guiado` termina en pregunta; vocabulario unificado.
