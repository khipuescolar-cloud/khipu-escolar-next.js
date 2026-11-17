# Informe editorial · Primaria, Matemática, lote 30

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente** (no se aprueba a sí mismo). Solo cambió el campo `claseGuiada` de cada clave; ejercicios, ids, respuestas y dificultad quedan intactos (comparado con `HEAD`, el resto de cada clave es idéntico). No se tocaron estado, huellas, BD, specs ni componentes. Parte de un intento anterior interrumpido: se reaprovecharon los nombres de algunos SVG, pero todos los SVG y los cuatro `claseGuiada` previos se rehicieron.

## Alcance

Archivos bajo `src/lib/nudito/conocimiento/banco/matematica/`. Todas con 10 momentos (el primero sin recurso; recurso en situación, ejemplo «razona» y contraejemplo). SVG en `public/nudito/diagramas/matematica/` (`<prefijo>-<id>.svg`).

| Clave | Archivo | Recursos (id) |
|---|---|---|
| `mat.p1.colecciones-igual-cantidad` | `primaria-1/fichas/igualdades-y-equivalencias.json` | `platos-pregunta`, `lapices-borradores`, `fichas-tamanos`, `error-filas` (prefijo `colecciones-igual-cantidad`) |
| `mat.p2.comparar-masas-balanza` | `primaria-2/fichas/medicion-masa-y-tiempo.json` | `frutas-pregunta`, `sandia-naranja`, `orden-frutas`, `errores` (`comparar-masas-balanza`) |
| `mat.p3.centimetro-regla` | `primaria-3/fichas/c26-forma-movimiento.json` | `lapiz-pregunta`, `lapiz-nueve`, `cinta-cuatro-once`, `error-marcas` (`centimetro-regla`) |
| `mat.p4.completar-millar` | `primaria-4/fichas/c23-redondeo-completar-millar.json` | `colecta-pregunta`, `dos-mil-setecientos`, `seis-mil-ochocientos-cuarenta`, `error-meta` (`completar-millar`) |
| `mat.p5.comprobar-solucion-ecuacion` | `primaria-5/fichas/ecuaciones.json` | `propuesta-pregunta`, `suma-correcta`, `producto-incorrecto`, `error-operacion` (`comprobar-solucion-ecuacion`) |
| `mat.p6.comparar-fraccion-decimal-porcentaje` | `primaria-6/fichas/porcentajes.json` | `carrera-pregunta`, `tres-valores`, `dos-avances`, `error-formas` (`comparar-fraccion-decimal-porcentaje`) |

24 SVG de 640×480, texto ≥26 px, paleta crema/índigo/turquesa/maíz (+ rojo `#B5412A` solo para errores), texto ámbar `#8A5A00` y texto turquesa `#0C706E`, sin `<tspan>`, con `<title>`, nada pegado al borde. Se borraron los SVG huérfanos del intento anterior (`colecciones-igual-cantidad-estrellas`, `centimetro-regla-lapiz-catorce`, `centimetro-regla-borrador-dos-siete`, `comprobar-solucion-ecuacion-error-intermedia`). Generador de los SVG en el scratchpad de la sesión (no se versiona).

## Decisiones pedagógicas

- Estructura común: idea (sin imagen) → situación con variante «pregunta» → ejemplo 1 guiado y «razona» → ejemplo 2 guiado y «razona» → contraejemplo → tres pasos → comprobación nueva. Los guiados no llevan recurso ni dicen «dibujo/imagen/mira».
- 1.º: botones en dos platos (cinco y cinco, sin números en el recurso); parejas lápiz-borrador (cuatro); fichas pequeñas y grandes (seis); contraejemplo de la fila separada. Frases cortas. Comprobación: siete botones juntos frente a siete separados (b).
- 2.º: la situación muestra la balanza vacía (no revela quién baja); ejemplo 1 sandía-naranja; ejemplo 2 orden de tres frutas comparando de dos en dos; contraejemplo pelota grande contra piedra. Comprobación: durazno más abajo que papaya (a).
- 3.º: regla 0–12 con lápiz suelto en la situación; ejemplo 1 lápiz de cero a nueve; ejemplo 2 cinta de cuatro a once (siete saltos); contraejemplo contar rayas (cinco) en vez de espacios (cuatro). Comprobación: seis a catorce, ocho centímetros (c); distractores catorce y seis.
- 4.º: barra de colecta 4 300 → 5 000 en la situación (el tramo faltante lleva «?»); ejemplo 1 2 700 → 3 000 (trescientos); ejemplo 2 6 840 → 6 900 → 7 000 (sesenta más cien); contraejemplo confundir la meta con lo que falta (5 400 → 6 000, faltan seiscientos). Comprobación: 5 750 → 6 000, doscientas cincuenta (d), distractores de dígitos cercanos.
- 5.º: ecuaciones de un paso: situación con caja punteada «x = ?» (el valor de Luis se dice en la voz, no se fija en el dibujo); ejemplo 1 suma (46 + 24 = 70); ejemplo 2 producto (11 falla, 12 cumple); contraejemplo repetir la operación en lugar de sustituir (x − 15 = 40, propuesta 25). La letra se dice «equis» en toda la voz. Comprobación: probar tres números en equis menos nueve igual a veintiuno (c, treinta).
- 6.º: todo a porcentaje; situación con tres tarjetas (1/4, 0,2, 30 %); ejemplo 1 tres cuartos, cero coma siete, sesenta y cinco por ciento; ejemplo 2 tres décimos contra cero coma veinticinco en barras de cien por ciento; contraejemplo «veinticinco es más que cinco» con decimales. Comprobación: tres cuartos contra cero coma setenta, Rosa avanza más (b).
- Letras correctas por clave: b, a, c, d, c, b. Longitud de opciones: diferencia máxima 3 caracteres; la correcta nunca es la más larga.

