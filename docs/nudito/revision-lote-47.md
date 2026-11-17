# Revisión independiente · Primaria, Matemática, lote 47

Fecha: 2026-11-16. Revisor independiente (no escribió el lote). Solo lectura sobre banco y recursos.

**Resumen:** APROBADAS: `mat.p2.completar-la-decena`, `mat.p5.decadas-siglos`, `mat.p6.decimos-centesimos`. CAMBIOS: `mat.p1.contar-hasta-10`, `mat.p3.comparar-tres-cifras`, `mat.p4.desplazamientos-cuadricula`.

## Verificación técnica (E)

- `pnpm` no está en el PATH de esta terminal; se usaron los binarios locales (`node_modules/.bin/tsc --noEmit`, `node_modules/.bin/tsx scripts/nudito-validar-banco.ts`).
- `tsc --noEmit`: sin errores.
- Validador del banco: «Banco válido: 2238 fichas activas; 27034 ejercicios».
- Lint mecánico `scripts/nudito-lint-clase-guiada.ts` sobre las 6 claves: **0 errores, 10 avisos** (todos `descripcion-larga`, 304–426 caracteres, por debajo del tope de 500). Letras correctas de comprobación: B, C, A, C, B, A.
- Comparación con HEAD por JSON (clave por clave): en las 6 claves **solo cambió `claseGuiada`**. Ejercicios, ids, respuestas y dificultad intactos. Coincide con lo declarado por el autor.
- Los 30 SVG existen, se rasterizaron en Chrome headless y se vieron uno por uno: 640×480, texto ≥ 26 px, sin `<tspan>`, sin desbordes ni solapes, rojo solo en errores, ámbar #8A5A00 (no #C98F1E). Cada `recursoRef` corresponde 1 a 1 con un recurso. Primer momento sin recurso en las 6. Sin dígitos sueltos ni «parte N de M» en narración.

## mat.p1.contar-hasta-10 — **CAMBIOS**

Archivo: `primaria-1/fichas/conteo-y-numeros-hasta-10.json`.

1. **Momento `ejemplo-1-guiado` sin respuesta posible (B/C3).** Dice «hay una fila de choclos. Señala el primero con el dedo… ¿Qué número dices con el último?» sin dar la cantidad y sin recurso. El alumno no tiene qué contar; la pregunta no se puede contestar y el siguiente momento ya revela «cuatro». Corregir: decir la cantidad en la voz («una fila de cuatro choclos…») y preguntar por el recuento, o enlazar un recurso de variante «pregunta» (fila sin números). El `ejemplo-2-guiado` sí es contestable.
2. **Momento `contraejemplo` / recurso `pollitos-error`: narración no coincide con el dibujo.** La narración dice «los números repetidos están en rojo», pero el dibujo (y alt/descripcion, que sí son correctos) pinta en rojo el tercero y el cuarto número (2 y 3): el 3 no está repetido. Corregir la narración: «el segundo dos y el número que sigue están en rojo», o pintar en rojo solo el 2 repetido en dibujo, alt y descripcion.
3. Menor: la `descripcion` de `choclos-contados` omite el rótulo superior «Un número por choclo» que sí está en el dibujo (ídem `cuadricula-veintitres` de p6, «Leer la parte pintada»). Añadir «Arriba: …» para que coincida exactamente.

Sin otros defectos: alt ≤ 200, descripcion ≤ 500, comprobación con respuesta única (b, «Seis»; 5/4/5 letras, correcta no es la más larga), vocabulario oral correcto. El dibujo de botones (el 7 verde abajo a la izquierda), choclos, mangos y tres-pasos coincide con alt/descripcion.

## mat.p2.completar-la-decena — **APROBADA**

Archivo: `primaria-2/fichas/adicion-y-sustraccion-hasta-100.json`. Sin defectos bloqueantes.

Cálculos verificados: 38 + 5 = 43 (2 + 3), 62 − 7 = 55 (2 + 5), 37 + 6 = 43 (el 46 del contraejemplo es 40 + 6, error bien explicado), comprobación 46 + 7 = 53 (c; 15/17/16 letras). Rectas numéricas: marcas, saltos y rótulos coinciden con alt/descripcion (37–44 y 54–63).

Observaciones menores (no bloquean):
1. `idea`: «Una decena es un número redondo, como treinta, cuarenta o cincuenta» es impreciso (una decena es un grupo de diez; treinta son tres decenas). Mejor «una decena exacta» o «un número redondo de decenas».
2. El `ejemplo-1-guiado` introduce a Ana y sus soles, pero `ejemplo-1-razona` pasa a «treinta y ocho más cinco» sin retomar el contexto. Funciona, pero el hilo se pierde.

## mat.p3.comparar-tres-cifras — **CAMBIOS**

Archivo: `primaria-3/fichas/c23-numeracion-fracciones-dinero.json`.

