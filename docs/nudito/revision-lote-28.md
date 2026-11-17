# Revisión independiente · Primaria, Matemática, lote 28

Revisor independiente (no escribió el lote). Solo lectura sobre banco y recursos. Se recalculó todo, se leyeron los 6 `claseGuiada` completos y los 72 ejercicios, y se rasterizaron con Chrome headless y se vieron los 30 SVG del lote.

## Resumen

| Clave | Veredicto |
|---|---|
| mat.p1.calendario-mes | APROBADA |
| mat.p2.combinaciones-basicas | APROBADA |
| mat.p3.calendario | APROBADA |
| mat.p4.compensacion-suma-resta | APROBADA |
| mat.p5.clasificar-cuadrilateros | CAMBIOS |
| mat.p6.comparacion-multiplicativa | APROBADA |

Técnico (E): `pnpm typecheck` sin errores; `pnpm nudito:validar-banco` válido (2238 fichas, 27034 ejercicios). Comparado con HEAD por JSON, en las 6 claves solo cambió `claseGuiada`; ejercicios intactos. Alt ≤ 200 y descripcion ≤ 500 en todos (máx. 365). Primer momento sin recurso en las 6. Sin `<tspan>` ni `font-size` < 26 en los 30 SVG; sin `#C98F1E` (el texto ámbar es `#8A5A00`). Sin «parte N de M» ni títulos repetidos. Los dígitos que detecta un regex en las narraciones son solo los de los títulos «Ejemplo 1», «Paso 1», que son convención.

Verificación matemática: 599+235=834; 640−297=343; 530−298=232; 499+237=736; 7+6=13; 13−5=8; 11−5=6; 8→19=11 días; 9/16/23/30 de setiembre 2026 son miércoles (1 de setiembre es martes); 27 de setiembre + 7 = 4 de octubre; 28 de abril + 5 = 3 de mayo; 17 de junio 2026 es miércoles (1 de junio es lunes); 9→13 = 4 días; 6×9=54; 56÷7=8; 5×8=40; 80÷4=20. Todo correcto. Respuesta correcta única en las 6 comprobaciones; letras b, a, c, b, c, a; diferencia máxima de longitud de opciones 3 (p3: «Tres de mayo» 12, «Cuatro de mayo» 14, «Dos de mayo» 11), la correcta nunca es la más larga.

## mat.p1.calendario-mes (medicion-masa-y-tiempo.json) — APROBADA

Sin defectos bloqueantes. Los 5 SVG coinciden con alt y descripcion (columna del miércoles = 3, 10, 17, 24; contar = 10 a 13 en turquesa; errores: 4 círculos rojos «Mal», «hoy» + 3 turquesa «Bien»). Contraste, márgenes y tamaños correctos.

Observaciones no bloqueantes:
1. Pregunta del orquestador (respuesta deducible por la cabecera de columna en `dia-pregunta`): **aceptable**. La destreza que enseña la ficha es justamente leer el día de la semana subiendo por la columna; `dia-pregunta` no escribe «miércoles», solo la sigla «Mi» en la cabecera, que el alumno debe buscar él mismo. No requiere corrección.
2. Los pasos 1-2 (día de la semana) y el paso 3 (cuántos faltan) mezclan dos tareas distintas; es coherente con los dos ejemplos y no confunde. Opcional: nada.

## mat.p2.combinaciones-basicas (adicion-y-sustraccion-hasta-100.json) — APROBADA

Sin defectos bloqueantes. Los marcos de diez coinciden con alt/descripcion (7 rojas + 6 verdes; lleno 7 rojas + 3 verdes y otro con 3; trece menos cinco igual ?; barra 13 = 5 + 8; contraejemplo con ficha de aro amarillo «ya se usó»). `resta-pregunta` no revela el 8. `recursoRef` coherentes.

Observaciones menores (opcionales):
1. `diez-pregunta`, `resta-pregunta`: el tercio inferior del lienzo queda vacío. Estético, no corregir.
2. `errores`: el «9» de «9 + 4» no se dibuja como fichas (solo las 4 fichas); coincide con alt/descripcion. Aceptable.

## mat.p3.calendario (c23-masa-tiempo.json) — APROBADA

