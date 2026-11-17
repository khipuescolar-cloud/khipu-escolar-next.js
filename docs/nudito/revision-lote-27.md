# Revisión independiente · Primaria, Matemática, lote 27

Fecha: 2026-11-16. Revisor distinto del autor. Solo lectura sobre banco y SVG.

## Verificaciones técnicas
- `pnpm typecheck`: sin errores. `pnpm nudito:validar-banco`: válido (2238 fichas, 27034 ejercicios).
- Comparado con `HEAD` por JSON: en las 6 claves solo cambió `claseGuiada` (ejercicios, ids, respuestas y dificultad intactos).
- 30 SVG rasterizados con Chrome headless (hojas por clave) y vistos. Todos con `<title>`, sin `<tspan>`, texto mínimo 28 px, sin texto ámbar `#C98F1E`, sin desbordes ni solapes. Cuentas y geometría de los dibujos recalculadas (casilleros, bloques, vértices de los prismas, ángulos de los triángulos): coinciden con alt y descripción.
- Narraciones: sin dígitos, sin «parte N de M» (el «parte los» de p2 `paso-2` es el verbo), sin títulos repetidos ni recursos sin usar; todos los `recursoRef` existen; alt ≤200 y descripcion ≤500; opciones de comprobación con diferencia de longitud ≤3 y la correcta nunca la más larga.
- Recalculado: 326+143=469; 752−231=521; 418+322=740; 5836<5863; 7049<7094<7904; 4318<4507; 4096<4906; octógono 10 caras y 16 vértices; heptágono 21 aristas; base de diez lados 30 aristas; 8-8-6 → 68°/68°/44°; 5-12-13 → 90°/23°/67°; 50°+65°+65°; 120°+30°+30°; 35+75+70=180. Ejercicios de las 6 claves revisados: sin errores.

## Casos que pidió el orquestador

**A. `mat.p5` `ideaCentral` con «n», «3n», «2n».** Decisión: corregir. Es texto de la ficha (no de la clase guiada) y un alumno de 5.º no ha trabajado álgebra con letras; además cualquier lectura en voz alta diría «ene». Corrección mínima (campo `ideaCentral`, el único tocado fuera de `claseGuiada`): «Si la base de un prisma tiene cierta cantidad de lados, hay esa misma cantidad de caras laterales, más dos bases. Las aristas son el triple de los lados de la base y los vértices, el doble. Puedes comprender estos conteos observando los dos contornos de las bases y las uniones entre sus esquinas.»

**B. `mat.p5` e08, respuesta exacta «3+3+3».** Decisión: no hace falta cambiar nada. Probado con `compararTexto` en el modo que usa el banco (`literal`, ver `servidor.ts`): «3+3+3» y «3 + 3 + 3» salen exactas (se normalizan los espacios); «3+3», «3+3+3 = 9» y «tres más tres más tres» se rechazan, que es lo coherente con el enunciado («sin resultado»). Es un ejercicio de formato, no de coherencia: la pista final lo orienta. Sin acción.

**C. `mat.p2.bloques-logicos` `grupo-pregunta`.** Decisión: el dibujo y la descripción por bloque están bien (los tres bloques son los datos del problema, igual que los números en p3/p4), pero el `alt` sí entrega la regla: «Tres bloques azules grandes juntos…», que es justo lo que se pregunta. Corrección mínima: alt «Tres bloques juntos dentro de una línea punteada, con la pregunta qué tienen en común.» (y, por coherencia, el `<title>` interno del SVG, que hoy dice «Tres bloques azules grandes…»). La descripción puede quedarse listando «triángulo azul grande, círculo azul grande, cuadrado azul grande» (sin enunciar la conclusión «mismo color y tamaño»). Alternativa más fuerte, no necesaria: variar un bloque en forma y tamaño del grupo para que la regla no salte a la vista.

## mat.p1.barras-verticales — APROBADA
Matemática y secuencia correctas. Situación y primer guiado no revelan nada (columnas vacías y sin «?» con valor); el gráfico de `paseos-pregunta` ya está pintado porque el ejemplo es de lectura, no de construcción. Dibujos coinciden (4/2/5 niños y casilleros; granja 6, mercado 3, playa 4; tres casilleros con borde amarillo sobre la línea). Contraejemplo (dos casilleros por niño) visible y correcto. Comprobación (b, papaya) única.
Sin defectos bloqueantes. Sugerencia opcional: el ejercicio e08 (existente, no tocado) usa «■» en el enunciado, que la voz puede leer mal; no afecta a esta clase.

