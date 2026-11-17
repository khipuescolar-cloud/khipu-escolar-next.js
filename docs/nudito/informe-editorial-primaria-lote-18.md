# Informe editorial · Primaria, Matemática, lote 18

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. No se tocaron estado, huellas, BD, specs ni componentes.

## Alcance

| Clave | Archivo del banco (`src/lib/nudito/conocimiento/banco/matematica/`) | Momentos | Recursos (ID) | Comprobación (correcta) |
|---|---|---:|---|---|
| `mat.p1.al-lado-cerca-lejos` | `primaria-1/fichas/ubicacion-y-recorridos.json` | 10 | `situacion-camino`, `tienda-pregunta`, `tienda-solucion`, `ciudades-pregunta`, `ciudades-solucion` | c |
| `mat.p2.armar-figuras` | `primaria-2/fichas/figuras-planas.json` | 10 | `situacion-piezas`, `cuadrados-pregunta`, `cuadrados-solucion`, `triangulos-pregunta`, `triangulos-solucion` | a |
| `mat.p3.asociativa-adicion` | `primaria-3/fichas/c23-adicion-sustraccion.json` | 10 | `situacion-bolsas`, `compras-pregunta`, `compras-solucion`, `sillas-pregunta`, `sillas-solucion` | b |
| `mat.p4.amplificar-fracciones` | `primaria-4/fichas/c23-fracciones-operaciones.json` | 10 | `situacion-barra`, `medio-pregunta`, `medio-solucion`, `quintos-pregunta`, `quintos-solucion` | c |
| `mat.p5.ampliacion-reduccion` | `primaria-5/fichas/ubicacion-y-transformaciones.json` | 10 | `situacion-triangulo`, `rectangulo-pregunta`, `rectangulo-solucion`, `cuadrado-pregunta`, `cuadrado-solucion` | a |
| `mat.p6.afirmaciones-pares-multiplos` | `primaria-6/fichas/argumentacion-numerica.json` | 10 | `situacion-parejas`, `impares-pregunta`, `impares-solucion`, `multiplos-pregunta`, `multiplos-solucion` | b |

Solo cambió `claseGuiada` de cada clave (un hunk por archivo). Ejercicios, ids, respuestas y dificultad intactos. 30 SVG nuevos en `public/nudito/diagramas/matematica/` con prefijos `ubicacion-lado-*`, `figuras-armar-*`, `adicion-asociativa-*`, `amplificar-fracciones-*`, `ampliacion-reduccion-*`, `afirmaciones-*`.

## Decisiones pedagógicas

- Estructura común: idea (sin imagen) → situación → ejemplo 1 (guiado con variante «pregunta» + razonado con variante «solución») → ejemplo 2 (igual) → contraejemplo de errores frecuentes (sin recurso) → tres pasos (reusan recursos que muestran justo lo narrado) → comprobación nueva.
- 1.º: tres casos (al lado / cerca por pasos / lejos por camino); frases cortas; los pasos se cuentan con puntos numerados.
- 2.º: dos cuadrados → rectángulo; dos triángulos con esquina recta → cuadrado; contraejemplo: pegar por otro lado puede dar un triángulo más grande (verificado: catetos iguales pegados dan un triángulo rectángulo isósceles mayor).
- 3.º: la pareja redonda es 7+3 (ej. 1, pareja contigua) y 125+75 (ej. 2, pareja no contigua) para mostrar que se puede elegir cualquier pareja.
- 4.º: amplificar como dividir cada parte; ejemplo 1 con factor dado (1/2 por 3) y ejemplo 2 con factor por descubrir (5 → 20); el contraejemplo usa 1/2 + 3 arriba y abajo = 4/5.
- 5.º: ampliación (rectángulo 2×3 → 4×6) y reducción (cuadrado 8 → 4) sobre cuadrícula; contraejemplo 3×4 → «5×6» frente a 6×8.
- 6.º: parejas y sobrantes para la suma de impares, regla 2a+1 en el momento razonado; el contraejemplo del taller usa 18 (también 6).
- Narración: números y operaciones en palabras (títulos incluidos), sin «parte N de M», sin repetir el título, «dibujo» solo en momentos con recurso (script).

## SVG

