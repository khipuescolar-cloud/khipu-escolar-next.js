# Informe editorial · Primaria, Matemática, lote 05

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. No se tocaron estado, huellas, BD, specs, componentes ni contratos.

## Alcance

Solo cambió el campo `claseGuiada` de cada clave (ids, respuestas y dificultad de los ejercicios intactos; el diff solo agrega líneas).

| Clave | Archivo del banco (`src/lib/nudito/conocimiento/banco/matematica/`) | Momentos | Recursos (ID) |
|---|---|---:|---|
| `mat.p2.igualdades-equilibrio` | `primaria-2/fichas/igualdades-y-equivalencias.json` | 10 | `balanza-seis` (existente), `mas-tres`, `desigual` |
| `mat.p2.medir-longitudes` | `primaria-2/fichas/longitud.json` | 10 | `lapiz-clips`, `puerta-pies-pasos` |
| `mat.p2.suma-resta-hasta-100` | `primaria-2/fichas/adicion-y-sustraccion-hasta-100.json` | 10 | `decenas-suma`, `decenas-resta` |
| `mat.p2.valor-posicional` | `primaria-2/fichas/numeracion-hasta-100.json` | 10 | `treinta-seis`, `billetes-54` |
| `mat.p4.division-una-cifra` | `primaria-4/fichas/c23-multiplicacion-division-calculo.json` | 10 | `reparto-648`, `pasos-735` |
| `mat.p4.multiplicacion-varias-cifras` | `primaria-4/fichas/c23-multiplicacion-division-calculo.json` | 10 | `mult-243`, `mult-1256` |
| `mat.p4.fraccion-de-cantidad` | `primaria-4/fichas/c23-fracciones-comprension.json` | 10 | `canicas`, `semillas` |
| `mat.p4.igualdades-dos-equivalencias` | `primaria-4/fichas/igualdades-y-equivalencias.json` | 10 | `arreglos`, `cuyes` |
| `mat.p4.patrones-aditivos-multiplicativos` | `primaria-4/fichas/patrones.json` | 10 | `monedas`, `cuyes-mes` |
| `mat.p4.perimetro-poligonos` | `primaria-4/fichas/longitud-y-perimetro.json` | 10 | `triangulo`, `rectangulo` |

Estructura común: idea sin imagen, situación visual, dos ejemplos (guiado + razonado), momento de contraejemplo/error frecuente, tres pasos y comprobación nueva con una sola respuesta correcta. Recursos enlazados solo por `recursoRef`.

## Decisiones pedagógicas

- 2.º (consignas cortas, objetos contables): balanza con fichas (poner/quitar lo mismo en ambos lados; contraejemplo quitando solo de un lado); clips y pies/pasos (unidad pegada, número con unidad, unidad más pequeña da número mayor); barras de decena y cubitos de unidad para 21 + 13 y 53 − 21 sin canje; valor posicional con barras/cubitos (36) y billetes de 10 soles con monedas (54).
- 4.º: división por posiciones con reparto de 648 entre 3 y 735 entre 5, contraejemplo del cero en el cociente (804 ÷ 4); multiplicación vertical con llevadas (243 × 3, 1256 × 4) con estimación y contraejemplo de llevada olvidada (629); fracción de cantidad por grupos (3/4 de 20, 2/5 de 30); igualdad entre productos con arreglos y cajas de cuyes, contraejemplo 5 × 4 y 2 × 8; patrón aditivo (monedas) frente a multiplicativo (cuyes) y secuencia que no es ninguno; perímetro de triángulo y rectángulo, contraejemplo de multiplicar largo por ancho.
- Comprobaciones nuevas (no repiten ejercicios del banco): huevos 45 − 23; billetes 4×10 + 5; sacos 612 ÷ 6 = 102; plantones 6 × 238 = 1428; gallinas 2/3 de 36 = 24; 5 × 8 = 4 × □ (10); secuencia 5, 15, 45, 135; cancha 25 y 14 (78 m); balanza 8 y 4; palmo grande o pequeño.
- Narración: números y operaciones en palabras; sin dígitos en narración, alt ni descripciones (verificado por script). Las opciones usan palabras y unidad.

