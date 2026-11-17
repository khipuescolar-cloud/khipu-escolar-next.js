# Revisión independiente · Primaria, Matemática, lote 25

Fecha: 2026-11-16. Revisor distinto del autor. Solo lectura sobre banco y SVG.

Verificaciones técnicas:
- `pnpm typecheck`: sin errores. `pnpm nudito:validar-banco`: válido (2238 fichas, 27034 ejercicios).
- Comparado con `HEAD`, en las 5 claves solo cambió `claseGuiada` (resto de cada archivo idéntico). Las demás diferencias del árbol son de otros lotes.
- 25 SVG rasterizados con Chrome headless y vistos. Sin `<tspan>`, con `<title>`, texto mínimo 26 px, sin desbordes ni pegado al borde de página.
- Cuentas recalculadas: 5·2·3=30; 6·3·2=36; 4·6·3=72 (distractores 68 y 82 plausibles); 3·3·2=18; 7−4=3; 407 258<407 528; 98 450<98 540<100 230; 459 826>450 998; 207 815<270 185<270 815 (orden Puno, Tarma, Huaral); 120° entre 90° y 180°. Respuesta única en todas las comprobaciones. Letras correctas b, a, c, b, a. Diferencias de longitud de opciones ≤3.

Defecto transversal (afecta p4 y p6, también ligeramente a otras): el ámbar `#C98F1E` sobre el crema `#FCF0D6` da contraste de aprox. 2,6:1, insuficiente para texto de 26–30 px que lleva información.

## mat.p1.barras-con-material — APROBADA
Matemática, secuencia, recursos y SVG correctos; sin revelaciones en situación ni guiados (columnas «?» de toda la altura); alt ≤200 y coinciden con el dibujo. Sugerencias opcionales, no bloqueantes:
1. `ejemplo-2-guiado` no tiene recurso aunque pide predecir «cuál torre será más alta»; está bien así (la imagen llega en `ejemplo-2-razona`), solo confirmar que la UI lo admite (la validación ya pasa).
2. `contraejemplo`: el «otro error» (torre más baja = más elegida) no se ve en `barras-con-material-errores`; es una frase oral sin apoyo visual. Aceptable.

## mat.p2.codigos-de-flechas — CAMBIOS (menores)
Matemática y estructura correctas; el recurso no revela el código del cuy (el movimiento ya lo da la narración, no las flechas).
1. `codigos-de-flechas-errores.svg` (recurso `errores`): el trazo rojo punteado arranca encima del cuerpo de Rosa (queda dentro del casillero de salida, pisando la figura). Mover el inicio del rojo y del verde al borde de la figura o desplazarlos para que no se solapen con ella.
2. `codigos-de-flechas-rosa-camino.svg` (`rosa-camino`): el último tramo verde entra sobre el asta de la bandera (solape línea-asta). Desplazar la bandera a la derecha del casillero o cortar el tramo antes del asta.
3. `codigos-de-flechas-cuy-codigo.svg` (`cuy-codigo`): la punta de la primera flecha verde toca la cabeza del cuy. Separar 6–8 px.
4. `ejemplo-1-guiado` (sin recurso): «Toca cada flecha con el dedo» manda tocar algo que no está en pantalla en ese momento. Cambiar a «Recuerda las tres flechas del código: sigue cada una con el dedo en la imaginación» o asignar recurso `tablero-pregunta`.

