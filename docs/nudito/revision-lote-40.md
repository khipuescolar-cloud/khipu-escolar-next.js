# Revisión independiente · Primaria, Matemática, lote 40

Revisor: agente independiente (no escribió el lote). Fecha: 2026-11-16. Solo lectura sobre banco y recursos.

## Verificaciones comunes (las 6 claves)

- Técnico: `pnpm typecheck` sin errores; `pnpm nudito:validar-banco` válido (2238 fichas, 27034 ejercicios); `git diff --check` limpio sobre los 6 JSON. En las 6 claves todo salvo `claseGuiada` es idéntico a `HEAD` (comparado por JSON; ninguna tenía `claseGuiada` previa): no hay ediciones de ejercicios.
- Script: 10 momentos por clave; primer momento sin recurso; `recursoRef` ↔ `recursos` exactos y todos usados (5 por clave); sin dígitos ni letras sueltas en narración; sin «dibujo/imagen/tarjeta/mira» en momentos sin recurso; alt ≤ 125; descripción ≤ 277; los 30 SVG existen.
- SVG: rasterizados los 30 con Chrome headless y vistos. Texto 26–44 px (mínimo 26), sin `<tspan>`, con `<title>`. Contrastes calculados: turquesa `#0C706E` 5,2:1, ámbar `#8A5A00` 5,2:1 (solo un texto), rojo `#B5412A` 4,95:1, gris `#5B6170` 5,5:1; ningún texto con `#0F7C7A` ni `#C98F1E`. Sin desbordes ni solapes de texto, salvo lo anotado en p6.
- Comprobaciones recalculadas: p1 hoja (b); p2 100−60=40 (c); p3 14 es el menor (a); p4 200 cm − 190 cm = 10 cm, Rosa (b); p5 420/60=7 (c); p6 15 de 20 (a). Respuesta única; letras b, c, a, b, c, a; longitud de opciones: p1 8/8/8, p2 7/9/8, p3 4/5/5, p4 26/26/26, p5 14/15/13, p6 49/49/49 (diferencia ≤ 2) y la correcta nunca es la más larga. Pistas no entregan la respuesta.
- Ejercicios de las 6 claves recalculados uno a uno (72): sin errores de contenido ni de grado (ver G).
- Observación general, baja: varias `descripcion` omiten el título que el SVG rotula arriba (p. ej. «Fila de fichas», «Dos cajas del mismo tamaño», «Una película»). No se pide corrección; es el criterio de lotes anteriores.

## mat.p1.completar-patron — APROBADA

Archivo: `src/lib/nudito/conocimiento/banco/matematica/primaria-1/fichas/patrones-de-repeticion.json`.

Sin defectos que exijan cambio. Dibujos = alt y descripción (siete casillas, corchetes de grupo, borde verde en la casilla resuelta, borde rojo punteado en el error). La situación no da la respuesta. Contraejemplo coherente con `erroresFrecuentes`.

Notas opcionales (no bloquean):
1. `comprobacion.pregunta` lee al oído una lista de nueve palabras (hoja, hoja, flor…); para 1.º es larga, pero el texto está en pantalla. Opcional: acortar a «hoja, hoja, flor, hoja, hoja, flor, hoja, espacio» y quitar el «flor» final.
2. `situacion` y `ejemplo-2-guiado` dicen listas de cinco fichas; aceptable porque cada ficha es una forma + color distinta.

## mat.p2.completar-a-100 — CAMBIOS

Archivo: `.../primaria-2/fichas/adicion-y-sustraccion-hasta-100.json`.

1. Momento `situacion` / recurso `barras-pregunta` (SVG `completar-a-100-barras-pregunta.svg`): la etiqueta «Tiene: 20» sobre un corchete de dos barras en una fila de diez fija que cada barra vale diez antes de `ejemplo-1-guiado`, donde el alumno debe deducirlo («Cada barra vale una decena»). Además `alt` y `descripcion` dicen «las otras ocho (están) vacías», que da el número de decenas que faltan. Corrección mínima: en el SVG cambiar «Tiene: 20» por «Ya pegó» (la voz ya dice «veinte» en la narración) y en `alt`/`descripcion` decir «las otras, vacías» sin el número. Las ocho barras vacías visibles son inevitables en el modelo de barras.
2. Resto correcto: `barras-decenas`, `tira-setenta`, `errores`, `pasos` coinciden con alt/descripción; contraejemplo («veinte más ocho») correcto; opciones 7/9/8, correcta c y no la más larga.

