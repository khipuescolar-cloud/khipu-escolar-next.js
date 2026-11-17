# Revisión independiente · Primaria, Matemática, lote 20

Revisor: subagente Claude (Sonnet), distinto del autor. Solo lectura sobre banco y SVG.

## Verificaciones técnicas (E)

- `pnpm nudito:validar-banco`: válido (2238 fichas, 27034 ejercicios). `pnpm typecheck`: sin errores.
- Comparación JSON contra `HEAD` en los 6 archivos: en las 6 claves solo cambió `claseGuiada`; ejercicios, ids y respuestas intactos.
- `primaria-6/fichas/fracciones.json`: además de `mat.p6.amplificar-simplificar`, cambió el `claseGuiada` de `mat.p6.multiplicacion-fracciones` respecto a HEAD. No es de este lote (otro autor/lote en curso); no se pisó nada, pero conviene que no se integre como parte del lote 20.
- Script: `recursoRef` resuelve en todos los momentos, 10 momentos, primer momento sin recurso, alt ≤ 200, sin dígitos en narración, sin «parte N de M», sin títulos repetidos, rutas `src` existen, «imagen/dibujo» solo en momentos con recurso. Letras correctas: c, a, b, c, a, b (sin repetición consecutiva).
- Los 25 SVG se rasterizaron con Chrome headless y se vieron uno a uno. Texto mínimo 26 px, sin desbordes ni solapes graves.
- Cálculos recalculados: 4·5·3=60; 7·25·4=700; 5·2·15=150; 5·2·3=30; 5·2·4 capas OK; 3·6·2=36; 3/5=12/20; 24/36=6/9=2/3 (mcd 12); 30/45=2/3; 60−35=25; tomates 35, cebollas 60. Respuesta única en las 6 comprobaciones. Todos los ejercicios existentes revisados: correctos.

## mat.p1.armar-figuras-con-piezas — CAMBIOS

1. `formas-del-entorno.json`, recurso `casa` (`armar-figuras-casa.svg`): el triángulo es más ancho que el cuadrado (base ~230 px frente a ~170 px), pero la narración (`ejemplo-2-guiado`) dice «el lado de abajo del triángulo toca el lado de arriba del cuadrado» y la descripción dice que juntos «parecen una casa». Igualar la base del triángulo al lado del cuadrado, o decir en narración y descripción que el techo sobresale.
2. Comprobación, campo `pista`: «Ahora hay uno más en la fila» junto con la referencia a los dos cuadrados prácticamente entrega «rectángulo». Reformular sin llevar a la respuesta (p. ej. «Mira el borde de afuera de toda la fila de cuadrados»).
3. `armar-figuras-dos-cuadrados-pregunta.svg`: el texto «Junto dos cuadrados» y «Junto sus lados completos» usa «junto» en primera persona; la voz y un niño de 1.º pueden leerlo como adjetivo. Cambiar por «Juntamos dos cuadrados» y «Juntamos sus lados completos». La descripción oral no menciona esas frases; añadirlas o aceptar la omisión.
4. Menor: `ejemplo-2-guiado` sin recurso narra la construcción completa; aceptable, pero considerar cerrar con una pregunta («¿qué figura sale?») para que sea guiado de verdad.

## mat.p2.barras-verticales — CAMBIOS

1. `graficos-y-pictogramas.json`, recursos `tabla-vacia` y `papa-cinco`: el marcador de interrogación es una caja punteada de altura 2 (cuadritos 0 a 2). Sugiere un valor (2) que no es el de ninguna barra (papa 5, yuca 3) y puede inducir un error de altura. Dibujar las columnas vacías sin altura propia (solo la línea de base con «?») o con caja punteada de toda la altura del eje.
2. `ejemplo-2-guiado` (sin recurso): dice «Queremos saber cuál barra será la más alta» y en la misma frase entrega «El mayor es siete». El guiado resuelve lo que la pregunta pedía. Dejar la pregunta abierta y resolver en `ejemplo-2-razona`.
3. Menor: `mascotas.svg`, la etiqueta «7» sobre la barra del perro queda a ~25 px de las tarjetas de datos; dar más aire.

