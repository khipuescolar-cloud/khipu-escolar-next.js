# Revisión final del pulido (2026-11-16)

Alcance: 35 claves del lint mecánico y del barrido de menores.

Comprobaciones:
- `nudito-lint-clase-guiada` sobre las 35 claves: 0 errores, 94 avisos.
- `pnpm nudito:validar-banco`: válido (2238 fichas, 27034 ejercicios).
- `tsc --noEmit`: sin errores.
- Comparación con HEAD de los ejercicios: solo cambian enunciado, opciones (texto), pistas, retroalimentación y un nombre. No cambia ningún id, dificultad ni respuesta correcta.
- Límite: HEAD no contiene `claseGuiada` de ninguna de las 35 fichas, así que su cambio no se pudo aislar; se revisó el contenido completo (comprobación, fugas de la respuesta en la narración, `recursoRef`, títulos repetidos). El HEAD también es anterior a otras ediciones aprobadas, por lo que algunos ejercicios con diferencias no figuran en la tabla de menores (p. ej. `cyt.p2.animales-diurnos-y-nocturnos` e12, `cyt.p5.agua-dulce-salada` e10, `cyt.p6.alimentos-transgenicos` e06). Su contenido es correcto y coherente.
- Los 9 SVG (`solvente-se-disuelve-o-no`, `agua-dulce-salada-cien`, `agua-dulce-salada-reparto`, `alternativas-sostenibles-tres-erres`, `indicadores-escala-colores`, `agentes-relieve-levanta-desgasta`, `agentes-relieve-clasificacion`, `transgenicos-gen-pasa`, `transgenicos-cruce-vs-gen`): un `<title>` cada uno, igual al `aria-label` y coherente con el alt y la descripción de su ficha. Se rasterizaron 3 (`agua-dulce-salada-cien`, `indicadores-escala-colores`, `transgenicos-cruce-vs-gen`) y coinciden con lo descrito.

| Clave | Veredicto | Defecto / nota |
|---|---|---|
| `com.p2.comentar-lo-que-dice-otro` | APROBADA |  |
| `cyt.p2.agua-dulce-y-salada` | APROBADA |  |
| `cyt.p2.animales-diurnos-y-nocturnos` | APROBADA |  |
| `cyt.p2.cadena-alimenticia` | APROBADA |  |
| `cyt.p2.cerros-montanas-valles` | APROBADA |  |
| `cyt.p3.actividades-segun-la-epoca` | CAMBIOS | Ejercicio e10 (opción b «Que cambia a la época de lluvias y se necesitan botas», 53 caracteres vs 36 y 34): la correcta es claramente la más larga; igualar longitud de opciones. |
| `cyt.p5.agua-como-solvente` | APROBADA |  |
| `cyt.p5.agua-dulce-salada` | APROBADA |  |
| `cyt.p5.alternativas-sostenibles` | APROBADA |  |
| `cyt.p6.acidos-bases-indicadores` | APROBADA |  |
| `cyt.p6.agentes-internos-externos` | APROBADA |  |
| `cyt.p6.alimentos-transgenicos` | APROBADA |  |
| `mat.p1.al-lado-cerca-lejos` | CAMBIOS | Comprobación: «la escuela está a muchos pasos… la panadería a dos pasos. ¿Qué está lejos?» da la respuesta en el enunciado; además la correcta es la opción más larga. |
| `mat.p1.alto-bajo` | CAMBIOS | Comprobación: el enunciado dice «La mochila llega menos arriba que la mesa» y pregunta «¿Qué cosa es más baja?»; reformula la definición, no hay inferencia (revela la respuesta). |
| `mat.p1.arriba-abajo` | APROBADA |  |
| `mat.p1.comparar-hasta-20` | APROBADA |  |
| `mat.p1.comparar-longitudes` | CAMBIOS | Comprobación: «La azul llega más lejos que la roja. ¿Cuál tira es más larga?» da la respuesta en el enunciado; plantear los extremos sin concluir. |
| `mat.p2.calendario` | APROBADA |  |
| `mat.p2.caras-y-puntas` | APROBADA |  |
| `mat.p3.asociativa-adicion` | APROBADA |  |
| `mat.p3.barras-horizontales` | APROBADA |  |
| `mat.p3.canjes-c-d-u` | APROBADA |  |
| `mat.p3.colecciones-equivalentes` | APROBADA |  |
| `mat.p4.amplificar-fracciones` | APROBADA |  |
| `mat.p4.barras-escala-10` | APROBADA |  |
| `mat.p4.cancelativa-igualdad` | CAMBIOS | Ejercicio e07 (V/F): «…por eso la igualdad … no es verdadera» con respuesta Verdadero y retroalimentación «Es verdadera la afirmación… es falsa» = doble negación confusa para 4.º; el enunciado además trae el razonamiento resuelto. |
| `mat.p4.conclusiones-graficos` | APROBADA |  |
| `mat.p4.conmutativa-multiplicacion` | APROBADA |  |
| `mat.p4.encuestas-entrevistas` | APROBADA |  |
| `mat.p4.justificar-comparaciones` | APROBADA |  |
| `mat.p5.area-figuras-compuestas` | APROBADA |  |
| `mat.p5.patrones-graficos-5` | APROBADA |  |
| `mat.p6.area-paralelogramo` | APROBADA | aviso de longitud (dif. 5) y unidad «cm cuadrados» mezclada con «centímetros cuadrados»: menor, no bloquea. |
| `mat.p6.barras-dobles` | APROBADA |  |
| `mat.p6.comparacion-multiplicativa` | APROBADA |  |

## Ronda 2

Lint de las 5 claves: 0 errores (14 avisos, solo svg-fill/descripción larga ya conocidos). `nudito:validar-banco`: válido (2238 fichas, 27034 ejercicios).

| Clave | Veredicto | Nota |
|---|---|---|
| `cyt.p3.actividades-segun-la-epoca` | APROBADA | e10: opción b acortada (35 car.), ya no es la más larga; respuesta única `b`; id/dificultad intactos. |
| `mat.p1.alto-bajo` | APROBADA | Comprobación por inferencia (rodilla/cintura); correcta no la más larga; pista no entrega la respuesta. |
| `mat.p1.comparar-longitudes` | APROBADA | Se plantean extremos (5 y 9) sin concluir; opciones de longitud pareja; respuesta única. |
| `mat.p1.al-lado-cerca-lejos` | APROBADA | Enunciado no enuncia la respuesta; opciones parejas (correcta empata, no es la más larga); pista no la entrega. |
| `mat.p4.cancelativa-igualdad` | APROBADA | e07 afirmado directamente («es verdadera»), respuesta Falso coherente con pistas y retroalimentación; sin doble negación; id/dificultad intactos. |
