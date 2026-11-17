# Revisión independiente · Primaria, Matemática, lote 46

Fecha: 2026-11-16. Revisor independiente (no escribió el lote). Solo lectura sobre banco y recursos.

## Resultado

| Clave | Veredicto |
|---|---|
| `mat.p1.construir-con-bloques` | **CAMBIOS** |
| `mat.p2.base-diez-y-abaco` | **APROBADA** |
| `mat.p3.comparar-longitudes` | **CAMBIOS** (menores) |
| `mat.p4.desarrollo-cubo` | **APROBADA** |
| `mat.p5.construir-cuadrilateros` | **CAMBIOS** |
| `mat.p6.area-unidades-cuadradas` | **APROBADA** |

## Verificación técnica (E)

- `nudito-lint-clase-guiada.ts` (6 claves): 0 errores, 8 avisos `descripcion-larga` (250–354 caracteres; el tope duro es 500, no son defectos). Los `i ficha-correcta-mas-larga` son de ejercicios preexistentes (no tocados).
- `tsc --noEmit`: sin errores. `nudito-validar-banco.ts`: «Banco válido: 2238 fichas; 27034 ejercicios».
- Comparado por JSON contra `HEAD` (repo interno): en las 6 claves solo cambió `claseGuiada`; los 12 ejercicios de cada una intactos.
- 29 SVG rasterizados en Chrome headless y revisados. Sin `<tspan>` (el único del banco es de otra clave), texto ≥ 26 px, nada fuera de márgenes (cálculo de cajas de texto), texto ámbar solo `#8A5A00`, turquesa de texto `#0C706E`. Todos los `recursoRef` existen y se usan; primer momento sin recurso; ningún dígito ni «parte N de M» en la narración; momentos sin recurso no dicen «mira/dibujo/imagen».
- Cálculos recomprobados: 20+5=25; 40+1=41; 12<16<20 y 45<55<60; 6+1=7; 9+1=10; 12+4/2=14; rectángulo base 9 → lado 9; romboide 5×3 con 60°/120°. Fila de seis cuadrados: 1↔5 y 2↔6 caen juntos (correcto). Proporciones de SVG correctas (cintas 15 px/cm; rectángulo 300×200 = 6×4; romboide lado 150/250 = 3/5, ángulo 59,7°).
- Nota: `pnpm` no está en el PATH de esta sesión; se ejecutó con `node_modules/.bin/tsx` y `tsc`.

## `mat.p1.construir-con-bloques` — CAMBIOS

1. `primaria-1/fichas/formas-del-entorno.json`, momento `ejemplo-2-razona` + recurso `camion` (alt, descripcion) + `construir-con-bloques-camion.svg`: la narración dice «Una caja pequeña con ventana hace de cabina», pero la mesa de la situación solo tiene tres cubos, una esfera, **una** caja larga y dos cilindros; la cabina (bloque alto con ventana) es una pieza que no existe en la situación. Corregir: quitar la cabina (narración, alt, descripcion y dibujo) o decir que la cabina es un cubo y dibujarla como cubo.
2. `ejemplo-2-guiado`: «¿qué pieza de la mesa gira bien?» tiene dos respuestas plausibles (la esfera también rueda, y la idea lo dice). Añadir en `ejemplo-2-razona` por qué el cilindro y no la esfera (el cilindro rueda en línea recta y la esfera se va para cualquier lado), o reformular la pregunta («¿qué pieza gira en línea recta?»).
3. `paso-3`: «Los cilindros de pie se apoyan en su base plana» es casi literal la opción correcta de la comprobación («De pie, sobre su base plana»). Cambiar la frase final por otra regla general (p. ej. «una pieza con base plana se apoya firme») para que la comprobación sea transferencia y no eco.
4. Recurso `techo-columnas` (alt/descripcion) y `paso-3`: «caja plana» frente a «caja larga» de la situación; nombrar igual («caja larga») o explicar que es la misma pieza acostada. Recurso `torre` (descripcion): «una llave vertical» — el dibujo es un corchete recto, no una llave; escribir «un corchete».

## `mat.p2.base-diez-y-abaco` — APROBADA

Sin defectos. Dibujos coinciden con alt y descripcion; 2·10+5 y 4·10+1 correctos; contraejemplo 36/63 bien dibujado (3 fichas decenas, 6 unidades); opciones 14/11/12 con una sola correcta (b).
Observación opcional (no bloquea): `material-resuelto` descripcion 302 caracteres (aviso del lint).

## `mat.p3.comparar-longitudes` — CAMBIOS (menores)

1. Recurso `cintas-alineadas` (descripcion): «una llave marca el trozo que sobresale»; el dibujo es un corchete con topes. Escribir «un corchete». La «línea punteada» nace en el borde superior de la amarilla y cruza la amarilla, no solo «baja desde donde termina la turquesa»: decir «una línea punteada vertical marca donde termina la turquesa».
2. Momento `paso-1`: «Las dos cintas están juntas, pero todavía no empiezan en el mismo lugar»; en `cintas-pregunta` las cintas están separadas (hueco vertical grande) y no se tocan. Cambiar a «Las dos cintas están una al lado de la otra…» o acercarlas en el dibujo.
3. Observación audio (opcional): la comprobación lee tres cantidades parecidas al oído en la misma pregunta (sesenta, cuarenta y cinco, cincuenta y cinco). Valdría separar más las cifras (p. ej. cuarenta y cinco, treinta y cinco, sesenta), sin cambiar la respuesta si se ajusta la opción correcta.

## `mat.p4.desarrollo-cubo` — APROBADA

