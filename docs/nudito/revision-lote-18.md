# Revisión independiente · Matemática primaria, lote 18

Fecha: 2026-11-16. Revisor distinto del autor. Solo lectura sobre banco y SVG.

## Resumen

| Clave | Veredicto |
|---|---|
| `mat.p1.al-lado-cerca-lejos` | CAMBIOS (menores) |
| `mat.p2.armar-figuras` | CAMBIOS |
| `mat.p3.asociativa-adicion` | APROBADA |
| `mat.p4.amplificar-fracciones` | CAMBIOS |
| `mat.p5.ampliacion-reduccion` | CAMBIOS (menores) |
| `mat.p6.afirmaciones-pares-multiplos` | CAMBIOS |

## Verificación técnica (E)

- `pnpm nudito:validar-banco`: banco válido, 2238 fichas, 27 034 ejercicios. `pnpm typecheck`: sin errores.
- En los 6 archivos hay un solo hunk (`claseGuiada`). Comparados contra HEAD, el resto de cada ficha es idéntico (misma cantidad de fichas, sin diferencias fuera de `claseGuiada`).
- Los 30 SVG se rasterizaron con Chrome headless y se miraron uno por uno. Ninguno tiene `<tspan>`; fuente mínima 26 px; sin desbordes, solapes ni elementos pegados al borde. Todos los `alt` miden 146 caracteres o menos.
- Comprobación mecánica de narraciones: sin dígitos, sin «parte N de M», sin «dibujo/imagen» en momentos sin recurso, todos los `recursoRef` existen y se usan todos los recursos. Letras correctas de comprobación: c, a, b, c, a, b.
- Cuentas recalculadas y correctas: 6+9+4=19 (no se afirma el total en el banco); 18+(7+3)=28; 125+75=200, +36=236; 35+65=100, +48=148; 1/2=3/6; 2/5=8/20; 2/3×4=8/12; 2×2=4, 3×2=6; 8÷2=4; 3×3=9, 5×3=15; 3+5=8; 18/4=4,5; 12=4·3, 24=4·6; 10 es múltiplo de 5 y par; 5 y 15 impares. Contraejemplos y distractores válidos (6/7 = suma en ambos términos, 6×8 = sumar 3, 9×5 = cambiar un solo lado).
- Los SVG coinciden con `alt` y `descripcion` en cantidades y posiciones (puntos, celdas, partes pintadas, quintos marcados cada 4, esquinas de cuadrícula), salvo lo listado abajo.

## `mat.p1.al-lado-cerca-lejos` — CAMBIOS (menores)
Archivo: `src/lib/nudito/conocimiento/banco/matematica/primaria-1/fichas/ubicacion-y-recorridos.json`.

Aspectos correctos: primer momento sin imagen; casa-banca/tienda/río coincide (0, 3 y 12 puntos); no hay imagen que revele respuesta; frases cortas para 1.º; opciones breves y legibles.

1. Recurso `ciudades-pregunta` (`ubicacion-lado-ciudades-pregunta.svg`): el dibujo tiene un texto inferior «Lima y Cusco, por tierra» que ni `alt` ni `descripcion` mencionan. Añadirlo a la descripción (o quitarlo del SVG).
2. Recurso `ciudades-solucion`: arriba el SVG dice «Lima y Cusco» y «muchas horas en bus»; la descripción solo cita el texto inferior. Mencionar «muchas horas en bus» o quitarlo.
3. Observación (no obliga): en `comprobacion`, la opción b «Tu mochila» no aparece en el enunciado y es un distractor sin lógica para un niño de 6 años; mejor «La banca de tu casa» o similar. El enunciado ya contiene la respuesta («muchos pasos y muchas calles»); aceptable en 1.º.

## `mat.p2.armar-figuras` — CAMBIOS
Archivo: `.../primaria-2/fichas/figuras-planas.json`.

1. Matemático, momentos `idea` y `ejemplo-2-guiado`/`ejemplo-2-razona`/`paso-3`: se afirma que dos triángulos iguales «con una esquina recta» pegados por el lado más largo dan un cuadrado. Solo es cierto si los dos lados cortos miden lo mismo (isósceles). Con catetos distintos sale un rectángulo o cometa. El SVG dibuja el caso isósceles, pero ninguna narración lo dice. Corregir: decir «triángulos con una esquina recta y los dos lados cortos iguales», y que `situacion-piezas` y las descripciones lo digan igual.
2. Recurso `triangulos-solucion`: `descripcion` dice «raya punteada de esquina a esquina», pero el SVG dibuja una línea sólida. Cambiar a «raya» (alt ya dice «raya»).
3. Recurso `cuadrados-solucion`: el SVG muestra una línea vertical que divide los dos cuadrados; la descripción no la menciona. Añadir «una raya en el medio que separa los dos cuadrados».
4. `contraejemplo`: «Si los pegas por otro lado, puede salir un triángulo más grande» es cierto para triángulos isósceles rectángulos, pero con la corrección 1 conviene precisarlo («por un lado corto»).
5. Sobre lo señalado por el autor: `e06` («dos triángulos grandes iguales por su lado más largo… ¿qué figura puede salir?») usa «puede salir» y los distractores son círculo y media luna, así que la respuesta es única y el alumno no ve error evidente; el riesgo real es de rigor (falta la condición isósceles) y se arregla en la misma corrección 1 (añadir «con una esquina recta y lados cortos iguales» al enunciado y a la pista 3). `ejemplos[0].desarrollo` («Quedan 4 lados largos y 2 cortos…») es falso (un rectángulo de dos cuadrados tiene 2 lados largos y 2 cortos) y contradice la narración nueva «dos lados largos y dos lados cortos». Afecta al alumno solo si la UI muestra los `ejemplos` clásicos en práctica/teoría; recomiendo corregirlo a «Quedan 2 lados largos y 2 cortos: una figura larga con 4 esquinas» en una pasada posterior (fuera de `claseGuiada`).

