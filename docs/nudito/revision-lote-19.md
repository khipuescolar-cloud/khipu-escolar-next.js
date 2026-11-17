# Revisión independiente, lote 19 (Matemática primaria)

Revisor distinto del autor. Solo lectura sobre banco y SVG. Fecha: 2026-11-16.

## Verificaciones técnicas

- `pnpm nudito:validar-banco`: banco válido, 2238 fichas, 27034 ejercicios. `pnpm typecheck`: sin errores.
- `git diff` por archivo: en las 6 claves solo se añade el bloque `claseGuiada` (sin otros cambios de ejercicios, ids ni respuestas). Nota: `primaria-2/fichas/igualdades-y-equivalencias.json` trae además un `claseGuiada` en `mat.p2.igualdades-equilibrio`, que es de otro lote y se ignora aquí.
- 30 SVG nuevos rasterizados con Chrome headless (640x480) y revisados como imagen. Sin `<tspan>`, todos con `<title>`, tamaño mínimo de fuente 26. No hay textos cortados ni solapes graves.
- Script: todos los `src` existen, alt <=145 caracteres, ningún dígito ni «parte N de M» en narraciones, ningún título repetido en la narración, primer momento sin recurso, sin «dibujo/imagen» en momentos sin recurso.
- No se revisó uno por uno los 72 ejercicios existentes, salvo e08 de p5.

## Decisiones sobre los dos casos dudosos

- `tres-angulos` (p4): no revela la regla (no hay rótulo ni marca de recto). Pero el ángulo B tiene lados exactamente vertical/horizontal y la descripción dice «el segundo tiene un lado vertical», lo que lo delata mientras la narración afirma que «a simple vista no basta». Se acepta la imagen si se gira B y se quita esa frase (defectos p4-3).
- `sandia-pesa` (p3): ACEPTABLE. Es el recurso de situación que ilustra la idea ya enunciada en el primer momento; no hay pregunta que resolver. No requiere cambio.

## Error de e08 en `mat.p5.barras-desde-tabla` (primaria-5/fichas/graficos.json)

Verificado: datos 90, 120, 70, escala de 30 en 30 desde 0 (0, 30, 60, 90, 120). La respuesta 120 es correcta si se lee «la marca más baja que alcanza a contener todas las barras» (primera marca >= 120), pero el enunciado es engañoso: «la marca más baja del eje» se lee naturalmente como 0. No es error de cálculo, sí de redacción. Corrección exacta propuesta del enunciado:

«Una heladería en Chimbote vende helados de lúcuma (90), maracuyá (120) y fresa (70). Si se diseña una escala de 30 en 30 iniciando en 0, ¿hasta qué número debe llegar el eje como mínimo para contener todas las barras? Escribe solo el número.»

Respuesta 120, pistas y retroalimentación sin cambio.

## Veredictos

### mat.p1.alto-bajo: CAMBIOS
1. `longitud.json`, recurso `torres-pregunta`, `descripcion`: dice «la torre amarilla, que es más larga hacia arriba». En el ejemplo guiado la pregunta es cuál torre es más baja; la descripción (que lee el reproductor) entrega la respuesta. Quitar «que es más larga hacia arriba» (dejar «a la izquierda la torre azul y a la derecha la torre amarilla»).
2. Opcional: `ejemplo-1-razona` usa `tito-resuelto` cuya línea punteada tiene un tramo vertical corto hacia Lucía que la descripción no menciona; añadir «y un trazo corto baja hasta la cabeza de Lucía».
Matemática, pedagogía, visual y opciones (c, 7/13/10 caracteres) correctas.

### mat.p2.balanza-platillos: APROBADA
Cuentas correctas (6+3=9; 10-7=3; 15-9=6), respuesta única (a), contraejemplos correctos, platillos sueltos en las variantes pregunta (no revelan), alt y descripción coinciden con los SVG. Observaciones menores no bloqueantes: platillos a 24 px del borde en `inclinada`/`diez-resuelto`; la narración de `situacion-balanza` habla de «más pesas» y el contraejemplo luego aclara que contar pesas no basta (aceptable).

### mat.p3.balanza-masa: CAMBIOS
1. `c23-masa-tiempo.json`, recurso `aguja-pregunta`: el SVG tiene el rótulo «La aguja todavía no se detiene» y un eje con punto rojo, mientras `alt` y `descripcion` dicen «la aguja aún no está» / «todavía no tiene aguja». Igualar: en alt/descripcion decir que la esfera aún no marca ningún número (o cambiar el rótulo del SVG).
2. `aguja-pregunta` y `aguja-resuelto` SVG: la bolsa de harina queda cortada por la caja «kg» (se ve a medias, entre la caja y el plato). Separarla de la caja o dibujarla completa sobre el plato.
3. `ejemplo-2-razona`: «la aguja apunta entre el seis y el diez, justo al ocho» es confuso para 3.º; decir «después del seis y antes del diez, justo en el ocho».
`sandia-pesa` aceptada (ver arriba). Cuentas (5+2=7; 4+3+2=9) correctas, respuesta única (b), opciones de longitud 15/16/16.

