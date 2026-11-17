# Informe editorial · Primaria, Matemática, lote 20

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. No se tocaron estado, huellas, BD, specs ni componentes. Solo cambió el campo `claseGuiada` de cada clave; ejercicios, ids, respuestas y dificultad quedan intactos.

## Alcance

Archivos bajo `src/lib/nudito/conocimiento/banco/matematica/`. Todas con 10 momentos (primero sin recurso).

| Clave | Archivo | Recursos (ID → SVG en `public/nudito/diagramas/matematica/`) |
|---|---|---|
| `mat.p1.armar-figuras-con-piezas` | `primaria-1/fichas/formas-del-entorno.json` | `piezas-mesa`, `dos-cuadrados-pregunta`, `dos-cuadrados-unidos`, `casa` (`armar-figuras-*.svg`) |
| `mat.p2.barras-verticales` | `primaria-2/fichas/graficos-y-pictogramas.json` | `tabla-vacia`, `papa-cinco`, `papa-yuca`, `mascotas`, `sin-nombres` (`barras-verticales-*.svg`) |
| `mat.p3.barras-escala` | `primaria-3/fichas/c25-datos.json` | `eje-vacio`, `votos-pregunta`, `votos-carla`, `jugos-cinco` (`barras-escala-*.svg`) |
| `mat.p4.asociativa-multiplicacion` | `primaria-4/fichas/c23-terminos-propiedades.json` | `almacen`, `agrupar-pregunta`, `sesenta`, `setecientos` (`asociativa-multiplicacion-*.svg`) |
| `mat.p5.capacidad-prismas` | `primaria-5/fichas/prismas-rectos.json` | `caja-cubo`, `lapices-pregunta`, `treinta`, `cuarenta` (`capacidad-prismas-*.svg`) |
| `mat.p6.amplificar-simplificar` | `primaria-6/fichas/fracciones.json` | `barra-cinco`, `multiplicar-pregunta`, `doce-veinte`, `irreductible` (`amplificar-simplificar-*.svg`) |

25 SVG nuevos, todos 640×480, texto ≥ 26 px, paleta crema/índigo/turquesa/maíz, con `<title>`.

## Decisiones pedagógicas

- Estructura: idea (sin imagen) → situación (recurso en variante pregunta) → ejemplo 1 guiado (pregunta) y razonado (solución) → ejemplo 2 guiado (sin recurso) y razonado (solución) → contraejemplo de errores frecuentes → tres pasos → comprobación nueva. Los recursos de situación y guiado no muestran respuesta (los espacios por completar son marcadores neutros, no de la altura correcta).
- 1.º: frases cortas; dos cuadrados forman rectángulo, triángulo sobre cuadrado forma casa; error de huecos. Comprobación: tres cuadrados en fila (c).
- 2.º: papa/yuca (construcción de barras) y mascotas (la más alta); contraejemplo con barras sin nombre. Comprobación: la barra más baja (a).
- 3.º: elegir escala por el dato mayor; barra entre dos líneas (11 entre 10 y 12 con escala de 2); jugos con escala de 5. Comprobación: diferencia de dos barras con escala de 10 (b).
- 4.º: asociativa solo con factores vecinos (la comprobación usa 5 × 2 × 15, no 2 × 15 × 5, para no exigir conmutativa); ejemplo 2 muestra elegir el grupo fácil (25 × 4). Comprobación en palabras (c).
- 5.º: capacidad = cubos por capa × capas; vistas oblicuas de cubos por capas de color y capas separadas. Comprobación 3 × 6 × 2 (a).
- 6.º: amplificar 3/5 por 4 con dos barras; simplificar 24/36 en dos pasos hasta 2/3 (y mención de dividir entre 12); fracciones habladas «sobre»/«quintos». Comprobación 30/45 (b).
- Letras correctas por clave: c, a, b, c, a, b. Opciones de longitud parecida; en 3.º–6.º números en palabras.
- Narración sin dígitos, sin «parte N de M», sin repetir títulos; «imagen» solo en momentos con recurso.

## Verificaciones

- Cálculos recalculados por script y a mano: 4·5·3 = 60; 7·25·4 = 700; 5·2·15 = 150; 5·2·3 = 30; 8·5 = 40; 3·6·2 = 36; 3/5 = 12/20; 24/36 = 6/9 = 2/3; 30/45 = 2/3; 60 − 35 = 25.
- Ejercicios existentes de las 6 claves revisados: sin errores hallados.
- Los 25 SVG se renderizaron en Chrome headless y se inspeccionaron antes de escribir alt y descripción; se corrigieron: etiquetas de eje amontonadas (jugos), nota solapada con barra (votos), y marcadores de «pregunta» que revelaban la altura correcta (yuca, Carla).
- Script de lote: recursoRef ↔ recursos exactos, alt ≤ 200 caracteres, 10 momentos, primer momento sin recurso.
- `pnpm nudito:validar-banco`: banco válido (2 238 fichas, 27 034 ejercicios). `pnpm typecheck`: sin errores. `git diff --check` sobre banco de Matemática y diagramas: limpio.

## Riesgos y pendientes

- No se recorrió el flujo en navegador con audio, móvil ni movimiento reducido; falta revisión independiente (pedagógica, factual, visual, oral).
- Los SVG usan texto en fuente sans-serif del sistema; revisar lectura en móvil pequeño.
- El archivo `primaria-6/fichas/fracciones.json` es compartido con otras claves de otras sesiones; se leyó y escribió solo el `claseGuiada` de `mat.p6.amplificar-simplificar` (comprobar que el diff no pise otro trabajo en curso).
- Ejercicio e11 de `mat.p6.amplificar-simplificar` y similares correctos; no se detectaron errores en ejercicios.

## Correcciones tras la revisión independiente (`revision-lote-20.md`)

`mat.p6.amplificar-simplificar` aprobada, no se tocó su contenido (el archivo `fracciones.json` se reescribió con el mismo contenido de esa clave; el cambio ajeno de `mat.p6.multiplicacion-fracciones` se conservó intacto).

- p1: SVG `casa` con triángulo de la misma base que el cuadrado; pista de la comprobación ahora «Mira el borde de afuera de toda la fila de cuadrados»; SVG `dos-cuadrados-pregunta` con «Juntamos…» (título y pie) y descripción que lo menciona.
- p2: marcadores «?» de `tabla-vacia` y `papa-cinco` pasan a columnas punteadas de toda la altura del eje (sin valor falso); `ejemplo-2-guiado` ya no entrega «el mayor es siete» (se resuelve en `ejemplo-2-razona`); más aire sobre la barra del perro en `mascotas`.
- p3: opciones de la comprobación «Treinta y cinco kilos / Veinticinco kilos / Cuarenta y cinco kilos» (la correcta ya no es la más larga); caja de Carla de toda la altura; etiqueta «11» con fondo crema y eje más amplio (32 px por división); `eje-vacio` sin marcas ni divisiones (solo eje con flecha y cero), alt y descripción ajustados.
- p4: opciones «Cuarenta y cinco / Ciento veinte / Ciento cincuenta» (longitudes parecidas); `agrupar-pregunta` con espacios duros (&#160;) en los tspan.
- p5: comprobación cambiada a base de tres filas de cinco cubos y dos capas (respuesta treinta; opciones «Treinta / Quince / Diez cubos unidad», longitudes parecidas; mensaje actualizado); `treinta.svg` con vista oblicua más ancha que muestra dos franjas laterales por capa (5 × 2 × 3).
- Los 10 SVG cambiados se volvieron a rasterizar y revisar. Revalidado: banco válido, typecheck y `git diff --check` limpios.