## `mat.p3.asociativa-adicion` — APROBADA
Archivo: `.../primaria-3/fichas/c23-adicion-sustraccion.json`.

Cuentas correctas, secuencia pedagógica completa (parejas contiguas y no contiguas, contraejemplo con resta), imágenes de pregunta sin respuesta, soluciones solo en «razona»/pasos, descripciones iguales a los SVG, números en palabras legibles en audio, opciones de longitud 22/22/23.

Observaciones no bloqueantes:
- `situacion-bolsas`: «Ana tiene tres bolsitas de canicas» repite casi el título «Tres bolsitas de canicas». Opcional variar.
- `comprobacion.pista` («Busca dos números que sumen cien…») da la estrategia pero no el resultado: aceptable.

## `mat.p4.amplificar-fracciones` — CAMBIOS
Archivo: `.../primaria-4/fichas/c23-fracciones-operaciones.json`.

1. Recurso `medio-pregunta` (ejemplo guiado): el SVG (y la `descripcion`) muestran «1/2 × 3: arriba y abajo», que entrega la regla antes de la pregunta y además escrito «1/2 × 3» significa 3/2 (el error que el contraejemplo advierte). Quitar esa línea; dejar «Cada parte se divide en 3» y la pregunta.
2. Recurso `medio-pregunta`: el SVG pregunta «¿Qué fracción queda?», pero la narración del momento `ejemplo-1-guiado` pregunta «¿Cuántas partes tendrá la barra y cuántas estarán pintadas?». Igualar (p. ej. en el SVG: «¿Cuántas partes habrá y cuántas pintadas?») y actualizar alt/descripcion.
3. `comprobacion.pista`: «Multiplica el numerador y el denominador por cuatro» entrega la operación exacta; el alumno solo calcula. Cambiar a algo como «Piensa qué hay que hacer con arriba y con abajo para que la fracción valga lo mismo».
4. `contraejemplo`: arranca «Hay dos errores frecuentes», eco literal del título «Dos errores frecuentes». Variar la primera oración.
5. Vocabulario oral: «veinteavos», «doceavos», «sextos», «séptimos» están en palabras y son legibles. «Seis séptimos» frente a «tres sextos» puede sonar parecido; solo probar el TTS. La opción «Dos doceavos» y «Ocho doceavos» difieren solo en el primer número: legible, pero conviene que el audio las separe con pausa (ya lo hace por ser opciones distintas).
6. Pedagógico: la `idea` es densa para 4.º (numerador, denominador, «no sea cero»). Valorar quitar «que no sea cero» del audio.

## `mat.p5.ampliacion-reduccion` — CAMBIOS (menores)
Archivo: `.../primaria-5/fichas/ubicacion-y-transformaciones.json`.

Aspectos correctos: cuadrículas 8×8 coinciden con alt/descripcion (3×4 base-altura, 2×3, 4×6 desde la misma esquina, 8 y 4), contraejemplo 3×4 → 5×6 frente a 6×8 correcto, imágenes de pregunta no revelan nada.

1. `comprobacion.pista`: «Multiplica el ancho y el alto por tres» entrega la operación completa. Cambiar a «¿Qué le pasa a cada lado cuando se amplía al triple?».
2. `comprobacion.opciones`: la correcta «Nueve por quince» (16 caracteres) es la más larga frente a 13 y 15; igualar longitudes (p. ej. distractor «Seis por ocho» a «Ocho por quince» sería peor; usar «Nueve por doce» no sirve; probar «Seis por once»).
3. Observación: las descripciones omiten los títulos superiores del SVG («Rectángulo de 2 por 3», «Cuadrado de lado 8»); no es contradictorio, pero si se quiere exactitud, mencionarlos.

## `mat.p6.afirmaciones-pares-multiplos` — CAMBIOS
Archivo: `.../primaria-6/fichas/argumentacion-numerica.json`.