Sin defectos bloqueantes. Setiembre arranca en martes (casilla de lunes vacía) y las fechas 8, 19, 9, 30 y la columna Mi coinciden con alt/descripcion. `saltos` y `errores` correctos; «concurso» a ~52 px del borde derecho, aceptable.

Observación pedida por el orquestador:
1. `fecha-pregunta` (ejemplo-2-guiado): la cabecera «Mi» sobre el 30 permite deducir la respuesta sin avanzar de siete en siete. **Aceptable**: el propio concepto de la ficha es que las fechas separadas por siete caen en la misma columna, el dato conocido se da en la narración («el nueve es miércoles») y `semanas` luego muestra exactamente esa columna. No se puede quitar la cabecera sin falsear un calendario. Corrección mínima opcional (no bloqueante): en la narración de `ejemplo-2-guiado`, cambiar «Prueba avanzando de siete en siete desde el nueve y fíjate qué fechas vas tocando» por «Antes de mirar los nombres de arriba, avanza de siete en siete desde el nueve y fíjate qué fechas tocas».

## mat.p4.compensacion-suma-resta (c23-suma-resta-cuatro-cifras.json) — APROBADA

Sin defectos bloqueantes. Proporciones de barra razonables (599:235 y 297:640 a escala), arco rojo y arco turquesa de `errores` sin solapes, `resta-compensada` legible. Los «?» no tienen valor falso. Comprobación con respuesta única (736); distractores 737 y 738 casi iguales al oído pero distinguibles.

Observación pedida por el orquestador:
1. Piezas amarillas de «1» (`suma-compensada`) y «3» (`resta-compensada`) no están a escala (se ven ~1/12 y ~1/7 de la barra). **No engañan de forma material**: están rotuladas («1 de más», «3 de más»), la descripcion las llama «estrecha» y en ningún momento se compara su tamaño con el resto. Corrección mínima opcional: añadir al final de la descripcion de ambos recursos «La pieza amarilla se dibuja más ancha para poder leerla.» (hay margen: 365 de 500 caracteres).

## mat.p5.clasificar-cuadrilateros (cuadrilateros-y-angulos.json) — CAMBIOS

Los 5 SVG coinciden con alt/descripcion (ventana sin marcas; paralelogramo con flechas simples y dobles; terreno con lados superior e inferior convergiendo a la derecha y costados no paralelos; trapecio con piernas que se cruzan arriba; tres familias, con trapecio y trapezoide verificados como no engañosos). Sin desbordes ni solapes.

Defectos:
1. `ejemplo-2-guiado` (sin recurso): la narración dice «un terreno de cuatro lados desiguales, cuyos lados se inclinan en direcciones diferentes» y pregunta «¿Cuántos pares de lados paralelos tendrá?». «Se inclinan en direcciones diferentes» es la respuesta (ningún par), así que la pregunta no se piensa, se lee (defecto C2/C4). Corregir: quitar esa cláusula, p. ej. «Ahora imagina un terreno de cuatro lados, todos de distinto largo. Para saber si dos lados son paralelos, podemos prolongarlos con rayas y ver si se cruzan. ¿Qué pares de lados revisarías? ¿A qué familia crees que pertenece?». (Con lados de distinto largo no se deduce nada: un trapecio también los puede tener.)
2. `ventana-pregunta`, descripcion: «No lleva marcas ni rótulos» es falso, el SVG tiene el rótulo «Una ventana inclinada» arriba. Corregir a «No lleva marcas.» (alt «sin marcas» ya es correcto).
3. `paso-2`: «Las marcas iguales en dos lados te dicen que son paralelos entre sí». En el dibujo son puntas de flecha (así lo dice la descripcion de `ventana-pares`); «marcas iguales» se confunde con la convención de lados de igual longitud. Corregir: «Las puntas de flecha iguales en dos lados te dicen que son paralelos entre sí.» Mismo ajuste conviene en `ejemplo-1-razona` («llevan una marca» → «llevan una punta de flecha», «dos marcas» → «dos puntas de flecha») para que la voz coincida con la descripcion.

