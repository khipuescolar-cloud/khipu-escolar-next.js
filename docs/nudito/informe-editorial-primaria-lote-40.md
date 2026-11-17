# Informe editorial · Primaria, Matemática, lote 40

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. No se tocaron estado, huellas, BD, specs ni componentes. Solo cambió el campo `claseGuiada` de cada clave; el resto de cada clave (ejercicios, ids, respuestas, dificultad) es idéntico a `HEAD` (comprobado por script).

## Alcance

Archivos bajo `src/lib/nudito/conocimiento/banco/matematica/`. Todas con 10 momentos (el primero sin recurso) y 5 recursos SVG a mano en `public/nudito/diagramas/matematica/` (`<prefijo>-<id>.svg`, 640×480, texto ≥ 26 px, sin `<tspan>`, con `<title>`).

| Clave | Archivo | Recursos (prefijo) |
|---|---|---|
| `mat.p1.completar-patron` | `primaria-1/fichas/patrones-de-repeticion.json` | `collar-pregunta`, `collar-grupo`, `grupo-de-tres`, `errores`, `pasos` (`completar-patron`) |
| `mat.p2.completar-a-100` | `primaria-2/fichas/adicion-y-sustraccion-hasta-100.json` | `barras-pregunta`, `barras-decenas`, `tira-setenta`, `errores`, `pasos` (`completar-a-100`) |
| `mat.p3.comparar-masas` | `primaria-3/fichas/c23-masa-tiempo.json` | `cajas-pregunta`, `cajas-comparar`, `bolsas-orden`, `tamano-error`, `pasos` (`comparar-masas`) |
| `mat.p4.convertir-m-cm` | `primaria-4/fichas/longitud-y-perimetro.json` | `cinta-pregunta`, `cinta-cien`, `tela-trozos`, `error-cero`, `pasos` (`convertir-m-cm`) |
| `mat.p5.convertir-unidades-tiempo` | `primaria-5/fichas/medicion-masa-y-tiempo.json` | `pelicula-pregunta`, `pelicula-minutos`, `carrera-segundos`, `errores`, `pasos` (`convertir-unidades-tiempo`) |
| `mat.p6.conclusiones-estudio` | `primaria-6/fichas/probabilidad.json` | `frutas-pregunta`, `frutas-conclusion`, `feria-barra`, `alcance-error`, `pasos` (`conclusiones-estudio`) |

## Decisiones

- Estructura común: idea (sin imagen) → situación («pregunta») → ejemplo 1 guiado y «razona» → ejemplo 2 guiado y «razona» → contraejemplo → tres pasos → comprobación nueva. El guiado del ejemplo 1 reutiliza el recurso de la situación; el guiado del ejemplo 2 va sin recurso (se describe de viva voz, sin decir «mira»).
- Los recursos de situación no dan la respuesta ni la regla (p2: barras sin valor por barra, solo «Tiene: 20»; p3: cajas del mismo tamaño; p4: tramos rotulados solo «un metro»; p5: dos bloques sin los sesenta; p6: gráfico sin conclusión).
- p1: patrón de dos y de tres fichas (círculo azul, cuadrado amarillo, triángulo verde), con forma y color para no depender solo del color. Contraejemplo: copiar la ficha de después del espacio (tres círculos juntos). Comprobación: hoja, hoja, flor (b).
- p2: barras de una decena. Ejemplos 20 → 80 y 70 → 30. Contraejemplo: «veinte más ocho». Comprobación: sesenta figuritas, faltan cuarenta (c).
- p3: cajas de igual tamaño (ocho y cinco kilogramos), orden de tres bolsas (6, 8, 11) y contraejemplo «caja grande dos kilogramos / pequeña siete». Comprobación: chuño 17, maíz 14, trigo 20, el más liviano es maíz (a).
- p4: ejemplo metros a centímetros (6 m = 600 cm) y centímetros a metros (370 cm = 3 m 70 cm). Contraejemplo: «dos metros cinco centímetros = veinticinco». Comprobación: dos metros frente a ciento noventa centímetros, Rosa por diez (b).
- p5: 2 h 10 min = 130 min; 5 min 20 s = 320 s. Contraejemplo: pegar «1 h 30 min» como ciento treinta. Comprobación: 420 s = 7 min (c).
- p6: conclusión de la fruta más elegida (10 de 24), «mayoría» con 18 de 25 frente a la mitad, y contraejemplo de generalizar a «todos los estudiantes del país». Comprobación: 15 de 20 familias (a).
- Letras correctas: b, c, a, b, c, a. Opciones de longitud pareja (diferencia máxima 3; p1, p4 y p6 empatadas, p2 y p5 con la correcta no más larga, p3 con la correcta más corta).