Sin defectos. Cruz de cuatro con cuadrados sobre y bajo el segundo correcta; fila de seis y arcos 1–5 / 2–6 correctos; contraejemplos (cuadrado chico, cinco cuadrados) coherentes con el dibujo; comprobación con una sola respuesta (c) y opciones 34/36/35.
G: la nota del autor sobre `e06` opción d es correcta (fila de cuatro con cuadrado sobre el primero y bajo el último sí es un desarrollo válido); la respuesta única `d` se sostiene porque b y c no cierran. No afecta al alumno.

## `mat.p5.construir-cuadrilateros` — CAMBIOS

1. Recurso `romboide-listo` / `construir-cuadrilateros-romboide-listo.svg`: el arco del ángulo de 120° (`M360 390 A40 40 0 0 1 380 355.4`) abarca solo 60° (de 180° a 120°) y se ve como un ángulo agudo rotulado «120°». El ángulo interior de la esquina inferior derecha va de 180° a 60° (pasando por 90°): el arco debe terminar en ≈ (420, 355.4), con radio 40 y recorrido por arriba; acercar el rótulo «120°» al arco (hoy está a ~40 px, dentro de la figura, y se puede confundir con otro ángulo).
2. Recurso `errores` (alt) : «un rectángulo inclinado» es incorrecto (un rectángulo girado sigue siendo rectángulo; el dibujo es un paralelogramo «torcido»). Alt: «un cuadrilátero inclinado que quería ser rectángulo»; descripcion ya dice «parece un rectángulo pero está inclinada», conservarla. Revisar también el SVG: esa figura tiene lados opuestos iguales, así que la narración acierta al apoyarse en «esquinas no rectas».
3. Observación (no bloquea): la figura de la derecha de `errores` es un trapecio con lados oblicuos; la narración solo critica «arriba 5, abajo 6», lo que es verdad pero deja sin comentar que tampoco tiene ángulos rectos. Aceptable para 5.º.
G: `e01` (reportado por el autor): la opción d «Un transportador circular roto» es poco natural pero inequívoca; la correcta es la más larga (37 caracteres frente a 22–26), pista de forma. Corrección mínima propuesta (decide el orquestador): acortar b a «La escuadra apoyada en la base» y d a «Un transportador sin marcas». No afecta la corrección de la respuesta.

## `mat.p6.area-unidades-cuadradas` — APROBADA

Sin defectos bloqueantes. Dibujos coinciden con alt y descripcion (6 cuadritos + 2 mitades = 7; 9 baldosas + 2 medias = 10); contraejemplo (dos mitades como dos, «cm» vs «cm²») bien dibujado; comprobación 12 + 4/2 = 14 con opciones 29/31/28 y una sola correcta (a).
Observaciones (opcionales): `ejemplo-1-guiado` termina con «Piensa: dos mitades forman un cuadrito entero» (afirmación, no pregunta) y adelanta la regla; mejor «Piensa: ¿cuántos cuadritos forman dos mitades juntas?». Nivel: contar cuadritos y mitades es muy elemental para 6.º; la clave así lo pide en el banco (ejercicios con `●●●●`), no es defecto del lote.

## Defectos del lote por clave

p1: 4 · p2: 0 · p3: 2 (+1 opcional) · p4: 0 · p5: 2 · p6: 0.

## Ronda 2

Revisor independiente (solo lectura). Alcance: `mat.p1.construir-con-bloques`, `mat.p3.comparar-longitudes`, `mat.p5.construir-cuadrilateros`.

| Clave | Veredicto |
|---|---|
| `mat.p1.construir-con-bloques` | **APROBADA** |
| `mat.p3.comparar-longitudes` | **APROBADA** |
| `mat.p5.construir-cuadrilateros` | **APROBADA** |

Verificación:
- Contra `HEAD` por JSON, en las 3 claves solo cambió `claseGuiada`; ejercicios intactos.
- Lint (3 claves): 0 errores, 2 avisos `descripcion-larga` (p5, 305 y 308 caracteres; no bloquean). `pnpm` no está en el PATH: se usó `node_modules/.bin/tsx` y `tsc`. `tsc --noEmit` limpio. `nudito-validar-banco`: «Banco válido: 2238 fichas activas; 27034 ejercicios» (el fallo de `mat.p1.contar-hasta-10` ya no aparece).
- SVG rasterizados con Chrome headless y revisados (camión, techo-columnas, torre, cintas-alineadas, cintas-pregunta, romboide-listo, errores de p5):
  - p1: sin cabina; camión = caja + dos ruedas, coincide con narración, alt y descripcion. `techo-columnas` rotula «caja larga». `torre` dice «corchete». `ejemplo-2` pregunta «gira en línea recta» y explica por qué no la esfera. `paso-3` cierra con regla general («base plana se apoya firme»).
  - p3: `paso-1` dice «una al lado de la otra» (cintas en filas contiguas, coherente). `cintas-alineadas`: «corchete» y «línea punteada vertical marca donde termina la turquesa» coinciden con el dibujo.
  - p5: el arco de 120° ahora abarca 120° (sube por arriba hasta el lado oblicuo) y el rótulo está pegado al arco; alt de `errores` = «cuadrilátero inclinado que quería ser rectángulo», coherente con el dibujo.
- Sin defectos nuevos: `recursoRef` válidos, imagen/alt/descripcion no revelan la respuesta de la comprobación, opciones de longitud pareja, vocabulario oral correcto.
- Observaciones opcionales (no bloquean): p3, tres cantidades parecidas al oído en la comprobación (exige tocar ejercicios); p5, e01 con correcta más larga (idem); p1, `paso-3` y la opción correcta de la comprobación comparten «base plana», pero como regla general, no como eco literal.