1. **Rigor matemático en `ejemplo-2-guiado` y `ejemplo-2-razona`.** Dicen «Carla tiene más decenas y más unidades que Diego» y «aunque tenga menos decenas y menos unidades». Con 692 y 701, leído como cantidad de decenas, es falso (69 decenas frente a 70). Solo es cierto para la cifra de las decenas (9 frente a 0). Corregir: «Carla tiene una cifra mayor en las decenas y en las unidades» / «aunque su cifra de las decenas y de las unidades sea menor». Revisar igual «Ana tiene siete y Beto tiene cuatro» en `ejemplo-1-razona` (ahí se lee bien por contexto, pero usar «cifra» da coherencia).
2. **Recursos `tabla-centenas-iguales`, `tabla-centenas-deciden`, `tabla-error`: encabezados C, D, U sin explicar.** El alumno de 3.º ve letras sueltas y la narración y la descripcion usan los nombres completos sin conectar. Corregir (a elegir): escribir «Centenas / Decenas / Unidades» en los encabezados (cabe a 26 px con tabla algo más ancha), o decir en la narración «las letras C, D y U son centenas, decenas y unidades» una vez en `ejemplo-1-razona`.
3. Observación oral (F), no bloquea: «cuatrocientos ochenta y tres» frente a «cuatrocientos treinta y ocho», y quinientos setenta y cuatro frente a quinientos cuarenta y siete, son difíciles de distinguir solo de oído. La imagen está en pantalla en esos momentos, así que se acepta; en `ejemplo-1-guiado` (sin recurso) el alumno que solo escucha tendría que retener ambas cifras.

Verificado sin defecto: 574 > 547, 692 < 701, 483 > 438, comprobación 643 > 634 (a; 13/14/15 letras), dibujos coinciden con alt/descripcion.

## mat.p4.desplazamientos-cuadricula — **CAMBIOS**

Archivo: `primaria-4/fichas/ubicacion-y-recorridos.json`.

1. **Momento `situacion` y recurso `cuadricula-pregunta` revelan las direcciones de la respuesta (C2).** Narración, alt y descripcion dicen «el cuy abajo, cerca del lado izquierdo, y el comedero más arriba, hacia la derecha»; la pregunta es «qué recorrido lleva al cuy al comedero», y las direcciones «derecha» y «arriba» son justo la respuesta del `ejemplo-1`. Corregir con el mismo criterio que el autor aplicó en p6: describir sin direcciones («el cuy está en una casilla y, más lejos, está su comedero; la cuadrícula no tiene números»), en narración, alt y descripcion.
2. Observación: el `contraejemplo` habla de «la bandera» sin presentarla (aparece en el `ejemplo-2`, pero el contraejemplo es independiente). Mejor «una ficha y una bandera» al empezar.

Verificado sin defecto: (2, 1) → (5, 3) = 3 derecha y 2 arriba; (6, 4) → (2, 2) = 4 izquierda y 2 abajo; salida contada de más = 4 en vez de 3; comprobación (1, 2) → (5, 5) = 4 derecha y 3 arriba (c; 41/38/39 letras, diferencia máxima 3, correcta no es la más larga). Flechas, banderas, números de columnas y filas coinciden con alt/descripcion.

## mat.p5.decadas-siglos — **APROBADA**

Archivo: `primaria-5/fichas/medicion-masa-y-tiempo.json`. Sin defectos bloqueantes.

Verificado: 1821 → 18 + 1 = siglo diecinueve (1801–1900); 2 siglos + 5 décadas = 250 años; 1900 es el último año del siglo diecinueve (el siglo veinte empieza en 1901); comprobación 1480 → siglo quince (b; 13/12/15 letras). Los intervalos de los bloques (1701–1800, 1801–1900, 1901–2000) son correctos.

Observaciones menores (no bloquean):
1. Los dibujos `linea-siglo-diecinueve` y `limite-mil-novecientos` rotulan «Siglo XIX/XX/XVIII» en números romanos, y la voz y la descripcion dicen «diecinueve». La lección nunca enlaza ambas formas. Sugerido: una frase en `ejemplo-1-razona` («el siglo diecinueve, que en el dibujo se escribe con números romanos»).
2. La regla «dos primeras cifras más uno» vale solo para años de cuatro cifras; decir «un año de cuatro cifras» evita el fallo con años como 476.

## mat.p6.decimos-centesimos — **APROBADA**

Archivo: `primaria-6/fichas/numeros-decimales.json`. Sin defectos bloqueantes.

Verificado: 2 columnas + 3 cuadritos = 23 centésimos (el dibujo de la situación pinta exactamente esa figura sin revelar el conteo en narración, alt ni descripcion); 5 décimos = 50 centésimos; 3 décimos = 30 centésimos frente a 3 centésimos; comprobación 10 + 4 = 14 cuadritos (a; 17/15/18 letras). Texto ámbar #8A5A00 correcto; las cuadrículas de `cuadricula-veintitres` y `tres-decimos-error` quedan a ~28 px del borde izquierdo (justo; aceptable).

Observaciones menores: en la comprobación, «Catorce» y «Cuarenta» suenan parecido de oído (ambas pronunciadas por la voz); si se quiere más margen, cambiar la opción c por «Cincuenta cuadritos» u otra más distinta. El `ejemplo-1-guiado` se apoya en «la cuadrícula de la situación» sin recurso propio, pero da los datos en la voz, así que se responde bien.