1. Audio, momento `ejemplo-1-razona` y `idea`: «dos por a más uno, más dos por b más uno, es dos por la suma de a, b y uno» es ambiguo al oído (¿2×(a+1) o 2a+1?) y la letra «a» sola la voz puede leerla como la preposición. Reescribir con «dos veces a, más uno» o «el doble de a, más uno», y «la letra a / la letra b / ene». Lo mismo en el `alt` de `impares-solucion` («dos a más uno más dos b más uno es dos por a más b más uno»).
2. `comprobacion.pista`: «Busca un múltiplo de cinco que sea par» casi entrega la respuesta (solo una opción es par). Cambiar a «Revisa cada opción: ¿alguna es múltiplo de cinco y no es impar?» o reformular el ejercicio con opciones más abiertas (p. ej. incluir un múltiplo de cinco impar en las tres y pedir cuál de cuatro).
3. `contraejemplo`: «Hay dos errores frecuentes» repite el título «Dos errores frecuentes». Además el segundo error (el cero) no se trabajó antes en la clase; añadirlo al paso o sustituirlo por algo ya visto (p. ej. «creer que un contraejemplo debe ser un número grande»).
4. Observación: el momento `ejemplo-1-razona` mezcla demostración visual y algebraica en una sola narración larga; partirla en dos oraciones breves con pausa.
5. Visual: sin defectos; `multiplos-solucion` (sí/no) y `impares-solucion` (cuatro parejas, la última amarilla) coinciden con alt y descripción. La fórmula del SVG `impares-solucion` queda en 26 px, en el límite.

## Notas generales

- Ningún SVG está pegado al borde ni tiene texto menor de 26 px.
- Varias `descripcion` omiten el título superior del SVG; no se considera defecto salvo en `ciudades-*` (ítems 1 y 2 de p1).
- Pendiente de probar fuera de esta revisión: audio TTS real, móvil y movimiento reducido.

## Ronda 2

Fecha: 2026-11-16. Solo lectura. `pnpm nudito:validar-banco`: banco válido (2238 fichas, 27 034 ejercicios). `pnpm typecheck`: sin errores. Comparado contra HEAD con `claseGuiada` removida de todas las fichas: los 5 archivos sin diferencias fuera de `claseGuiada`, salvo en p2 exactamente tres líneas autorizadas (`ejemplos[0].desarrollo`, enunciado de e06 y pista 3 de e06). En e06, id, respuesta (`a`, cuadrado) y dificultad (2) intactos; respuesta única (círculo y media luna no se arman con triángulos) y pista 3 correcta (el cuadrado tiene 4 lados iguales y 4 esquinas rectas) sin nombrar la figura. SVG rasterizados con Chrome headless (`ciudades-pregunta/solucion`, `triangulos-pregunta/solucion`, `cuadrados-solucion`, `medio-pregunta`, `impares-solucion`): fuente mínima 26 px, sin `<tspan>`, sin solapes ni desbordes.

| Clave | Veredicto | Verificación |
|---|---|---|
| `mat.p1.al-lado-cerca-lejos` | APROBADA | Descripciones de `ciudades-*` recogen todos los textos del SVG («Lima y Cusco, por tierra», «muchas horas en bus», «Lima y Cusco»). Distractor «La cama de tu casa» sensato; opciones 13/18/10 caracteres, correcta `c`. |
| `mat.p2.armar-figuras` | APROBADA | Condición de esquina recta y lados cortos iguales en idea, situación, ejemplo 2, contraejemplo, paso 3 y e06; «por un lado corto» precisado en el contraejemplo. `triangulos-solucion` («raya») y `cuadrados-solucion` («raya en el medio») coinciden con el dibujo. `ejemplos[0].desarrollo` ya es matemáticamente correcto. Sin defectos nuevos. |
| `mat.p4.amplificar-fracciones` | APROBADA | `medio-pregunta` sin «1/2 × 3: arriba y abajo»; pregunta del SVG igual a la narración; alt y descripción acordes. Pista sin la operación; contraejemplo con otro arranque (1/2 con +3 da 4/5, correcto); «que no sea cero» fuera. Opciones 12/12/13, correcta `c`. |
| `mat.p5.ampliacion-reduccion` | APROBADA | Pista ya no entrega la operación. Opciones 16/18/15: la correcta ya no es la única más larga; correcta `a`. Observación no bloqueante: «Seis por dieciocho» es un distractor poco natural (3→6 y 5→18). |
| `mat.p6.afirmaciones-pares-multiplos` | APROBADA | Sin letras sueltas en el audio; `ejemplo-1-razona` en frases cortas; alt/descripción de `impares-solucion` coherentes con el SVG («(2a + 1) + (2b + 1) = 2(a + b + 1)», 26 px, legible). Pista no entrega la respuesta; contraejemplo con otro arranque y sin el cero (seis como contraejemplo es válido). Correcta `b`. |

Sin defectos pendientes. Letras correctas del lote: c, a, b, c, a, b (p1 a p6).
