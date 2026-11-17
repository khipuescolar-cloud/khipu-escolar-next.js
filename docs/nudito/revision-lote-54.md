# Revisión independiente · Primaria, Matemática, lote 54

Fecha: 2026-11-16. Revisor independiente (solo lectura sobre banco y recursos).

Verificaciones técnicas (mías):
- Lint mecánico `nudito-lint-clase-guiada.ts` (3 claves): 0 errores, 8 avisos `descripcion-larga` (303–380 caracteres, todos ≤ 500, aceptables) y 2 informativos `ficha-correcta-mas-larga` en ejercicios existentes (p4 e01, p6 e09; no son del lote).
- `npx tsc --noEmit`: sin errores (`pnpm` no está en el PATH). `npx tsx scripts/nudito-validar-banco.ts`: banco válido, 2238 fichas, 27034 ejercicios.
- Comparado con `HEAD` por JSON: en las tres fichas solo cambió `claseGuiada` (antes ausente).
- 15 SVG referenciados rasterizados en Chrome headless y vistos: todos con `<title>`, sin `<tspan>`, texto ≥ 26 px, sin `#C98F1E`, sin desbordes; las geometrías (80°, 130°, alturas 1,25/0,75, cuartos de la jarra) coinciden con alt y descripción.
- Recalculado: 4+3+3=10; 1,25 L=1250 mL; 0,75+1,25=2,00 (llevadas correctas); 1,30>1,25; 1,60>1,45; 0,8+0,5=1,3; 180−80=100; 180−130=50; 180−85=95. Respuestas únicas y correctas.

## mat.p4.encuestas-entrevistas — **CAMBIOS** (menores)

1. Orfandad/duplicados: en `public/nudito/diagramas/matematica/` quedan 5 SVG antiguos sin referencia con el mismo prefijo (`encuestas-entrevistas-error-duplicado`, `-pregunta-neutral`, `-registro-pregunta`, `-registro-resuelto`, `-situacion`), no usados por ninguna ficha (0 referencias). Borrar o decidir su destino (ver defecto transversal T1).
2. Pedagógico (menor): el título dice «entrevistas», pero la entrevista solo se define en el momento `idea`; ningún ejemplo, contraejemplo ni la comprobación la trabaja. Añadir una frase en `paso-1` o `ejemplo-1-razona` (p. ej. «Si fuera una entrevista, se haría a una sola persona, con una pregunta abierta») o quitarla del título del tema.
3. Descripción (menor): `transporte-pregunta`, `descripcion` no menciona el título del dibujo «Cómo llegamos al colegio» que sí está rotulado. Añadirlo (cabe en 500).

Contenido, orden pedagógico, letra c, longitudes de opciones (45/42/42) y visuales: correctos.

## mat.p5.litro-decimales — **CAMBIOS**

1. `recurso errores-decimales`: la imagen rotula abajo «La mitad de 1000 mL» y la `descripcion` no lo dice (describe solo error y bien). Añadir «y debajo, la nota la mitad de mil mililitros» (cabe en 500).
2. Visual `suma-alineada` y `comparar-columnas`: la línea punteada ámbar pasa exactamente por encima de las comas (x≈255) y las tacha/ensucia, sobre todo en la fila resultado «2,00». Desplazar la línea unos 12–16 px a la derecha de la coma, o dibujarla detrás y acortarla para que no cruce los caracteres «,».
3. Orfandad/duplicados: 5 SVG antiguos sin referencia (`litro-decimales-comparacion`, `-error`, `-mezcla-pregunta`, `-mezcla-resuelta`, `-situacion`) (ver T1).
4. Pedagógico (menor): `contraejemplo` junta dos errores distintos en un solo momento; funciona, pero conviene que la narración marque «primer error… segundo error…» para el oído (ahora dice «Arriba… Abajo…», que en audio no tiene referencia visual si el alumno no mira). Opcional.

Contenido y comprobación (a; 20/22/19 caracteres; pista no entrega la respuesta): correctos.

## mat.p6.medir-construir-angulos — **CAMBIOS**