## SVG (viewBox 640×480, paleta spec 18, texto ≥ 26 px)

Nuevos en `public/nudito/diagramas/matematica/` (20): `igualdades-equilibrio-mas-tres`, `igualdades-equilibrio-desigual`, `longitud-clips-lapiz`, `longitud-pies-pasos`, `suma-resta-bloques-suma`, `suma-resta-bloques-resta`, `valor-posicional-treinta-seis`, `valor-posicional-billetes`, `division-reparto-648`, `division-pasos-735`, `multiplicacion-243-por-3`, `multiplicacion-1256-por-4`, `fraccion-canicas-tres-cuartos`, `fraccion-semillas-dos-quintos`, `igualdades-productos-arreglos`, `igualdades-cuyes-cajas`, `patrones-monedas-mas-cinco`, `patrones-cuyes-por-tres`, `perimetro-triangulo-chacra`, `perimetro-rectangulo-patio` (todos con extensión `.svg`). Reutilizado: `igualdad-balanza-seis.svg` (600×450, sin texto). Todos se renderizaron en Chrome headless y se inspeccionaron antes de escribir alt y descripción; se corrigió el arco del patrón aditivo (subía sobre las casillas) y los títulos del patrón.

## Verificación y comandos

- Script de recálculo de todas las cifras (sumas, restas, cocientes, productos, fracciones, perímetros, 30²+40²=50²): sin discrepancias.
- Script de estructura: 10 momentos por clave, idea sin recurso, todo `recursoRef` existe y todo recurso se usa, archivos SVG existentes, sin «Atención:», sin «¿Es verdad», sin «parte N de M».
- `pnpm nudito:validar-banco`: banco válido, 2 238 fichas activas, 27 034 ejercicios.
- `pnpm typecheck`: sin errores.
- `git diff --check` (banco de Matemática y diagramas): limpio. ESLint no aplica (JSON y SVG).

## Riesgos y pendientes

- No se recorrió el flujo en navegador con audio, móvil ni movimiento reducido; falta revisión independiente (pedagógica, factual, visual, oral).
- `balanza-seis` es 600×450 (4:3 pero distinto viewBox) y sin texto; su descripción se escribió según su `<desc>`.
- Los ejemplos 2 y 4 de la clave de igualdades de 2.º (momentos «ahora con números» y «ahora quitamos») no llevan recurso por no haber imagen que los ilustre fielmente.
- Las descripciones de los SVG con texto leen el contenido de las etiquetas; revisar duplicación con la narración al escuchar.
- No se actualizaron `estado-refuerzo-primaria.json`, spec 50 ni bitácora (fuera del encargo).
- Los archivos de banco se reescribieron con `json.dumps(indent=2)`; el diff solo agrega líneas, pero otros agentes editando los mismos archivos en paralelo podrían pisarse (`c23-fracciones-comprension.json` ya contenía el lote 04).

## Correcciones tras la revisión independiente

- `mat.p2.igualdades-equilibrio` paso-3: la narración ahora describe el caso exacto del recurso `desigual` (nueve y cinco, cuatro quitados solo del lado derecho).
- `mat.p4.igualdades-dos-equivalencias` ejemplo-1-guiado: se quitó el recurso para no adelantar la respuesta; la imagen aparece en la situación, en el momento razonado y en el paso 1.
- `mat.p4.fraccion-de-cantidad` paso-3: se eliminó la frase suelta «Responde con una oración completa.».
- `mat.p4.patrones-aditivos-multiplicativos` situacion-monedas: la narración dice «monedas», igual que alt y descripción.
- Posición de la respuesta correcta redistribuida: a = suma-resta, división, fracción de cantidad, patrones; b = medir longitudes, perímetro; c = igualdades 2.º, valor posicional, multiplicación, igualdades 4.º. Opciones reordenadas sin orden numérico ni pistas de longitud.
- Revalidado: `pnpm nudito:validar-banco`, `pnpm typecheck` y `git diff --check` sin errores.
