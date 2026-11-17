# Revisión independiente · lote 51 (Matemática primaria)

Revisor: Claude (independiente; el lote lo escribió Codex). Informe del autor: `informe-editorial-primaria-lote-51.md`.

## Verificaciones técnicas (todas OK)
- Lint mecánico `nudito-lint-clase-guiada.ts` en las 5 claves: 0 errores, 0 avisos (letras C, B, A, C, B).
- `tsc --noEmit`: sin errores. `nudito-validar-banco`: válido, 2 238 fichas, 27 034 ejercicios (`pnpm` no está en el PATH de este shell; se usaron `node_modules/.bin/tsc` y `tsx`).
- Comparación con HEAD por clave: fuera de `claseGuiada` todo idéntico en las 5 claves (ejercicios y metadatos intactos).
- 20 SVG rasterizados en Chrome headless y vistos: `viewBox` 640×480, texto ≥26 px, sin `<tspan>`, sin `#C98F1E`. Los 20 se enlazan por `recursoRef`.
- Cálculos verificados: 15+60+15=90; 20+25… 10:20→11:05=45; 2:10→3:25=75; 5+7=12; 8+7=15; 0‑2,1‑5,2‑8 recta con ordenada 2 (no directa). Todas las respuestas de comprobación son correctas y únicas.

## mat.p1.siempre-a-veces-nunca — CAMBIOS
Archivo: `primaria-1/fichas/nociones-de-azar.json`.
1. `comprobacion` repite el ejemplo 2 (caja con tarjeta de sol y de luna, «¿saldrá sol?»): no es una situación nueva. Cambiar por otra (p. ej. una caja con una cuchara y un lápiz: «¿saldrá una cuchara?»… o una bolsa de fichas verdes y azules: «¿saldrá una verde?») con respuesta «a veces» y misma longitud de opciones; o usar «nunca» (bolsa solo de fichas azules: «¿saldrá una roja?»), que así se practica.
2. «Nunca» solo se define en la idea; ningún ejemplo, contraejemplo ni comprobación lo trabaja. Añadirlo (en la comprobación nueva o en el paso 3 con una frase concreta).
3. Observación menor: `ejemplo-1-guiado` dice «la bolsa solo contiene fichas amarillas» y luego pregunta «¿hay alguna de otro color?»; revela la regla antes del razonamiento. Dejar la pregunta sin la afirmación previa.
4. Visual: `siempre-veces-nunca-mixtas-pregunta.svg`, el «sol» es un círculo amarillo sin rayos, idéntico a las fichas de la bolsa; solo el rótulo SOL lo distingue. Añadir rayos o dejarlo (menor).

## mat.p2.explicar-patron-aditivo — CAMBIOS
Archivo: `primaria-2/fichas/patrones-aditivos.json`.
1. Recurso `escalera-pregunta` (+ alt/descripcion «asciende hacia la derecha»): la escalera sube mientras los números bajan (45→30), y la narración de `ejemplo-2-razona` dice «cada peldaño baja cinco». Contradicción visual‑verbal. Dibujar la escalera descendiendo hacia la derecha (o con el 45 arriba) y ajustar alt/descripcion.
2. `ejemplo-2-guiado`: dice «el siguiente dice treinta» y luego pregunta «qué número falta arriba»; el signo «?» queda después del 30 (peldaño siguiente). Reformular: «¿qué número va en el peldaño con el signo?» y sin «arriba».
3. `explicar-patron-mandarinas-pregunta.svg`: el montón de dieciséis (círculo superior en y≈60) se solapa con el final del título «Los montones crecen» (la «n»). Subir el título/reducir el montón o acortar el título.
4. `explicar-patron-error-salto.svg`: la equis roja está debajo del 17, no sobre el «+4» que debe tachar (alt dice «salto de cuatro tachado»). Mover la equis al «+4».
5. `comprobacion`: opciones «Aumenta de cinco / Disminuye de diez / Disminuye de cinco» con «de» agramatical (la voz lo lee mal). Usar «Aumenta cinco cada vez», etc., manteniendo diferencia ≤3.
6. G) Autor: `e10` (correcta 20 caracteres, la más larga, diferencia 4): riesgo menor; corrección mínima: «Sumó 20, no 10» (14)… igualar a ~19 («Sumó veinte, no diez» 20 / «Sumó cinco, no diez» 19 / «No cometió ningún error» 23): decisión del orquestador; no bloqueante.

