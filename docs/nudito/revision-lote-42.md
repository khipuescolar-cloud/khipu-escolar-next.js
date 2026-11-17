# Revisión independiente · Primaria, Matemática, lote 42

Fecha: 2026-11-16. Revisor distinto del autor. Solo lectura sobre banco y recursos. SVG rasterizados en Chrome headless (640×480) y vistos uno por uno.

## Resultado

| Clave | Veredicto |
|---|---|
| `mat.p1.contar-hasta-50` | APROBADA (con corrección recomendada de e12 y e08, fuera del `claseGuiada`) |
| `mat.p2.crear-patron` | APROBADA (sugerencia opcional de audio) |
| `mat.p3.conclusiones-datos` | APROBADA (sugerencia opcional) |
| `mat.p4.cubo-prisma-entorno` | CAMBIOS (1 defecto menor de descripción) |
| `mat.p5.decena-centena-millar` | CAMBIOS (1 defecto de descripción/siglas) |
| `mat.p6.conversion-tiempo` | APROBADA |

## Verificación técnica (E)

- `pnpm typecheck`: sin errores.
- `pnpm nudito:validar-banco`: «Banco válido: 2238 fichas activas; 27034 ejercicios».
- Comparado con `HEAD` por JSON: en las 6 claves solo cambió `claseGuiada`. Los otros cambios dentro de los mismos archivos son de otros lotes y se ignoraron.
- Mecánico por clave: 10 momentos, primer momento sin recurso, 5 recursos y todos los `recursoRef` existen; los 30 SVG existen; sin dígitos en narración, alt, descripcion, pregunta, opciones, mensaje ni pista (los «1/2/3» detectados son solo los de los títulos «Ejemplo 1», «Paso 1»); sin «parte N de M»; ningún momento sin recurso alude a «dibujo/imagen/tarjeta/gráfico»; alt ≤ 200 y descripcion ≤ 500.
- Letras correctas c, a, b, d, c, b; diferencias de longitud de opciones 2, 2, 2, 3, 1, 2; la correcta nunca es la única más larga.

## Visual (D)

Texto ≥ 26 px en los 30 SVG, sin `<tspan>`, sin desbordes ni solapes, márgenes ≥ 14 px. Contrastes sobre crema `#FCF0D6`: turquesa `#0C706E` 5,2:1; ámbar `#8A5A00` 5,2:1; rojo `#B5412A` 4,95:1; blanco sobre tomate `#C8452D` 4,8:1 y sobre círculo `#0F7C7A` 5,0:1. Ningún `#C98F1E`. Gráficos de barras proporcionales (36 px por voto). Nota: algunas capturas headless salieron encogidas por una variación del viewport de Chrome (no del SVG); se repitieron hasta verlas completas.

## Por clave

### mat.p1.contar-hasta-50: APROBADA

Archivo: `src/lib/nudito/conocimiento/banco/matematica/primaria-1/fichas/numeros-hasta-50.json`.

- Cálculos correctos (3·10+5 = 35; 4·10+8 = 48; 4·10+7 = 47). Respuesta c única. Distractores plausibles (37, 44).
- Situación sin revelar el total; ejemplos «razona» y error coinciden con narración, alt y descripcion. Imagen del error: tres bandejas, «Nina dijo 30», cuatro sueltas en recuadro rojo; coincide con la narración.
- Secuencia idea → situación → 2 ejemplos → contraejemplo → pasos → comprobación correcta.
- Opcional (no bloquea): las descripciones de `ejemplo-uno`, `ejemplo-dos`, `error` y `pasos` omiten el título que dibuja el SVG («Contamos de diez en diez», «Faltó contar las sueltas»); no contradice nada.

### mat.p2.crear-patron: APROBADA

Archivo: `.../primaria-2/fichas/patrones-de-repeticion.json`.

- Núcleos y vueltas correctos (2 cuentas × 3; 3 cuentas × 2). Respuesta a única; b rompe el orden, c cambia la última cuenta.
- Contraejemplo coincide con el dibujo (una vuelta; azul, rojo, azul, rojo, rojo, azul). Líneas turquesa/ocre del SVG coinciden con la descripcion.
- Sugerencia opcional (F): las tres opciones son listas de cuatro figuras casi idénticas (62 a 64 caracteres) y se distinguen solo por el final; leídas en voz alta pesan para 2.º. Si el orquestador quiere aligerar, usar solo formas en la comprobación («Triángulo, cuadrado, triángulo, cuadrado»…). No bloquea.

### mat.p3.conclusiones-datos: APROBADA

Archivo: `.../primaria-3/fichas/c25-datos.json`.

- 10 − 8 = 2; 15 − 9 = 6; 21 − 14 = 7. Barras proporcionales a los votos; barra amarilla del charango coincide con alt, descripcion y narración. Marca y equis de las dos frases coinciden.
- Contraejemplo (opinión y generalización) adecuado a 3.º; la regla ya se enunció en la idea («habla solo del grupo que respondió»).
- Comprobación: b única (A es opinión, C generaliza). Pista orienta al criterio sin dar la letra.
- Opcional: la narración dice «tercero B» (situación y ejemplo 1); la voz lo lee «tercero be», una letra suelta. Si se toca: «un salón de tercer grado» en la narración (el SVG puede conservar «tercero B», la descripcion lo lee).

### mat.p4.cubo-prisma-entorno: CAMBIOS

Archivo: `.../primaria-4/fichas/cubos-y-prismas.json`.

1. Recurso `situacion`, campo `descripcion` («una caja amarilla baja, una caja turquesa más alta…»): la caja de regalo del SVG es un cubo (frente cuadrado de lados iguales); decirla «baja» induce a imaginar una caja achatada y luego contradice «cubo». Corregir a «una caja amarilla más pequeña, una caja turquesa más alta y una lata redonda de color lila…». El alt («caja de té alta») se puede dejar.

