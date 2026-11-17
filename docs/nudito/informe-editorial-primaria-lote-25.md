# Informe editorial · Primaria, Matemática, lote 25

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. No se tocaron estado, huellas, BD, specs ni componentes. Solo cambió el campo `claseGuiada` de cada clave; ejercicios, ids, respuestas y dificultad quedan intactos (comparado con `HEAD`: el resto de cada clave y las demás claves de cada archivo son idénticas).

## Alcance

Archivos bajo `src/lib/nudito/conocimiento/banco/matematica/`. Todas con 10 momentos (el primero sin recurso). SVG en `public/nudito/diagramas/matematica/`.

| Clave | Archivo | Recursos (ID; SVG `<prefijo>-<id>.svg`) |
|---|---|---|
| `mat.p1.barras-con-material` | `primaria-1/fichas/graficos-y-pictogramas.json` | `ninos-pregunta`, `torre-fresa`, `fresa-lucuma`, `recreo`, `errores` (prefijo `barras-con-material`) |
| `mat.p2.codigos-de-flechas` | `primaria-2/fichas/ubicacion-y-desplazamientos.json` | `tablero-pregunta`, `rosa-camino`, `cuy-pregunta`, `cuy-codigo`, `errores` (`codigos-de-flechas`) |
| `mat.p4.capacidad-cubos-prismas` | `primaria-4/fichas/capacidad.json` | `caja-pregunta`, `una-capa`, `tres-capas`, `caja-plana`, `solo-arriba` (`capacidad-cubos-prismas`) |
| `mat.p5.comparar-ordenar-seis-cifras` | `primaria-5/fichas/numeros-hasta-999-999.json` | `tabla-pregunta`, `primera-diferencia`, `ordenar-tres`, `ultimas`, `tres-pasos` (`comparar-ordenar-seis-cifras`) |
| `mat.p6.clasificacion-angulos` | `primaria-6/fichas/rectas-y-angulos.json` | `laptop-pregunta`, `laptop-referencias`, `relojes`, `errores`, `escala` (`clasificacion-angulos`) |

25 SVG nuevos, 640×480, texto mínimo 26 px, paleta crema/índigo/turquesa/maíz (+ rojo `#B5412A` solo para errores), sin `<tspan>`, con `<title>`, sin elementos al borde.

## Decisiones pedagógicas

- Estructura común: idea (sin imagen) → situación con variante «pregunta» → ejemplo 1 guiado y «razona» → ejemplo 2 guiado y «razona» → contraejemplo → tres pasos → comprobación nueva. Los recursos de situación y de guiado no muestran respuesta (columnas «?» de toda la altura, sin valores falsos).
- 1.º: torres de cubos, un cubo por niño; recreo fútbol (4) frente a vóley (2); contraejemplo «dos cubos por niño». Frases cortas. Comprobación: 7 − 4 = 3 niños más (b).
- 2.º: código de flechas leído (Rosa: derecha, derecha, arriba) y escrito (cuy hasta el maíz: derecha, derecha, abajo). Contraejemplo: una flecha que salta dos casilleros (camino verde frente a rojo). Las flechas se dibujan como figuras y la voz las nombra («derecha», «arriba»). Comprobación en palabras: «Arriba, arriba, derecha» (a).
- 4.º: capacidad por capas con vistas oblicuas de cubitos (5×2×3 = 30; 6×3×2 = 36). Contraejemplo: contar solo la capa de arriba (3×3 por capa, 18 en total) y sumar en vez de multiplicar. Comprobación 4×6×3 = 72 (c), con opciones numéricas cercanas.
- 5.º: tabla de valor posicional; ejemplo 1: 407 258 frente a 407 528 (primera diferencia en las centenas); ejemplo 2: 98 450, 98 540, 100 230 (cantidad de cifras y luego centenas). Contraejemplo: mirar solo la última cifra (459 826 frente a 450 998) y 99 999 frente a 100 000. Números en palabras en toda la narración. Comprobación: orden de menor a mayor con nombres de cooperativas (Puno, Tarma, Huaral) en vez de letras sueltas (b).
- 6.º: ángulos con laptop (120°, entre 90° y 180°), relojes (90° y 180°) y barra 0°–360°. Contraejemplo: 180° es llano, no obtuso, y el largo de los lados no cambia la clase. Comprobación: puerta en línea recta con la pared → llano (a).
- Letras correctas: b, a, c, b, a. Longitud de opciones: diferencia máxima 2 caracteres; la correcta no es la más larga salvo en p5, donde las tres opciones miden 19 caracteres (empate, no es la única más larga).

