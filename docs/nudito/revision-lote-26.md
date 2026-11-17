# Revisión independiente · Primaria, Matemática, lote 26

Fecha: 2026-11-16. Revisor distinto del autor. Solo lectura sobre banco y recursos.

## Resumen

| Clave | Veredicto |
|---|---|
| `mat.p1.arriba-abajo` | CAMBIOS |
| `mat.p2.afirmaciones-comparacion` | APROBADA |
| `mat.p3.barras-horizontales` | APROBADA |
| `mat.p4.clasificar-poligonos-lados` | CAMBIOS |
| `mat.p5.area-perimetro-relacion` | APROBADA |
| `mat.p6.area-figuras-compuestas` | CAMBIOS |

Las tres con cambios necesitan correcciones pequeñas (texto de alt/descripción/narración y un SVG). Ninguna toca matemáticas: todas las cuentas del lote y de los ejercicios existentes están bien.

## Verificación técnica (E)

- `pnpm typecheck`: sin errores. `pnpm nudito:validar-banco`: «Banco válido: 2238 fichas activas; 27034 ejercicios».
- Comparado con `HEAD` por JSON, clave por clave: en las 6 solo cambia `claseGuiada` (en `HEAD` no existía). Ejercicios, ids y respuestas intactos.
- Los 30 SVG existen, tienen `viewBox 0 0 640 480`, sin `<tspan>`, todo `<text>` con `font-size` mayor o igual a 26, rojo `#B5412A` solo en rótulos de error, ningún texto en ámbar. Recursos referenciados = recursos definidos (todos usados); primer momento sin recurso; sin dígitos en narración, alt ni descripción; sin «parte N de M»; sin «dibujo/imagen» en momentos sin recurso; títulos no repetidos en la narración; alt máx 160; descripción máx 311.
- Letras correctas de la comprobación: b, c, a, b, c, a. Diferencia máxima de longitud 3 (p2, p5) y la correcta nunca es la más larga.
- Cuentas recalculadas y correctas: 67 > 59, 45 < 54, 83 > 80, 36 < 41, 72 > 69; 12 m² con perímetros 14 y 16; 16 baldosas con perímetros 16 y 20; 1 × 12 con 26; 24 + 6 = 30; 40 − 3 = 37; 36 + 9 = 45; 2 × 9 (22) frente a 3 × 6 (18). Escala de los SVG de p6 proporcional (40 px por metro en el mural, 44 en el patio).

## mat.p1.arriba-abajo — CAMBIOS

Archivo: `src/lib/nudito/conocimiento/banco/matematica/primaria-1/fichas/ubicacion-y-recorridos.json`.

1. Recurso `patio-pregunta` (alt, descripcion y `aria-label` del SVG): dicen que el gato está «sentado» y «sobre una franja de pasto». En el SVG el gato va de perfil, echado o caminando con la cola alzada, y la franja es celeste claro, no pasto. Corregir texto: «un gato oscuro echado sobre una franja clara» (o redibujar el gato sentado). Además el pájaro está sobre la copa y no «en» el árbol; el `aria-label` del SVG ya dice «sobre la copa», alinear alt y descripcion.
2. Recurso `agachado`: la figura tiene el torso vertical y una pierna estirada hacia delante sobre el piso; se lee como persona sentada, no agachada con rodillas dobladas. Alt y descripcion («agachada, con las rodillas dobladas») no coinciden con el dibujo. Redibujar con las rodillas dobladas y los pies en el piso, o cambiar alt, descripcion y la narración del contraejemplo a «sentada».
3. Momento `contraejemplo`, última oración: «Otro error es pensar que arriba es solo lo que está en la pared». Es un error inventado, no trabajado ni dibujado, y confuso para 1.º. Borrar la oración.
4. (Menor, F) Ejercicios existentes e06 («5.° escalón», «2.° escalón») y e09 (opciones ★ ● ▲) se leerán mal o nada en audio. Ver G.

Lo demás bien: idea sin imagen, patio (pregunta sin respuesta), cuerpo, edificio pregunta y resuelto coinciden con alt y descripcion; comprobación con opciones 9/8/7 caracteres.

## mat.p2.afirmaciones-comparacion — APROBADA

Archivo: `primaria-2/fichas/numeracion-hasta-100.json`. Sin defectos bloqueantes. Bloques correctos en las cinco imágenes (6 barras y 7 cubitos, 5 y 9, 4 y 5, 5 y 4, 8 y 3, 8 y 0, 3 y 6, 4 y 1); el recuadro turquesa de `rosa-unidades` y los rojos de `errores` coinciden con alt y descripcion; las dos imágenes «pregunta» no revelan el resultado. Notas no bloqueantes:

1. Los `aria-label` internos de varios SVG difieren del alt del banco (más largos). No afecta si se muestran con `<img alt>`; conviene igualarlos.
2. Existentes e03 y e08: ver G.

## mat.p3.barras-horizontales — APROBADA

