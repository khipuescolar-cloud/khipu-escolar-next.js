# Revisión independiente · Primaria, Matemática, lote 45

Fecha: 2026-11-16. Revisor distinto del autor. Solo lectura sobre banco y recursos. Lote de 5 claves (no hay `mat.p3`).

## Resumen

| Clave | Veredicto |
|---|---|
| `mat.p1.delante-detras` | APROBADA |
| `mat.p2.cuantos-dias-faltan` | CAMBIOS (un solo ejercicio existente erróneo, e07; la clase guiada está bien) |
| `mat.p4.descomposicion-multiplicativa` | CAMBIOS (la bolsa de caramelos parece una pesa) |
| `mat.p5.desarrollo-prismas` | APROBADA (e11 con retroalimentación confusa: corrección recomendada, no bloquea la clase guiada) |
| `mat.p6.decimales-entre-decimales` | CAMBIOS (frase ambigua al oído en `mensajeCorrecto`) |

## Verificación técnica (E)

- `pnpm typecheck`: sin errores. `pnpm nudito:validar-banco`: «Banco válido: 2238 fichas activas; 27034 ejercicios».
- Comparado con HEAD por JSON: en las 5 claves solo difiere `claseGuiada`. Ejercicios, ids y respuestas intactos.
- Mecánico en las 5: `recursoRef` coincide 1 a 1 con los recursos; primer momento sin recurso; sin dígitos ni «parte N de M» en narraciones; sin título repetido; «dibujo/imagen/tarjeta» solo en momentos con recurso; alt de 47 a 136 caracteres (máx. 200); descripción de 132 a 315 (máx. 500); todos los SVG existen.
- Visual (D): los 25 SVG rasterizados en headless (Chrome) y vistos. Texto todo ≥ 26 px, sin `<tspan>`, todos con `<title>`, sin desbordes ni solapes, márgenes ≥ 28 px. Texto ámbar solo `#8A5A00`, turquesa de texto `#0C706E`, rojo `#B5412A` solo en errores; `#C98F1E` no aparece. `#0F7C7A` solo como relleno de figuras (con texto blanco). Cada dibujo coincide con su alt y descripción.

## Por clave

### mat.p1.delante-detras — APROBADA
Archivo: `src/lib/nudito/conocimiento/banco/matematica/primaria-1/fichas/ubicacion-y-recorridos.json`.

- Contenido: orden de las filas, sentido «a la derecha», Ema primera y Nina en el medio coinciden con los cuatro dibujos (panadería y autobús). Comprobación correcta (Paco, `a`); opciones de 4, 5 y 3 letras. Los 12 ejercicios se recalcularon: sin errores.
- Pedagogía: idea sin imagen, situación, dos ejemplos (guiado sin respuesta; razona con respuesta), contraejemplo de «contar de más», tres pasos. Los guiados no revelan nada.
- Nota menor (no bloquea): ej. 2 guiado dice cinco nombres seguidos al oído; el dibujo los muestra. Aceptable.
- Las figuras esquemáticas (cabeza de perfil y cuerpo) se leen como niños mirando a la derecha. Aceptables.

### mat.p2.cuantos-dias-faltan — CAMBIOS
Archivo: `src/lib/nudito/conocimiento/banco/matematica/primaria-2/fichas/medicion-masa-y-tiempo.json`.

1. **Ejercicio e07 (error real, afecta al alumno).** Enunciado: «Hoy es martes 12. El festival de danzas es dentro de 3 días. ¿Qué día de la semana será?». El banco guarda `respuesta: "jueves"` y `alternativasAceptadas: ["el jueves"]`. Martes más 3 días es **viernes**: la pista 3 («Miércoles, jueves, viernes: el tercer día…») y la retroalimentación («el tercero es el viernes») ya dicen viernes, así que el alumno que acierta queda como incorrecto y la propia pista lo contradice. Corrección mínima y exacta, solo dos campos: `respuesta` → `"viernes"` y `alternativasAceptadas` → `["el viernes"]`. No hace falta tocar enunciado, pistas ni retroalimentación (la alternativa «cambiar el enunciado a dentro de 2 días» obliga a reescribir pista 3 y retroalimentación: peor). Esa cadena aparece solo en este archivo (grep).
2. Resto de la clave sin defectos: calendario de abril de 2023 (sábado 1; martes 4, sábado 8, lunes 3, 10, jueves 13, viernes 14), comprobación (jueves 15 de junio a martes 20: viernes, sábado, domingo, lunes, martes = cinco, `c`; 11/9/10 letras) y los 11 ejercicios restantes recalculados: e01 5, e02 3, e03 V, e04 6, e05 14, e06 4, e08 3 semanas, e09 9, e10 23, e11 F, e12 2. Todos correctos.
3. Nit opcional e03: «falta 7 días» → «faltan 7 días». No bloquea.

### mat.p4.descomposicion-multiplicativa — CAMBIOS
Archivo: `src/lib/nudito/conocimiento/banco/matematica/primaria-4/fichas/c23-multiplicacion-division-calculo.json`; recurso `bolsas-pregunta` (`public/nudito/diagramas/matematica/descomposicion-multiplicativa-bolsas-pregunta.svg`).

