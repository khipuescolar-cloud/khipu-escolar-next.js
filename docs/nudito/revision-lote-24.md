# Revisión independiente · Primaria, Matemática, lote 24

Revisor: subagente Claude (Sonnet), distinto del autor. Solo lectura sobre banco y SVG.

## Verificaciones técnicas (E)

- `pnpm typecheck`: sin errores. `pnpm nudito:validar-banco`: válido (2238 fichas, 27034 ejercicios).
- Comparación contra `HEAD` en los 6 archivos: en las 6 claves del lote solo cambió `claseGuiada`. Cambios ajenos (ignorados): `mat.p1.igualdades` (cambió además `ejercicios`, no es de este lote), `mat.p4.igualdades-dos-equivalencias`, `mat.p5.numeros-decimales`.
- Script: 10 momentos, primer momento sin recurso, todos los `recursoRef` resuelven y todos los recursos se usan, `src` existen, alt ≤ 147, descripcion ≤ 487, sin dígitos en narración, sin «parte N de M», sin título repetido, sin letras sueltas, «imagen/dibujo/figura» nunca en momentos sin recurso.
- 28 SVG rasterizados con Chrome headless y vistos. Sin `<tspan>`, texto mínimo 26 px, sin desbordes ni solapes graves. Cuentas dibujadas verificadas (5+5; 7 y 4 papas; 8 puntos del cubo con aristas ocultas bien trazadas; 9 y 9 pareadas; 12/8 y 10/10 con 8 amarillas + 2 turquesa; marcas de la recta 4–5 a 2 y 7 espacios; recta 2–4 con 2,9, 3,1 y 3,8 en la posición exacta; cuerda con extremos sobre la circunferencia; diámetro por el centro).
- Cálculos recalculados: 9>7; 6 caras y 8 puntas; 1 cara y 1 punta del cono; 9=9; 12−8=4, mitad 2, 10 y 10; 12 y 6 → 3 (9 y 9); 18+11=29=18+6+5; 13=5+8; 4,7>4,2; 2,9<3,1<3,8; 6,2>5,9>5,6; 2+2=4; dos radios opuestos = diámetro. Respuesta correcta única en las 6 comprobaciones. Letras correctas b, c, a, c, b, a; longitudes de opciones con diferencia ≤ 3 y correcta nunca la más larga.

## mat.p1.balanza-equilibrio — CAMBIOS

1. `igualdades-y-equivalencias.json`, `claseGuiada.comprobacion.opciones`, opción a: «Ninguno queda recto» es una frase sin sentido (un platillo no «queda recto»; lo que queda recto es la barra). Cambiar por «Ninguno de los dos» (18 caracteres, mantiene la diferencia de longitud ≤ 3 con «El de la izquierda» 18 y «El de la derecha» 16).
2. Recurso `platillos-pregunta` (`balanza-equilibrio-platillos-pregunta.svg`): los dos montones son idénticos (pirámides de 3 abajo y 2 arriba, 5 y 5). La respuesta «equilibrio» se ve por la forma sin contar, justo lo que la ficha quiere enseñar a evitar. Dibujar uno de los montones de otra forma (p. ej. los amarillos en una fila de cinco) y actualizar `descripcion` («apilados en dos filas» pasa a describir cada platillo). Alt sigue válido.
3. Menor, opcional: la idea y el contraejemplo dicen «mirar el tamaño en vez de contar» sin aclarar que los objetos pesan igual (un melón pesa más que una uva). Añadir en `idea`: «Los objetos pesan todos lo mismo.» (primer momento, sin dígitos).

Sin defectos en: orden idea→situación→2 ejemplos→contraejemplo→pasos→comprobación, guiados sin recurso sin respuesta ni «el dibujo», `inclinada` (izquierda baja con 7 papas, 4+3) coincide con alt y descripcion, pista de la comprobación no entrega la respuesta.

## mat.p2.caras-y-puntas — APROBADA

Sin defectos bloqueantes en `claseGuiada`. Matemática correcta; `dado-pregunta` sin marcas ni respuesta; `cubo-cuenta` coincide con alt y descripcion (1 enfrente, 2 arriba, 3 lado, 8 puntos, aristas ocultas punteadas); `cono` correcto; idea no adelanta el resultado. Observaciones menores no obligatorias:

