# Revisión independiente · Primaria, Matemática, lote 22

Fecha: 2026-11-16. Revisor distinto del autor. Solo lectura sobre banco y SVG.

## Verificaciones hechas

- Los 29 SVG se rasterizaron con Chrome headless (640x480) y se vieron uno por uno. Todos los textos son >= 26 px, no hay `<tspan>`, no hay desbordes ni solapes graves.
- Script: `recursoRef` resuelve en todos los momentos, 10 momentos por clave, primer momento sin recurso, títulos únicos, sin «parte N de M», sin «dibujo/imagen» en momentos sin recurso, sin dígitos en narración, alt <= 117 caracteres. Letras de comprobación: b, c, a, b, c, a (sin repetición consecutiva). Opciones con diferencia de longitud <= 2 y correcta nunca la más larga.
- Cuentas recalculadas: 4+3=7; 9-4=5; 10-4=6; 50+20=70; 60+4=64; 50-20=30; 13=1 decena+3; 235-70=165 (13-7=6 barras); 70 entre 60 y 80; 50 entre 40 y 60 con paso 20; 105 > 90 y < 180; 3.ª marca = 12, 5.ª = 20, 20-12=8; museo 12/8, granja 18/10, parque 6/20, dif. 14. Todas correctas. Valores dibujados coinciden con los datos (alturas medidas en los SVG).
- `pnpm typecheck`: sin errores. `pnpm nudito:validar-banco`: banco válido (2238 fichas, 27034 ejercicios).
- `git diff`: en las 6 claves solo se añade `claseGuiada` (los demás hunks de p1 son de otras claves y se ignoran).
- Columnas punteadas «?» de toda la altura del eje (p4 `diez-pregunta`, p6 `escala-pregunta`): válidas según el criterio ya aceptado en revision-lote-20 (altura completa, sin valor falso).

## Decisión sobre los dos casos dudosos del autor

- p3 `canje-pregunta`: el dibujo es aceptable (contar diez cuadritos ES la tarea, y la regla no está escrita en la imagen). El defecto está en el texto: `alt` y `descripcion` dicen «diez cuadritos» y entregan la respuesta a quien escucha. Ver p3 #1.
- p5 `agudo-pregunta`: el dibujo es aceptable en lo pedagógico (hay que mirar dónde queda el lado), pero tiene un defecto visual (el lado sobresale del arco) y la `descripcion` dice «sube dentro de la zona», que revela la respuesta. Ver p5 #1 y #2.

## Veredictos

| Clave | Veredicto |
|---|---|
| `mat.p1.aumenta-o-disminuye` | APROBADA |
| `mat.p2.calculo-con-decenas` | CAMBIOS |
| `mat.p3.canjes-c-d-u` | CAMBIOS |
| `mat.p4.barras-escala-10` | CAMBIOS |
| `mat.p5.clases-de-angulos` | CAMBIOS |
| `mat.p6.barras-dobles` | APROBADA |

### mat.p1.aumenta-o-disminuye — APROBADA

Matemática correcta, estructura idea→situación→2 ejemplos→contraejemplo→pasos→comprobación, imágenes coinciden con alt/descripcion (4 lápices + 3 punteados; 7 lápices 4 amarillos y 3 turquesa; 5 globos + 4 con equis; 6 galletas con 3 punteadas por recuadro). Ninguna imagen guiada revela la cuenta. Opciones legibles en audio. Sin defectos.

### mat.p2.calculo-con-decenas — CAMBIOS

1. `adicion-y-sustraccion-hasta-100.json`, recurso `unidades-pregunta`, campo `alt`: dice «rotulados sesenta y cuatro», pero el SVG rotula «60» y «4». Además suena a la respuesta de la pregunta «¿qué número se forma?». Cambiar a «rotulados sesenta y cuatro»→«rotulados con sesenta y con cuatro, con la pregunta qué número se forma» (mejor: «Seis barras de diez, marcadas 60, y cuatro cuadritos sueltos, marcados 4, con la pregunta qué número se forma»).
2. Momento `contraejemplo`: «escribir setecientos noventa para setenta más nueve» usa un número de tres cifras (fuera del rango «hasta 100» de 2.º) y no es un error natural. Reemplazar por un error de 2.º, p. ej. «Otro error es decir setenta y nueve como siete nueve, o sumar setenta más nueve y obtener ochenta y nueve; el nueve son unidades y van al final: setenta y nueve».

