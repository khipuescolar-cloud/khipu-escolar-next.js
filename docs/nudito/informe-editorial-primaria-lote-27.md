# Informe editorial · Primaria, Matemática, lote 27

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. No se tocaron estado, huellas, BD, specs ni componentes. Solo cambió el campo `claseGuiada` de cada clave (se releyó cada JSON justo antes de escribir); ejercicios, ids, respuestas y dificultad quedan intactos.

## Alcance

Archivos bajo `src/lib/nudito/conocimiento/banco/matematica/`. Todas con 10 momentos (el primero sin recurso) y 5 recursos enlazados por `recursoRef`. SVG a mano en `public/nudito/diagramas/matematica/` (30 nuevos, 640×480, texto mínimo 28 px, sin `<tspan>`, con `<title>`, paleta crema/índigo/turquesa/maíz; ámbar de texto `#8A5A00`; rojo `#B5412A` solo para errores).

| Clave | Archivo | Recursos (ID; SVG `<prefijo><id>.svg`) |
|---|---|---|
| `mat.p1.barras-verticales` | `primaria-1/fichas/graficos-y-pictogramas.json` | `juegos-pregunta`, `juegos-pintado`, `paseos-pregunta`, `paseos-mas`, `errores` (prefijo `barras-verticales-`) |
| `mat.p2.bloques-logicos` | `primaria-2/fichas/figuras-planas.json` | `caja-pregunta`, `por-color`, `grupo-pregunta`, `grupo-comun`, `errores` (`bloques-logicos-`) |
| `mat.p3.calculo-mental-descomposicion` | `primaria-3/fichas/c23-adicion-sustraccion.json` | `tienda-pregunta`, `suma-partes`, `resta-pregunta`, `resta-partes`, `errores` (`calculo-mental-descomposicion-`) |
| `mat.p4.comparar-cuatro-cifras` | `primaria-4/fichas/c23-numeros-hasta-10000.json` | `bibliotecas-pregunta`, `bibliotecas-decide`, `alcancias-pregunta`, `alcancias-orden`, `errores` (`comparar-cuatro-cifras-`) |
| `mat.p5.caras-aristas-segun-base` | `primaria-5/fichas/prismas-rectos.json` | `octogono-pregunta`, `octogono-conteo`, `heptagono-pregunta`, `heptagono-aristas`, `errores` (`caras-aristas-segun-base-`) |
| `mat.p6.clasificar-triangulos` | `primaria-6/fichas/triangulos-cuadrilateros-y-circulo.json` | `tejado-pregunta`, `tejado-clasificado`, `escuadra-pregunta`, `escuadra-clasificado`, `errores` (`clasificar-triangulos-`) |

Momentos: idea → situación (recurso «pregunta») → ejemplo 1 guiado (mismo recurso, sin respuesta) y «razona» → ejemplo 2 guiado y «razona» → contraejemplo → tres pasos (reusan recursos) → comprobación nueva.

## Decisiones pedagógicas

- 1.º: un casillero por niño; ejemplo 1 pinta columnas (soga 4, trompo 2, canicas 5), ejemplo 2 lee un gráfico ya pintado y cuenta los casilleros que sobran (granja 6, mercado 3, playa 4). Contraejemplo: dos casilleros por niño. Los gráficos de situación y guiado no llevan números ni «?» con valor. Comprobación: papaya (b).
- 2.º: atributos forma, color y tamaño; ejemplo 1 agrupa por color (rojos), ejemplo 2 halla lo común en un grupo. Contraejemplo: «una regla» frente a «sin regla» (cubre los dos errores del banco). Comprobación: regla por forma (c).
- 3.º: suma por partes 326 + 143 y resta por partes 752 − 231 con cadenas de saltos y la tarjeta del segundo número partida. Las partes se nombran como «centenas valen cien, decenas valen cuarenta…» para evitar listas ambiguas al oído. Contraejemplo: 243 = 200 + 40 + 3 frente a 2 + 4 + 3. Comprobación 418 + 322 = 740 (a).
- 4.º: tablas de valor posicional (siglas UM, C, D, U aclaradas en la narración y en la descripción). Ejemplo 1: 5 836 frente a 5 863 (decide la decena); ejemplo 2: orden de tres ahorros con ceros (7 049 < 7 094 < 7 904, nombres propios en vez de letras). Contraejemplo: mirar solo la última cifra. Comprobación 4 096 frente a 4 906 (c).
- 5.º: prisma octogonal (caras 10, vértices 16) y heptagonal (aristas 7 + 7 + 7 = 21), dibujados con proyección generada por código (aristas ocultas punteadas). Se evitaron las bases de 3, 4, 5 y 6 lados de los ejercicios (e05, e06, e09, e10, e12) para no resolver la práctica. Contraejemplo con prisma triangular: contar solo una base y «sumar dos» a los vértices. Comprobación: base de diez lados, treinta aristas (b).
- 6.º: tejado isósceles acutángulo (8, 8, 6 cm; 68°, 68°, 44°, calculados con la ley de cosenos) y escuadra escalena rectángula (5, 12, 13 cm; 90°, 23°, 67°). Contraejemplo: dos isósceles, uno acutángulo (50°) y otro obtusángulo (120°). Comprobación con ángulos 35°, 75°, 70° → acutángulo (a).
- Letras correctas: b, c, a, c, b, a. Diferencia de longitud de opciones ≤ 3 y la correcta nunca es la más larga.

## Verificaciones