## mat.p2.bloques-logicos — CAMBIOS
1. Recurso `grupo-pregunta`, campo `alt` (y `<title>` del SVG `bloques-logicos-grupo-pregunta.svg`): revela la respuesta del ejemplo 2 («azules grandes»). Reescribir como en el caso C. El resto del recurso (descripcion, dibujo) se mantiene.
Todo lo demás correcto: `caja-pregunta` (8 bloques, 3 rojos), `por-color` (3 rojos / 5 demás), `errores` (una regla frente a sin regla) coinciden con alt y descripción; comprobación única (c, «Por forma»).

## mat.p3.calculo-mental-descomposicion — CAMBIOS
1. Momento `contraejemplo`: «A la izquierda quedan doscientos, cuarenta y tres en tres tarjetas…» es una lista ambigua al oído («doscientos, cuarenta y tres» suena a 243 partido en dos). Reescribir: «A la izquierda quedan tres tarjetas: la del doscientos, la del cuarenta y la del tres, y esas partes juntas forman otra vez el número.»
2. Menores (no bloquean, corregir si se toca el archivo): `<title>` interno de `calculo-mental-descomposicion-errores.svg` («separado bien en doscientos, cuarenta y tres…») y de `-suma-partes.svg` («…en cien, cuarenta y tres») tienen la misma ambigüedad; reescribir con «y» solo entre los dos últimos y artículos («el cien, el cuarenta y el tres»). Etiquetas de salto «+100»/«−200» a ~3 px de la tarjeta siguiente y tarjetas de `tienda-pregunta`/`resta-pregunta` a ~18 px del borde: legible, solo apretado; dar 4–8 px más de aire.
Matemática correcta (326+143; 752−231; 243=200+40+3 frente a 2+4+3; 418+322=740 con distractores 730 y 750). Sin revelaciones: las tarjetas de situación solo traen los datos y el «?».

## mat.p4.comparar-cuatro-cifras — APROBADA
Contenido, secuencia y dibujos correctos; las celdas resaltadas coinciden con la descripción (decenas en bibliotecas; decenas de Carla, centenas y decenas de Ana, centenas de Beto en ahorros). Los números van en palabras y en oraciones separadas (no hay listas ambiguas); las siglas UM, C, D, U no se deletrean en la narración. Contraejemplo (mirar solo la última cifra) correcto. Comprobación única (c, domingo; diferencia de longitud 3).
Sugerencia opcional: las descripciones de `bibliotecas-*` y `alcancias-*` nombran «UM, C, D y U»; si la descripción se lee en voz alta, quedarán como letras sueltas. Si se toca, usar «columnas de unidades de millar, centenas, decenas y unidades, rotuladas con sus siglas».

## mat.p5.caras-aristas-segun-base — CAMBIOS
1. Momento `contraejemplo`: la frase final «Los vértices no se hallan sumando dos al número de lados…» introduce un tercer error que el dibujo no muestra (el panel izquierdo es de aristas; el derecho muestra los seis vértices). Quitarla o sustituirla por una frase apoyada en la imagen: «En el segundo se marcaron las esquinas de las dos bases: tres arriba y tres abajo, seis vértices.» (ya está) y cerrar con «Hay que contar las dos bases.»
2. `ideaCentral` con «n», «3n», «2n» (campo fuera de `claseGuiada`): ver caso A. La clase guiada, la descripción y los SVG están limpios; la corrección es solo del texto de la ficha. Si el orquestador prefiere no tocarlo en este lote, anotarlo como pendiente (no bloquea la clase guiada).
Resto correcto: octógono 8+2=10 caras y 16 vértices (8 en cada base; 4 vértices ocultos huecos, geométricamente consistentes con la altura del prisma), heptágono 7+7+7=21 con los tres grupos de color contados en el dibujo (7 arriba, 7 abajo con tramos punteados, 7 verticales), recursos de 3, 4, 5 y 6 lados evitados, comprobación única (b, treinta; distractores veinte y veintidós plausibles).