Resto correcto (60+4, 50+20, comprobación 50-20=30, c; 16/16/16 caracteres; los SVG coinciden con alt y descripción).

### mat.p3.canjes-c-d-u — CAMBIOS

1. Recurso `canje-pregunta` (`canjes-canje-pregunta.svg`), `alt` y `descripcion`: dicen «una barra de diez cuadritos» / «dividida en diez cuadritos» y entregan la respuesta de «¿cuántos cubitos hacen una barra?». Quitar el «diez»: «una barra alta dividida en cuadritos». El SVG se conserva igual (el conteo lo hace el alumno).
2. Recurso `desarmar-pregunta` (`canjes-desarmar-pregunta.svg`): los rótulos «3 barras» y «5 cubitos» quedan a ~13 px uno del otro y se leen casi como una sola línea. Separar (p. ej. acortar a «3 barras» con más margen o subir uno de los rótulos).
3. Momento `paso-2` (recurso `desarmar-solucion`): narra «diez cubitos por una barra, y diez barras por una placa», cosa que la imagen no muestra (la imagen es el camino inverso, placa → diez barras). Dejar el recurso solo si la narración dice «Si necesitas lo contrario, mira cómo desarmamos la placa», o quitar el `recursoRef` de ese momento.

Matemática correcta (235-70=165 con canje, 13 barras tras desarmar, 3 placas → 2 placas + 10 barras, a, 24/25/25).

### mat.p4.barras-escala-10 — CAMBIOS

1. Recurso `corta` (`barras-escala-diez-corta.svg`): la barra del básquet llega visualmente a ~60 en esa escala (tope de la barra a la altura del 60), pero el texto dice que vale 80. Valor falso en el dibujo. Hacer que la barra llegue hasta el borde superior del área (con una flecha hacia arriba o una marca de corte) para que no lea 60, y mantener «80 no cabe».
2. Recurso `juegos` (`barras-escala-diez-juegos.svg`): los rótulos «Ajedrez» y «Básquet» quedan a ~17 px y se leen pegados. Acortar el ancho o separar las barras.
3. Recurso `libros` (`barras-escala-diez-libros.svg`): la nota «70 queda entre 60 y 80» queda a ~25 px del borde inferior y pegada a «Miércoles». Subir el gráfico o la nota (menor).
4. Momento `paso-3` (recurso `juegos`): narra «si el dato queda entre dos marcas…», cosa que `juegos` no muestra (todos caen en marca). Usar `libros` o quitar esa frase del momento con imagen (menor).
5. Ejercicio existente `e06` («¿Qué escala es más cómoda?»): subjetivo. Ojo: «de 1 en 1» también deja todos los datos en marca, así que «justo en una marca» no basta. Corrección mínima: «¿Qué escala tiene pocas marcas y deja todos los datos justo en una marca?» (b única: 1 en 1 tiene demasiadas marcas, 3 en 3 no acierta 20, 40 ni 100, 100 en 100 deja 20, 40 y 60 entre marcas).

Matemática y comprobación correctas (50 con paso 20 → entre 40 y 60, b; 25/24/26).

### mat.p5.clases-de-angulos — CAMBIOS