Observaciones sobre ejercicios (G), no bloquean el lote:
4. e03, pista 3 «Su nombre termina en el sufijo -oide»: casi entrega la respuesta y además también vale para «Romboide» (opción d). Está en la última pista, tras dos pistas que ya descartan paralelogramo y trapecio. Corrección mínima: reemplazarla por «Es el único cuadrilátero de esta lista que no tiene ningún par de lados paralelos.» (o dejarla; riesgo bajo).
5. e08: la respuesta canónica es «rectangulo» sin tilde. No afecta al alumno: el evaluador normaliza tildes (`normalizarFlexible`) y `rectángulo` también figura en `alternativasAceptadas`. Si se desea, cambiar `respuesta` a «rectángulo» para que la solución mostrada lleve tilde (retroalimentación ya la lleva).
6. e09 (existente, no tocado): la opción correcta b es la más larga por más de 3 caracteres (62 frente a 37-56). Fuera del alcance de este lote, pero conviene anotar para la revisión de ejercicios.

## mat.p6.comparacion-multiplicativa (numeros-naturales-y-operaciones.json) — APROBADA

Sin defectos bloqueantes. Los 5 SVG coinciden con alt/descripcion (barra de Pablo ~6 veces el bloque de Sara; bodega ~1/7 del mercado; 7 bloques de ocho con el primero amarillo; mal 8+5 con barra corta, bien 5 bloques de ocho). Los «?» son bloques/barras de rayas sin valor falso. La comprobación tiene respuesta única, la correcta es la más corta (19 caracteres frente a 22).

Observaciones (G):
1. «Veces más» = multiplicar (e06: 4 veces más que 24 = 96): es la convención de toda la ficha (e01 «2 veces más» → 36, e03, e10, e11) y de la clase guiada, que la enseña con bloques y con «veces menos» = dividir. No hay error. Riesgo real pero bajo: algunos textos leen «4 veces más» como 5 veces. No corregir el banco; si el orquestador quiere blindarlo, reformular solo el enunciado de e06 a «4 veces lo que tiene Julia» (afecta una pregunta, no la respuesta).
2. e10, opción d «Debió sumar 15 cuatro veces más y tener 75 soles» es justo la lectura alternativa (15 + 4 × 15), que bajo esa convención sería «correcta». Un alumno que sepa esa lectura quedaría penalizado. Corrección mínima: reemplazar d por «Debió multiplicar 4 por 4 y tener 16 soles» (distractor de otro tipo, sin ambigüedad).
3. e05: el enunciado «¿Cuántas veces los puntos de A tiene B?» es forzado; mejor «¿Cuántas veces más puntos que A tiene B?» ... pero eso introduce la ambigüedad anterior; mejor «¿Por cuánto hay que multiplicar los puntos de A para obtener los de B?». Opcional.

## Respuestas a los riesgos señalados por el autor

- p1/p3, respuesta deducible de la cabecera: aceptable (ver arriba).
- p4, piezas de uno y de tres no a escala: no engañan; nota opcional en la descripcion.
- p5 e03 pista, p5 e08 sin tilde, p6 «veces más»: ver G arriba; ninguna afecta a la corrección del juicio del alumno, salvo la opción d de p6 e10 (ambigüedad real, corrección mínima propuesta).
- p1 e01-e04 con calendario de mayo frente a junio de la clase guiada: sin conflicto.

## Ronda 2 — mat.p5.clasificar-cuadrilateros — APROBADA

Verificados los 3 defectos de ronda 1: (1) `ejemplo-2-guiado` ya no da la respuesta (habla de lados de distinto largo y de prolongarlos con rayas; no deduce el número de pares); (2) descripcion de `ventana-pregunta` dice «No lleva marcas.» y coincide con el SVG rasterizado (solo título y cuadrilátero); (3) «puntas de flecha» en `ejemplo-1-razona`, `paso-2` y `contraejemplo`, coherente con `ventana-pares` y `errores` (chevrones turquesa y azules visibles). Sin defectos nuevos: recursoRef válidos, narración acorde a los recursos, comprobación de opciones de longitud pareja, vocabulario oral correcto. `pnpm nudito:validar-banco` OK (2238 fichas, 27034 ejercicios); `pnpm typecheck` OK. Nota: el diff del archivo contra HEAD incluye también retoques de enunciados de otra ficha (ángulos) ajenos a esta ronda; no se pudo aislar frente a la ronda 1 sin git histórico del lote.
