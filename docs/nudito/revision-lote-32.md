# Revisión independiente · Primaria, Matemática, lote 32

Fecha: 2026-11-16. Revisor distinto del autor. Solo lectura sobre banco y SVG.

## Verificaciones técnicas

- `pnpm typecheck`: sin errores. `pnpm nudito:validar-banco`: válido (2238 fichas, 27034 ejercicios).
- Comparado con `HEAD` por JSON: en las 6 claves solo cambia `claseGuiada`; ejercicios y demás campos idénticos.
- Recursos: 24 en total (4 por clave), todos con archivo existente; cada `recursoRef` apunta a un recurso existente y todo recurso se usa; ningún id duplicado; cada SVG se referencia en un solo JSON (grep en `src`). No hay SVG huérfano con los prefijos del lote (los 4 `comparar-fracciones-heterogeneas-*` son de otro lote, p5). No hay duplicados ni restos del proceso Codex interrumpido.
- SVG: los 24 rasterizados con Chrome headless y vistos uno por uno. Texto mínimo 26 px, sin `<tspan>`, todos con `<title>`, sin desbordes ni solapes ni pegado al borde. Texto ámbar solo `#8A5A00`; turquesa `#0C706E`; ningún texto en `#C98F1E`. Barras y segmentos proporcionales a los datos (frutas 8/12/6/10, veinteavos 8/10/15).
- alt ≤117 caracteres, descripcion ≤301. Comprobaciones: letras b, a, a, c, c, b; diferencias de longitud ≤3 y la correcta nunca es la más larga; respuesta única.
- Aritmética recalculada: 420÷10=42; 150÷10=15; 3,5 kg=3500 g; 2,5 kg=2500 g; 1250 g=1,25 kg; 25>18; 2/3=8/12<9/12=3/4; 2/5=8/20<1/2=10/20<3/4=15/20; 5/6=15/18>14/18=7/9; 3/5=9/15<10/15=2/3.
- Ninguna de las 6 claves tiene «parte N de M», títulos repetidos ni dígitos o letras sueltas en la narración. Primer momento sin imagen en las 6.

## mat.p1.comparar-longitudes — CAMBIOS (menores)

1. `ejemplo-1-guiado`: «Las puntas de la izquierda tocan la misma línea de partida». En `lapices-alineados` la punta (amarilla) está a la derecha y la izquierda es el extremo plano. Cambiar a «Los extremos de la izquierda tocan la misma línea de partida».
2. `ejemplo-2-guiado`: la narración ya dice «La cinta termina antes», que es la respuesta que el momento pide pensar. Reescribir: «Tito pone una cinta y una soga desde el mismo borde de la mesa. Fíjate dónde termina cada una y piensa cuál recorre menos espacio».
3. `contraejemplo`: «También es un error doblar una cinta» no tiene apoyo visual (`error-inicio` no lo muestra). Aceptable; si se quiere, quitar la frase para no dejar una idea sin imagen.

Lo demás correcto: imágenes coinciden con alt y descripcion, la cinta roja (280) frente a la verde (340) y las reglas del «Así no» son coherentes (la que parece llegar más lejos es más corta).

## mat.p2.construir-con-cuerpos — CAMBIOS

1. La situación (`puente-pregunta`) pregunta qué pieza va sobre las columnas y nunca se responde. `paso-2` reutiliza esa imagen sin cerrarla. Añadir en `paso-2`: «Para el puente sirve el bloque largo: tiene cara plana y se apoya en las dos columnas».
2. `base-error`, alt: dice «una torre derecha apoyada sobre un cubo»; el dibujo y la descripcion muestran un bloque rectangular ancho (no un cubo). Cambiar «cubo» por «bloque» en el alt.
3. Opcional: `comprobacion.pista` («Piensa en un gorro de fiesta») prácticamente nombra el cono, y el enunciado ya dice «punta arriba». Cambiar la pista a «Busca el cuerpo que termina en punta». No bloqueante.

Lo demás correcto (secuencia, casita, carrito, respuesta única, opciones de 7/7/10).

## mat.p3.dividir-por-10 — APROBADA

Matemática correcta y sin revelaciones (`bolsas-pregunta` sin resultado; ninguna imagen anticipa el seis ni el quince). Imágenes y narración coinciden. Contraejemplos correctos (ochenta menos diez es setenta; olvidar que la centena son diez decenas). Comprobación única (42; distractores 400 y 52 plausibles), opciones 21/20/22. Nota no bloqueante: `ejemplo-1-guiado` repite la imagen de la situación; está bien.

## mat.p4.conclusiones-graficos — APROBADA

Contenido correcto, contraejemplo pertinente y sin conceptos no trabajados, SVG coherentes (barras proporcionales a 8/12/6/10; sin números en `frutas-pregunta`). Comprobación única (c, 25/27/25). Nota no bloqueante: `ejemplo-1-guiado` usa `frutas-pregunta`; las alturas se ven pero la pregunta del momento la dan los datos de la narración, no el dibujo.

## mat.p5.convertir-kg-g — APROBADA

