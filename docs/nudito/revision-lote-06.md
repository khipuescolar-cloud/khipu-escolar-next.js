# Revisión independiente, lote 06 (Matemática 5.º, claseGuiada)

Revisor independiente, solo lectura. No leí `informe-editorial-primaria-lote-06.md`.

## Veredictos

| Clave | Veredicto |
|---|---|
| mat.p5.area-rectangulos | CAMBIOS (D1, D2, D3) |
| mat.p5.ecuaciones-simples | CAMBIOS (D1, D3) |
| mat.p5.operaciones-combinadas | CAMBIOS (D1, D3) |
| mat.p5.patrones-regla-formacion | CAMBIOS (D1, D3) |
| mat.p5.proporcionalidad-tablas | CAMBIOS (D1, D3) |
| mat.p5.suma-resta-fracciones | CAMBIOS (D1, D3) |

Sin defectos de exactitud ni técnicos. Los cambios son de posición de la respuesta y de coherencia momento-imagen.

## Defectos

1. **D1, las 6 claves.** La respuesta correcta de la comprobación es `a` en las seis (pista de posición, defecto recurrente de lotes previos). Corrección: variar la letra reordenando opciones sin tocar textos, p. ej. area `b`, ecuaciones `c`, operaciones `a`, patrones `c`, proporcionalidad `b`, fracciones `c`; actualizar `respuesta`.
2. **D2, area-rectangulos, comprobación.** El distractor «Veinte metros» (el perímetro) se descarta por la unidad sin razonar. Corrección: «Veinte metros cuadrados» para que el error sea de cálculo, no de unidad.
3. **D3, imagen que revela el resultado antes de razonarlo (recursoRef de «guiado» que muestra el paso siguiente).**
   - ecuaciones, `ejemplo-1-guiado` (naranjas): el SVG ya muestra «12 − 5 = 7»; la narración termina en «le quitamos la parte conocida».
   - operaciones, `ejemplo-1-guiado` (galletas): muestra «7 + 12 = 19»; la narración solo llega a 12. `ejemplo-2-guiado` (stickers): muestra 25 y 31; la narración llega a 15.
   - patrones, `ejemplo-1-guiado` (tabla): muestra el quince verde y el «+5» que se deduce en `ejemplo-1-razona`. `ejemplo-2-guiado` (album): muestra el trece y el «+4», deducidos en `ejemplo-2-razona`.
   - proporcionalidad, `ejemplo-1-guiado` (entradas): muestra la fila resaltada «5 → 35». `ejemplo-2-guiado` (cinta): muestra «1 → 4» y «5 → 20».
   - fracciones, `ejemplo-1-guiado` (doceavos): muestra «cinco doceavos»; `ejemplo-2-guiado` (tanque): muestra «2/10 = 1/5».
   - area, `ejemplo-2-razona` (corral): narra grupos de dos cuadritos y seis bolsas, pero el SVG no tiene grupos de dos y además muestra el borde de catorce metros (ruido antes del contraejemplo). `ejemplo-2-guiado` ya enseña ese «Borde: 14 m».
   
   Corrección sugerida: avisar en la narración («en el dibujo ya aparece el resultado, pero vamos a ver por qué sale») o pasar el `recursoRef` al momento «razona»; en area-corral, usar solo `corral` para guiado y no referenciarlo en `ejemplo-2-razona`, o describir la imagen que sí se ve.
4. **Menor, patron-album-figuritas.** El rótulo «Semana» queda pegado al borde inferior y casi toca el «3»; legible, pero ajustado. Opcional.

## Comprobaciones hechas

- Exactitud (recalculé a mano y por revisión de cada cuenta): 6×3=18; 8×5=40; 4×3=12, 12÷2=6, perímetro 14; 7×3=21 (distractores 20=perímetro, 10); x+3=10→7; 12−5=7; 20−8=12 (28→36); x+7=18→11 (25, 12 son errores plausibles); 7+4×3=19 (33 por error); 40−3×5+6=31; 18−2×5+4=12 (84, 4 plausibles); saltos 2,3,4→15; 3,4,6,9→13; 6,9,14,21 saltos 3,5,7,9→30 (28, 24 plausibles); 7×5=35; 12÷3=4, ×5=20; 15÷5=3, 8×3=24 (23, 18 plausibles); 3/6+2/6=5/6; 1/4+1/6=5/12 (error «2/10» < 1/4 correcto); 7/10−5/10=2/10=1/5; 1/3+1/4=7/12 (2/7 y 5/12 plausibles). Todo correcto; una sola respuesta correcta por comprobación; `respuesta` coincide con el id.
- Voz: sin «Atención:», sin «¿Es verdad que…» introductorio, sin «recuerda» inicial; números en palabras (también en opciones); «equis» para la x. Edad 5.º adecuada.
- Recursos: los 18 SVG existen y se renderizaron en Chrome headless a 360 px; sin solapes ni recortes; texto legible; alt y descripcion fieles al dibujo (conté: 6×3 losetas, 8×5 con primera fila amarilla, 3 + 10 granos, 7 sueltas + 4 bolsas de 3, 1-3-6-10 latas, barras 3-4-6-9-13). Sin `recursoRef` rotos, sin recursos sin usar, idea sin imagen, 3 recursos distintos por clave.
- Técnica: `pnpm nudito:validar-banco` OK (2238 fichas, 27034 ejercicios); `pnpm typecheck` OK. `git diff` en los 6 JSON: 688 inserciones y 6 eliminaciones; las 6 eliminadas son `"revisado": null` (reemplazado al añadir claseGuiada); ejercicios y respuestas intactos. claseGuiada v1, ids únicos.

## Pendiente (no comprobado)

- Audio real (voz del navegador, sincronía, lectura de opciones) y recorrido en la app (teoría, comprobación, práctica, móvil, movimiento reducido); los SVG se vieron aislados, no dentro del componente.
- Huellas editoriales y aprobación editorial.
