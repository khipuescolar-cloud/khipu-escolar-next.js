# Revisión independiente — lote 50 (Matemática primaria)

Revisor: Claude (no autor del lote). Solo lectura sobre banco y recursos.

## Verificaciones técnicas (E)
- `nudito-lint-clase-guiada` (5 claves): 0 errores, 0 avisos; 1 nota informativa (`ficha-correcta-mas-larga` mat.p2 e01).
- `nudito-validar-banco`: «Banco válido: 2238 fichas activas; 27034 ejercicios».
- `tsc --noEmit`: sin errores (`pnpm` no existe en el entorno; se usó `node_modules/.bin`).
- Comparado con HEAD por JSON: en las 5 claves solo cambió `claseGuiada`. Sin ediciones de ejercicios.
- SVG: 20 archivos, 20 referencias en los 5 `recursos` (4 por clave); sin huérfanos, sin duplicados (md5), todos con `<title>`, sin `<tspan>`, textos ≥26 px, ámbar solo #8A5A00.
- Contenido (A) y vocabulario oral (F): todas las cuentas recalculadas y correctas (4+6=10→8+12=20; 12=6+6→6=3+3; 16=10+6→8=5+3; 156=120+36→13; 84=70+14→12; 168=120+48→14; 42−7=35<36; 3 categorías en perro/gato/conejo; 6-8-10-12 de 2 en 2). Respuesta única, letras B/A/D/B/C sin repetición, correcta nunca la más larga ni con diferencia >3.

## mat.p1.explicar-como-crece — CAMBIOS
Archivo: primaria-1/fichas/patrones-aditivos.json
1. Recurso `fichas-pregunta` (explicar-crece-fichas-pregunta.svg): los rótulos «Primero» (x=105, 30 px) y «Luego» casi tocan el borde de la tarjeta (tarjeta 120 px de ancho, texto ≈112 px). Reducir a un texto que quepa con ≥12 px de margen (p. ej. «1.º», o ensanchar tarjetas y separar).
2. Mismo SVG: la secuencia de rótulos «Primero, Luego, Tercero» es incoherente (falta «Segundo»; «Luego» no es ordinal). Usar «Primero, Segundo, Tercero» o «Uno, Dos, Tres», y actualizar `descripcion` en igual sentido.
3. Mismo SVG y `fichas-uno`: las fichas (círculos) de las tarjetas 2 y 3 se tocan entre sí y rozan el borde de la tarjeta; separar 6–8 px o reducir radio.
4. `error-salto`: el `alt` dice «cruz sobre el salto distinto» pero la cruz está debajo del rótulo «+1» (la `descripcion` dice «bajo el segundo cambio»); además el tercer salto («+1») también difiere de +2 y no está marcado. Alinear `alt` con la `descripcion` («cruz bajo el segundo cambio») o marcar ambos saltos distintos.
Menor (G, ejercicio existente, no bloquea): e10 tiene la correcta («En el último salto aumenta solo 1», 33 car.) la más larga y la diferencia con «No hay ningún error» es 14. Corrección mínima: acortar a «El último salto aumenta solo 1» (30) y alargar c a «No hay ningún error en ella» (27) y d a «La secuencia va hacia atrás» (27).

## mat.p2.datos-cualitativos — CAMBIOS
Archivo: primaria-2/fichas/recogida-y-organizacion-de-datos.json
1. Recurso `encuesta-pregunta` (datos-cualitativos-encuesta-pregunta.svg): «Lomo saltado» y «Ají de gallina» (27 px) llenan la tarjeta de 170 px y tocan el borde. Ensanchar tarjetas (≈190, como en `platos-agrupados`) o dividir el texto en dos líneas ≥26 px.
2. Recurso `platos-agrupados`: los títulos «Lomo saltado» y «Ají de gallina» (26 px negrita) tocan los bordes de sus cajas (190 px); además la separación entre la 2.ª y la 3.ª caja es de 11 px (x 415→426), casi pegadas. Igualar separación (≈20 px) y dar margen al texto (p. ej. dos líneas «Lomo / saltado», «Ají de / gallina» a 26–28 px, o cajas más anchas reduciendo el hueco lateral).
3. Narración de `ejemplo-1-razona`/`paso-2`: correcta; sin defecto. (Sin cambios en audio.)
G (ejercicio existente, afecta al alumno: pista y forma delatan la respuesta). e01: correcta «Mi plato favorito es el ceviche» (31) frente a 12 y 14 caracteres. Corrección mínima: a «Tengo 7 años de edad» (20), b «Me gusta mucho el ceviche» (25)… mejor igualar: a «Tengo siete años de edad» (24), b «Mi plato favorito: ceviche» (26), c «Tengo dos hermanos más» (23); retroalimentación equivalente.