Matemática y secuencia correctas; esquema `sentido` coincide con el contraejemplo; comprobación única (c; la más larga es la a, que es incorrecta; 28/26/26). Marcador «? g» de la balanza no fija valor. Observación no bloqueante: `paso-3` («comprueba el sentido») usa `balanza-pregunta`, con el signo de pregunta. Mejor `sentido` o `mangos`; solo cambiar el `recursoRef` si el orquestador quiere afinar.

## mat.p6.comparar-ordenar-fracciones — CAMBIOS

1. `tiras-pregunta.svg`: el título dice «Dos porciones iguales», que se lee como «las porciones son iguales» (justo la respuesta falsa) y contradice la pregunta «¿Cuál porción es mayor?». Cambiar el título a «Dos tiras del mismo largo» y ajustar la descripcion si se desea («Dos tiras horizontales tienen la misma longitud»; ya lo dice).
2. `idea`: «o una misma recta numérica» (también en `ideaCentral` del banco): la ficha no trabaja la recta. Quitar de la `idea` de la clase guiada: «Usa un denominador común. Después compara los numeradores y justifica el orden».
3. `contraejemplo`: plantea tres quintos y dos tercios, pero no cierra el error. Añadir: «Con quince avos, tres quintos son nueve quinceavos y dos tercios son diez quinceavos. Gana dos tercios». (O al menos decir qué fracción es mayor.)
4. Observación no bloqueante: `tiras-pregunta` deja ver a ojo que 3/4 es mayor (tiras coloreadas 300 frente a 340). Es una representación honesta y la narración advierte que las partes no miden igual; se acepta.

Lo demás correcto: aritmética de 12 y 20; comprobación única (b; 13/12/11); «dieciochoavos» en el mensaje es largo pero legible para la voz.

## Ejercicios existentes señalados por el autor (no editados)

- **P1 e05** (puntos `|●●●●●` en el enunciado): afecta al alumno con lector de pantalla (lee «círculo negro» cinco y siete veces). Corrección mínima: «Tira A: cinco puntos después de la línea. Tira B: siete puntos después de la línea. ¿Cuál es más larga?» y quitar la pista 2 que repite el recuento. Prioridad media.
- **P1 e09–e11** (restar marcas): matemáticamente correctos (8 y 6; 7 y 8; 8 y 5, respuesta única). Exigentes para 1.º y además contradicen la ficha, que enseña a alinear el comienzo. Corrección mínima: conservarlos con dificultad 3 y, si se quiere, e09 con números más pequeños (lápiz de 0 a 6 y otro de 2 a 7). No bloquea el lote. Prioridad baja.
- **P2 e05** (pelota frente a dado): la respuesta es única en el contexto del grado (cara plana abajo) y coincide con la ficha. Solo reformular el enunciado a «¿Qué pieza pones de cabeza para que quede firme y no ruede?». Prioridad baja.
- **P4 e09–e11** (puntos ●): afecta con lector de pantalla (veinte círculos). Corrección mínima: escribir los datos como «lunes cuatro puntos, martes siete puntos, miércoles tres puntos, jueves seis puntos» y dejar «(cada punto vale 5 soles)». Prioridad media.
- **P4 e11, defecto adicional** (el autor no lo mencionó): la opción correcta `a` es la más larga (73 caracteres frente a 30–35 de las demás) y además mueve la pista «35 y 30 pasan de 25». Corrección mínima: acortar a «Martes y jueves vendieron más de 25 soles» o alargar los distractores. Prioridad media.

## Resumen

- APROBADAS: mat.p3.dividir-por-10, mat.p4.conclusiones-graficos, mat.p5.convertir-kg-g.
- CAMBIOS (menores, sin errores matemáticos): mat.p1.comparar-longitudes (2 correcciones de narración), mat.p2.construir-con-cuerpos (cerrar la situación y alt), mat.p6.comparar-ordenar-fracciones (título del SVG, recta numérica, contraejemplo incompleto).

## Ronda 2

Verificado contra `HEAD`: en las 3 claves solo cambia `claseGuiada` (ejercicios intactos). `pnpm nudito:validar-banco` válido (2238 fichas, 27034 ejercicios); `pnpm typecheck` sin errores. SVG `tiras-pregunta` rasterizado con Chrome headless: rótulo visible «Dos tiras del mismo largo», sin desbordes (el `<title>` interno es «Dos tiras iguales divididas en tercios y en cuartos»: aceptable, no sugiere igualdad de porciones).

- mat.p1.comparar-longitudes — APROBADA. `ejemplo-1-guiado` dice «Un extremo de cada lápiz»; `ejemplo-2-guiado` ya no entrega la respuesta («Pensemos cuál recorre menos espacio»). Sin defectos nuevos.
- mat.p2.construir-con-cuerpos — APROBADA. `paso-2` cierra el puente con «el bloque largo»; alt de `base-error` dice «bloque rectangular»; pista «sombrero de cumpleaños» no nombra el cono. Sin defectos nuevos.
- mat.p6.comparar-ordenar-fracciones — APROBADA. Rótulo del SVG corregido; `idea` sin recta numérica; contraejemplo cerrado (9/15 < 10/15, dos tercios mayor: correcto). Sin defectos nuevos.
