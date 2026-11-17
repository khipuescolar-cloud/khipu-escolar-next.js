# Revisión independiente · Primaria, Matemática, lote 17

Fecha: 2026-11-16. Revisor distinto del autor. Solo lectura sobre banco y SVG.

Verificaciones técnicas: `pnpm nudito:validar-banco` (2238 fichas, 27034 ejercicios) y `pnpm typecheck` pasan. En las seis claves del lote el diff contra HEAD solo toca `claseGuiada`; ejercicios intactos. (Los seis archivos JSON también muestran `claseGuiada` de otras claves, que son de otros lotes y se ignoran.) Los 24 SVG se rasterizaron con Chrome headless y se vieron: sin `<tspan>`, texto mínimo 26 px, sin desbordes. `alt` entre 75 y 146 caracteres (todos ≤ 200). Narración sin dígitos ni «parte N de M»; primer momento sin imagen; todos los `recursoRef` coinciden con lo narrado en ese momento; ninguna imagen de situación revela la respuesta. Cuentas recalculadas y correctas en las seis claves (p. ej. 3×4+8×3=36; 9×5−2×3=39; 14×6=84 con altura 6 y lado 10 coherentes por 6-8-10; 72÷9=8; 52−7=45; 66; 42; 18×10=180). Letras correctas del lote: b, c, a, c, b, a (sin patrón repetido seguido). Longitudes de opciones sin delatar.

## mat.p1.comparar-hasta-20 — APROBADA
Sin defectos. Observación sin acción: la pista de la comprobación indica el método (comparar unidades), no la respuesta.

## mat.p2.canje-decenas-unidades — APROBADA
Sin defectos.

## mat.p3.arreglos-rectangulares — APROBADA
Sin defectos.

## mat.p4.comparar-fracciones — CAMBIOS
1. `src/lib/nudito/conocimiento/banco/matematica/primaria-4/fichas/fracciones.json`, recurso `cintas` (`public/nudito/diagramas/matematica/fracciones-cinta-comparar.svg`): la `descripcion` dice «Una línea punteada baja desde el final de las dos partes de Elena y muestra que la parte de Bruno termina antes». El SVG dibuja la línea punteada en x=272 (fin de las dos partes de Bruno), entre y=163 e y=217, es decir, parte de la barra de Elena a mitad de su segunda parte y no marca el final de las partes de Elena (x=400). Descripción y dibujo no coinciden. Corregir: mover la línea a x=400 (de la barra de Elena a la de Bruno, con trazo más grueso que 2 px para que se vea) o reescribir la descripción como «una línea punteada baja desde la barra de Elena hasta el final de la parte pintada de Bruno». Lo mejor es lo primero, porque así el dibujo muestra de verdad que Elena llega más lejos. Revisar también que `alt` siga siendo exacto.

Observación sin acción obligatoria: la pista de la comprobación («Piensa cuál de las dos cintas está cortada en partes más grandes») casi entrega la regla; aceptable, pero podría quedar más abierta.

## mat.p5.area-figuras-compuestas — APROBADA
Sin defectos.

## mat.p6.area-paralelogramo — CAMBIOS
1. `public/nudito/diagramas/matematica/paralelogramo-vidrio-altura.svg`, recurso `vidrio`: la etiqueta «8 cm» (x=198, y=250, 28 px) queda a 8 px de la línea punteada de la altura (x=190), casi pegada. Desplazar la etiqueta (p. ej. a x=206) o ponerla a la izquierda del segmento con `text-anchor="end"`.
2. `public/nudito/diagramas/matematica/paralelogramo-a-rectangulo.svg`, recurso `rectangulo`: el rótulo «mover» (y=84) y la flecha (y=98) quedan apretados entre el título (y=52) y el borde superior de la figura (y=114), a unos 16 px de la figura. Bajar el dibujo unos 20 px o subir el título para dar aire. (Defecto visual de espaciado, no de contenido.)

Observación sin acción obligatoria: la pista de la comprobación («Multiplica la base por la altura que forma ángulo recto, no por el lado inclinado») indica qué dos medidas usar; el estudiante aún debe multiplicar, pero considerar reformularla sin nombrar el descarte.

## Resumen
Aprobadas: p1, p2, p3, p5. Con cambios: p4 (1 defecto de coherencia descripción/dibujo), p6 (2 defectos visuales de espaciado).

## Ronda 2

Fecha: 2026-11-16. Revisor independiente, solo lectura. `pnpm nudito:validar-banco` (2238 fichas, 27034 ejercicios) y `pnpm typecheck` pasan. Los 3 SVG se rasterizaron con Chrome headless y se vieron: texto mínimo 26 px, sin desbordes ni solapes, nada pegado al borde.

### mat.p4.comparar-fracciones — APROBADA
- `fracciones-cinta-comparar.svg`: la línea punteada (trazo 4) está en x=400, fin de las dos partes de Elena, y cruza la barra de Bruno donde sus partes pintadas ya terminaron (x=272). Coincide con la `descripcion` («línea punteada gruesa… cruza la barra de Bruno») y con el `alt`.
- Pista «Compara cuántas partes usó cada uno y cómo es el tamaño de las partes.»: no entrega la respuesta.
- Cuenta: 3 partes en ambos casos; quintos > séptimos, luego 3/5 > 3/7. Clave c correcta.

### mat.p6.area-paralelogramo — APROBADA
- `paralelogramo-vidrio-altura.svg`: «8 cm» ahora a la derecha de la punteada (x=210), con aire; «72 cm²» arriba, sin choque.
- `paralelogramo-a-rectangulo.svg`: «mover» y flecha con aire entre título y figura.
- Pista «Piensa qué medida forma un ángulo recto con la base.»: no entrega la regla.
- Cuenta: 18×10=180 cm² (clave a); distractores 216=18×12 y 90=mitad. Correcta.

Sin defectos nuevos. Aprobadas las 6 claves del lote.
