# Informe editorial · Primaria, Matemática, lote 56

Fecha: 2026-11-16. Autor: Claude (Sonnet), por cupo agotado del autor Codex. Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. Solo cambió el campo `claseGuiada` de cada clave; ejercicios, ids, respuestas y dificultad intactos. No se tocaron estado, huellas, BD, specs ni componentes.

| Clave | Archivo (`src/lib/nudito/conocimiento/banco/matematica/`) | Momentos | Recursos (SVG `<prefijo>-<id>.svg` en `public/nudito/diagramas/matematica/`) |
|---|---|---|---|
| `mat.p4.fraccion-todo-continuo` | `primaria-4/fichas/c23-fracciones-comprension.json` | 10 | `cinta-pregunta`, `cinta-conteo`, `regleta-pregunta`, `regleta-fraccion`, `errores` (prefijo `fraccion-todo-continuo`) |
| `mat.p5.patrones-graficos-5` | `primaria-5/fichas/patrones.json` | 10 | `escalera-pregunta`, `escalera-aumentos`, `fichas-pregunta`, `fichas-aumentos`, `errores` (`patrones-graficos-5`) |
| `mat.p6.potencia-cuadrada` | `primaria-6/fichas/potenciacion.json` | 10 | `mosaico-pregunta`, `mosaico-filas`, `jardin-pregunta`, `jardin-area`, `errores` (`potencia-cuadrada`) |

## Decisiones
- Estructura: idea (sin imagen) → situación («pregunta») → ejemplo 1 guiado/razona → ejemplo 2 guiado/razona → contraejemplo → tres pasos → comprobación nueva.
- p4: cinta de ocho partes con tres pintadas (tres octavos) y regleta de doce cm en cuatro tramos (dos cuartos); contraejemplo: partes desiguales y fracción invertida. Comprobación: tres quintos (c).
- p5: escalera de cuadritos (1, 3, 6, 10) y filas de fichas (4, 9, 15, 22); contraejemplo: contar solo la última fila y aumentos no iguales. Comprobación: 6, 9, 13 → 18 (b).
- p6: piso de 8×8 (64 baldosas) y jardín de 20 m (400 m²); contraejemplo: seis al cuadrado como seis por dos y una sola fila como área. Comprobación: «once por once» (a).
- Letras correctas: c, b, a. Opciones de longitud pareja (diferencia ≤1) y la correcta nunca la única más larga.
- Los SVG de situación y de guiado no muestran respuesta ni regla («?» sin valor).

## Verificaciones
- Cálculos revisados: 3/8, 2/4, 3/5; 1+2+3+4=10, 4+5+6+7=22, 13+5=18; 8²=64, 20²=400, 11²=121, 6²=36.
- Lint mecánico (`nudito-lint-clase-guiada.ts`): 0 errores, 0 avisos. `nudito-validar-banco`: banco válido (2 238 fichas). `tsc --noEmit` y `git diff --check`: limpios.
- SVG rasterizados con Chrome headless y vistos antes de escribir alt y descripción; el recorrido de navegador (audio, móvil) no se hizo.
- `pnpm` no está en el PATH de esta sesión: se ejecutaron `tsx` y `tsc` desde `node_modules/.bin`.

## Ejercicios existentes
Recalculados los 36: sin errores de contenido ni de grado. Nota menor: p4 e10 explica que «20/30 es equivalente», concepto de equivalencia no trabajado en la clase; p4 e09 (3/6) menciona «la mitad».

## Riesgos
- Sin revisión independiente ni prueba en navegador.
- p5 y p6 `errores` tienen descripciones de unos 300 caracteres (por decir números en palabras).
- Los SVG usan cifras y símbolos (`3/8`, `8²`); narración y descripción los dicen en palabras.

## Correcciones (2026-11-16, tras `revision-lote-56.md`)
- p5 `contraejemplo`: ahora nombra el error («no repitas siempre el mismo aumento: de dos a cinco son tres más y de cinco a nueve son cuatro más…»). `errores.svg` panel inferior: «mal: sumar siempre 3» / «bien: sumar 3 y luego 4»; alt y descripcion ajustados y rerasterizado visto.
- p5 `fichas-pregunta` alt: reescrito por figuras («la primera con una fila de cuatro; la segunda con filas de cuatro y cinco…»). Vocabulario unificado: «etapa» → «figura» en comprobación.
- p6 `idea`: «su área es el lado al cuadrado, medida en unidades cuadradas». `mosaico-pregunta` alt: «ocho baldosas en cada lado» (sin «ocho por ocho»). Pista de comprobación sustituida por la sugerida.
- p4 no tocada. Ejercicios sin cambios.