1. Recursos `agudo-pregunta` y `agudo-solucion`: el lado del ángulo atraviesa el arco punteado y termina fuera del cuarto de círculo, aunque el texto dice «queda adentro». Acortar el lado para que termine dentro de la zona turquesa (o ampliar la zona), en ambos SVG.
2. Recurso `agudo-pregunta`, `descripcion`: «su otro lado sube dentro de la zona» revela la respuesta de la pregunta. Reescribir: «Un ángulo índigo comparte con ella el lado de abajo y su otro lado sube desde el vértice». Y `alt`: cambiar «si el otro lado queda adentro» por «si el otro lado queda adentro, igual o afuera».
3. Ejercicio `e01`: «grados sexagesimales… con exactitud» es vocabulario innecesario para 5.º y la voz lo leerá mal. Mínimo: «¿Cuántos grados mide un ángulo recto? Escribe solo el número.»
4. Ejercicio `e04`: «¿Qué denominación recibe un ángulo… comprendida entre 0° y 90°…?». Mínimo: «¿Cómo se llama un ángulo que mide entre 0° y 90°: agudo u obtuso?»; pista 2 «evoca una forma puntiaguda» puede quedarse.
5. Menor: en `situacion` el ángulo 2 es exactamente recto (90°) mientras la narración dice solo «se abre más»; es correcto, pero podría decirse «se abre más, como una esquina» o dejarse (no obligatorio).

Matemática correcta (obtuso = >90 y <180; 87° se parece al recto; 105° → obtuso, c; 24/24/23).

### mat.p6.barras-dobles — APROBADA

Gráficos y cálculos correctos (12/8, 18/10, 6/20; 20-6=14; comprobación 12 y 20 → 8, a; 15/17/15). Las alturas dibujadas coinciden con los datos; la leyenda y la escala común están en todos los gráficos; columnas «?» de altura completa sin valor falso. `excursiones-pregunta` no escribe los valores; el corchete 6-20 de `excursiones-parque` coincide con la descripción. Sin letras sueltas ni «parte N de M». Sin defectos bloqueantes. Menor opcional: en `libros` la etiqueta «14» queda a ~10 px de la leyenda.

## Resumen

APROBADAS: p1, p6. CAMBIOS: p2 (2 defectos), p3 (3), p4 (5), p5 (5). Ningún defecto matemático de fondo; los cambios son alt que revela, un contraejemplo fuera de grado, dos SVG con valor/inclusión falsa (p4 `corta`, p5 lados fuera del arco), rótulos pegados y dos ejercicios con vocabulario.

## Ronda 2

Fecha: 2026-11-16. Verificados los 4 defectos listados de ronda 1 por clave, git diff (fuera de `claseGuiada` solo cambian p4 `e06` y p5 `e01`/`e04` + retro de `e04`, ids/dificultad/respuestas intactos), 9 SVG modificados rasterizados con Chrome (texto >= 26 px, sin solapes ni desbordes), `pnpm nudito:validar-banco` (2238 fichas, 27034 ejercicios) y `pnpm typecheck` limpios.

| Clave | Veredicto |
|---|---|
| `mat.p2.calculo-con-decenas` | APROBADA |
| `mat.p3.canjes-c-d-u` | APROBADA |
| `mat.p4.barras-escala-10` | APROBADA |
| `mat.p5.clases-de-angulos` | APROBADA |

- p2: `alt` de `unidades-pregunta` coincide con el dibujo (60 y 4) y no da la respuesta; contraejemplo ahora en rango de 2.º.
- p3: `alt`/`descripcion` de `canje-pregunta` sin «diez»; rótulos de `desarmar-pregunta` separados; `paso-2` y `paso-3` coherentes (paso-2 sin recurso y sin «el dibujo»; paso-3 con `canje-trece`).
- p4: `corta` coincide con la descripción (barra de 80 a escala sobre eje que termina en 50, línea punteada, «80 no cabe»); `juegos` y `libros` sin pegado; `paso-3` sin recurso (menor: «Así quedó el gráfico de los juegos» sin imagen, aceptable); `e06` con b única (de 1 en 1 muchas marcas; de 3 en 3 no acierta 20/40/100; de 100 en 100 deja 20/40/60 entre marcas).
- p5: lado dentro de la zona en `agudo-pregunta` y `agudo-solucion`; `descripcion` sin revelar; `situacion` con 75° coherente («se abre más»); `e01` y `e04` con opciones/pistas/retro coherentes.