## Verificaciones

- Cálculos revisados a mano: 20+80 = 100; 70+30 = 100; 60+40 = 100; 8>5; 6<8<11; 14 menor de 14/17/20; 6×100 = 600; 370 = 300+70; 200+5 = 205; 200 > 190; 60+60+10 = 130; 5×60+20 = 320; 420/60 = 7; 10+8+6 = 24; 18+7 = 25 y 18 > 12,5; 15 de 20 es más de la mitad.
- Script de lote: 10 momentos, primer momento sin recurso, recursoRef ↔ recursos exactos (todos usados, 5 por clave), sin dígitos en narración, pregunta, opciones, mensaje, pista, alt y descripción, sin «parte N de M», sin títulos repetidos, sin «imagen/dibujo/tarjeta» en momentos sin recurso, alt ≤ 200 (máx. 125) y descripción ≤ 500 (máx. 277), archivos SVG existentes.
- 30 SVG rasterizados con Chrome headless y vistos antes de escribir alt y descripción. Se corrigieron en el proceso: etiquetas centradas sobre llaves cortas (p2), textos pegados al borde o a otros rótulos (p3, p5), círculos con texto que desbordaba (p6), error de p1 que mostraba aún el «?».
- Texto turquesa `#0C706E`, ámbar `#8A5A00` (solo p3), rojo `#B5412A` solo para errores.
- `pnpm nudito:validar-banco`: banco válido (2 238 fichas, 27 034 ejercicios). `pnpm typecheck`: sin errores. `git diff --check` sobre los 6 JSON y los diagramas: limpio.

## Errores o dudas en ejercicios existentes (no editados)

- `mat.p6.conclusiones-estudio` e08: «¿Cuántos votos sustentan que A fue más elegido?» con respuesta 12 es ambiguo (podría esperarse la diferencia, 3). Reformular.
- `mat.p2.completar-a-100`, ficha de errores frecuentes: «Esa es la mitad de 60» para decir que a 30 no le faltan 30 es confusa para segundo grado.
- `mat.p5.convertir-unidades-tiempo` e11: el contexto del «árbitro» y la «transmisión televisiva» es forzado; matemáticamente correcto (150 − 135 = 15).
- `mat.p6.conclusiones-estudio` vive en `probabilidad.json`, aunque el tema es de estadística (no es error de contenido).
- El resto (p1 e01 a e12, p3, p4, p5) revisado con respuestas recalculadas: sin errores de contenido ni de grado.

## Riesgos y pendientes

- Sin revisión independiente ni recorrido en navegador (audio, móvil, movimiento reducido); los SVG se vieron sueltos.
- Los textos dentro de los SVG usan cifras y símbolos; la narración y la descripción los dicen en palabras.
- p2: la situación dice «Tiene: veinte» sobre dos barras, lo que insinúa que cada barra vale diez antes del ejemplo (se dice expresamente en el ejemplo 1); revisar si se acepta.
- p6: `feria-barra` usa «mitad» como línea punteada en el cuadro trece; la narración dice «doce y medio».
- No se actualizaron `estado-refuerzo-primaria.json`, specs ni bitácora (fuera del encargo).

## Correcciones tras la revisión independiente (`revision-lote-40.md`)

`mat.p1.completar-patron` y `mat.p4.convertir-m-cm` aprobadas: sin cambios.

- p2: rótulo de `barras-pregunta` «Tiene: 20» pasa a «Ya pegó»; `alt` y `descripcion` ya no dicen «ocho». Corregido `erroresFrecuentes[0].correccion` de la ficha (autorizado): «30 son 3 decenas y 100 son 10 decenas: faltan 7 decenas, o sea 70, porque 30 + 70 = 100.»
- p3: `ejemplo-2-guiado` y `ejemplo-2-razona` hablan de «cajas» (título y narración), alineado con el dibujo.
- p5: contraejemplo ahora «1 h 15 min» (error 115, correcto 75) en SVG `errores`, narración, alt y descripción. e11 intacto.
- p6: `frutas-conclusion` dice «el mango fue la fruta más elegida»; en `alcance-error` el círculo interior es más grande y queda 15 px dentro del exterior, con «encuestados» a ~20 px del borde. e08 (autorizado): enunciado «¿Cuántos votos tuvo la opción más elegida?», respuesta 12, primera pista «Busca la opción con más votos.» y retroalimentación «La opción más elegida, A, tuvo 12 votos; 3 es la diferencia con B.» (id y dificultad intactos).
- SVG cambiados rasterizados y revisados; `pnpm nudito:validar-banco` válido, `pnpm typecheck` sin errores, `git diff --check` limpio.