Sin defectos en: alturas de barras (4, 7, 2; 5, 3; 3, 5, 2) coinciden con alt y descripción; nombres bajo cada barra; contraejemplo `sin-nombres` correcto y coherente.

## mat.p3.barras-escala — CAMBIOS

1. `c25-datos.json`, comprobación: opciones «Veinte kilos» (12 car.), «Veinticinco kilos» (17), «Treinta kilos» (13); la correcta es la más larga. Igualar longitudes (p. ej. «Veintiún kilos» no; usar «Veinte kilos», «Veinticinco kilos», «Treinta y cinco kilos» o similares de largo parecido).
2. Recurso `votos-pregunta` (`barras-escala-votos-pregunta.svg`): el marcador de Carla es una caja punteada que llega al 6, un valor falso (el dato es 11). Puede inducir a pensar que Carla es 6. Dibujar la caja sin altura concreta o con altura completa del eje.
3. Recurso `votos-carla`: la etiqueta «11» sobre la barra amarilla se apoya sobre la línea del 12; y los números del eje (26 px cada 30 px) casi se tocan. Subir la etiqueta o darle fondo crema, y ampliar la separación del eje.
4. Recurso `eje-vacio` (situación): el eje ya trae ocho divisiones iguales hasta el dato mayor 40, lo que fija implícitamente la escala de cinco en cinco que se pregunta («¿de cuánto en cuánto va el eje?») y se resuelve en `ejemplo-2-guiado`. Dibujar un número de divisiones que no delate la escala o aclararlo en la narración.
5. Menor: `paso-1` dice «Mira la tabla» sin recurso; aceptable porque la tabla se nombró antes, pero revisar.

Sin defectos en: cuentas (11 entre 10 y 12; 35 entre 30 y 40), alturas del SVG `jugos-cinco` (40, 25, 35 con líneas cada 5) coinciden con alt y descripción.

## mat.p4.asociativa-multiplicacion — CAMBIOS

1. `c23-terminos-propiedades.json`, comprobación: opciones «Cuarenta» (8), «Cien» (4), «Ciento cincuenta» (16). La correcta es con diferencia la más larga: delata la respuesta. Usar opciones de longitud parecida (p. ej. «Cuarenta y cinco», «Ciento veinte», «Ciento cincuenta»).
2. `asociativa-multiplicacion-agrupar-pregunta.svg`: `<tspan fill>` con espacios iniciales/finales dentro de texto centrado (« × 3 = ?», «4 × »). Funciona en Chrome pero es frágil en otros renderizadores; separar en `<text>` independientes o usar `xml:space`.

Matemática y pedagogía correctas: asociativa solo con factores vecinos, ejemplo 2 con grupo fácil (25 × 4), comprobación con 5 × 2 × 15 sin exigir conmutativa. Imágenes `agrupar-pregunta` no revelan resultado; `sesenta` y `setecientos` coinciden con alt y descripción.

## mat.p5.capacidad-prismas — CAMBIOS

1. `prismas-rectos.json`, comprobación: «Treinta y seis cubos unidad» (27), «Dieciocho cubos unidad» (22), «Once cubos unidad» (17); la correcta es la más larga. Igualar longitudes (p. ej. «Doce cubos unidad» con relleno equivalente) o cambiar la redacción.
2. `capacidad-prismas-treinta.svg`: con ancho de dos cubos, la cara lateral derecha muestra una sola franja por capa en vez de dos; la vista no es exactamente 5 × 2 × 3. Dibujar la cara lateral con dos cubos de profundidad o aclararlo en la descripción.
3. Menor: `cuarenta.svg` representa cada capa como una fila plana de 8 cubos; es válido como «capas separadas» pero no se ve como capas de una caja; la narración ya lo dice («capas separadas»). Sin acción obligatoria.

Matemática correcta (5·2·3=30; 8·5=40; 3·6·2=36). `lapices-pregunta` no revela el resultado y su altura de tres capas coincide con alt y descripción.

## mat.p6.amplificar-simplificar — APROBADA

Sin defectos bloqueantes. Observaciones menores no obligatorias:

