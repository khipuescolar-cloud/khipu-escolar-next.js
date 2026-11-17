# Informe editorial · Primaria, Matemática, lote 52

Fecha: 2026-11-16. Autor: Codex. Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. No se tocaron estado editorial, huellas, BD, specs, componentes ni ejercicios.

## Alcance

| Clave | Archivo | Momentos | Recursos |
|---|---|---:|---:|
| `mat.p2.grupos-misma-cantidad` | `primaria-2/fichas/igualdades-y-equivalencias.json` | 10 | 4 (`situacion`, `papas`, `canicas`, `errores`) |
| `mat.p4.el-litro` | `primaria-4/fichas/capacidad.json` | 10 | 4 (`situacion`, `bidones`, `balde`, `errores`) |
| `mat.p5.interpretar-representaciones` | `primaria-5/fichas/graficos.json` | 10 | 4 (`situacion`, `pictograma`, `taller`, `error`) |
| `mat.p6.grafico-lineas` | `primaria-6/fichas/graficos-estadisticos.json` | 10 | 4 (`situacion`, `temperatura`, `planta`, `error`) |

Se crearon 16 SVG con nombres únicos en `public/nudito/diagramas/matematica/`. Todos usan `viewBox="0 0 640 480"`, texto de al menos 26 px, `<title>`, paleta indicada y texto turquesa `#0C706E` o ámbar `#8A5A00`.

## Decisiones

- Estructura común: idea sin imagen → situación → dos ejemplos distintos → contraejemplo → tres pasos → comprobación nueva.
- Segundo grado: se compara el conteo total, no el espacio ni la distribución; se trabaja además la reunión de grupos por color.
- Cuarto grado: se distingue capacidad de masa y se separan los casos de reunir recipientes iguales y hallar cuánto falta.
- Quinto grado: se contrastan tabla, pictograma y barras; la clave y la escala se usan antes de concluir si coinciden.
- Sexto grado: se ordenan momentos en el eje horizontal, se ubican puntos y se interpretan subida, bajada y tramo horizontal.
- Las respuestas correctas de las comprobaciones son, respectivamente, `b`, `b`, `a` y `c`. Las opciones tienen longitud pareja y la correcta no es la única más larga.

## Verificación de ejercicios existentes

- `mat.p2.grupos-misma-cantidad`: respuestas y cálculos correctos. Riesgo de accesibilidad no editado: `e01` y `e12` usan series de círculos que el audio puede leer mal; en `e01`, además, la opción correcta es bastante más larga que varios distractores.
- `mat.p4.el-litro`: **error existente no editado en `e12`**. El enunciado pregunta por llenar exactamente un bidón de cinco litros con botellas llenas de dos litros, pero la retroalimentación dice que bastan tres porque suman seis litros. Eso excede la capacidad y no resuelve el llenado exacto sin sobrante. En `e03`, la opción correcta es mucho más larga que los distractores.
- `mat.p5.interpretar-representaciones`: cálculos y respuestas correctos. En `e11`, la opción correcta es claramente la más larga y puede delatarse por forma; no se editó.
- `mat.p6.grafico-lineas`: cálculos, tendencias y respuestas revisados sin errores detectados.

## Verificaciones

- Los 16 SVG se rasterizaron con Chrome headless y se inspeccionaron uno por uno. Se corrigió el solape de las etiquetas semanales en `grafico-lineas-planta.svg`.
- Cálculos de la clase: tres por cinco son quince; diez menos seis son cuatro; cuatro por tres son doce; sesenta entre quince son cuatro; cuatro por veinte son ochenta; ciento ochenta entre treinta son seis; las secuencias de los gráficos coinciden con cada punto dibujado.
- Lint mecánico dirigido: sin errores ni avisos de `claseGuiada`; solo informa dos observaciones preexistentes de opciones correctas más largas (`p4 e03`, `p5 e11`).
- `pnpm nudito:validar-banco`: correcto; banco válido con 2 238 fichas activas y 27 034 ejercicios.
- `pnpm typecheck`: correcto, sin errores.
- `git diff --check` dirigido sobre los cuatro JSON: correcto. Los 16 SVG y el informe, aún no rastreados, pasaron además la revisión de espacios finales; el control mecánico confirmó 16 recursos sin defectos de `viewBox`, `<title>`, `<tspan>`, tamaño mínimo ni color de texto.

## Riesgos y pendientes

- Falta revisión editorial independiente; este informe no aprueba el lote.
- No se recorrió la experiencia completa en navegador con audio, móvil ni movimiento reducido.
- Los recursos son diagramas esquemáticos; la legibilidad se verificó a 640 por 480, no dentro de todas las vistas de la aplicación.

## Correcciones (2026-11-16)

Atendida la revisión `revision-lote-52.md` en las 4 claves; SVG rerasterizados y vistos.
- p2: descripciones de `situacion` y `papas` sin totales; narración del contraejemplo aclara que separar no cambia la cantidad. Ejercicios (autorizado, mínimo): e01 y e12 sin «●» (texto con «fichas»; e01 opción correcta acortada); id, dificultad y respuesta intactos.
- p4: `?` del balde en la parte vacía; situación unificada («¿Cuántos litros recibe el balde?»); bidones con «capacidad para cinco litros»; «no masa» explicado. e12 (autorizado): retroalimentación precisa, respuesta `false` intacta.
- p5: márgenes de texto en `situacion` y `pictograma`; «combi» unificado; `taller` sin dar el valor de la barra en narración, alt ni descripción.
- p6: rótulo «Misma altura» quitado del SVG `planta`; alt y descripción de `planta` y `temperatura` neutros; `error` subido (margen inferior) y `situacion` con columna de valores separada.
- Pendiente fuera de alcance: p4 e03 y p5 e11 (correcta más larga, informativo).