## mat.p4.capacidad-cubos-prismas — CAMBIOS
1. `contraejemplo` (recurso `solo-arriba`): la narración nunca dice qué caja es (tres de largo, tres de ancho, dos de alto) ni cuánto da el error. Dice «cada capa tiene nueve cubitos, y entre las dos hay dieciocho» sin haber presentado la caja, y la frase «dentro de la caja también hay cubitos» es confusa. Reescribir: «Esta caja mide tres de largo, tres de ancho y dos de alto. Si cuentas solo la capa de arriba, dirías nueve cubitos, y es un error: falta la capa de abajo. Son dos capas de nueve, o sea dieciocho.» Añadir la medida «alto: 2» al SVG o mencionarla en la descripción.
2. SVG `capacidad-cubos-prismas-tres-capas.svg`, `-caja-plana.svg`, `-solo-arriba.svg`: etiquetas «capa 2» y «capa de arriba» en ámbar sobre crema (contraste ≈2,6:1). Oscurecer el ámbar de texto (por ejemplo `#8A5A00`).
3. `capacidad-cubos-prismas-caja-plana.svg`: la etiqueta «ancho: 3» arranca a ~8 px de la arista derecha del prisma (casi pegada). Separarla al menos 24 px.
4. `capacidad-cubos-prismas-tres-capas.svg` (`tres-capas`): muestra largo y alto pero no el ancho (dos), necesario para el 5×2×3 que se narra; se añadió «ancho: 2» en `una-capa` pero no aquí. Añadir la etiqueta y mencionarla en la descripción.
5. `capacidad-cubos-prismas-solo-arriba.svg`: las cubitos de la capa superior de ambas capas (tonos claros) casi se confunden con el fondo; subir un poco su saturación.

## mat.p5.comparar-ordenar-seis-cifras — CAMBIOS
1. `ejemplo-2-guiado`, `ejemplo-2-razona`: la enumeración de tres números en palabras es ambigua al oído: «cien mil doscientos treinta y noventa y ocho mil quinientos cuarenta» y «…quinientos cuarenta y cien mil doscientos treinta» (la «y» puede leerse como parte del número). Separar con pausas y conectores no numéricos: «Primero, noventa y ocho mil cuatrocientos cincuenta. Segundo, cien mil doscientos treinta. Tercero, noventa y ocho mil quinientos cuarenta.» Igual en el orden final de `ejemplo-2-razona`.
2. Descripciones `ordenar-tres` (~85 palabras) y `ultimas` (~70) son largas para el audio. Recortar `ordenar-tres` a: «Tres filas numeradas con los números noventa y ocho mil cuatrocientos cincuenta, noventa y ocho mil quinientos cuarenta y cien mil doscientos treinta, con el signo menor que entre ellos; en amarillo, la cifra que decide cada comparación.» (no recitar casilla por casilla).
3. `tabla-pregunta` y `primera-diferencia`: la descripción nombra las columnas completas («centenas de millar, decenas de millar…») pero el SVG solo muestra las abreviaturas CM, DM, UM, C, D, U. Mencionar que se rotulan con esas siglas o escribir las palabras completas en el SVG (si no caben, justificar la abreviatura en la narración). Ahora la descripción no coincide exactamente con lo visible.
4. Comprobación: la pregunta es muy larga para audio (tres números en palabras de cinco a seis tokens) y «doscientos siete mil» / «doscientos setenta mil» suenan casi iguales. Pregunta sin otra pista de forma salvo la reversión de orden (opción c = orden del enunciado, b = inverso); es aceptable, pero mantener el orden listado del enunciado distinto del de la opción correcta evita pistas visuales. Conservar y revisar lectura TTS; opcional: usar tres números con ceros menos confundibles.
5. `paso-1`, `paso-2`: sin recurso, está permitido; pero `paso-3` es el único con imagen y dice «la tarjeta», correcto. Sin acción.

