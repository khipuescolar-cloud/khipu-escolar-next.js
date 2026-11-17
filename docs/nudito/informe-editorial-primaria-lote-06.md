# Informe editorial · Primaria, Matemática 5.º, lote 06

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. No se tocaron estado, huellas, BD, specs, componentes ni otras fichas.

## Alcance

| Clave | Archivo (`src/lib/nudito/conocimiento/banco/matematica/primaria-5/fichas/`) | Momentos | Recursos (ID → SVG) |
|---|---|---:|---|
| `mat.p5.area-rectangulos` | `perimetro-y-superficie.json` | 10 | `terraza`, `patio`, `corral` |
| `mat.p5.ecuaciones-simples` | `ecuaciones.json` | 10 | `balanza`, `naranjas`, `soles` |
| `mat.p5.operaciones-combinadas` | `operaciones-con-naturales.json` | 10 | `orden`, `galletas`, `stickers` |
| `mat.p5.patrones-regla-formacion` | `patrones.json` | 10 | `latas`, `album`, `tabla` |
| `mat.p5.proporcionalidad-tablas` | `proporcionalidad.json` | 10 | `canastas`, `entradas`, `cinta` |
| `mat.p5.suma-resta-fracciones` | `fracciones.json` | 10 | `sextos`, `doceavos`, `tanque` |

Solo cambió el campo `claseGuiada` de cada clave (un hunk por archivo; la única otra línea tocada es la coma tras `"revisado": null`). Ejercicios, ids, respuestas y dificultad intactos. Estructura: idea sin imagen, situación visual, dos ejemplos (guiado + razonado), contraejemplo del error frecuente, tres pasos, comprobación nueva de una sola respuesta correcta. Cada recurso se enlaza por `recursoRef` y se comprobó por script que no hay refs rotas ni recursos sin usar.

## Decisiones

- Cada recurso narrado muestra exactamente lo que la voz dice: p. ej. en patrones, la quinta barra (13) y la columna 15 se dibujaron en color distinto porque la narración las predice; en proporcionalidad la tabla incluye la fila 4 → 28 que usa el contraejemplo.
- Áreas: situación (6×3 = 18), patio 8×5 = 40, corral 4×3 = 12 con seis bolsas de paja; el contraejemplo contrasta borde (14 m) con área (12 m²). Distractor de la comprobación: 7+3+7+3 = 20 (perímetro) y 7+3 = 10.
- Ecuaciones: balanza, barra x+5 = 12, comprobación x+8 = 20 (28 no sirve, 12 sí). Comprobación x+7 = 18 → 11; distractores 25 (sumar) y 12.
- Operaciones: esquema de orden; 7+4×3 = 19 (error 33); 40−3×5+6 = 31. Comprobación 18−2×5+4 = 12; distractores 84 (izq. a der. sin jerarquía) y 4 (sumar antes de restar).
- Patrones: latas 1,3,6,10 (saltos 2,3,4), álbum 3,4,6,9,13, comprobación 6,9,14,21 → 30; distractores 28 y 24.
- Proporcionalidad: canastas de 5, entradas S/ 7 (5 → 35), cinta 3 m → 12 lazos (÷3, ×5 = 20). Comprobación 5 kg = S/ 15 → 8 kg = S/ 24; distractores 23 (aditivo) y 18.
- Fracciones: 1/2+1/3 en sextos, 1/4+1/6 = 5/12, 7/10−1/2 = 1/5 (con simplificación). Contraejemplo (2/10 < 1/4) sin imagen; comprobación 1/3+1/4 = 7/12.
- Cifras y opciones numéricas dichas en palabras (también ecuaciones: «equis»); sin dígitos en narraciones ni comprobación; sin «Atención:», sin «¿Es verdad…», «ten presente» no aparece (idea sin «recuerda»).
- Se descartó un cuarto SVG (error de fracciones) para mantener 3 recursos por clave.

## SVG nuevos (`public/nudito/diagramas/matematica/`, 640×480, texto ≥ 26 px, paleta spec 18)

`area-terraza-losetas`, `area-patio-ocho-por-cinco`, `area-borde-y-cuadritos`, `ecuacion-balanza-granos`, `ecuacion-barra-naranjas`, `ecuacion-comprobar-soles`, `operaciones-orden-prioridad`, `operaciones-galletas-sueltas-y-bolsas`, `operaciones-stickers-pasos`, `patron-latas-apiladas`, `patron-album-figuritas`, `patron-tabla-saltos`, `proporcionalidad-canastas-duraznos`, `proporcionalidad-tabla-entradas`, `proporcionalidad-tabla-cinta`, `fracciones-medio-y-tercio-sextos`, `fracciones-torta-doceavos`, `fracciones-tanque-diez`. No se reutilizó ningún SVG existente. Renderizados con Chrome headless a 360 px de ancho y corregidos (solapes de los saltos en latas y álbum, rótulo «Semana», rótulo suelto en canastas) antes de escribir alt y descripción. Generador y capturas en el scratchpad de la sesión (no en el repo).

## Comandos y resultados

- `pnpm nudito:validar-banco`: banco válido, 2 238 fichas, 27 034 ejercicios.
- `pnpm typecheck`: sin errores.
- `git diff --check` (banco primaria-5 y diagramas): limpio.
- Script: todas las cifras recalculadas con asserts (enteros y `Fraction`), un hunk por archivo, 10 momentos, primer momento sin recurso.

## Riesgos y pendientes

- No se recorrió en navegador con audio real, móvil ni movimiento reducido; falta la revisión independiente (pedagógica, factual, visual, oral).
- Texto de SVG a 360 px queda en ~15 px (26 px sobre 640); revisar lectura en móvil pequeño.
- Fracciones y ecuaciones escritas como «1/4» o «x + 5» dentro de los SVG; la narración las dice completas.
- No se actualizaron `estado-refuerzo-primaria.json`, spec 50 ni bitácora.

## Correcciones tras la revisión independiente (`revision-lote-06.md`)

- Letra correcta variada: area b, ecuaciones c, operaciones a, patrones c, proporcionalidad b, fracciones c; opciones reordenadas sin orden numérico. Area: distractor ahora «Veinte metros cuadrados».
- Imágenes que adelantaban el resultado: los momentos «guiado» de ecuaciones (naranjas, soles), operaciones (galletas, stickers), patrones (tabla, álbum), proporcionalidad (entradas, cinta) y fracciones (doceavos, tanque) quedan sin recurso y se reescribió su narración para no aludir al dibujo; el recurso aparece en el momento «razona».
- Area `ejemplo-2-razona`: nuevo SVG `area-corral-bolsas-paja.svg` (seis parejas de cuadritos con borde grueso, rendericado y revisado), recurso `paja`; `corral` queda para el contraejemplo. Area pasa a 4 recursos (excepción a «2–3»).
- `patron-album-figuritas.svg`: barras subidas 20 px y rótulo «Semana» separado del borde.
- Revalidado: `pnpm nudito:validar-banco` (2 238 fichas, 27 034 ejercicios), `pnpm typecheck` y `git diff --check` limpios; un hunk por archivo.