### mat.p4.angulo-recto: CAMBIOS
1. `poligonos.json`, recurso `triangulo-pregunta`, `alt`: «con un círculo en una de sus esquinas, que parece muy abierta» revela la respuesta del ejemplo guiado. Quitar «que parece muy abierta».
2. `comprobacion.opciones`: la correcta (c, «Los dos son ángulos rectos») es la más larga (26 contra 23 y 23) y la única distinta. Igualar longitudes (por ejemplo «Los dos por igual», o alargar a y b: «Solo el de los lados largos»/«Solo el de los lados cortos»).
3. Recurso `tres-angulos`: la `descripcion` dice «el segundo tiene un lado vertical» y B está en ejes exactos, por lo que parece el único recto aunque la narración diga que a simple vista no basta. Girar B unos grados o dejar el vértice de B con lados no alineados y quitar esa frase de la descripción; alt y descripción deben seguir coincidiendo con el SVG.
4. `comprobacion.pista`: «¿importa el largo de los lados?» induce casi directamente la respuesta; reformular a «Recuerda para qué sirve la escuadra: ¿qué compara?».
5. Redacción de la pregunta de comprobación: «¿Cuál es un ángulo recto?» con respuesta «los dos» es forzada; usar «¿Cuáles son ángulos rectos?».
Visual: `triangulo-resuelto` correcto (hueco amarillo coincide con la descripción), aunque el vértice con círculo queda tapado en parte por la hoja y la hoja cruza el lado del triángulo; aceptable. Matemática: ángulo del triángulo ~120 grados, correcto.

### mat.p5.barras-desde-tabla: APROBADA
Cuentas correctas (15/25/35/20 = 3/5/7/4 intervalos de 5; puntos medios 50 y 30), comprobación con respuesta única (a: 25, 45, 35 y 15 son múltiplos de 5; 10 y 7 no sirven), SVG coinciden con alt y descripción, texto >=26. Recomendaciones no bloqueantes de voz: en la comprobación «veinticinco, cuarenta y cinco, treinta y cinco y quince» puede oírse ambiguo (escribir «los valores veinticinco, cuarenta y cinco, treinta y cinco, y quince»), y en el contraejemplo «cero, quince, treinta y setenta» sustituir por «cero, quince, treinta, setenta». Corregir e08 (ver arriba, decisión del orquestador).

### mat.p6.ampliacion-reduccion: CAMBIOS
1. `ubicacion-y-transformaciones.json`, momento `ejemplo-2-razona`: «Las rectas punteadas pasan por el origen» no coincide con el SVG `plano-resuelto`, donde los trazos punteados solo unen cada vértice con su imagen y no llegan al origen. Cambiar a «Los trazos punteados unen cada punto con su nuevo punto; si se prolongaran, pasarían por el origen», o prolongar los trazos hasta el origen en el SVG.
2. Recurso `plano-resuelto`, `descripcion`: «con el triángulo verde original y, dentro, un triángulo amarillo más pequeño». El amarillo no está dentro del verde; decir «y, más cerca del origen, un triángulo amarillo más pequeño».
3. Recurso `plano-pregunta`, `descripcion`: «números de cero a ocho» pero el eje vertical solo llega a seis; decir «números de cero a ocho en el eje horizontal y de cero a seis en el vertical».
4. Voz: `ejemplo-2-guiado` «la coordenada x y la coordenada y se dividen» (la «y» letra y la «y» conjunción chocan en audio). Escribir «la primera coordenada, x, y la segunda coordenada, ye,» o usar «la coordenada horizontal y la coordenada vertical». Lo mismo en `paso-3` («x e y»).
Matemática correcta (3x3=9, 2x3=6; (4,2),(8,2),(4,6) a (2,1),(4,1),(2,3); 12/3=4, 18/3=6, distractores 9x15 y 4x18), respuesta única (b), opciones 28/27/32 caracteres.

## Resumen

APROBADAS: p2, p5. CON CAMBIOS: p1 (1 obligatorio), p3 (3), p4 (5), p6 (4). Todos los cambios son de texto de alt/descripcion/narración/opciones, salvo p3-2 y p4-3, que tocan SVG.

## Ronda 2

Verificado: `pnpm nudito:validar-banco` (2238 fichas, 27034 ejercicios) y `pnpm typecheck` sin errores. SVG rasterizados con Chrome headless y vistos (tres-angulos, aguja-pregunta, aguja-resuelto): texto >=26 px, sin solapes ni desbordes.

- mat.p1.alto-bajo: APROBADA. `torres-pregunta` ya no dice cuál torre es más larga; `tito-resuelto` menciona el trazo corto a Lucía. Sin defectos nuevos.
- mat.p2.balanza-platillos: APROBADA (ronda 1).
- mat.p3.balanza-masa: APROBADA. alt/descripcion de `aguja-pregunta` coinciden con el SVG (solo eje rojo, «la aguja todavía no se detiene»); la bolsa de harina está completa sobre el plato y separada de la caja kg (hueco de ~14 px) en pregunta y resuelto; aguja en 8 verificada geométricamente (36° desde la derecha); `ejemplo-2-razona` claro.
- mat.p4.angulo-recto: APROBADA. Geometría de `tres-angulos` verificada: B tiene rayos a -20° y -110° (diferencia exacta de 90°, ninguno en ejes); A mide ~35° y C ~140°, ambos con base horizontal, por lo que ninguno se delata por ejes. Descripción sin «lado vertical». alt de `triangulo-pregunta` sin «muy abierta». Opciones de 27/27/26 caracteres, correcta c; pregunta «¿Cuáles son…?» y pista nuevas correctas. Observación no bloqueante: el enunciado ya dice que los dos encajan justo con la escuadra, así que la pregunta es fácil (diseño previo).
- mat.p5.barras-desde-tabla: APROBADA. e08 con el enunciado nuevo tiene respuesta única 120 (máximo de 90, 120, 70; escala 0, 30, 60, 90, 120) y es coherente con pistas y retroalimentación.
- mat.p6.ampliacion-reduccion: APROBADA. «Coordenada horizontal y vertical» se entiende en 6.º, evita el choque de «y» en audio y no rompe la comprobación (afiche 12 por 18 entre tres, respuesta b); trazos punteados, «más cerca del origen» y ejes 0-8 / 0-6 ya coinciden con SVG y narración.

Veredicto global: lote 19 APROBADO, sin cambios pendientes.