## mat.p4.duracion-actividades — CAMBIOS
Archivo: `primaria-4/fichas/medicion-masa-y-tiempo.json`.
1. `ejemplo-1-guiado`/`ejemplo-1-razona`/`linea-resuelta`: la idea y los pasos dicen «avanza hasta una hora completa», pero el ejemplo 1 avanza hasta las 8:30 (media hora), no a una hora completa. Incoherente con el método. Rehacer: 8:15→9:00 (45), 9:00→9:45 (45) = 90, o cambiar horarios del ejemplo (p. ej. 8:20→9:50: 40+50=90) y actualizar SVG/alt/descripcion.
2. `duracion-actividades-error-horas.svg`: la equis roja atraviesa y tapa «3:30 a 5:00» y «5 − 3 = 2 horas»; texto ilegible. Tachar solo la segunda línea (línea corta) y dejar legible el intervalo.
3. `contraejemplo`: nunca dice la hora de fin («cinco»), solo «de las cuatro a las cinco» y «cinco menos tres»; decir explícitamente «de las tres y media a las cinco».
4. `duracion-actividades-linea-resuelta.svg`: no está a escala (15 min = 85 px, 60 min = 275 px). Aceptable como esquema, pero corregir o aclarar si se rehace el ejemplo 1.
5. `duracion-actividades-feria-pregunta.svg`: relojes sin marcas ni números; agujas del mismo largo/color apenas distinguibles (hora/minutero). Distinguir largo o color (menor).

## mat.p5.doble-entrada-5 — CAMBIOS
Archivo: `primaria-5/fichas/datos-y-tablas.json`.
1. `movilidad-pregunta` (usado en `situacion` y `ejemplo-1-guiado`): la casilla Quinto B / Bus está sombreada y muestra «6» con el signo «?» al lado. Revela la respuesta y el «?» es incoherente. Dejar la casilla vacía/«?» dentro de ella y ajustar descripcion («Quinto B muestra cinco y un espacio vacío»). Mantener el 6 solo en `movilidad-resuelta`.
2. `doble-entrada-cinco-error-fila.svg`: el símbolo de prohibición tapa el «3» de Quinto A (no se lee lo que se tacha) y la flecha parte pegada a la etiqueta «Quinto B». Reducir el símbolo o tachar con una raya y dejar el 3 legible.
3. `libros-pregunta`: «?» fuera de la tabla a la derecha de la fila Quinto A no corresponde a un total de columna; colocarlo bajo la columna Ciencia (menor).
4. G) Autor `e10`: verificado (9, 8, 9, 10; correcta única). Longitudes 22‑26; no bloqueante.

## mat.p6.grafica-proporcionalidad — CAMBIOS
Archivo: `primaria-6/fichas/proporcionalidad.json`.
1. `comprobacion` opción b «No, empieza sobre el origen» es ambigua al oído (se entiende «empieza en el origen», lo contrario). Cambiar a «No, no pasa por el origen» (25) y revisar que la `pista` y el mensaje coincidan. Opción c «dibuja una línea curvada» contradice el enunciado («forman una recta»): es descarte trivial; preferible «No, los puntos no se alinean» no, porque contradice igual; mejor «Sí, porque sube de a tres» (distractor plausible).
2. `grafica-proporcionalidad-error-coordenadas.svg`: la etiqueta «(6, 2)» se solapa con la parte baja de la equis y el punto (2, 6) queda pegado al borde superior del cuadriculado; ejes sin numeración, el alumno no puede verificar «dos en horizontal, seis arriba». Añadir marcas numeradas (26 px) o reducir la equis y dar margen.
3. `grafica-proporcionalidad-fruta-resuelta.svg`: cuadrícula sin numerar con unidades distintas por eje (la rejilla vertical marca 3 soles, la horizontal 1 kilo); sin numeración el alumno no ve la regla. Numerar ejes o aclarar la escala.
4. `ejemplo-2-razona` dice «cuatro unidades sobre el origen» sin ningún recurso que muestre la gráfica de la tarifa (solo la tabla). Añadir recurso `tarifa-resuelta` o reformular («el primer punto está en cero kilómetros y cuesta cuatro soles»).