## mat.p6.clasificacion-angulos — CAMBIOS
Sobre `escala` y el tramo «mayor que llano»: es coherente con los ejercicios (e12 usa «mayor que llano» y e11 pasa de 180°), pero el texto no lo prepara. Hay que introducirlo.
1. `idea`: añadir «y entre ciento ochenta y trescientos sesenta es mayor que llano». Hoy solo cita 360° y los ejercicios lo exigen.
2. `paso-3` (recurso `escala`): la narración no menciona el tramo lila «mayor que llano» que la imagen sí muestra, y la frase «Asigna el nombre del tramo o de la medida exacta» es confusa. Reescribir: «Mira la barra: antes de noventa es agudo, entre noventa y ciento ochenta es obtuso, y después de ciento ochenta es mayor que llano. Las marcas son recto en noventa, llano en ciento ochenta y vuelta en trescientos sesenta.»
3. `paso-2` (recurso `laptop-referencias`): dice «noventa, ciento ochenta y trescientos sesenta grados», pero el dibujo solo marca 90° y 180°. Quitar «trescientos sesenta» de ese paso (o usar `escala`).
4. SVG `clasificacion-angulos-escala.svg` («recto», «llano», «vuelta») y `clasificacion-angulos-relojes.svg` («90°», «180°»): texto ámbar con contraste ≈2,6:1. Oscurecer.
5. `comprobacion`: el enunciado dice «línea recta» y la opción b es «Ángulo recto»; es una trampa léxica válida, pero la `pista` («los dos lados forman una sola línea») casi da la respuesta. Reformular la pista: «Compara con la media vuelta de ciento ochenta grados» sin describir el dibujo.
6. `relojes`: el minutero queda pegado a la cifra «12» (separación <4 px en el reloj de las tres); bajar el extremo del minutero o subir el rótulo.

## Resumen
- p1: APROBADA. p2, p4, p5, p6: CAMBIOS (todas menores, sin errores matemáticos).
- Ningún defecto de recursoRef incorrecto, «parte N de M», títulos repetidos, dígitos sueltos o alt >200.

## Ronda 2

Fecha: 2026-11-16. Revisor independiente. `pnpm nudito:validar-banco` válido (2238 fichas, 27034 ejercicios); `pnpm typecheck` sin errores. Comparado con `HEAD`, en las 5 claves solo cambia `claseGuiada` (resto idéntico). Los 8 SVG modificados se rasterizaron con Chrome headless y se vieron: texto ≥26 px, sin solapes ni desbordes ni pegado al borde.

Contraste: `#8A5A00` sobre `#FCF0D6` = 5,24:1 (≥4,5). Ningún `<text>` del lote usa ya `#C98F1E` (solo quedan rellenos decorativos). Nota menor no bloqueante: el verde `#0F7C7A` de «capa 1» y «capa de abajo» da 4,44:1, pero es texto negrita de 28 px (texto grande, ≥3:1).

- mat.p1.barras-con-material: APROBADA (claseGuiada sin cambios de contenido respecto a ronda 1 en lo comprobable; sin SVG modificados).
- mat.p2.codigos-de-flechas: APROBADA. Trazos de `errores` y `rosa-camino` nacen fuera de Rosa; bandera a la derecha del tramo verde; flecha de `cuy-codigo` separada de la cabeza; `ejemplo-1-guiado` con recurso `tablero-pregunta` (el código está en pantalla). Sin defectos nuevos.
- mat.p4.capacidad-cubos-prismas: APROBADA. Contraejemplo con caja de 3×3×2 (nueve por capa, dieciocho en total) coherente con el SVG y su descripción; `tres-capas` muestra «ancho: 2»; «ancho: 3» de `caja-plana` a ~25 px; capas legibles; 5·2·3=30, 6·3·2=36, 4·6·3=72 (b 82 y a 68 plausibles).
- mat.p5.comparar-ordenar-seis-cifras: APROBADA. Comprobación recalculada: Puno 400 230 < Tarma 402 300 < Huaral 420 300; respuesta b correcta y única; mensaje correcto exacto; opciones de 19 caracteres; el orden del enunciado (Tarma, Huaral, Puno) difiere de b. Narraciones «primero, segundo, tercero» sin ambigüedad; 98 450 < 98 540 < 100 230 correcto; descripciones recortadas y siglas aclaradas.
- mat.p6.clasificacion-angulos: APROBADA. `idea` y `paso-3` incluyen «mayor que llano» (180–360), coherente con e11/e12 y con la barra lila de `escala`; `paso-2` sin 360°; pista sin describir el dibujo; minutero de `relojes` separado del «12».

Letras correctas a, c, b, a (y b en p1 ya aprobada): variadas. Sin defectos nuevos. Veredicto lote 25: APROBADA (5/5).