1. **La bolsa de caramelos no es aceptable tal cual.** Es un trapecio con asa arriba y un «25» en el centro: es la silueta clásica de una pesa. En un ejercicio sobre cantidades, un niño de 4.º puede leer «25 kg» y no «25 caramelos» (la palabra «caramelos» va pequeña debajo). Corrección: redibujar como bolsa de tela con cuello atado (óvalo/saco redondeado con un lazo) y 2 o 3 caramelos envueltos sueltos, manteniendo el 25, el rótulo y el tamaño de texto; actualizar alt/descripcion solo si cambian palabras. Las figuras esquemáticas de los niños de p1 sí son aceptables; la bolsa no.
2. Todo lo demás correcto: 25×16 = 400 (25×4×4), 50×14 = 700 (50×2×7), 25×24 = 600; contraejemplo «parar en cien» coherente; «?» solo es la incógnita total en la situación y marca el paso que falta en el contraejemplo (valor no falso); comprobación `b`, opciones de 13/11/11 letras, la correcta no es la más larga; 12 ejercicios recalculados sin errores (25×8=200, 125×4=500, 25×28=700, 40×35=1400, 125×16=2000, 25×36=900, 48×125=6000, 75×24=1800, 20×45=900). Observación sin acción: en e06 y e10 la respuesta correcta tiene más cifras que los distractores; es inherente al cálculo.

### mat.p5.desarrollo-prismas — APROBADA
Archivo: `src/lib/nudito/conocimiento/banco/matematica/primaria-5/fichas/prismas-rectos.json`.

- Geometría verificada: la plantilla de caja (tira de cuatro con un rectángulo arriba y otro abajo de la primera cara, mismo ancho) es un desarrollo válido de un prisma rectangular; hexágono → seis laterales; triángulo → tres; pentágono → cinco; los dibujos coinciden con alt y descripción. La caja de «seis rectángulos» queda fuera del sesgo de «bases = dos de otro color» porque la situación no distingue colores.
- Guiado de ej. 2 sin recurso: aceptable, narra la plantilla con palabras y el dibujo aparece en el razona.
- Comprobación correcta (`c`, 18/16/17 letras).
- **e11 (recomendado, no bloquea la clase):** la retroalimentación «Confundir bases con laterales puede dar dos; falta 1 cara para llegar a cinco» no se entiende. Corrección mínima, solo `retroalimentacion`: «La plantilla completa tiene 2 + 3 = 5 caras. Ya hay 4, así que falta 1.» La respuesta (1) es correcta.
- Opcional: en e05 y e12 la correcta es la opción más larga por 3 a 10 letras (defecto de longitud en ejercicios existentes, fuera del alcance del lote).

### mat.p6.decimales-entre-decimales — CAMBIOS
Archivo: `src/lib/nudito/conocimiento/banco/matematica/primaria-6/fichas/argumentacion-numerica.json`.

1. **Comprobación, `mensajeCorrecto` ambiguo al oído (F).** Dice «…los extremos son siete coma sesenta y siete coma setenta. Siete coma sesenta y cinco queda en medio.». La voz lee «sesenta y siete coma setenta» y se oye como 67 (7,67), no como los extremos 7,60 y 7,70. Corrección: «Correcto. Escritos con centésimas, el primer extremo es siete coma sesenta y el segundo es siete coma setenta. Siete coma sesenta y cinco queda en medio.»
2. Recomendado (menor): `ejemplo-2-guiado` dice «entre tres coma cuarenta y cinco y tres coma cuarenta y seis». Se oye encadenado; usar «entre tres coma cuarenta y cinco, y tres coma cuarenta y seis», o «el primero… el segundo».
3. Todo lo demás correcto: 5,35 entre 5,30 y 5,40; 3,455 entre 3,450 y 3,460; 1,25 entre 1,20 y 1,30; 7,65 entre 7,60 y 7,70; las rectas de once marcas con punto en la sexta; sin marcas intermedias en la situación; comprobación `b`, opciones de 28/27/27 letras. 12 ejercicios recalculados: respuestas únicas y correctas (e05 3,47; e08 0,505; e11 2,485; e12 0,9995).

## Decisiones sobre lo reportado por el autor (G)

- **e07 de p2:** error real; corrección de dos campos arriba. El orquestador decide si la aplica (está fuera de `claseGuiada`).
- **e11 de p5:** corrección propuesta arriba; no cambia la respuesta.
- **Figuras esquemáticas:** niños aceptables; bolsa de p4 no aceptable (parece pesa), ver p4.1.

## Ronda 2

- **mat.p2.cuantos-dias-faltan — APROBADA.** e07: `respuesta` «viernes», `alternativasAceptadas` ["el viernes"], enunciado, id y dificultad intactos; pistas y retroalimentación coherentes con viernes; el enunciado aparece solo en esa ficha.
- **mat.p4.descomposicion-multiplicativa — APROBADA.** SVG final rasterizado: se lee como bolsa de tela atada con moño, con dos caramelos y el 25; ya no parece pesa. Alt, descripción y narración dicen «bolsa de tela amarilla». Nota menor sin bloqueo: los caramelos son óvalos sobre los hombros de la bolsa, sin puntas de envoltorio.
- **mat.p6.decimales-entre-decimales — APROBADA.** `mensajeCorrecto` dice «el primer extremo es siete coma sesenta y el segundo es siete coma setenta»; `ejemplo-2-guiado` en frases cortas («El primero es… El segundo es…»).
- `pnpm nudito:validar-banco` (2238 fichas, 27034 ejercicios) y `pnpm typecheck` sin errores.