## Resumen
Aprobadas: ninguna. Con cambios: las 5 claves. Defectos graves: p5 movilidad-pregunta revela la respuesta; p2 escalera contradictoria; p4 ejemplo 1 no sigue el método y equis ilegible; p6 opción b ambigua en audio; p1 comprobación repetida.

## Ronda 2
Revisor independiente. Técnico: lint `nudito-lint-clase-guiada.ts` en las 5 claves 0 errores/0 avisos (letras B, B, A, C, B); `nudito-validar-banco` válido (2 238 fichas, 27 034 ejercicios); `tsc --noEmit` sin errores. Comparación con HEAD por JSON: solo cambió `claseGuiada` en las 5 claves. SVG cambiados rasterizados con Chrome headless y vistos.

- **mat.p1.siempre-a-veces-nunca — APROBADA.** Comprobación nueva (bolsa azul, «roja», «nunca», b) practica «nunca»; paso-3 con ejemplo concreto; ejemplo-1-guiado sin revelar; sol con rayos; opciones de longitud pareja (17/18/17).
- **mat.p2.explicar-patron-aditivo — CAMBIOS (menor, solo SVG/descripcion).** Resueltos: escalera descendente coherente con alt/descripcion/narración; título «Cuatro montones» sin solape; opciones gramaticales (22/23/24). Pendiente: en `explicar-patron-error-salto.svg` la raya roja pasa por el centro de «+4» y tapa el «+» (se lee «4» con barra); además `descripcion` sigue diciendo «Una equis roja marca ese salto» y ahora es una raya. Mover la raya (por debajo/encima del «+4» o más fina) y ajustar descripcion.
- **mat.p4.duracion-actividades — CAMBIOS (menor, solo SVG).** Resueltos: ejemplo 1 sigue el método (8:15→9:00→9:45, 45+45), línea a escala, contraejemplo con «de las tres y media a las cinco», relojes con marcas y agujas distinguibles. Pendiente: en `duracion-actividades-error-horas.svg` la raya roja cae justo sobre el «−» de «5 − 3 = 2 horas» y lo oculta (se lee «5  3 = 2 horas»); subir/bajar la raya o hacerla más fina para que se vea el signo.
- **mat.p5.doble-entrada-5 — APROBADA.** `movilidad-pregunta` con casilla «?» sin revelar el 6; `error-fila` con 3 legible y flecha separada; «?» bajo Ciencia; alt/descripcion coinciden con los dibujos.
- **mat.p6.grafica-proporcionalidad — APROBADA.** Opción b «No, no pasa por el origen» sin ambigüedad oral; c plausible; ejes numerados en `error-coordenadas` y `fruta-resuelta`; ejemplo-2-razona sin gráfica inexistente.

## Ronda 2 (segunda pasada: defectos menores)
Revisor independiente. Técnico: lint 0 errores (solo 2 avisos descripcion-larga en p4 desplazamientos), validar-banco válido (2238 fichas, 27034 ejercicios), tsc --noEmit OK (binarios locales). Comparado con HEAD por JSON; SVG cambiados rasterizados con Chrome headless y vistos.

- **mat.p2.explicar-patron-aditivo — APROBADA.** error-salto: la raya roja subraya el «+4» y se lee; alt/descripcion dicen «subrayado/raya» (ya no «equis»). Sin defectos nuevos.
- **mat.p4.duracion-actividades — APROBADA.** error-horas: la raya queda bajo «5 − 3 = 2 horas» y el signo «−» se ve; alt/descripcion coinciden.