## Verificaciones

- Cálculos revisados a mano y por script de estructura: 5·2·3 = 30; 6·3·2 = 36; 4·6·3 = 72; 3·3·2 = 18; 7 − 4 = 3; 207 815 < 270 185 < 270 815; 459 826 > 450 998; 98 450 < 98 540 < 100 230; 120° entre 90° y 180°.
- Ejercicios existentes de las 5 claves revisados (respuestas recalculadas): sin errores de contenido ni de grado.
- Script de lote: recursoRef ↔ recursos exactos (todos usados y solo ellos), 10 momentos, primer momento sin recurso, sin dígitos en narración, pregunta, opciones, mensaje, pista, alt y descripción (todo en palabras), sin «parte N de M», sin títulos repetidos en la narración, «imagen/dibujo/tarjeta» solo en momentos con recurso, alt ≤ 200, archivos SVG existentes.
- SVG rasterizados con Chrome headless y vistos antes de escribir alt y descripción. Se corrigieron en el proceso: camino de flechas que tapaba rótulos (ahora leyenda inferior y símbolos sin texto dentro de la celda), cajas de cubitos pequeñas y etiquetas cortadas, etiquetas «ancho» pegadas a las de capa.
- `pnpm nudito:validar-banco`: banco válido (2 238 fichas, 27 034 ejercicios). `pnpm typecheck`: sin errores. `git diff --check` sobre los 5 JSON y los diagramas: limpio.

## Riesgos y pendientes

- Sin revisión independiente ni recorrido en navegador (audio, móvil, movimiento reducido); los SVG se vieron sueltos.
- Los textos dentro de los SVG usan cifras y símbolos (`120°`, `98 450 < 98 540`); la narración y la descripción los dicen en palabras.
- p2: la mazorca es un óvalo amarillo con una raya y el cuy un óvalo marrón con cabeza; son esquemáticos (descritos así).
- p5: las descripciones son largas por leer números en palabras.
- p5: la comprobación comparte estilo con el ejercicio e09 (orden de tres cantidades) pero con cifras y nombres distintos.
- p6: en `escala` aparece el tramo «mayor que llano» (trabajado en el ejercicio e12), no mencionado en la idea central.
- No se actualizaron `estado-refuerzo-primaria.json`, specs ni bitácora (fuera del encargo).

## Correcciones tras la revisión independiente (`revision-lote-25.md`)

`mat.p1.barras-con-material` aprobada: sin cambios de contenido.

- Transversal: el texto ámbar de los SVG pasa a `#8A5A00` (contraste ≥ 4,5:1 sobre crema); los rellenos decorativos no cambian.
- p2: `errores` y `rosa-camino` con los trazos empezando fuera de la figura de Rosa; bandera de `rosa-camino` desplazada a la derecha del tramo verde; `cuy-codigo` con la primera flecha separada de la cabeza del cuy; `ejemplo-1-guiado` ahora lleva el recurso `tablero-pregunta` (el código está en pantalla).
- p4: `contraejemplo` presenta la caja (tres de largo, tres de ancho, dos de alto) y el error con sus números; «ancho: 3» de `caja-plana` y las etiquetas de capa a 24 px de la caja; `tres-capas` añade «ancho: 2» (alt y descripción actualizados); tono claro de la capa amarilla más saturado; descripción de `solo-arriba` menciona el alto de dos.
- p5: los tres números del ejemplo 2 se dicen como «primero, segundo, tercero»; descripciones de `tabla-pregunta`, `primera-diferencia`, `ordenar-tres` y `ultimas` acortadas, y se aclara que las columnas llevan siglas (también en la narración de la situación); comprobación acortada con otros números (Tarma 402 300, Huaral 420 300, Puno 400 230), orden del enunciado distinto del correcto (b: Puno, Tarma, Huaral) y pista nueva.
- p6: la idea y el `paso-3` incluyen «mayor que llano»; `paso-2` ya no menciona trescientos sesenta; pista de la comprobación: «Compara con la media vuelta de ciento ochenta grados.»; minutero de `relojes` acortado y cifras del reloj más alejadas.
- SVG cambiados rasterizados y revisados; revalidados banco, typecheck y `git diff --check`.
