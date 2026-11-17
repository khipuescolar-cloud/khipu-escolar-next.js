# Revisión independiente · Lote 41 (Matemática primaria)

Revisor independiente, 2026-11-16. Solo lectura sobre banco y recursos.

Técnico: `pnpm typecheck` sin errores. `pnpm nudito:validar-banco` válido (2238 fichas, 27034 ejercicios). Comparado con HEAD por JSON: en las 6 claves solo cambió `claseGuiada` (ninguna la tenía). Los 30 SVG existen, se rasterizaron en Chrome headless y se vieron. Todo el texto SVG es >=26 px, sin `<tspan>`, colores de texto solo `#1E2A78`, `#0C706E`, `#8A5A00`, `#B5412A`, `#FFFFFF`. Alt <=142 y descripción <=351 en todos. Los 10 momentos, el primero sin recurso, y los `recursoRef` coinciden con los recursos. Cuentas recalculadas y correctas en las seis. Escalas de las rectas (p3) y del triángulo y el rectángulo (p6) verificadas a escala. Letras correctas b, c, a, b, c, a; longitudes de opciones con diferencia <=3 y la correcta nunca la más larga.

## Resumen

| Clave | Veredicto |
|---|---|
| mat.p1.contar-hacia-atras | APROBADA (con ajuste menor opcional) |
| mat.p2.conclusiones-grafico | APROBADA |
| mat.p3.completar-centena | CAMBIOS (menor, 1 línea de narración) |
| mat.p4.croquis-referencias | APROBADA (ajustes menores opcionales) |
| mat.p5.croquis-calles | CAMBIOS |
| mat.p6.construir-triangulos-cuadrilateros | APROBADA |

## mat.p1.contar-hacia-atras (`primaria-1/fichas/conteo-y-numeros-hasta-10.json`): APROBADA

Sin defectos bloqueantes. Contenido, orden pedagógico, imágenes (el «?» del cohete es un valor real que falta; no se revela el tres) y alt/descripción coinciden con el dibujo.

1. Opcional, `contar-atras-cohete-completo.svg`: el rótulo ámbar «Uno menos cada vez» queda ~16 px del borde inferior. Subirlo ~10 px.

## mat.p2.conclusiones-grafico (`primaria-2/fichas/graficos-y-pictogramas.json`): APROBADA

Sin defectos. Barras 8/6/3 y pictograma 3 y 5 figuras de dos: 6, 10, diferencia 4, correctos. El pictograma de situación no muestra totales; la respuesta aparece solo en los recursos «comparar» y «cuenta». La comprobación sin gráfico (7 y 4, tres fresas más) es única.

1. Opcional, `conclusiones-panes-cuenta.svg`: el recuadro punteado casi toca la tercera figura del martes; separarlo ~6 px.

## mat.p3.completar-centena (`primaria-3/fichas/c23-adicion-sustraccion.json`): CAMBIOS (menor)

1. Momento `contraejemplo`: la narración nunca dice de dónde parte el error («sumó ocho, llegó a trescientos cincuenta»); el número de salida solo está en la imagen. Corregir: «alguien parte de trescientos cuarenta y dos, completó solo la decena: sumó ocho…». Así la narración se entiende sin ver el recurso (audio).

Lo demás correcto: 284→300 (6+10), 462→500 (8+30), 342→350→400, 648→700 (52). Las imágenes de pregunta no escriben la respuesta.

## mat.p4.croquis-referencias (`primaria-4/fichas/ubicacion-y-recorridos.json`): APROBADA (ajustes menores)

Riesgo del autor (izquierda/derecha/al frente con el croquis visto desde arriba): es claro y consistente en la ficha. La situación dice «visto desde arriba, de izquierda a derecha», el ejemplo 2 ancla «la izquierda es hacia donde queda la bodega» y el colegio (abajo, mirando a la calle) tiene su izquierda en la misma dirección que la izquierda de la página. Solo se usa la izquierda del colegio, que coincide en ambos sentidos. «Al frente» está definido («al otro lado de la calle, justo enfrente»).

Ajustes menores, no bloqueantes:

1. `comprobacion`: la posta está en la fila de arriba, mirando hacia la calle; su derecha propia es la izquierda de la página. El enunciado no repite la convención. Añadir «En un croquis visto desde arriba, …» o «a la derecha de la posta, mirando el croquis». Sin ese anclaje un alumno atento puede dudar.
2. `croquis-referencias-calle-colegio.svg`: las puntas de la flecha «Al frente» se meten ~7 px en los bordes del mercado y del colegio; acortarla para que toque sin atravesar.
3. `croquis-referencias-errores.svg`: el dibujo «mototaxi» parece una camioneta pequeña (cabina y caja, sin techo ni tercera rueda). Aceptable por ser esquemático, pero un niño peruano podría no reconocerlo. Si es fácil, añadirle techo.

## mat.p5.croquis-calles (`primaria-5/fichas/ubicacion-y-transformaciones.json`): CAMBIOS