1. `caras-puntas-dado-pregunta.svg`: la segunda línea de la pregunta tiene su base en y=458 de 480 (margen ~22 px); subir 8 px el bloque inferior si se retoca.
2. `situacion`: «Desde aquí se ven tres de sus partes planas» es vago para quien solo escucha; opcional «En la imagen se ven tres de sus partes planas».

## mat.p3.colecciones-equivalentes — APROBADA (un retoque visual menor)

Matemática y pedagogía correctas (9 y 9; 12 y 8, mitad de la diferencia; contraejemplo «pasar toda la diferencia» coherente con `erroresFrecuentes`). Recursos coinciden con alt/descripcion; `canastas-pregunta` no revela cantidades.

1. Menor, `colecciones-equivalentes-chapitas-pregunta.svg`: la etiqueta «Andrés: 8» está centrada en x=470 pero sus chapitas están centradas en x=451 (desfase de 19 px; la de Rosa sí coincide: 165 vs 166). Cambiar `x="470"` por `x="451"` en esa etiqueta.

## mat.p4.cancelativa-igualdad — APROBADA

Sin defectos bloqueantes en `claseGuiada`. Matemática correcta, `balanza-pregunta` usa «? kg» sin valor falso y el cuadrado vacío no sugiere cifra, la resuelta no se adelanta a la situación, comprobación con respuesta única (8). Observaciones menores no obligatorias:

1. `cancelativa-igualdad-balanza-pregunta.svg` y `-balanza-cancela.svg`: la etiqueta de pesa/maíz («5 kg», «? kg») queda sobre el cordón derecho del platillo, que desaparece detrás. Mover la etiqueta ~20 px a la izquierda. Los cuyes punteados de `balanza-cancela` son tenues pero legibles con el rótulo «quito 4 cuyes».
2. La «bolsa de maíz» se dibuja como una etiqueta amarilla, no como bolsa; coherente con la descripcion, solo menos literal.

## mat.p5.comparar-ordenar-decimales — CAMBIOS

1. `numeros-decimales.json`, `erroresFrecuentes[0].error` (clave de este lote): «Creer que 5,9 es menor que 6,1 porque 9 es menor que 1 al mirar cifras aisladas.» Es falso en dos sentidos: 5,9 SÍ es menor que 6,1, y «9 es menor que 1» es falso. Además este texto lo ve el alumno (`temaDeFicha` lo usa como `repaso.errorFrecuente`, mostrado como «Cuidado: …» y pasado a la IA). Corrección mínima: «Creer que 5,9 es mayor que 6,1 porque 9 es mayor que 1 al mirar cifras aisladas.» (la `correccion` actual «Compara primero las unidades: 6 supera 5.» queda correcta).
2. `claseGuiada`, momento `ejemplo-2-razona`: «comparamos los décimos: uno es menor que ocho» se lee en voz como números sueltos. Cambiar por «comparamos los décimos: un décimo es menor que ocho décimos».
3. Menor, `decimales-orden-recta-dos-cuatro.svg`: el rótulo «3,1» flota ~100 px sobre su punto sin línea guía y queda visualmente más cerca del tick del «3» que de su punto (el «2,9» está pegado al suyo). Añadir una línea fina vertical del rótulo al punto.

Vocabulario oral (F): narración, opciones, `alt` y `descripcion` están escritos con «coma» y en palabras («cuatro coma dos», «seis coma uno»); «décimos», «unidades», «metros», «centímetros» sin dígitos ni símbolos; legibles en audio. Los SVG llevan cifras (4,2; 4,7; 3,8…) pero la voz lee la narración/descripcion, no el SVG. Sin palabras problemáticas. Los enunciados de práctica (e01…e12, con «4,2», «12,4 s») no son del lote.

## mat.p6.circunferencia-circulo — APROBADA

