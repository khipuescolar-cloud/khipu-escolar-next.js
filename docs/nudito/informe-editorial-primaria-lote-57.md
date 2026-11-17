# Informe editorial primaria — lote 57 (Matemática)

| Clave | Archivo | Momentos | Recursos |
|---|---|---|---|
| mat.p4.justificar-comparaciones | primaria-4/fichas/numeros-hasta-10-000.json | 10 | 5 |
| mat.p5.problemas-proporcionalidad | primaria-5/fichas/proporcionalidad.json | 10 | 5 |

## Decisiones
- Los 10 SVG ya existían (autor Codex anterior, sin `claseGuiada`); se reutilizaron tras revisarlos a ojo con chrome headless.
- Correcciones de SVG: `problemas-proporcionalidad-situacion` dibujaba 4 vasos bajo «5 jarras» (ahora 5); `avena-pregunta` tenía «3 tazas» tapado por el tazón; `avena-resuelto` tenía flechas sobre «12 porciones». Los 10 SVG pasan a `<title>` simple (el lint no aceptaba `id`) y se ancla cada texto de `avena-resuelto`.
- Variante «pregunta» en los ejemplos guiados (sin respuesta) y «resuelto» en los razonados. Contraejemplos y primer momento sin recurso.
- Comprobaciones nuevas: p4 (Marta 5 480 vs Pedro 5 408), respuesta C; p5 (nueve paltas con cuatro a S/ 12 → S/ 27), respuesta B. Opciones con diferencia ≤3 caracteres, correcta no la más larga.

## Verificaciones
- Lint `nudito-lint-clase-guiada.ts`: 0 errores, 0 avisos de la clave (un aviso informativo en ejercicios p4).
- `nudito-validar-banco.ts`: banco válido (2238 fichas, 27034 ejercicios). `tsc --noEmit`: sin errores. `git diff --check`: limpio. SVG bien formados y rasterizados en headless.
- `pnpm` no está en el PATH; se ejecutaron los scripts con `node_modules/.bin/tsx` y `tsc`.

## Riesgos / errores de ejercicios existentes
- p4 e05: corregido (ver Correcciones).
- Todos los demás ejercicios de ambas claves se recalcularon a mano: sin errores de contenido.
- En el SVG de situación de p4, los seis recuadros son decorativos y no codifican la cantidad.

## Correcciones (tras revision-lote-57)
- p4: `situacion-almacenes` se cierra en `paso-3` (centenas 2 contra 0); SVG sin recuadros decorativos y sin mención en narración/alt/descripcion. `contraejemplo` retitulado «Cuidado con mirar las cifras del final» y con otro par (2 985 vs 3 012), distinto de e07 y del ejemplo 2.
- p4 e05 (autorizado, corrección mínima): opciones a/c igualadas en longitud (32/30/30), correcta b ya no es la más larga; id, dificultad y respuesta intactos. e01 y e09 (redacción menor) no se tocaron por no estar autorizados: pendientes.
- p5: `contraejemplo` reescrito («agregar ocho porciones no significa agregar ocho tazas…»); limonada se resuelve en `paso-2`/`paso-3` (3 limones por jarra, 15 en cinco jarras); `avena-resuelto` con flechas acortadas (≥30 px de aire); pie de `avena-pregunta` ahora «¿Cuántas tazas hacen falta?» (SVG y descripcion).
- p5 e11 (autorizado): pista 3 → «Añade a las cuatro tazas las dos que usan cuatro panes más.»
- SVG rasterizados con chrome headless y revisados.
