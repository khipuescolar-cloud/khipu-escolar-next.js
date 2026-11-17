# Revisión independiente · Primaria, Matemática, lote 55

Fecha: 2026-11-16. Revisor: Claude (Sonnet 5.5), independiente del autor. Informe revisado: `informe-editorial-primaria-lote-55.md`.

## Comprobaciones técnicas (E)

- `nudito-lint-clase-guiada` (3 claves): 0 errores, 0 avisos.
- `tsc --noEmit`: sin errores. `nudito-validar-banco`: «Banco válido: 2238 fichas activas; 27034 ejercicios».
- Por JSON frente a HEAD: en los tres archivos, todo salvo `claseGuiada` es idéntico. Ejercicios sin editar (coincide con el informe). `patrones.json` contiene además `mat.p6.patrones-termino-general` con claseGuiada: es de otro lote, ignorado.
- SVG: exactamente 15 con los prefijos del lote (5 por clave), los 15 referenciados, sin huérfanos ni duplicados; todos con `<title>`, sin `<tspan>`, texto ≥26 px; alt ≤200 y descripcion ≤500 en todos. Rasterizados con Chrome headless y vistos todos. Ámbar solo #8A5A00 (ok).

## mat.p4.figuras-simetricas-cuadricula — CAMBIOS
Archivo: `primaria-4/fichas/simetria-y-traslacion.json`. Imágenes correctas y coherentes con alt/descripcion (primera fila un cuadrito, fila 4 dos por extremo, distancias 3/3, errores 4+2 vs 3).

1. **comprobacion** (enunciado/opciones): la respuesta correcta («Tercera desde el borde») es el eco literal del enunciado («la tercera casilla… desde el borde izquierdo»); basta copiar la frase, sin razonar la distancia al eje. Además «borde» no dice de qué lado en las opciones y la frase «Las opciones cuentan desde el eje o desde el borde exterior» es forzada y larga al oído. Corregir: enunciado con otra medida de entrada, p. ej. «En cada lado hay siete casillas. Tamara pintó una casilla del lado izquierdo que está a dos casillas del eje. ¿Dónde debe pintar su pareja?» con opciones como «A dos del eje, a la derecha / A tres del eje, a la derecha / A dos del eje, a la izquierda» (longitudes parejas, sin correcta más larga). Mantener la letra correcta distinta de c, a (ya usadas por los otros lotes del mismo archivo no importa; aquí b está libre).
2. **comprobacion.mensajeCorrecto**: «quedan cuatro antes de llegar a ella» mezcla otra convención de conteo que la de los ejemplos (uno, dos, tres desde el eje). Rehacer con la nueva pregunta usando el mismo conteo desde el eje.
3. (menor) **ejemplo-1-guiado**: «lejos del eje, pero del otro lado» casi contesta la pregunta que cierra el momento. Quitar «pero del otro lado» o la última pregunta más abierta.

## mat.p5.media-aritmetica — APROBADA
Archivo: `primaria-5/fichas/moda-y-media.json`. Cálculos verificados: 3+5+6+10 = 24 = 4·6 (cedidas 4, recibidas 3+1); 12+15+21 = 48 → 16 (entre menor y mayor); contraejemplo 3+9+12 = 24: ÷12 = 2, ÷3 = 8; comprobación 5+8+11+12 = 36 → 9. Respuesta única (c), distractores plausibles (los datos 11 y 12), longitudes 10/10/11. Imágenes coinciden con alt y descripcion; el guiado 1 no revela el 6; ejemplo 2 sin recurso ni «dibujo». Vocabulario oral limpio (cifras y «÷» solo en SVG, dichos en palabras). Sin defectos bloqueantes.
Observación opcional: **ejemplo-2-guiado** hace dos preguntas seguidas (suma y entre cuántos); aceptable.

## mat.p6.patrones-aditivos — CAMBIOS
Archivo: `primaria-6/fichas/patrones.json`. Cálculos correctos (7; 39; −0,25 → 1,65; 2,4→2,9→3,4 → 3,9). Respuesta única (a) con distractores 3,8 y 4,1.

1. **recursos `pan-saltos` y `rio-saltos`, descripcion**: dice «Tres arcos amarillos» pero los arcos se dibujan en ocre oscuro (#8A5A00, se ven marrones); el amarillo (#F2B84B) no aparece en estos SVG. Corregir la descripcion a «arcos ocres» (o «marrones») en ambos, no el dibujo.
2. **momento `contraejemplo`**: junta dos errores y el segundo no tiene secuencia dada («una secuencia con saltos de cero coma tres»), con «sumar tres a tres coma dos», ambiguo al oído («tres a tres»), y «al cambiar, no hay diferencia constante» es poco claro. Reescribir en dos frases limpias: «Cuatro, siete, doce: los saltos son tres y cinco, no se repiten, así que no es un patrón de este tipo. Otro error es leer mal la coma: si el salto es cero coma tres, a tres coma dos se le suma cero coma tres y da tres coma cinco, no seis coma dos.»
3. (menor) **ejemplo-1-guiado**: «Resta los panes de la primera hora a los de la segunda» es ambiguo de dirección al oído. Mejor: «A los panes de la segunda hora réstales los de la primera».

## G) Error de ejercicio existente reportado por el autor
- `mat.p6.patrones-aditivos` e10: confirmado. «¿Qué valor debe reemplazar al 13…?» con respuesta b = 13 es circular y confunde al alumno (afecta). Corrección mínima propuesta (no aplicada): enunciado «En la sucesión 4, 7, 10, __, ¿qué valor falta si el salto sigue siendo de 3?»; resto igual.

## Ronda 2
Revisor independiente. Técnico: lint 0 errores (solo 2 avisos descripcion-larga en p4 desplazamientos), validar-banco válido (2238 fichas, 27034 ejercicios), tsc --noEmit OK (binarios locales). Comparado con HEAD por JSON; SVG cambiados rasterizados con Chrome headless y vistos. Solo cambió claseGuiada, salvo p6 e10 (enunciado, autorizado); id, dificultad, opciones y respuesta intactos.

- **mat.p4.figuras-simetricas-cuadricula — APROBADA.** Comprobación nueva con respuesta única (b, 28/30/31, correcta no la más larga) y mensaje con el mismo conteo desde el eje; ejemplo-1-guiado ya no revela el lado.
- **mat.p6.patrones-aditivos — APROBADA.** Descripciones «arcos ocres» correctas; contraejemplo en dos frases limpias; ejemplo-1-guiado sin ambigüedad; e10 «4, 7, 10, __» ya no es circular y tiene respuesta única (13).