## mat.p4.duplicar-repartir-lados — APROBADA
Archivo: primaria-4/fichas/igualdades-y-equivalencias.json
Sin defectos bloqueantes. Primer momento sin imagen; recursos coinciden con `alt`/`descripcion`; contraejemplo (8+12=10: izquierda 20, derecha 10) correcto; comprobación D («Ocho igual a cinco más tres», 27 car.) con opciones de 26–28 caracteres, respuesta única.
Observaciones opcionales (no condicionan): (a) la flecha doble de `igualdad-pregunta` es ambigua (sugiere equivalencia, no «duplicar»); podría quitarse o sustituirse por «×2 / ÷2» sin revelar. (b) En `error-un-lado` la cruz queda entre los rótulos «Izquierda: 20» y «Derecha: 10» a ~10 px del primero; separar un poco.

## mat.p5.descomponer-dividendo — CAMBIOS
Archivo: primaria-5/fichas/operaciones-con-naturales.json
1. Recurso `libros-pregunta` (descomponer-dividendo-libros-pregunta.svg): «en cada estante» (30 px, ≈215 px) ocupa casi todo el ancho de la tarjeta punteada (x 355–580, 225 px) y toca el borde. Dividir en «en cada / estante» o reducir ancho de texto con ≥12 px de margen y actualizar si cambia la `descripcion`.
2. Recurso `panes`: seis óvalos solapados «decoran» el centro de una tarjeta que habla de 84 panes y 7 puestos; la cantidad dibujada (6) contradice 84 y no coincide con ningún dato (7 puestos). Quitar los óvalos o reemplazarlos por una imagen sin conteo (y ajustar `descripcion`, que hoy dice «Seis panes amarillos decoran el centro»).
3. G (finalizador señaló e09/e10/e12 «correcta la más larga»): no aplica. e09 es numérica, e12 verdadero/falso y e10 tiene opciones de 12 caracteres todas; las cuentas de e01–e12 son correctas. Sin corrección.

## mat.p6.desigualdades-signos — CAMBIOS
Archivo: primaria-6/fichas/desigualdades.json
1. Recurso `tapitas-pregunta` (desigualdades-tapitas-pregunta.svg): `alt` y `descripcion` presentan «treinta y seis tapitas» y «veintinueve tapitas», pero se dibujan 6 y 5 círculos (marcadores con valor falso). Además el momento `ejemplo-1-guiado` habla de «tres decenas» y «dos decenas», que tampoco corresponden a 6 y 5. Dibujar tres barras de decena + 6 sueltas y dos barras + 9 (o eliminar los círculos y dejar solo las tarjetas numéricas) y ajustar `descripcion`.
2. `tapitas-resuelto` y `edad`: sin defectos visuales ni de texto; `edad` renderiza completo.
Menor (G, no bloquea): e06 retroalimentación «Es falso: 7 = 7; para x < 7…» es confusa; sugerida «Es falso: 7 no es menor que 7; sirven valores como 6, 5, 4…».

## Ronda 2

Revisor: Claude (independiente). Verificado: lint-clase-guiada (4 claves) 0 errores/0 avisos; `nudito:validar-banco` «Banco válido: 2238 fichas activas; 27034 ejercicios»; `tsc --noEmit` sin errores (`pnpm` no existe; se usó `node_modules/.bin`). SVG cambiados rasterizados con Chrome headless y revisados; `alt`/`descripcion` coinciden con los dibujos. Comparado con HEAD por JSON: solo cambian `claseGuiada` y los ejercicios autorizados/menores listados abajo.

- **mat.p1.explicar-como-crece — APROBADA.** Rótulos «Uno, Dos, Tres» con margen; círculos separados en `fichas-pregunta`/`fichas-uno`; `alt` de `error-salto` alineado con la `descripcion` (cruz bajo el 2.º cambio). e10: opciones 30/27/27, correcta ya no la más larga. Obs. menor: el 3.er salto (+1) tampoco es +2 y queda sin cruz (aceptado por la opción de ronda 1).
- **mat.p2.datos-cualitativos — APROBADA.** Títulos en dos líneas ≥26 px, cajas separadas 20 px, sin tocar bordes (el «Ají de» de `encuesta-pregunta` queda justo pero sin tocar). e01 (edición autorizada): id/dificultad/respuesta intactos; opciones de 26 car. cada una, respuesta única (solo «Mi plato favorito: ceviche» es cualitativo); solo cambian opciones y retroalimentación.
- **mat.p5.descomponer-dividendo — APROBADA.** «en cada / estante» en dos líneas con margen; `panes` sin óvalos (84=70+14, 70÷7=10, 14÷7=2, 12); `descripcion` coherente.
- **mat.p6.desigualdades-signos — APROBADA.** `tapitas-pregunta`: 3 barras+6 sueltas=36 y 2 barras+9=29, coincide con alt/descripcion y «tres/dos decenas». e06 retroalimentación corregida; ningún otro ejercicio tocado.
- mat.p4.duplicar-repartir-lados: ya APROBADA en ronda 1.
- Nota fuera de alcance: en esos mismos archivos también cambió `claseGuiada` de mat.p2.lista-de-datos y mat.p5.operaciones-combinadas (no son del lote revisado).