## Verificaciones

- Cuentas recalculadas: 4 300 → 5 000 = 700 (no mostrado); 2 700 → 3 000 = 300; 6 840 + 60 = 6 900, + 100 = 7 000, total 160; 5 400 → 6 000 = 600; 5 750 → 6 000 = 250; 46 + 24 = 70; 6 × 11 = 66, 6 × 12 = 72; 25 − 15 = 10 (solución real 55); 30 − 9 = 21 (20 → 11, 40 → 31); 3/4 = 75 %, 0,7 = 70 %; 3/10 = 30 % > 0,25; 0,5 = 50 % > 0,25; 3/4 = 75 % > 0,70; 9 − 0 = 9; 11 − 4 = 7; 14 − 6 = 8.
- Ejercicios existentes de las 6 claves revisados y recalculados (los 12 de cada una, más los de p1 con 12 y p4 con 12): sin errores de contenido ni de grado. Observaciones menores, no son errores: `mat.p5.comprobar-solucion-ecuacion` e04 pide evaluar una expresión (5 × k), no una ecuación; `mat.p6` e01 y e03 usan «Escribe la forma que aparece en la pregunta», aceptable; `mat.p4` e06 tiene cuatro opciones mientras otros ejercicios de opción tienen tres (es válido).
- Script de lote: recursoRef ↔ recursos exactos y todos usados; 10 momentos; primer momento sin recurso; sin dígitos en narración, pregunta, opciones, mensaje, pista, alt y descripción (todo en palabras); sin «parte N de M»; sin «x/X» suelta; sin título repetido en su narración; sin palabras visuales («barra», «tarjeta», «recta», «mira», «observ») en momentos sin recurso (salvo la situación, que siempre lleva recurso); alt ≤ 200 y descripcion ≤ 500 (máximo 310); archivos SVG existentes (24 SVG, ninguno huérfano).
- SVG rasterizados con Chrome headless (`--headless=new`, sin ventana) y vistos antes de escribir alt y descripción. Correcciones durante el proceso: botones solapados y rozando el borde del plato; borrador sin forma reconocible (ahora con franja turquesa y cuerpo rosado); frutas rozando la viga de la balanza (platillos más bajos); etiquetas «2 700» y «+300» pegadas (marca del valor ahora debajo de la barra); `≠ 40` apretado en la tarjeta (ahora cruz y texto debajo); línea de escala suelta en `dos-avances`.
- `pnpm nudito:validar-banco`: banco válido (2 238 fichas activas, 27 034 ejercicios). `pnpm typecheck`: sin errores. `git diff --check` sobre los 6 JSON: limpio.

## Riesgos y pendientes

- Sin revisión independiente ni recorrido en navegador (audio, móvil, movimiento reducido).
- Los textos dentro de los SVG usan cifras y símbolos (`4 300`, `x + 24 = 70`, `×`, `−`, `%`); la narración y la descripción los dicen en palabras.
- p1 y p2: recursos esquemáticos (botones, lápices, frutas como círculos y óvalos); descritos así.
- p2: la situación muestra la balanza vacía y las frutas aparte; la frase «a la derecha hay una balanza vacía» depende de ese orden.
- p5: en la situación la caja dice «x = ?» mientras la voz dice que Luis propone cuarenta y seis; es intencional para no mostrar el valor.
- p6: `mat.p6` usa «cero coma setenta» en la comprobación (equivale a setenta por ciento); si se prefiere evitar la cola «cero», cambiar por «cero coma siete» y comparar con tres cuartos (75 %), igual resultado.
- Otras claves de los mismos archivos (p1: 2, p2/p3/p5/p6: 1) difieren de `HEAD` por trabajo de otros lotes; no son de este lote.
- No se actualizaron `estado-refuerzo-primaria.json`, specs ni bitácora (fuera del encargo).

## Correcciones tras la revisión independiente (`revision-lote-30.md`)

p2, p3, p4 y p5 aprobadas, sin cambios. Sin SVG modificados (no hubo que rerasterizar).

- `mat.p1.colecciones-igual-cantidad`: `ejemplo-2-guiado` (sin recurso) ya no pide contar algo invisible: «Un grupo tiene seis fichas pequeñas. El otro tiene seis fichas grandes. El tamaño puede engañar. Piensa: ¿cuál grupo tiene más?». Comprobación nueva (no repite la situación): dos cajas con cuatro lápices, parados y acostados; opciones «La primera caja tiene más» / «Tienen la misma cantidad» (b) / «La segunda caja tiene más»; mensaje y pista actualizados.
- `mat.p6.comparar-fraccion-decimal-porcentaje`: comprobación con Rosa (un medio) y Luis (cero coma cuatro), sin el cero final y sin repetir el par del ejemplo 1; opciones y letra b sin cambios; mensaje correcto según lo pedido.
- Revalidado: `validar-banco` válido, `typecheck` sin errores, `git diff --check` limpio.