## mat.p6.clasificar-triangulos — CAMBIOS
1. Recursos `escuadra-pregunta` y `escuadra-clasificado`, momentos `ejemplo-2-guiado`, `ejemplo-2-razona` (título «los nombres de la escuadra») y `paso-2` («Mira la escuadra»): una escuadra escolar real es 45°-45°-90° (isósceles rectángulo) o 30°-60°-90°; el triángulo 5-12-13 (90°, 23°, 67°) no es una escuadra y el alumno que tenga una en la mano verá una clasificación distinta («escaleno» frente a «isósceles»). Renombrar el objeto, por ejemplo «una rampa» o «una cuña de madera»: «Ahora mira otro triángulo, el de una rampa. Sus lados miden cinco, doce y trece centímetros…», título «Ejemplo 2: los nombres de la rampa», «Mira la rampa, que tiene un ángulo recto», y «La rampa es un triángulo escaleno rectángulo». Los alt de los SVG no nombran la escuadra; solo cambian ids/títulos si se quiere coherencia (no es obligatorio).
Resto correcto: tejado 8-8-6 con 68°/68°/44° (ley de cosenos), 5-12-13 con 90°/23°/67°, ejemplos 1 y 2 distintos, contraejemplo con dos isósceles (50° acutángulo y 120° obtusángulo; ángulos del dibujo medidos: 50° y 120° reales), `pregunta` y `guiado` sin revelar el nombre (los ángulos y medidas son datos del enunciado), comprobación única (a, 35°-75°-70°). Observación del autor sobre `erroresFrecuentes[0]` y e05 («al menos dos» frente a «exactamente dos»): consistente en todo el banco; sin acción. e05 usa 7-7-10, que es isósceles con exactamente dos lados iguales; correcto.
Menor: la comprobación (acutángulo, letra a) y e04 (50°, 60°, 70°, acutángulo, a) son casi gemelas; opcional cambiar los ángulos de la comprobación a un obtusángulo (p. ej. 30°, 40°, 110° ya está en e06) o a uno con ángulos más cercanos a 90° para que sea distinta de e04.

## Resumen
Aprobadas: `mat.p1.barras-verticales`, `mat.p4.comparar-cuatro-cifras`.
Con cambios (todos pequeños y localizados): `mat.p2.bloques-logicos` (1: alt de `grupo-pregunta`), `mat.p3.calculo-mental-descomposicion` (1: lista ambigua en `contraejemplo`), `mat.p5.caras-aristas-segun-base` (1 en `claseGuiada` + `ideaCentral` sin letras), `mat.p6.clasificar-triangulos` (1: «escuadra» no corresponde al triángulo 5-12-13).

## Ronda 2

Revisión de solo lectura de las 4 claves corregidas. `pnpm nudito:validar-banco`: válido (2238 fichas, 27034 ejercicios). `pnpm typecheck`: sin errores. SVG rasterizados con Chrome headless (grupo-pregunta, tienda-pregunta, resta-pregunta, suma-partes, resta-partes, errores): sin solapes, tarjetas de salto con aire, etiquetas legibles. En las 4 fichas solo se ve tocada `claseGuiada` (más `ideaCentral` en p5); ejercicios intactos.

- mat.p2.bloques-logicos: APROBADA. `alt` y `<title>` de `grupo-pregunta` ya no revelan la regla; la descripción solo lista los bloques; el dibujo muestra la pregunta sin respuesta.
- mat.p3.calculo-mental-descomposicion: APROBADA. Contraejemplo sin la ambigüedad «243» («la del doscientos, la del cuarenta y la del tres»); `<title>` de suma-partes, resta-partes y errores con artículos; tarjetas de salto más bajas y etiquetas sin rozar.
- mat.p5.caras-aristas-segun-base: APROBADA. Contraejemplo sin «sumando dos». `ideaCentral` sin letras: caras = lados + 2 bases, aristas = triple de los lados, vértices = doble; correcto para un prisma recto y de lenguaje adecuado a 5.º (la última oración es algo torpe, no bloquea).
- mat.p6.clasificar-triangulos: APROBADA. «rampa» en ejemplo-2-guiado, título de ejemplo-2-razona y paso-2; no queda «escuadra» en texto visible ni narrado, ni en alt, descripción o `<title>` (solo ids, `src` y archivos con prefijo `escuadra-`).