## G. Errores y problemas en ejercicios existentes (el orquestador decide; no se editó nada)

Los 72 ejercicios se recalcularon; todas las respuestas guardadas son correctas, salvo ambigüedad:

1. **p4 `e11`** (`ubicacion-y-recorridos.json`): «casilla (2, 2)… casilla (6, 5)» sin decir qué número es columna y cuál fila. Con (fila, columna) la opción a («3 a la derecha y 4 arriba») sería válida; con (columna, fila) lo es la d (clave). Respuesta no única sin convención. Corrección mínima: añadir «(columna, fila)» al enunciado. Igual en `e07` (la dirección del eje de filas decide «3 abajo»), `e09` y `e12` (fila hacia arriba); basta una frase corta de convención en cada enunciado. Afecta al alumno.
2. **p1** (`conteo-y-numeros-hasta-10.json`) `e01`–`e12`: enunciados de plantilla artificial («dados, dados. ¿Cuántos hay?») y pistas rotas («Ubica el primer dados de la lista de en el aula»). `e04`, `e08` y `e12` son marcas «| | |» pero sus pistas hablan de lápices. Las respuestas son correctas, pero el alumno de 1.º recibe texto confuso. Corrección mínima: reescribir pistas de e04/e08/e12 («Toca cada marca una vez») y enunciados con la cantidad en palabras o con un recurso; es contenido de otro lote, no del 47.
3. **p5 `e09`, `e11`** (y en menor medida `e05`): opciones con «Siglo XVIII», «XIX», «XX» solo en números romanos (`e05` añade «(siglo 20)»). La voz puede leerlos mal («equis equis»). Corrección mínima: añadir «(siglo 19)» a las opciones o dar al lector de voz una lectura en palabras.
4. **p5 `ideaCentral`**: «se analiza la centena y se añade 1 a los dígitos que preceden a las decenas» es confusa y no se ajusta a la regla de la clase guiada (dos primeras cifras más uno). Si se muestra al alumno, reemplazarla por la regla de la clase.
5. **p6 `e01`, `e06`**: opciones como «1/100», «10/10», «30/10» dependen de cómo lea la voz las fracciones; verificar en el lector antes de dar por buenas.

## Pendientes y límites de esta revisión

- No se abrió el navegador de la aplicación ni se probó audio, móvil o movimiento reducido: la revisión visual fue por rasterizado headless de los SVG.
- No se tocó ningún archivo salvo este informe.

## Ronda 2

Revisor independiente. Verificado: lint 0 errores/5 avisos (descripcion-larga), validar-banco válido (2238 fichas, 27034 ejercicios), `tsc --noEmit` OK (pnpm no está en PATH; binarios locales). Comparado con HEAD por JSON: p1 solo `ejercicios` (enunciado/pistas/retroalimentacion, e01–e12) y `claseGuiada`; p3 solo `claseGuiada`; p4 solo `claseGuiada` y enunciado de e07, e09, e11, e12. Ids, dificultad, respuesta, opciones intactos; sin otras ediciones. SVG no cambiados; se rasterizó `cuadricula-pregunta` (coincide con alt/descripcion).

- `mat.p1.contar-hasta-10` — **APROBADA**. Defectos de ronda 1 resueltos (ejemplo 1 da «cuatro choclos»; contraejemplo coincide con el dibujo; descripcion de `choclos-contados` incluye el rótulo). e01–e12: enunciados coherentes, respuesta única, pistas únicas. Observación menor (no bloquea): pistas de e04/e08/e12 con «(lápiz, la biblioteca)», «(vaso, la cocina)», «(sombrero, la escuela)» suenan a plantilla; mejor «Toca la primera marca y di uno».
- `mat.p3.comparar-tres-cifras` — **APROBADA**. «Cifra» en lugar de «decenas/unidades» como cantidad; C, D y U explicadas en ejemplo 1 y en las descripciones. Sin defectos nuevos.
- `mat.p4.desplazamientos-cuadricula` — **CAMBIOS**. Resueltos: situación/alt/descripcion sin direcciones; contraejemplo presenta ficha y bandera; e09, e11, e12 ya traen convención y «(columna, fila)». Defecto: **e07** añade la convención de ejes pero no «(columna, fila)»; «(5, 5) → (5, 2)» sigue ambiguo (con (fila, columna) la respuesta sería «3 izquierda», no «3 abajo»). Corregir: añadir «Cada casilla se escribe (columna, fila).» a e07.

## Ronda 2 (segunda pasada: solo e07 de p4)
Revisor independiente. Técnico: lint 0 errores (solo 2 avisos descripcion-larga en p4 desplazamientos), validar-banco válido (2238 fichas, 27034 ejercicios), tsc --noEmit OK (binarios locales). Comparado con HEAD por JSON; SVG cambiados rasterizados con Chrome headless y vistos.

- **mat.p4.desplazamientos-cuadricula — APROBADA.** e07 trae «Cada casilla se escribe (columna, fila).»: (5, 5) → (5, 2) = «3 abajo», respuesta única; id, dificultad y respuesta intactos (en este lote solo cambian enunciados de e07, e09, e11, e12 y claseGuiada).