1. Pista de la comprobación (`comprobacion.pista`: «Lee la escala que empieza en el cero del lado inicial.») más el enunciado («Un lado… sobre el cero de la escala de adentro») entregan la respuesta (95): el enunciado ya dice cuál escala. Reformular el enunciado sin nombrar la escala («Un lado está sobre el cero del transportador; el otro pasa por 95 en una escala y por 85 en la otra… el cero del lado inicial está en la escala de adentro» no sirve) o, mejor, dejar el enunciado y cambiar la pista a algo que no repita la regla: «Las dos lecturas suman ciento ochenta; elige la que parte del cero del lado inicial.» (aún da el criterio, pero obliga a relacionar).
2. Orfandad/duplicados: 6 SVG antiguos sin referencia (`medir-construir-angulos-construccion-pregunta`, `-construccion-resuelta`, `-error`, `-medicion-pregunta`, `-medicion-resuelta`, `-situacion`) (ver T1).
3. Visual (menor): en `medicion-80` y `trazar-130` las etiquetas «180 0» se repiten a ambos lados, azul y gris; no hay rótulo que diga cuál es la «exterior» y cuál la «interior». La narración usa esas palabras. Añadir en el dibujo un rótulo corto («escala de afuera» / «escala de adentro») o, si no cabe, aclarar en `ejemplo-1-razona` «la escala azul de afuera».
4. Ejercicio existente erróneo (ver G): e09, retroalimentación.

Contenido, geometría y letra b (22/22/21): correctos.

## Defecto transversal

T1. 16 SVG huérfanos (5 + 5 + 6) del trabajo previo de Codex siguen en `public/nudito/diagramas/matematica/`, sin referencias en `src`, `docs`, `scripts` y sin seguimiento git. El orquestador decide: borrarlos (recomendado, para evitar duplicados e inconsistencias) o conservarlos con nota.

## G. Errores en ejercicios existentes

1. `mat.p6.medir-construir-angulos` e09, `retroalimentacion`: «30° es complementaria en el dibujo». 150° + 30° = 180° → suplementaria. Afecta al alumno (término equivocado). Corrección mínima: «30° es la lectura de la escala contraria».
2. p4 e03 (reportado por el autor): pista 2 entrega la respuesta. Afecta poco; corrección: «Cuenta cuántas marcas hay en la fila.». No verificado a fondo; menor.

## Resumen

Aprobadas: ninguna sin cambios. Con cambios (todos menores, sin errores de contenido ni de dibujo): p4 (3), p5 (4), p6 (4) y T1.

## Ronda 2 (2026-11-16, revisor independiente)

Verificado: lint 0 errores (10 avisos `descripcion-larga` ≤ 500, 2 informativos en ejercicios existentes); `validar-banco` válido (2238 fichas, 27034 ejercicios); `tsc --noEmit` limpio. Vs HEAD por JSON: solo cambió `claseGuiada`, salvo p6 `e09` (únicamente `retroalimentacion`, id/dificultad/respuesta intactos; ya no dice «complementaria»). 15 SVG referenciados, cada uno referenciado exactamente por su ficha; ningún SVG nuevo huérfano; los 16 SVG antiguos borrados no se citan en src, tests, public, docs (salvo informes de revisión), specs ni scripts. SVG cambiados rasterizados y vistos (suma-alineada, comparar-columnas, errores-decimales, medicion-80, trazar-130): línea punteada ya no toca las comas, rótulos «escala de afuera/adentro» legibles, sin solapes.

- `mat.p4.encuestas-entrevistas` — **APROBADA** (entrevista definida en `paso-1`; descripción con el título del dibujo). Pendiente ya anotado: p4 e03 pista 2 (ejercicio existente, fuera de alcance).
- `mat.p5.litro-decimales` — **APROBADA** (nota «mitad de mil mililitros» en descripción; línea corrida; «Primer error/Segundo error»).
- `mat.p6.medir-construir-angulos` — **APROBADA** (pista nueva, rótulos de escala en dibujos y narración coherente; e09 corregido).
