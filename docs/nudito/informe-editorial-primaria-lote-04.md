# Informe editorial · Primaria, Matemática, lote 04

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. No se tocaron estado, huellas, BD, specs ni componentes.

## Alcance

| Clave | Archivo del banco | Momentos | Recursos (ID) |
|---|---|---:|---|
| `mat.p2.patrones-aditivos` | `primaria-2/fichas/patrones-aditivos.json` | 10 | `ahorro-diario`, `recta-panes` (nuevos), `regla-mas-tres` (rehecho 640×480) |
| `mat.p3.grupos-iguales` | `primaria-3/fichas/c23-multiplicacion-division.json` | 10 | `cestas-choclos`, `paltas-recta` (nuevos), `bolsas-pan` (rehecho 640×480) |
| `mat.p4.fracciones-equivalentes` | `primaria-4/fichas/c23-fracciones-comprension.json` | 10 | `cintas-doce`, `tiras-mitad` (nuevos), `tiras-medio-cuartos` (rehecho 640×480) |
| `mat.p5.numeros-decimales` | `primaria-5/fichas/numeros-decimales.json` | 10 | `chocolate-diez`, `semillas-diez` (nuevos), `barra-diez` (rehecho 640×480) |
| `mat.p6.porcentajes` | `primaria-6/fichas/porcentajes.json` | 10 | `equivalencias`, `tres-cuartos` (nuevos), `cuartos-ochenta` (rehecho 640×480) |

Solo cambió el campo `claseGuiada` de cada clave (hunk único por archivo). Ejercicios, ids, respuestas y dificultad quedan intactos. Estructura común: idea sin imagen, situación visual, dos ejemplos (guiado + razonado), un momento de contraejemplo tomado de los errores frecuentes, tres pasos y comprobación nueva y específica (no repite ningún ejercicio del banco). Cada recurso se enlaza por `recursoRef`.

## Decisiones pedagógicas

- 2.º: el salto constante se descubre con monedas (sube dos) y con una recta (sube cinco); contraejemplo 4, 8, 12, 15.
- 3.º: grupos iguales como suma repetida (cestas, bolsas, paltas con saltos de dos); se advierte contra sumar grupos más cantidad (4 + 3) y contra grupos desiguales. Se anticipa la multiplicación sin formalizarla.
- 4.º: equivalencia por longitud cubierta en tiras iguales; cinta de 12 cm con regla (2/3 y 4/6 llegan a 8 cm); explica por qué (partir cada parte) y exige misma unidad.
- 5.º: décimo con coma; distingue 0,2 de 2,0; complemento (10 décimos menos 8 = 2 décimos).
- 6.º: tabla de equivalencia porcentaje-fracción como mapa; 25 % de 80, 10 % de 80 y 75 % de 40; el 20 % se menciona como un quinto; contraejemplo de porcentaje mayor que el total.
- Narración: números y operaciones en palabras; las fracciones y porcentajes se dicen completos. La descripción de cada recurso se agrega automáticamente por el reproductor, así que la narración no la repite íntegra.

## SVG (viewBox 640×480, 4:3, paleta spec 18: crema, índigo, turquesa, maíz)

Nuevos, en `public/nudito/diagramas/matematica/`: `patrones-aditivos-ahorro.svg`, `patrones-aditivos-recta-cinco.svg`, `grupos-iguales-cestas.svg`, `grupos-iguales-recta-dos.svg`, `fracciones-equivalentes-cinta.svg`, `fracciones-equivalentes-mitad.svg`, `decimales-chocolate.svg`, `decimales-semillas.svg`, `porcentajes-equivalencias.svg`, `porcentajes-tres-cuartos.svg`. Rehechos tras la revisión independiente (texto ≥ 26 px; los antiguos de 560×190 se conservan sin uso en estas clases): `patrones-aditivos-regla.svg`, `grupos-iguales-bolsas.svg`, `fracciones-equivalentes-medio-cuartos.svg`, `decimales-barra-seis.svg`, `porcentajes-cuartos-ochenta.svg`. Los 15 SVG se renderizaron en Chrome headless y se inspeccionaron antes de escribir alt y descripción; se corrigieron solapes (pie de la alcancía, margen derecho de la recta, centrado de semillas).

## Verificación y comandos

- Cálculos recalculados dos veces (script y a mano): 2,5,8,11→14; 3,6,9,12→15,18,21; 5→…→25,30; 4×… suma repetida 15, 12, 10, 24; 12·2/3 = 12·4/6 = 8 cm; 2/6 = 1/3; 10 − 8 = 2; 80/4 = 20, 80/10 = 8, 40/4·3 = 30, 160/4·3 = 120.
- `pnpm nudito:validar-banco`: banco válido, 2 238 fichas activas, 27 034 ejercicios.
- `pnpm typecheck`: sin errores.
- `git diff --check` sobre banco de Matemática y diagramas: limpio.
- Comprobado por script: sin «Atención:» ni «¿Es verdad», sin «3x4» en narración, primer momento sin recurso, todos los recursos referenciados.
- ESLint no aplica (solo JSON y SVG).

## Riesgos y pendientes

- No se recorrió el flujo en navegador con audio, móvil ni movimiento reducido; falta la revisión independiente (pedagógica, factual, visual, oral).
- 5.º: las opciones de la comprobación están en palabras («Cero coma siete», «Siete coma cero», «Cero coma cero siete») para que el audio no dependa de leer la coma.
- Los diagramas usan texto en SVG (≥ 26 px sobre 640); revisar lectura en móvil pequeño.
- No se actualizaron `estado-refuerzo-primaria.json`, spec 50 ni bitácora (fuera del encargo).

## Correcciones tras la revisión independiente (`revision-lote-04.md`)

Corregidos los 8 defectos: título de p2 `ejemplo-1-razona`; `recursoRef` de p3 `paso-2` y `paso-3` a `cestas-choclos`; cinco SVG rehechos a 640×480; p5 frase de `ejemplo-2-razona` y opciones en palabras; p6 narración de los cuatro pares y aclaración del veinte por ciento; «ten presente» en p2 y p3. Validaciones repetidas: banco válido (2 238 fichas, 27 034 ejercicios), typecheck y `git diff --check` limpios.
