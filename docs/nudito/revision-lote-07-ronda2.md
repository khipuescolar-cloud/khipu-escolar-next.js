# Revisión lote 07, ronda 2 (Matemática 6.º)

| Clave | Veredicto |
|---|---|
| mat.p6.area-triangulos | CAMBIOS |
| mat.p6.ecuaciones-cuatro-operaciones | CAMBIOS |
| mat.p6.multiplicacion-fracciones | CAMBIOS |
| mat.p6.operaciones-decimales | CAMBIOS (menor) |
| mat.p6.patrones-termino-general | CAMBIOS |
| mat.p6.proporcionalidad-directa | APROBADA |

Defecto restante: el recurso de la `situacion-*` (o un guiado) muestra el resultado del ejemplo 1 antes de razonarlo.
- patrones `situacion-palitos`: el SVG `palitos` muestra «3 × 1 + 1 = 4», «3 × 3 + 1 = 10» y «T(n) = 3n + 1»; revela la regla que ejemplo-1 busca. Usar SVG sin regla o sin recursoRef.
- area-triangulos `situacion-paralelogramo`: muestra «10 × 6 = 60» y «cada triángulo: 30 cm²» (resultado del ejemplo 1).
- ecuaciones `situacion-balanza`: muestra «4x = 24» y «x = 6» (resultado del ejemplo 1).
- fracciones `situacion-huerta`: muestra «1/2 × 3/4 = 3/8» (ejemplo 1). `ejemplo-2-guiado` (recta): muestra «6 × 2/3 = 12/3 = 4 m» cuando la narración llega a 12/3 y el razona simplifica a 4. Quitar recursoRef del guiado.
- decimales `ejemplo-1-guiado` (cuadricula): muestra «= 0,12» que el razona deduce (menor: la narración de la situación ya lo dice).
Si la UI deja visible la imagen anterior mientras avanzan momentos, el efecto se agrava (sin comprobar).

Correcto: proporcionalidad usa `arroz-pregunta` y `regla-pregunta` (incógnitas «S/ ?», «x km»); `alt` y `descripcion` fieles; render a 360 px legible, sin solapes. Frase «alto y delgado» eliminada; «la letra n» presente; sin refs rotas ni recursos sin usar; 3 recursos distintos por clave (5 en proporcionalidad).
Exactitud: toda cifra de narración y comprobacion recalculada, correcta. Comprobaciones: area 63 (a), ecuaciones x=5 (c), fracciones 1/4 (a), decimales 4,5 (b), patrones 5n+3 (b), proporcionalidad 21 (c): una sola correcta, `respuesta` coincide con id, letras a,c,a,b,b,c, sin pista por longitud.
Banco: las 6 fichas difieren de HEAD solo en `claseGuiada`; `pnpm nudito:validar-banco` OK (2238 fichas, 27034 ejercicios); `pnpm typecheck` OK.
Sin comprobar: audio, UI real, SVG antiguos re-renderizados (solo los 2 nuevos).
