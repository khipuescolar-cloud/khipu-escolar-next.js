# Revisión independiente — lote 57 (Matemática)

Comprobado: lint mecánico 0 errores (1 aviso informativo p4 e05); `tsc --noEmit` limpio; `nudito-validar-banco` válido (2238 fichas); en ambas claves solo cambió `claseGuiada` respecto de HEAD; 10 SVG, todos referenciados, sin duplicados ni huérfanos, todos con un `<title>`, ningún texto <26 px, sin #C98F1E ni `<tspan>`. Todos los SVG rasterizados y mirados; coinciden con alt/descripcion salvo lo anotado. Contenido numérico de momentos, comprobaciones y los 24 ejercicios recalculado: correcto.

## mat.p4.justificar-comparaciones — CAMBIOS
Archivo: `primaria-4/fichas/numeros-hasta-10-000.json`
1. Momento `situacion-almacenes` (recurso `almacenes`): la pregunta (cuál tiene más y qué lugar decide) no se responde en ningún momento posterior (los ejemplos usan otros números). Cerrarla: en `ejemplo-2-razona` o `paso-3`, o bien cambiar la situación por una que sí se retome. Además los seis recuadros del SVG son decorativos y de ancho desigual (el tercero angosto); narración «seis recuadros de color» sugiere que cuentan algo. Quitarlos de la narración o dibujarlos iguales y sin mención.
2. Momento `contraejemplo`: el título dice «empezar por la derecha» pero el error narrado es mirar las tres últimas cifras («novecientos noventa y nueve es más que cero»), no la derecha. Alinear título y texto (p. ej. «Cuidado con mirar las cifras del final»). Además repite exactamente el par de e07 (3 999 vs 4 000), que queda regalado.
3. Ejercicio e05 (existente, el autor no lo editó): correcta `b` (36 car.) es la más larga y las otras miden 23 y 19 (diferencia >3). Corrección mínima: «Porque tiene 2 centenas y no 0» / «Porque tiene más cifras» / «Porque su última cifra es 5» o igualar longitudes (~28 car.). Afecta al alumno (pista de longitud).
4. Ejercicio e01 (menor): pregunta «¿Quién tiene más?» pero opciones son números; ambiguo al oído («tres mil cuatrocientos ochenta y dos» vs …). Sugerido: opciones «Ana», «Beto», «Los dos igual».
5. Ejercicio e09, pista 2 y retro: «las mismas millares» → «los mismos millares».

## mat.p5.problemas-proporcionalidad — CAMBIOS
Archivo: `primaria-5/fichas/proporcionalidad.json`
1. Momento `contraejemplo`: «las porciones no crecieron en ocho a la vez que las tazas» es matemáticamente falso/ininteligible (las porciones sí crecieron en ocho) y confunde. Reescribir, p. ej.: «Pero agregar ocho porciones no significa agregar ocho tazas: las porciones se triplicaron, así que las tazas también deben triplicarse».
2. Momento `situacion-limonada`: la pregunta (cuántos limones para cinco jarras, respuesta 15) no se resuelve en ningún momento; los ejemplos usan entradas y avena. Resolverla en `paso-2/3` o reemplazar por un contexto que se retome.
3. Recurso `avena-resuelto` (SVG `problemas-proporcionalidad-avena-resuelto.svg`): la punta de la flecha de la primera fila toca el texto «12 porciones» (x≈375 vs inicio del texto ≈378). Acortar la flecha o dar ≥12 px de aire; la segunda fila también queda justa a «9 tazas».
4. `avena-pregunta`: el pie «¿Qué factor cambia las dos cantidades?» ya dirige a la estrategia (factor) antes de que el alumno razone; cambiar por «¿Cuántas tazas hacen falta?».
5. Ejercicio e11 (existente): pista 3 dice «Suma dos tazas», contradice el contraejemplo de la propia clase («sumar no mantiene la receta»). Corrección mínima: «Añade a las cuatro tazas las dos que usan cuatro panes más».

## Errores de ejercicios existentes (criterio G)
- p4 e05: afecta al alumno (correcta más larga); corregir como arriba.
- p4 e01 y e09: menores, redacción.
- p5 e11: pista contradictoria con el contraejemplo; corregir pista.
- El resto de ejercicios de ambas claves: sin errores de contenido ni letra repetida problemática.

## Ronda 2
Revisor independiente. Técnico: lint 0 errores (solo 2 avisos descripcion-larga en p4 desplazamientos), validar-banco válido (2238 fichas, 27034 ejercicios), tsc --noEmit OK (binarios locales). Comparado con HEAD por JSON; SVG cambiados rasterizados con Chrome headless y vistos. Solo cambió claseGuiada, salvo p4 e05 (opciones) y p5 e11 (pista 3), ambos autorizados; id, dificultad y respuesta intactos.

- **mat.p4.justificar-comparaciones — APROBADA.** Almacenes se cierra en paso-3 y el SVG ya no tiene recuadros decorativos; contraejemplo retitulado y con par propio (2 985 vs 3 012); e05 opciones 32/30/30 con correcta b ya no la más larga y respuesta única. Pendientes menores no autorizados: e01 y e09 (redacción).
- **mat.p5.problemas-proporcionalidad — APROBADA.** Contraejemplo coherente; limonada resuelta (3 por jarra, 15); flechas de avena-resuelto con aire; pie «¿Cuántas tazas hacen falta?» coincide con SVG y descripcion; e11 pista 3 ya no contradice el contraejemplo. Sin defectos nuevos.
