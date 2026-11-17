# Informe editorial · Primaria, Matemática, lote 31

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. No se tocaron estado, huellas, BD, specs ni componentes. Solo cambió `claseGuiada` de cada clave (ejercicios, ids, respuestas y dificultad intactos).

Una ejecución anterior dejó las seis `claseGuiada` y 24 SVG ya escritos. Se revisaron completos (texto, SVG rasterizados con Chrome headless, ejercicios) y se corrigió lo hallado; no se duplicó ni se dejó ningún SVG huérfano.

## Alcance

Base: `src/lib/nudito/conocimiento/banco/matematica/`. Todas con 10 momentos (el primero sin recurso) y 4 recursos; SVG en `public/nudito/diagramas/matematica/<prefijo>-<id>.svg` con ids `situacion`, `ejemplo-uno`, `ejemplo-dos`, `error` (o `ejemplo-dos`, `error` según clave; todos usados).

| Clave | Archivo | Prefijo SVG | Letra correcta |
|---|---|---|---|
| `mat.p1.comparar-hasta-50` | `primaria-1/fichas/numeros-hasta-50.json` | `comparar-hasta-50` | a |
| `mat.p2.conservacion-longitud` | `primaria-2/fichas/longitud.json` | `conservacion-longitud` | c |
| `mat.p3.comparar-reglas-patrones` | `primaria-3/fichas/c24-regularidad.json` | `comparar-reglas-patrones` | b |
| `mat.p4.comprobar-division` | `primaria-4/fichas/c23-multiplicacion-division-calculo.json` | `comprobar-division` | a |
| `mat.p5.comun-denominador` | `primaria-5/fichas/fracciones.json` | `comun-denominador` | c |
| `mat.p6.comparar-ordenar-decimales` | `primaria-6/fichas/numeros-decimales.json` | `comparar-ordenar-decimales` | b |

## Correcciones de esta ejecución

- SVG p1: fichas que tocaban el borde de la tarjeta (`situacion`, `ejemplo-uno`, `ejemplo-dos`) reubicadas; `3 unidades` ya no pisa las fichas.
- SVG p2 `error`: título acortado (quedaba a 15 px del borde). p5 `situacion`: título acortado por la misma razón («¿Cómo igualamos las partes?»).
- SVG p4 `error`: el círculo tachado cubría la palabra «residuo»; ahora solo rodea el ocho.
- SVG p6 `ejemplo-uno`: la columna «centésimos» se salía de la tarjeta; tarjeta ensanchada y columnas recolocadas.
- SVG p3: rótulos y signos «+n» alineados con la línea de números.
- Contraste: todo `<text>` turquesa pasa de `#0F7C7A` a `#0C706E` en los 24 SVG (rellenos sin cambio).
- p2 `ejemplo-2-guiado` y `alt`/`descripcion` de `ejemplo-dos`: se quitó la letra suelta «u» en la narración («curva abierta, con los dos extremos hacia arriba»).
- p4 `paso-1`: lista de cuatro números con «respectivamente» (ambigua al oído) reescrita como frases cortas con nombre de cada dato.
- p5 `ejemplo-2-razona`: gramática («A tres quintos lo multiplicamos…»).

## Verificaciones

- Script: `recursoRef` = ids de recursos (todos usados), primer momento sin recurso, sin «parte N de M», sin cifras en narración/pregunta/opciones/mensaje/pista, sin «imagen/dibujo/tarjeta/barra» en momentos sin recurso, alt ≤ 200 (máx. 100), descripcion ≤ 237 (una de p5 en 237; resto ≤ 229), archivos SVG existentes.
- Opciones de comprobación de longitud pareja (diferencia ≤ 3), la correcta nunca es la única más larga; letras a, c, b, a, c, b.
- SVG: viewBox 640×480, `<title>`, sin `<tspan>`, texto ≥ 26 px, paleta de specs/18 (+ rojo `#B5412A` en errores), ámbar `#8A5A00`; rasterizados y vistos antes y después de corregir.
- Cálculos recalculados: 53 = 5·10 + 3; 47 = 6·7 + 5; 68 = 8·8 + 4; 68 = 6·10 + 8 (residuo mayor que divisor); 74 = 9·8 + 2; 3/4 = 9/12, 5/6 = 10/12; 3/5 = 6/10, 1/2 = 5/10; 1/2 = 3/6, 1/3 = 2/6; 0,70 > 0,68; 3,08 < 3,18 < 3,80; 4,09 < 4,19 < 4,90; patrones 6-10-14 y 30-34-38 suman 4.
- `pnpm nudito:validar-banco`: banco válido (2 238 fichas, 27 034 ejercicios). `pnpm typecheck`: sin errores. `git diff --check` sobre los 6 JSON: limpio.

## Ejercicios existentes

Revisados los 70 ejercicios de las seis claves (respuestas recalculadas en los de mayor riesgo: p3 e10-e12, p4 e04/e10, p5 e09/e12, p6 e08/e09/e12). **No se hallaron errores** de contenido ni de grado.

## Riesgos y pendientes

- Sin revisión independiente ni recorrido en navegador (audio, móvil, movimiento reducido).
- p6 `ejemplo-dos`: la recta numérica marca 3,08, 3,18 y 3,8 solo en orden, sin escala proporcional; la descripción dice «marca de izquierda a derecha» y no promete escala.
- p6: el 3,8 de la recta se escribe «3,80» en la cadena inferior; la narración lo explica antes («tres coma ocho como tres coma ochenta»).
- p2 y p3 `error`: el contraejemplo p2 se enfoca en el atajo entre extremos; el revisor puede pedir mostrar también la cinta cortada.
- No se actualizaron estado, specs ni bitácora (fuera del encargo).

## Correcciones tras la revisión independiente (`revision-lote-31.md`)

p1 y p4 aprobadas: sin cambios. Se rerasterizaron en headless todos los SVG cambiados.

- p2: `ejemplo-dos` sin cota azul (ya no sugiere que sesenta centímetros sea la distancia entre extremos); `descripcion` ajustada. `error` redibujado con una cuerda turquesa (recta arriba con cota, enrollada abierta abajo con dos extremos visibles) y la línea roja punteada uniendo los extremos; alt y descripcion dicen «cuerda», como la narración.
- p3: en `error` se quitó la barra roja y se compactó el recuadro; título de `ejemplo-dos` acortado («Mismo cambio, sentido opuesto»); «+4» de `ejemplo-uno` alineados; `ejemplo-1-guiado`, `ejemplo-2-guiado` y la pregunta de la comprobación pasan a frases cortas («empieza en…, después va…, luego…»).
- p5: `error` tacha «1/6» con una raya fina y se lee; descripcion y alt de `ejemplo-dos` usan «dos sobre dos» y «cinco sobre cinco»; barras de `situacion` sombreadas (dos de tres, tres de cuatro) y alt/descripcion actualizados; listas de `ejemplo-uno` rotuladas «Múltiplos de 4» y «Múltiplos de 6» (descripcion actualizada).
- p6: recta de `ejemplo-dos` a escala (3,08 y 3,18 juntos, 3,80 lejos) y rótulo «3,80»; `error` tachado con una raya que deja ver el signo; `situacion` con tarjetas más anchas y precio a 48 px (margen de 17 px o más).
- Revalidado: `pnpm nudito:validar-banco`, `pnpm typecheck` y `git diff --check`.