1. `amplificar-simplificar-barra-cinco.svg`: «Tres quintos de una barra» y «3/5 de la barra» repiten la misma información; podría quitarse una línea.
2. El archivo `primaria-6/fichas/fracciones.json` incluye un cambio ajeno al lote (`mat.p6.multiplicacion-fracciones`), ver sección técnica.

Verificado: 3/5=12/20 (12 de 20 partes pintadas, coincide con el SVG), 24/36 → 6/9 → 2/3, mcd 12, comprobación 30/45 = 2/3 con respuesta única (6/9 y 10/15 son equivalentes pero no irreductibles), opciones de longitud parecida, vocabulario oral correcto («tres quintos», «seis novenos», «doce sobre veinte»), `multiplicar-pregunta` no revela resultado.

## Vocabulario oral (F), todo el lote

- Narración sin dígitos ni símbolos; fracciones dichas como «sobre/quintos/novenos/tercios». Sin problemas.
- Opciones en letras; legibles en audio. En p4 «Cien» frente a «Ciento cincuenta» se distingue bien.
- Resumen: APROBADA solo p6; p1 a p5 necesitan los cambios indicados (los de mayor peso: longitudes que delatan la respuesta en p3, p4, p5; marcadores «?» con altura falsa en p2 y p3; techo desproporcionado en p1).

## Ronda 2

Revisor: subagente Claude distinto del autor. Solo lectura. `pnpm nudito:validar-banco`: válido (2238 fichas, 27034 ejercicios). `pnpm typecheck`: sin errores. Comparación con HEAD: en las 6 fichas solo cambia `claseGuiada`; `primaria-6/fichas/fracciones.json` cambia únicamente `claseGuiada` de `amplificar-simplificar` y de `multiplicacion-fracciones` (esta última ajena, presente, con 10 momentos y válida). `claseGuiada` de p6 intacta respecto a ronda 1 (3/5=12/20, 24/36→6/9→2/3, mismos recursos y comprobación). SVG modificados rasterizados con Chrome headless y vistos: texto ≥26 px, sin solapes ni desbordes.

- mat.p1.armar-figuras-con-piezas: APROBADA. Casa con triángulo de la misma base que el cuadrado (coincide con narración y descripción); pista ya no entrega «rectángulo»; «Juntamos…» en SVG y descripción. Menor sin acción: `ejemplo-2-guiado` sigue sin cerrar con pregunta.
- mat.p2.barras-verticales: APROBADA. Columnas «?» punteadas de toda la altura (5), sin valor falso para la yuca (3); `ejemplo-2-guiado` ya no entrega «el mayor es siete»; etiqueta 7 de `mascotas` con aire. Menor: la columna «?» de yuca llega al 5, igual que la papa; no revela el 3.
- mat.p3.barras-escala: APROBADA. Opciones «Treinta y cinco / Veinticinco / Cuarenta y cinco kilos» (21/17/22 car.; respuesta b, 60−35=25); caja de Carla de toda la altura (14); «11» con fondo y eje más aireado; `eje-vacio` sin marcas, coherente con alt y descripción.
- mat.p4.asociativa-multiplicacion: APROBADA. «Cuarenta y cinco / Ciento veinte / Ciento cincuenta» (5·2·15=150, respuesta c); tspan con espacios duros se ven bien.
- mat.p5.capacidad-prismas: APROBADA. Comprobación 3·5·2=30; opciones «Treinta / Quince / Diez cubos unidad» (20/19/18 car.), respuesta a, pista y mensaje correctos. `treinta.svg` ahora muestra dos franjas laterales por capa y cinco×dos arriba: coherente con 5×2×3=30. Menor: la respuesta de la comprobación (30) repite el resultado del ejemplo 1; conviene cambiar a otra capa/número en una pasada futura, no bloquea.
- mat.p6.amplificar-simplificar: APROBADA (sin cambios).

Letras correctas: c, a, b, c, a (p1–p5) y b (p6), sin repetición consecutiva. Sin defectos nuevos de recursoRef, vocabulario oral ni imagen que revele la respuesta.