## mat.p3.comparar-masas — CAMBIOS

Archivo: `.../primaria-3/fichas/c23-masa-tiempo.json`.

1. Momentos `ejemplo-2-guiado` y `ejemplo-2-razona` (recurso `bolsas-orden`): la narración dice «tres bolsas» («la bolsa de lentejas… la de arroz… la de harina») y el título «ordenar tres bolsas», pero el dibujo, `alt` y `descripcion` muestran tres cajas con asa («Tres cajas iguales en fila»). Corregir: o decir «tres cajas» en esos dos momentos (título y narración), o dibujar bolsas. Lo mínimo es cambiar el texto: «tres cajas de la tienda… la caja de lentejas… la de arroz… la de harina». El `id` `bolsas-orden` puede quedar.
2. Resto correcto: cajas del mismo tamaño en la situación (sin revelar), ámbar `#8A5A00` solo en «Más liviana», contraejemplo (caja grande 2 kg / pequeña 7 kg) con dibujo proporcional, opciones 4/5/5 con la correcta (a) la más corta.

## mat.p4.convertir-m-cm — APROBADA

Archivo: `.../primaria-4/fichas/longitud-y-perimetro.json`.

Sin defectos que exijan cambio. La situación solo rotula «1 m» (no revela cien); `cinta-cien` muestra «1 m / 100 cm» y «6 × 100 = 600 cm»; `tela-trozos` y `error-cero` coinciden con alt/descripción. Opciones de igual longitud (26).

Notas opcionales:
1. `ejemplo-2-razona` explica 370 cm con «tres veces cien son trescientos» (descomposición) mientras `paso-3` enseña «divide entre cien». Opcional: añadir «trescientos entre cien son tres».
2. En `error-cero.svg` las tres casillas quedan alineadas a la izquierda mientras los textos van centrados; estético, no bloquea.

## mat.p5.convertir-unidades-tiempo — CAMBIOS

Archivo: `.../primaria-5/fichas/medicion-masa-y-tiempo.json`.

1. Momento `contraejemplo` / recurso `errores` (SVG `convertir-unidades-tiempo-errores.svg`): el error mostrado es «una hora y treinta minutos = ciento treinta minutos». Pero «ciento treinta minutos» es justo la respuesta correcta del ejemplo 1 (dos horas y diez minutos). Al oído el alumno recibe el mismo número como correcto y como error en pocos momentos. Corrección mínima: usar otro caso con resultado distinto, p. ej. «una hora y quince minutos»: error «ciento quince», correcto «sesenta más quince son setenta y cinco minutos». Cambiar narración, rótulos del SVG («1 h 15 min = 115 min», «60 + 15 = 75 min», casilla «15 min»), `alt` y `descripcion`.
2. Resto correcto: situación sin los sesenta; cálculos (130, 320) y dibujos coinciden; opciones 14/15/13 con la correcta (c) la más corta.

## mat.p6.conclusiones-estudio — CAMBIOS

Archivo: `.../primaria-6/fichas/probabilidad.json`.

1. Recurso `frutas-conclusion` (SVG `conclusiones-estudio-frutas-conclusion.svg`, momento `ejemplo-1-razona`): el texto dibujado dice «el mango fue la más elegida» (concordancia rota: sujeto masculino, «la» sin sustantivo), y `alt`/`descripcion` lo repiten. La narración dice «la fruta más elegida». Corregir el SVG a «el mango fue la fruta más elegida» (caber en dos líneas con 28 px: «Entre los 24 encuestados,» / «el mango fue la fruta más elegida») o a «el mango fue el más elegido», y ajustar `descripcion`.
2. Recurso `alcance-error` (SVG `conclusiones-estudio-alcance-error.svg`, momento `contraejemplo`): el círculo interior (cx 320, cy 322, r 88; borde inferior en y 410) casi toca el círculo punteado exterior (cy 255, r 160; borde en y 415): quedan 3 px y parece tangente. Además «encuestados» (26 px, y 349) queda a unos 4 px del borde del círculo interior. Corregir: subir el círculo interior a cy ≈ 300 (texto a y ≈ 293 y 327) o agrandar el exterior; dejar al menos 12 px.
3. Resto correcto: `feria-barra` (18 verdes, 7 grises; línea punteada en el centro del cuadro trece = doce y medio) coincide con alt/descripción; «doce y medio» se lee bien; opciones 49/49/49 con la correcta (a).