viewBox 640×480, fondo crema `#FCF0D6`, índigo, turquesa y maíz, texto ≥ 26 px, `<title>` y `aria-label`, sin `<tspan>`. Se generaron a mano con un script y se **renderizaron con Chrome headless**; se corrigieron: casa sin espacio para su rótulo, flechas, centrado de puntos, corchetes, marcas de quintos. Los recursos de situación y de ejemplo guiado no muestran respuesta ni regla; las soluciones van en los momentos «razona» y en los pasos.

## Verificación

- Cálculos recalculados dos veces: 6+9+4=19; 18+(7+3)=28; 125+75=200, +36=236; 35+65=100, +48=148; 1/2=3/6; 2/5=8/20; 2/3·4=8/12; 2·2=4 y 3·2=6; 8÷2=4; 3×3=9 y 5×3=15; 3+5=8; 18÷4=4,5; 12=4·3, 24=4·6; 10 es múltiplo de 5 y par.
- Ejercicios existentes revisados (60+): sin errores. Observación menor, no editada: `mat.p2.armar-figuras` e06 («dos triángulos grandes iguales por su lado más largo… un cuadrado») solo vale si son triángulos con esquina recta e isósceles; `ejemplos[0].desarrollo` de la misma ficha («Quedan 4 lados largos y 2 cortos...») es confuso.
- Letras correctas de la comprobación: c, a, b, c, a, b; opciones de longitud parecida; números en palabras.
- Script: imagen ≠ primer momento, todos los `recursoRef` existen y todos los recursos se usan, alt ≤ 200, XML bien formado.
- `pnpm nudito:validar-banco`: banco válido, 2238 fichas, 27 034 ejercicios. `pnpm typecheck`: sin errores. `git diff --check` limpio.

## Riesgos y pendientes

- No se probó en navegador con audio, móvil ni movimiento reducido.
- Las descripciones se escribieron después de ver el render, pero deben contrastarse con la imagen en la revisión independiente.
- «Veinteavos», «doceavos» y «séptimos» se leen en palabras; revisar pronunciación del TTS.
- No se actualizaron estado, spec 50 ni bitácora (fuera del encargo).

## Correcciones tras la revisión independiente (`revision-lote-18.md`)

`mat.p3.asociativa-adicion` aprobada, sin cambios. Resto corregido:

- **p1**: descripciones de `ciudades-pregunta` y `ciudades-solucion` recogen todos los textos del SVG («Lima y Cusco, por tierra», «muchas horas en bus», «Lima y Cusco»); distractor «Tu mochila» por «La cama de tu casa».
- **p2**: idea, situación, ejemplo 2 (guiado y razonado), contraejemplo y paso 3 dicen que los triángulos tienen la esquina recta y los dos lados cortos iguales; descripciones de `triangulos-solucion` (raya sólida) y `cuadrados-solucion` (raya central) corregidas. Cambios autorizados fuera de `claseGuiada`: `ejemplos[0].desarrollo` ahora «Quedan 2 lados largos y 2 cortos: una figura larga con 4 esquinas.»; ejercicio e06 con enunciado «…dos triángulos grandes iguales, con una esquina recta y los dos lados cortos iguales, por su lado más largo…» y pista 3 «…4 lados iguales y 4 esquinas rectas» (id, respuesta y dificultad intactos).
- **p4**: SVG `medio-pregunta` rehecho (sin «1/2 × 3: arriba y abajo»; pregunta «¿Cuántas partes habrá y cuántas pintadas?», igual que la narración) con alt y descripción actualizados; pista de la comprobación sin la operación; contraejemplo con otro arranque; «que no sea cero» quitado de la idea.
- **p5**: pista «Piensa qué le pasa a cada lado cuando se amplía al triple»; distractor «Seis por ocho» por «Seis por dieciocho» (longitudes 16/18/15; se pierde el distractor por suma, que sigue en el contraejemplo).
- **p6**: sin letras sueltas en el audio («dos veces un número entero, más uno»), alt y descripción de `impares-solucion` igual; `ejemplo-1-razona` en frases cortas; pista «Revisa cada opción: ¿es múltiplo de cinco y además no es impar?»; contraejemplo con otro arranque y sin el cero (ahora: un contraejemplo pequeño, como seis, sirve).
- Validación: `validar-banco` válido, `typecheck` y `git diff --check` limpios; SVG de p4 rerasterizado.