1. Incoherencia entre recursos (defecto 1). El mercado está en Puno con Brasil en `plano-pregunta.svg` y `plano-posta.svg` (mismo mapa Tacna/Junín/Puno), pero en `errores` está en Junín con Brasil y el momento `contraejemplo` dice «En este mapa, el mercado y la posta están sobre la misma calle Junín». Es falso para el mapa que el alumno acaba de ver. Corrección mínima: mover el círculo y la etiqueta del mercado a Junín con Brasil en `plano-pregunta.svg` y `plano-posta.svg` (el mapa ya tiene la posta en Junín), de modo que los tres recursos coincidan. Las alt/descripción de esos dos no nombran la fila del mercado, así que no cambian. En `plano-posta`, «El mercado sigue en su cruce» sigue valiendo.
2. Convención presentada como regla (riesgo del autor). El momento `contraejemplo` dice «Otro error es confundir una calle con una avenida: las calles van de lado a lado y las avenidas, de arriba abajo». Eso es falso en general (las vías no tienen orientación fija) y se presenta como error del alumno. La situación sí lo plantea como descripción de este mapa. Corregir el contraejemplo a «Otro error es confundir los nombres: en estos mapas las calles van de lado a lado y las avenidas, de arriba abajo, y cada una tiene su propio nombre» o, más corto, eliminar esa frase y dejar solo el error de nombrar una sola vía. El texto ámbar del SVG («Calles: de lado a lado / Avenidas: de arriba abajo») es aceptable porque describe el mapa. La situación debería decir «En este mapa».
3. Comprobación: las opciones a y b («sin avenida», «sin calle») delatan la correcta c por contraste. Menor; si se toca, reformular a «Solo la calle Tacna» / «Solo la avenida Brasil» / «Calle Tacna con avenida Brasil».

Lo demás correcto: cruces y colores de las imágenes coinciden con la narración; vocabulario oral sin problemas; la situación no nombra el cruce de la posta.

## mat.p6.construir-triangulos-cuadrilateros (`primaria-6/fichas/triangulos-cuadrilateros-y-circulo.json`): APROBADA

Riesgo del autor (el contraejemplo insinúa que tres, cuatro y ocho no cierran; ¿adelanta e09?): no es defecto. e09 usa 2, 3 y 6 (otros datos), la ficha preparatoria debe mostrar un caso que no cierra, y no enuncia la regla de la suma ni da la letra de e09. La frase «los lados cortos no alcanzan» es suficiente y no se debe añadir la regla explícita (eso sí adelantaría el ejercicio). Verificado en el dibujo: arcos de 3 y 4 cm sobre base de 8 cm, hueco de 40 px = 1 cm, correcto. Triángulo 4-5-6 dibujado a 50 px/cm, vértice en la intersección real; rectángulo 6 por 4 con cuatro ángulos rectos marcados; alt y descripción coinciden.

1. Opcional: el SVG `errores` usa 40 px/cm y los otros 50 px/cm; no afecta al alumno.

## Ejercicios existentes reportados por el autor (G)

El orquestador decide; correcciones mínimas propuestas (no editadas por el revisor):

1. `mat.p1.contar-hacia-atras` e01, e04 y e09: «cuenta 1 números», «señala 1 lugares anteriores» y también en la pista 2 («Retrocede 1 veces») y la retroalimentación («Al retroceder 1 lugares»). Afecta al alumno (texto visible y leído en voz). Corrección: singular en enunciado, pista 2 y retroalimentación de las tres: «cuenta 1 número hacia atrás», «señala 1 lugar anterior», «Retrocede 1 vez de uno en uno», «Al retroceder 1 lugar desde…». No cambia respuestas.
2. e02/e06/e10 de p1: «En la actividad con choclos en el patio, en un juego en el patio dices…» repite el contexto. Afecta la claridad pero no la respuesta. Corrección mínima: quitar la segunda mención, p. ej. «En la actividad con choclos en el patio, dices 9 y retrocedes 2 pasos de uno en uno…». Prioridad baja.
3. `mat.p6` e11: la opción a (correcta) mide ~80 caracteres frente a 25 y 29 de las otras. Se acierta por longitud. Corrección: igualar longitudes, p. ej. a «Traza 5 cm, marca 60°, mide 5 cm y une»; b «Traza 5 cm, marca 90°, mide 5 cm y une»; c «Dibuja tres lados de 5 cm a ojo». Se mantiene respuesta única (a). Afecta al alumno, prioridad media.
4. `mat.p2`: los ejercicios dependen del gráfico descrito en texto; es el diseño del banco, sin acción.

## Defectos de la rúbrica comprobados sin hallazgo

- Sin «parte N de M», sin títulos repetidos en narración, sin «mira/imagen/dibujo» en momentos sin recurso (el momento `idea` de p6 solo coincidió con una palabra no visual), sin letras sueltas en narración. Los números aparecen en palabras; los dígitos de «Ejemplo 1»/«Paso 1» están solo en los títulos.
- Texto de SVG en cifras con narración en palabras: coherente.

## Ronda 2

| Clave | Veredicto |
|---|---|
| mat.p1.contar-hacia-atras | APROBADA |
| mat.p3.completar-centena | APROBADA |
| mat.p5.croquis-calles | APROBADA |
| mat.p6.construir-triangulos-cuadrilateros | APROBADA |

- p1: e01, e04, e09 comparadas con HEAD por JSON; solo cambian texto de enunciado, pista 2 y retroalimentación (id, dificultad y respuesta intactos). Gramática correcta: «1 número», «1 lugar anterior», «Retrocede 1 vez», «1 lugar».
- p3: el contraejemplo ya dice «parte de trescientos cuarenta y dos»; se entiende sin ver el recurso.
- p5: rasterizados `plano-pregunta`, `plano-posta` y `errores`: mercado en Junín×Brasil y posta en Junín×Colón en los tres. Rótulos «Aquí: calles de lado a lado y avenidas de arriba abajo», situación «En este croquis…» y contraejemplo sin regla general. Comprobación (28/28/29): única respuesta c (Puno×Arica); a cambia la calle, b la avenida; coherente con el mapa (farmacia hipotética en un cruce libre).
- p6: e11 con opciones 38/38/39; a (60° entre dos lados de 5 cm) es la única correcta, b usa 90° y c no mide. Respuesta única y matemática correcta. No hay otra edición fuera de claseGuiada.
- `pnpm nudito:validar-banco`: 2238 fichas, 27034 ejercicios, válido. `pnpm typecheck`: sin errores.
- Sin defectos nuevos.