Archivo: `primaria-3/fichas/c25-datos.json`. Sin defectos bloqueantes. Gráficos con barras exactas (mango 5, piña 3, uva 4; aguaje 6, camu camu 2; fútbol 0-6, vóley 2-6 con hueco rojo); `tabla-pregunta` y `belen-pregunta` sin eje ni barras. Notas:

1. Descripciones de `frutas-barras` (307) y `errores` (311) repiten lo que ya dice la narración del momento (nombres a la izquierda, eje abajo, «cada cuadradito vale un voto»). Como se leen justo después de la narración, recortar las frases repetidas si se quiere audio más ágil (ver G).
2. Existentes e07, e08, e04, e05, e11: ver G.

## mat.p4.clasificar-poligonos-lados — CAMBIOS

Archivo: `primaria-4/fichas/poligonos.json`.

1. Recurso `errores` (momento `contraejemplo`): la tercera figura se ve como un cuadrado girado (lados de 102 a 117 px, esquinas casi rectas), no como «figura irregular». El alumno ve dos «cuadrados» y la frase «aunque solo una sea cuadrada» no se sostiene visualmente; falla el contraejemplo («no todo cuadrilátero es cuadrado»). Redibujar la tercera como un cuadrilátero claramente irregular (trapecio o cometa) y mantener «figura irregular» en alt y descripcion.
2. Mismo recurso: el `aria-label` del SVG dice «figura irregular naranja»; el color real es rosado (la descripcion dice rosada). Igualar.
3. Momento `ejemplo-2-razona`: «aunque no se parezca a una celda de panal» es una referencia innecesaria que el alumno de 4.º no necesita para contar lados; quitarla o reemplazarla por «aunque tenga forma de ele».

Lo demás bien: `figuras-pregunta` (triángulo, rectángulo, pentágono, hexágono, sin rótulos) y `casita-lados`/`patio-lados` (numeración 1 a 5 y 1 a 6 coincide con la descripcion, 6 lados reales en el patio en ele); comprobación 9/8/9.

## mat.p5.area-perimetro-relacion — APROBADA

Archivo: `primaria-5/fichas/perimetro-y-superficie.json`. Sin defectos bloqueantes. Cuadrículas correctas (3 × 4 con 12 celdas, 2 × 6 con 12, 4 × 4 con 16, 2 × 8 con 16, 1 × 12); las imágenes «pregunta» no dan áreas ni perímetros. Notas menores:

1. `huertos-pregunta` y `huertos-resuelto`: alt y descripcion dicen «cuadrados de un metro» / «cada cuadrito es de un metro de lado», pero el dibujo no tiene esa leyenda (solo «3 m», «4 m»). Es deducible; si se quiere exactitud estricta, quitar la frase del alt o añadir leyenda al SVG. Etiquetas «3 m» y «6 m» a unos 35 px del borde (apretado, sin cortarse).
2. Existente e07: la pista «Su borde es 26, frente a 14» y las demás no tienen error; única correcta 1 × 12 (c) confirmada.

## mat.p6.area-figuras-compuestas — CAMBIOS

Archivo: `primaria-6/fichas/longitud-perimetro-y-area.json`.

1. Momento `ejemplo-1-razona`: «Mira el mural separado». `mural-resuelto` muestra el mural unido, solo coloreado en dos piezas (rectángulo amarillo, triángulo turquesa). Decir «Mira el mural con sus dos piezas de colores». El `aria-label` del SVG repite «separado»; igualar.
2. Descripcion de `mural-resuelto`: «El mismo mural en dos piezas» está bien; añadir que las piezas siguen unidas, o dejarlo como en alt, para no contradecir el dibujo.
3. (Menor) `patio-resuelto`: etiqueta «40 m²» sobre toda la figura amarilla, incluido el triángulo, con el resultado 37 solo en la ecuación; coherente con la narración, sin cambio obligado.

Lo demás bien: dimensiones proporcionales, triángulos de base y altura correctos, esquina del patio de 2 m por 3 m en la posición descrita, `errores` con triángulo rectángulo abajo a la izquierda; comprobación 16/18/16.

## G. Observaciones del autor sobre ejercicios existentes

Cada una evaluada sin editar. Correcciones mínimas para que decida el orquestador.