- Script de lote (`build.py`, en el scratchpad): 10 momentos, primer momento sin recurso, `recursoRef` ↔ recursos exactos, títulos únicos y no repetidos en la narración, sin dígitos en narración, pregunta, opciones, mensaje, pista, alt y descripcion, sin «parte N de M», sin «imagen/dibujo/figura/tarjeta/recuadro» en momentos sin recurso, alt ≤ 200 (máx. 167) y descripcion ≤ 500 (máx. 414), SVG existentes, opciones parejas.
- Cuentas recalculadas: 326+143=469; 752−231=521; 418+322=740; 5836<5863; 7049<7094<7904; 4318 vs 4507 (decide centenas, 3<5); 4096<4906; octógono 8+2=10 caras y 16 vértices; heptágono 21 aristas; base de diez lados 30 aristas; triángulo 8-8-6: 44,05°/67,98°; 5-12-13: 22,6°/67,4°/90°; 50°+65°+65°=180° y 120°+30°+30°=180° (isósceles del contraejemplo); 35+75+70=180.
- 30 SVG rasterizados con Chrome headless y vistos antes de escribir alt y descripcion. Se corrigieron en el proceso: etiquetas de errores de prismas que cruzaban el vértice, aristas/vértices visibles y ocultos de los prismas (regla por cara visible), cifras resaltadas equivocadas en `alcancias-orden`, rótulos pegados a las celdas en `bibliotecas-decide`, cadena de saltos demasiado cerca del borde, etiqueta «50°» sobre los lados.
- Texto de SVG ≥ 28 px; sin `<tspan>`; todos con `<title>`.
- `pnpm nudito:validar-banco`: banco válido (2 238 fichas, 27 034 ejercicios). `pnpm typecheck`: sin errores. `git diff --check` sobre los 6 JSON: limpio.

## Errores en ejercicios existentes

Los ejercicios de las 6 claves (12 o 13 por clave) fueron recalculados uno por uno: sin errores matemáticos ni de grado. Observaciones menores, sin editar:

1. `mat.p5.caras-aristas-segun-base`, `ideaCentral`: usa «n», «3n» y «2n» (álgebra con letra) que el alumno de 5.º lee en el texto de la ficha; la clase guiada lo evita y habla de «una cara por cada lado». Opcional: reescribir la idea sin letras.
2. `mat.p5.caras-aristas-segun-base` `e08`: respuesta de texto corto `3+3+3` exige ese formato exacto; podría fallar con espacios o con «3 + 3 + 3» según la normalización del validador de respuestas.
3. `mat.p6.clasificar-triangulos` `erroresFrecuentes[0]` define isósceles como «al menos dos» y pide un solo nombre «más específico»; e12 y e01 siguen esa regla, pero e05 («¿cuántos lados iguales tiene?») solo vale para isósceles con exactamente dos. Coherente, solo conviene no mezclar ambos criterios.
4. `mat.p3.calculo-mental-descomposicion` e06: el enunciado dice «primero 237 + 100, luego suma 40 y después 2»; está correcto (379), pero el enunciado ya da la descomposición.

## Riesgos y pendientes

- Sin revisión independiente ni recorrido en navegador (audio, móvil, movimiento reducido); los SVG se vieron sueltos.
- Los SVG llevan cifras y símbolos (`326`, `5 836 < 5 863`, `68°`); la narración y las descripciones los dicen en palabras.
- Las descripciones de los recursos «pregunta» nombran los datos dibujados (cuántos niños por grupo, las cifras de las tablas, los bloques del grupo), porque son los datos del problema; no dicen la respuesta. En `bloques-logicos` `grupo-pregunta` los tres bloques se describen azules y grandes (es la propia pregunta «qué tienen en común»); un revisor podría preferir otro diseño.
- p5: la comprobación (base de diez lados) comparte estilo con e10; usa un valor distinto (30 aristas).
- p6 `tejado-pregunta`/`escuadra-pregunta` muestran los ángulos y medidas como datos del enunciado (también en las descripciones).
- No se actualizaron `estado-refuerzo-primaria.json`, specs ni bitácora (fuera del encargo).

## Correcciones tras la revisión independiente (`revision-lote-27.md`)

`mat.p1.barras-verticales` y `mat.p4.comparar-cuatro-cifras` aprobadas: sin cambios.

- p2 `bloques-logicos`: `alt` y `<title>` de `grupo-pregunta` ya no dicen «azules grandes» («Tres bloques juntos dentro de una línea punteada, con la pregunta qué tienen en común»); la descripción sigue listando cada bloque.
- p3 `calculo-mental-descomposicion`: `contraejemplo` dice «la del doscientos, la del cuarenta y la del tres» y «la del dos, la del cuatro y la del tres»; `<title>` de `suma-partes`, `resta-partes` y `errores` sin listas ambiguas; tarjetas de salto de 68 a 60 px de alto (más aire para las etiquetas de salto) y tarjetas de `tienda-pregunta`/`resta-pregunta` más separadas del borde. SVG rerasterizados y vistos.
- p5 `caras-aristas-segun-base`: `contraejemplo` sin la frase de «sumar dos» (cierra con «Hay que contar las dos bases»). Autorizado: `ideaCentral` de la ficha reescrita sin letras («cierta cantidad de lados… el triple… el doble»); es el único campo fuera de `claseGuiada` tocado en el lote; ejercicios intactos.
- p6 `clasificar-triangulos`: «escuadra» pasa a «rampa» en `ejemplo-2-guiado`, `ejemplo-2-razona` (título) y `paso-2`. Los ids/archivos de recursos conservan el prefijo `escuadra-` (no aparece en alt, descripción ni títulos).
- Revalidado: `pnpm nudito:validar-banco` válido, `pnpm typecheck` sin errores, `git diff --check` limpio. En p4 no se tocaron las siglas «UM, C, D y U» (aprobada).