Resto correcto: medidas y caras (10-10-10; 8-8-20; 6-6-12), contraejemplos correctos (lata de leche; caja de velas), el dibujo del ejemplo 2 muestra la cara de arriba y los lados como dice la narración. Comprobación: d única; c («prisma con seis caras cuadradas e iguales») es falsa para esa caja; opciones 42/44/45/42, la correcta no es la más larga. Observación (no bloquea): la pista «cuál es distinta» presupone que una medida difiere; aceptable porque no da la letra. Tarjeta de pasos con tres líneas en pasos 1 y 3 queda ajustada (≈15 px de aire arriba y abajo), legible.

### mat.p5.decena-centena-millar: CAMBIOS

Archivo: `.../primaria-5/fichas/numeros-hasta-999-999.json`.

1. Recurso `ejemplo-dos`, campo `descripcion`: el SVG rotula «= 200 UM» y «4 DM = 40 UM», pero la descripcion solo dice «igual a doscientas unidades de millar» y «cuarenta unidades de millar»; no nombra las siglas ni explica que se rotulan así. Mismo defecto ya observado en lotes anteriores (revision-lote-23). Corregir: «…rotulado igual a doscientas unidades de millar, UM… cuatro decenas de millar, DM… cuarenta UM. UM significa unidad de millar y DM, decena de millar.» (queda por debajo de 500 caracteres).
2. Opcional: la sigla se explica por primera vez en la narración nunca; solo en `ejemplo-uno.descripcion` y al pie de `error`. Añadir en `ejemplo-1-razona`: «En el dibujo, DM quiere decir decena de millar y UM, unidad de millar», para que quien escucha entienda los rótulos. Si se añade, decirlo en palabras (sin deletrear).

Resto correcto: 3 DM + 5 UM = 35 paquetes; 2 CM + 4 DM = 200 + 40 = 240 UM; 47 paquetes = 4 DM + 7 UM; la cuadrícula de la situación (5 columnas × 7 filas) no revela el total; el error «diez UM = cien mil» está marcado y corregido. Comprobación c única (41/42/41). Oral: «decenas» y «centenas» de las opciones b y c suenan parecidas, pero van con cuatro/siete y se leen completas; aceptable.

### mat.p6.conversion-tiempo: APROBADA

Archivo: `.../primaria-6/fichas/medidas-masa-tiempo-y-temperatura.json`.

- 60 + 50 = 110; 4 200 ÷ 60 = 70 = 1 h 10 min; 300 × 60 = 18 000 (error) y 300 ÷ 60 = 5; 9 000 s = 150 min = 2 h 30 min. Respuesta b única; distractores plausibles (2 h 40, 2 h 15), correcta no la más larga (28/27/26).
- Dibujos coinciden con alt y descripcion (cronómetro; barra de 60 y 50; flechas «÷ 60»; tarjetas roja/turquesa). Símbolos «×», «÷», «s», «min» solo en el SVG; la voz usa palabras.
- Contraejemplo (multiplicar en vez de dividir) correcto y adecuado a 6.º.

## G. Errores de ejercicios existentes

1. `mat.p1.contar-hasta-50`, e12 (numérico, 5): pista 3 «Los números que dijiste son los grupos: 10, 20, 30, 40, 50» es falsa: esos números son totales acumulados; los grupos son cuántos números dices. Afecta al alumno de 1.º (puede responder 50 o 10 tras leer la pista). La retroalimentación sí está bien. Corrección mínima: pista 3 → «Cada número que dices cierra un grupo: cuenta cuántos números dijiste (10, 20, 30, 40, 50).»
2. `mat.p1.contar-hasta-50`, e08 (verdadero/falso, falso): usa 5 grupos de 10 + 3 = 53, fuera del rango de la ficha (hasta 50). La respuesta falsa es correcta y no hay error de lógica; afecta poco. Corrección mínima si se quiere respetar el rango: «Leo tiene 4 grupos de 10 pelotas y 3 pelotas sueltas, así que tiene 34 pelotas.» (falso; correcto 43). Pistas: «4 grupos de 10 son 40.» / «Al 40 súmale 3.» Retroalimentación: «Es falso. 4 grupos de 10 son 40 y con 3 sueltas son 43, no 34.»
3. Los ejercicios de las otras cinco claves no se editaron y el autor no reportó errores; no se hizo auditoría exhaustiva de los 12 a 13 ejercicios de cada una (fuera del encargo).

## No verificado

No se hizo recorrido de navegador, audio real ni movimiento reducido (fuera del alcance de esta revisión de contenido y SVG).

## Ronda 2

- mat.p4.cubo-prisma-entorno: APROBADA. `situacion.descripcion` dice «caja amarilla más pequeña»; SVG rasterizado: caja amarilla cúbica, más pequeña que la turquesa alta y la lata lila; coherente.
- mat.p5.decena-centena-millar: APROBADA. `ejemplo-dos.descripcion` incluye «200 UM», «4 DM = 40 UM» y explica UM y DM. La narración del momento de la decena de millar dice «las siglas DM significan decena de millar y UM, unidad de millar»; legible a la voz (sigla seguida de su significado completo). Observación menor: la sigla se lee por letras; aceptable.
- mat.p1.contar-hasta-50: APROBADA. Pista 3 de e12 = «Cada número que dices cierra un grupo: cuenta cuántos números dijiste (10, 20, 30, 40, 50).»; id e12, dificultad 3 y respuesta 5 intactos; no entrega la respuesta (hay que contar los números).
- `pnpm nudito:validar-banco` OK (2238 fichas, 27034 ejercicios); `pnpm typecheck` OK.
