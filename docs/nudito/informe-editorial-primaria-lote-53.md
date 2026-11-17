# Informe editorial primaria — lote 53 (Matemática)

| Clave | Archivo | Momentos | Recursos |
|---|---|---|---|
| mat.p2.posible-imposible | primaria-2/fichas/posible-e-imposible.json | 10 | 5 |
| mat.p4.elemento-siguiente-patron | primaria-4/fichas/patrones.json | 10 | 5 |
| mat.p5.justificar-resolucion | primaria-5/fichas/justificacion-de-procesos.json | 10 | 5 |
| mat.p6.media-reparto-equitativo | primaria-6/fichas/moda-y-media.json | 10 | 5 |

## Decisiones
- Un autor anterior dejó p2, p5 y p6 completos; se reutilizaron. Se completó p4 (faltaba `claseGuiada`) y se reutilizaron sus cinco SVG.
- p4: recurso `banderines-pregunta` en el ejemplo guiado (sin respuesta) y `banderines-resuelto` en el razonado; el segundo ejemplo guiado no lleva recurso. Comprobación: respuesta A, opciones de longitud pareja.
- SVG corregidos: p5 `justificar-resolucion-situacion` (título que desbordaba el margen, ahora tamaño 27 y texto más corto); p4 `banderines-resuelto` (rótulos «núcleo» centrados sobre cada grupo).

## Verificaciones
- `nudito-lint-clase-guiada.ts` de las cuatro claves: 0 errores, 0 avisos de la ficha (queda un aviso informativo en ejercicios de p5).
- `pnpm nudito:validar-banco`: banco válido (2238 fichas, 27034 ejercicios). `tsc --noEmit`: sin errores.
- No se pudo rasterizar con chrome headless (sin salida); los SVG se revisaron solo con el lint, no a ojo.

## Riesgos / errores de ejercicios existentes
- p5: en e09, e10 y e12 la opción correcta es la más larga (aviso de lint); no se editó.
- Sin errores de contenido detectados en los demás ejercicios.

## Correcciones (tras `revision-lote-53.md`)
- p2: `ejemplo-1-razona` cierra la situación inicial (bolsa sin verde = imposible). SVG `bolita-pregunta`: bolita morada y dos naranjas movidas hacia dentro de la bolsa. Ejercicio e01 (autorizado): opciones a/b/c reescritas (28/27/29 caracteres), pista y retroalimentación ajustadas; id, dificultad y respuesta intactos. `bolita-resuelta` no pisaba la pared (la bolita está fuera); sin cambios. e05 queda igual (diferencia menor).
- p4: «núcleo» → «grupo» en `banderines-resuelto` (SVG, alt, descripcion); «maíz/índigo» → «amarillo/azul» en narración, alt y descripcion; el contraejemplo narra que la fila se duplica; `error-regla`: equis a un costado del texto.
- p5: `combis-resuelto`: equis fuera del texto. Ejercicios e09, e10, e12 (autorizado): solo `opciones.texto` reescrito, longitudes parejas (e09 51–54, e10 55–59, e12 55–58), sin cambiar id/dificultad/respuesta. No se cambió la situación (144 repetido, menor) ni `combis-pregunta` (ya dice «de muestra»).
- p6: `error-moda`: datos con comas, equis debajo del texto, tarjetas ensanchadas; el contraejemplo define «moda» (dato que más se repite); `ventas-resuelto`: barra amarilla suelta eliminada; `ventas-pregunta`: rótulos de día en una sola línea (dos renglones alineados).
- SVG cambiados rasterizados con Chrome headless y revisados a ojo.