## G. Errores de ejercicios existentes (informados por el autor)

Todos los ejercicios de las 6 claves recalculados; solo estos tres afectan al alumno. El orquestador decide; ninguno se editó.

1. `mat.p6.conclusiones-estudio` e08 («Un gráfico registra 12 votos por A y 9 por B. ¿Cuántos votos sustentan que A fue más elegido?», respuesta 12): **sí afecta**; «sustentan» admite 3 (la diferencia) y 12. Corrección mínima sin cambiar la respuesta: «Un gráfico registra 12 votos por A y 9 por B. ¿Cuántos votos tuvo la opción más elegida? Escribe solo el número.» (12).
2. `mat.p2.completar-a-100`, `erroresFrecuentes[0].correccion` («Esa es la mitad de 60. A 30 le faltan 7 decenas…»): **sí afecta** a un alumno de 2.º; la frase «mitad de 60» no explica nada. Corrección mínima: «30 son 3 decenas y 100 son 10 decenas: faltan 7 decenas, o sea 70, porque 30 + 70 = 100.»
3. `mat.p5.convertir-unidades-tiempo` e11 (partido con alargue, árbitro y transmisión televisiva): matemáticamente correcto (150 − 135 = 15, b), pero el contexto es forzado y confuso («el árbitro quiere saber cuánto falta para completar dos horas y media de transmisión»). Impacto bajo. Corrección mínima: «Una obra de teatro dura 2 horas y media y ya pasaron 135 minutos. ¿Cuántos minutos faltan?» (mismas opciones, respuesta b).

Observación adicional (bajo, no del autor): en p6 e01 y e09 la opción correcta es la más larga (c y d), igual que e12 (a) y e06 de p5 no aplica; son ejercicios preexistentes, solo para tenerlo en cuenta en una pasada de ejercicios.

## Resumen

- APROBADAS: mat.p1.completar-patron, mat.p4.convertir-m-cm (con notas opcionales).
- CAMBIOS: mat.p2.completar-a-100 (1 defecto), mat.p3.comparar-masas (1), mat.p5.convertir-unidades-tiempo (1), mat.p6.conclusiones-estudio (2).
- Sobre el «Tiene: 20» de p2: sí insinúa el valor de cada barra antes del ejemplo; se corrige quitando el número del rótulo y de alt/descripción.

## Ronda 2

Verificados los defectos de ronda 1 en las cuatro claves; SVG rasterizados con Chrome headless y revisados; `pnpm nudito:validar-banco` válido (2238 fichas, 27034 ejercicios); `pnpm typecheck` sin errores.

- mat.p2.completar-a-100 — APROBADA. Rótulo «Ya pegó» sin valores; alt/descripcion sin cifra; `erroresFrecuentes[0].correccion` correcta y clara.
- mat.p3.comparar-masas — APROBADA. `ejemplo-2-guiado`/`razona` dicen «cajas» (título y narración), coherente con dibujo, alt y descripcion.
- mat.p5.convertir-unidades-tiempo — APROBADA. Contraejemplo «1 h 15 min» (error 115, correcto 75) coherente en narración, SVG, alt y descripcion; ya no coincide con el 130 del ejemplo 1.
- mat.p6.conclusiones-estudio — APROBADA. «el mango fue la fruta más elegida» en SVG, alt y descripcion; `alcance-error` con aire visible (círculo interior y texto sin tocar el borde). e08: «¿Cuántos votos tuvo la opción más elegida?», respuesta única 12, pistas y retro coherentes con los datos (12 y 9).