1. **p2 e08, pista 2 confusa: afecta al alumno, corregir.** «Una de ellas tiene un número menor a la izquierda con menos decenas» no se entiende. Reemplazar por: «El signo < pide que el primer número tenga menos decenas que el segundo.» La retroalimentación y la respuesta (c, 61 < 70) son correctas.
2. **p2 e03, correcta la más larga: afecta (adivinable); corregir.** Opciones de 27, 28, 42 y 28 caracteres. Alargar distractores: a «No, porque 3 unidades son menos que 8 unidades», b «No, porque el 68 tiene más cifras escritas», d «Sí, porque 3 unidades son más que 8 unidades». Igual problema, mismo archivo, en e09 (correcta d de unos 45 caracteres frente a 26 a 38); corregir igual si se hace e03.
3. **p3 e07, «la pista omite el séptimo voto»: no es un defecto.** La lista es liga, trompo, liga, liga, yaces, trompo, liga; liga está en las posiciones 1, 3, 4 y 7. La pista 3 dice «…y también en el último», que es el séptimo. Sin cambio. Solo si se quiere, la pista 2 podría decir «primer, tercer y cuarto lugar» y la 3 «y en el último».
4. Otros hallados en p3 (existentes, mismo motivo): e08 con la correcta c la más larga (38 caracteres frente a 21 y 32). Fácil de igualar acortando c: «A la izquierda de cada barra.».
5. **Audio (F), existentes:** p1 e06 («5.°», «2.°» se leerán «cinco punto grado» según el motor), p1 e09 (opciones ★ ● ▲), p3 e04, e05, e11 (opciones con ■ y palotes). No tienen lectura natural; si el lector de opciones no las verbaliza, el alumno que escucha no puede elegir. Propuesta mínima: decir «quinto escalón» y, para símbolos, añadir en el enunciado la cuenta en palabras o dar nombre a las figuras (estrella, círculo, triángulo). Fuera del alcance de este lote; anotar como pendiente.

## Riesgos del autor

- **Texto turquesa `#0F7C7A` sobre crema `#FCF0D6`: 4,44:1.** Pasa 3:1 como texto grande en escritorio, pero en móvil el SVG se reduce (aprox. 0,5 de escala; el texto de 26-30 px queda en 13-16 px visibles) y deja de ser «grande». Conviene oscurecer solo el relleno de `<text>` a `#0C706E` (5,22:1 sobre crema, 5,9 sobre blanco) en los 11 SVG del lote que tienen texto turquesa (`grep -l '<text[^>]*fill="#0F7C7A"'`). Los rellenos de formas no cambian. Sobre amarillo claro o celeste el turquesa baja a 3,6-4,0:1, pero en este lote no hay texto turquesa sobre esos fondos. Aplicar la misma decisión a los demás lotes para mantener una sola paleta.
- **Descripciones de 250 a 311 caracteres: no es excesivo.** El audio lee título + narración + «La imagen relacionada con esta parte muestra lo siguiente:» + descripcion. El peor caso del lote (p3 `contraejemplo`) suma unos 654 caracteres, aprox. 40 s de voz, y la mayoría queda entre 400 y 600. Solo recortar donde la descripcion repite la narración (p3 `frutas-barras`, `errores`).
- p1 `agachado` y p4 `errores`: ya recogidos arriba como defectos.
- Sin recorrido en navegador (audio, móvil, movimiento reducido): no verificado por este revisor, que solo rasterizó los 30 SVG a 640 por 480 y los miró.

## Qué no se comprobó

Reproducción de audio, vista móvil real, comportamiento con `prefers-reduced-motion`, ni la integración de huellas ni la sincronización. Otros lotes en curso modifican archivos ajenos del árbol de trabajo; no se contaron contra este lote.

## Ronda 2

Fecha: 2026-11-16. Revisor independiente. Solo lectura salvo este apartado.

| Clave | Veredicto |
|---|---|
| `mat.p1.arriba-abajo` | APROBADA |
| `mat.p2.afirmaciones-comparacion` | APROBADA |
| `mat.p3.barras-horizontales` | APROBADA |
| `mat.p4.clasificar-poligonos-lados` | APROBADA |
| `mat.p6.area-figuras-compuestas` | APROBADA |

- p1: alt, descripcion y `aria-label` de `patio-pregunta` coinciden con el dibujo (gato oscuro de perfil, franja celeste, pájaro sobre la copa); `agachado` ahora en cuclillas, texto alineado; oración sobrante del contraejemplo eliminada.
- p4: tercera figura de `errores` es un trapecio rosado claramente irregular; `aria-label` dice «rosada»; sin «celda de panal».
- p6: `ejemplo-1-razona` dice «mural con sus dos piezas de colores»; alt, descripcion y `aria-label` de `mural-resuelto` coinciden con el dibujo.
- Comparado con `HEAD` por JSON: fuera de `claseGuiada` solo cambian las ediciones autorizadas. p2 e08 pista 2 (correcta, no da la respuesta); p2 e03 (única correcta c; la correcta, 42 caracteres, ya no es la más larga) y e09 (única correcta d, 49; a 52, b 46, c 41); p3 e08 opción c «A la izquierda de cada barra.» (29; b tiene 31). ids, dificultad y respuesta correcta intactos. p1, p4 y p6 sin diferencias fuera de `claseGuiada`.
- Contraste: `#0C706E` sobre crema `#FCF0D6` = 5,22:1 (sobre blanco 5,9). Ningún `<text>` con `#0F7C7A` queda en los SVG del lote (11 con `#0C706E`).
- Rasterizados y vistos 12 SVG (los 4 corregidos y 8 de los 11 con cambio de contraste): texto ≥ 26 px, sin solapes ni desbordes.
- `pnpm nudito:validar-banco`: válido (2238 fichas, 27034 ejercicios). `pnpm typecheck`: sin errores.