Sin defectos bloqueantes. Matemática correcta (2+2=4, cuerda no diametral, dos radios opuestos = diámetro); `cuerda-pregunta` ni alt ni descripcion dicen si es diámetro; `moneda-diametro` y `tres-segmentos` coinciden con la narración; contraejemplo sin conceptos nuevos; opciones 11/13/10. Observaciones menores no obligatorias:

1. `circunferencia-circulo-tres-segmentos.svg`: el diámetro es del mismo azul oscuro que el contorno del círculo y sus extremos se funden con el borde; legible, pero un trazo ligeramente más grueso o un tono distinto lo distinguiría mejor.
2. La `idea` introduce cinco términos en un solo momento; aceptable para 6.º, ya que los ejemplos los separan.

## Errores menores señalados por el autor en ejercicios existentes

Todos los ejercicios son de práctica y se ven al pedirlos; ninguno es del lote ni afecta la corrección.

1. **p3 «hasta 20» vs e11 (27)**: lo ve el alumno (el nombre de la ficha). No es grave: cada colección de e11 es ≤ 12 (6, 9, 12) y e12 compara 15 y 16; solo el total intermedio 27 (pista y retroalimentación) supera 20. Corrección: ninguna necesaria. Si se quiere estricto: cambiar e11 a Eva 4, Lía 6 y Nora 8 (total 18, respuesta 6) con pistas «Hay 18…» y «3 veces 6 es 18»; no cambiar `nombre` (puede ser clave de catálogo).
2. **p5 `erroresFrecuentes`**: ver defecto 1 de p5; es más grave de lo que dijo el autor, porque la frase es falsa entera y se muestra como «Cuidado:». Corrección arriba (el autor proponía «compara solo 9 y 1», que sigue sin decir qué cree el alumno).
3. **p4 e07**: lo ve el alumno; confuso («es falsa porque…» con respuesta verdadero). Corrección mínima: enunciado «Al quitar 8 de ambos lados de 8 + 6 = 8 + 9 queda 6 = 9. Por eso la igualdad 8 + 6 = 8 + 9 no es verdadera.» (respuesta, pistas y retroalimentación siguen valiendo; si se prefiere dejar el texto como está, es solo confuso, no erróneo).
4. **p2 e12 pista 2**: la ve el alumno al pedir ayuda. Corrección mínima: «El cono tiene 1 cara plana y 1 punta, no 5 caras.» (reemplaza «El cono tiene 2 partes distintas: una base y una punta.»).

## Resumen

- CAMBIOS: p1 (opción a de la comprobación, montones idénticos), p5 (`erroresFrecuentes[0]`, «uno es menor que ocho»).
- APROBADA: p2, p3 (retoque x=451), p4, p6, con observaciones menores no obligatorias.
- El validador y `tsc` pasan; no hubo fallos por archivos de otros lotes.

## Ronda 2

- **mat.p1.balanza-equilibrio — APROBADA.** Opciones 18/18/16 caracteres, respuesta única b (nueve > siete, baja la izquierda). `platillos-pregunta` rasterizado: 5 cubos rojos en dos filas frente a 5 amarillos en una fila, no revela la respuesta ni muestra igualdad por forma; alt/descripcion coinciden con el dibujo; texto ≥28 px, sin solapes. La idea añade «Todos los objetos pesan lo mismo.»; sin defectos nuevos.
- **mat.p5.comparar-ordenar-decimales — APROBADA.** `erroresFrecuentes[0].error` ahora «Creer que 5,9 es mayor que 6,1 porque 9 es mayor que 1 al mirar cifras aisladas.» (correcto y claro; único cambio fuera de `claseGuiada` en esta clave). `ejemplo-2-razona` dice «un décimo es menor que ocho décimos». `recta-dos-cuatro` rasterizado: «3,1» con línea fina hasta su punto, texto ≥30 px, sin solapes; descripcion lo menciona.
- Otros cambios fuera de `claseGuiada` en estos archivos (`mat.p1.igualdades` e01-like, enunciado/pistas de piedritas a fichas) pertenecen a otra clave, no a este lote.
- `pnpm nudito:validar-banco`: válido (2238 fichas, 27034 ejercicios). `pnpm typecheck`: sin errores.
