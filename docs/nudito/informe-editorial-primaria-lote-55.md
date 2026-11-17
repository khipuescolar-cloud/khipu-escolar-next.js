# Informe editorial · Primaria, Matemática, lote 55

Fecha: 2026-11-16. Autor: Claude (Sonnet 5.5), tras agotarse el cupo del autor Codex. Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. Solo cambió el campo `claseGuiada` de cada clave (ejercicios, ids, respuestas y dificultad intactos); no se tocaron estado, huellas, BD, specs ni componentes.

## Alcance

| Clave | Archivo (`src/lib/nudito/conocimiento/banco/matematica/`) | Momentos | Recursos (`public/nudito/diagramas/matematica/<prefijo>-<id>.svg`) |
|---|---|---|---|
| `mat.p4.figuras-simetricas-cuadricula` | `primaria-4/fichas/simetria-y-traslacion.json` | 10 | `cuadricula-pregunta`, `figura-completa`, `distancia-pareja`, `errores`, `tres-pasos` (prefijo `figuras-simetricas-cuadricula`) |
| `mat.p5.media-aritmetica` | `primaria-5/fichas/moda-y-media.json` | 10 | `torres-pregunta`, `nivelar`, `suma-division`, `errores`, `tres-pasos` (`media-aritmetica`) |
| `mat.p6.patrones-aditivos` | `primaria-6/fichas/patrones.json` | 10 | `pan-pregunta`, `pan-saltos`, `rio-saltos`, `errores`, `tres-pasos` (`patrones-aditivos-p6`) |

## Decisiones

- Estructura: idea (sin imagen) → situación («pregunta», sin respuesta) → ejemplo 1 guiado/razona → ejemplo 2 guiado/razona → contraejemplo → tres pasos → comprobación nueva. En el ejemplo 2 de p4 y p5 y en el de decimales de p6 el momento guiado no lleva recurso y no alude a dibujos.
- p4: reflejo fila por fila y contar casillas hasta el eje (distancia tres); errores: copiar sin invertir y pareja a otra distancia. Comprobación (b): tercera casilla desde el borde → pareja a cinco del eje.
- p5: igualar columnas (tres, cinco, seis, diez chapitas → seis), luego sumar y dividir (doce, quince, veintiuno → dieciséis); errores: dividir entre el mayor y quedarse con la suma. Comprobación (c): cinco, ocho, once y doce soles → nueve.
- p6: patrón natural (dieciocho, veinticinco, treinta y dos → treinta y nueve) y decimal descendente (dos coma cuarenta, dos coma quince, uno coma noventa → uno coma sesenta y cinco); errores: cambios distintos y coma mal leída. Comprobación (a): dos coma cuatro, dos coma nueve, tres coma cuatro → tres coma nueve.
- Letras correctas b, c, a; opciones de longitud pareja (diferencia ≤2) y la correcta nunca supera a las demás por más de 1.
- Se eliminaron SVG huérfanos de un intento previo (autor Codex, sin claseGuiada, sin referencias) con los prefijos de estas claves, y se sobrescribieron `errores` y `tres-pasos` de p4/p5 con las versiones nuevas. p6 usa el prefijo `patrones-aditivos-p6` para no chocar con los SVG de `mat.p2.patrones-aditivos` (`ahorro`, `regla`, `recta-cinco`), que no se tocaron.

## Verificaciones

- Cálculos recalculados a mano: 3+5+6+10 = 24 = 4·6; 12+15+21 = 48 = 3·16; 24÷3 = 8; 32+7 = 39; 1,90−0,25 = 1,65; 2,9−2,4 = 0,5 → 3,4+0,5 = 3,9; 7−3+1 = 5 casillas al eje.
- SVG (640×480, texto ≥26 px, sin `<tspan>`, con `<title>`) rasterizados con Chrome headless y vistos antes de escribir alt y descripción; cuadrículas, columnas y cuadros comprobados contra el texto.
- `scripts/nudito-lint-clase-guiada.ts` sobre las tres claves: 0 errores, 0 avisos.
- `nudito-validar-banco`: banco válido (2238 fichas, 27034 ejercicios). `tsc --noEmit`: sin errores. `git diff --check` sobre los 3 JSON: limpio. (`pnpm` no está en el PATH de esta sesión; se ejecutaron los mismos binarios de `node_modules/.bin`.)

## Errores en ejercicios existentes (no editados)

- `mat.p6.patrones-aditivos` **e10**: «La sucesión 4, 7, 10, 13 pierde su cuarto término. ¿Qué valor debe reemplazar al 13…?» La respuesta correcta (b, trece) es el mismo valor que se pretende reemplazar; el enunciado es circular y confuso. Conviene reescribirlo (p. ej. «4, 7, 10, __: ¿qué valor falta?»).
- p4 y p5: sin errores de contenido; respuestas recalculadas.

## Riesgos

- Sin revisión independiente ni recorrido en navegador (audio, móvil, movimiento reducido).
- Los SVG llevan cifras y símbolos (`24 ÷ 3 = 8`, `+7`); narración y descripciones los dicen en palabras.
- La comprobación de p4 depende de contar desde el borde o desde el eje; se aclara en el enunciado, pero conviene que el revisor la lea en voz alta.
- No se actualizaron `estado-refuerzo-primaria.json`, specs ni bitácora (fuera del encargo).

## Correcciones (tras revisión independiente, 2026-11-16)

- `mat.p4.figuras-simetricas-cuadricula`: comprobación reescrita (casilla a dos del eje; opciones «A tres del eje, a la derecha» / «A dos del eje, a la derecha» (b) / «A dos del eje, a la izquierda») y `mensajeCorrecto` con el mismo conteo desde el eje; `ejemplo-1-guiado` sin «pero del otro lado».
- `mat.p6.patrones-aditivos`: descripcion de `pan-saltos` y `rio-saltos` dice «arcos ocres»; `contraejemplo` en dos frases limpias; `ejemplo-1-guiado` con «A los panes de la segunda hora réstales los de la primera». SVG sin cambios (no hubo que rerasterizar).
- Autorizado: e10 de `mat.p6.patrones-aditivos` → enunciado «En la sucesión 4, 7, 10, __, ¿qué valor falta si el salto sigue siendo de 3?»; id, dificultad, opciones y respuesta (b) intactos.
- `mat.p5.media-aritmetica` aprobada, sin tocar.
