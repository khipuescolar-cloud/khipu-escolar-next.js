# Informe editorial · Primaria, Matemática, lote 44

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. No se tocaron estado, huellas, BD, specs ni componentes. Solo cambió el campo `claseGuiada` de cada clave (ejercicios, ids, respuestas y dificultad intactos).

## Alcance

Archivos bajo `src/lib/nudito/conocimiento/banco/matematica/`. Todas con 10 momentos (el primero sin recurso). SVG en `public/nudito/diagramas/matematica/` (`<prefijo><id>.svg`).

| Clave | Archivo | Momentos | Recursos (id) | Prefijo SVG |
|---|---|---|---|---|
| `mat.p1.datos-por-categorias` | `primaria-1/fichas/recogida-y-organizacion-de-datos.json` | 10 | `situacion`, `grupos`, `stickers-pregunta`, `stickers-grupos`, `error` | `datos-categorias-` |
| `mat.p2.cuantas-veces-mas-largo` | `primaria-2/fichas/longitud.json` | 10 | `situacion`, `ej1-fila`, `cintas-pregunta`, `cintas-razona`, `error` | `cuantas-veces-` |
| `mat.p3.division` | `primaria-3/fichas/c23-multiplicacion-division.json` | 10 | `situacion`, `ej1-reparto`, `canicas-pregunta`, `canicas-reparto`, `desigual` | `repartir-igual-` |
| `mat.p4.descomponer-cuatro-cifras` | `primaria-4/fichas/c23-numeros-hasta-10000.json` | 10 | `situacion`, `valores`, `tarjetas-pregunta`, `cero`, `error` | `descomponer-cuatro-cifras-` |
| `mat.p5.decisiones-con-datos` | `primaria-5/fichas/conclusiones.json` | 10 | `situacion`, `conclusion`, `tabla-pregunta`, `tabla-conclusion`, `error` | `decisiones-datos-` |
| `mat.p6.croquis-planos` | `primaria-6/fichas/ubicacion-y-transformaciones.json` | 10 | `situacion`, `cruce`, `entre`, `error` | `croquis-planos-` |

29 SVG nuevos, 640×480, texto mínimo 26 px, paleta crema/índigo/turquesa/maíz (+ rojo `#B5412A` solo en errores, azul y rojo de relleno en globos y cintas), sin `<tspan>`, con `<title>`, espacios no separables como `&#160;`. Texto turquesa `#0C706E`, ámbar `#8A5A00`; el nombre de las avenidas del croquis va en índigo para no caer sobre fondo maíz.

## Decisiones pedagógicas

- Estructura común: idea (sin imagen) → situación («pregunta») → ejemplo 1 guiado (reutiliza el recurso de situación) y «razona» → ejemplo 2 guiado («pregunta») y «razona» → contraejemplo → tres pasos (sin recurso, sin decir «mira el dibujo») → comprobación nueva.
- p1 (1.º, frases cortas): globos mezclados → columnas por color (cuatro, tres, uno); stickers (estrella tres, corazón dos, luna uno). Contraejemplo: dos cestas para el mismo color. Comprobación: sol/nube/lluvia, grupo más grande = tres (a).
- p2 (2.º): crayón en cordón (cabe cuatro veces) y cintas de cuadritos (tres azules cubren nueve). Contraejemplo: crayones con huecos. Comprobación: tubo de tres palmos, cuatro veces más largo = doce (c; la suma, siete, es el distractor).
- p3 (3.º): doce panes entre cuatro canastas; veinte canicas entre cinco niños (con comprobación multiplicando). Contraejemplo: reparto seis, cuatro y dos. Comprobación: treinta galletas en seis bolsas = cinco (b).
- p4 (4.º): tabla UM/C/D/U; descomponer siete mil doscientos noventa y cuatro; componer seis mil más cuatrocientos más tres = 6403 (cero en las decenas). Contraejemplo: 9000 + 30 + 5 escrito 935 en vez de 9035. Comprobación en palabras: cuatro mil, seiscientos y cinco = cuatro mil seiscientos cinco (a).
- p5 (5.º): gráfico de barras (sogas 12, pelotas 21, ajedrez 9, ligas 8; total 50) y tabla de tardanzas (9, 4, 3, 4, 5; total 25). Contraejemplo: decidir por gusto. Comprobación: libros, quince cuentos de treinta votos (c).
- p6 (6.º): croquis con dos jirones y dos avenidas; ejemplo 1 = cruce jirón Ica y avenida Sucre; ejemplo 2 = colegio en el jirón Piura entre las avenidas Sucre y Bolívar. Contraejemplo: dos postas junto a la misma avenida. Comprobación: banco entre dos jirones (b).
- Letras correctas: a, c, b, a, c, b. Opciones con diferencia máxima 3 caracteres (p1 12/14/11, p2 12/13/11, p3 13/14/15, p4 28/26/29, p5 19/21/19, p6 19/19/22); la correcta nunca es la más larga.
- Recursos de situación y de guiado sin respuesta: sin números en el gráfico ni resaltado en `situacion` de p5; tabla de p4 solo con los valores a colocar; cintas de p2 sin marcar cuántas veces.

## Verificaciones

- Cálculos recalculados: 4+3+1 = 8 globos; 3+2+1 = 6 stickers; 90/90 = 3 y 4×90 = 360 (crayones); 9/3 = 3; 12/4 = 3; 20/5 = 4; 30/6 = 5; 6+4+2 = 12; 7000+200+90+4 = 7294; 6000+400+3 = 6403; 9000+30+5 = 9035; 4000+600+5 = 4605; 12+21+9+8 = 50; 9+4+3+4+5 = 25; 15+6+9 = 30.
- Script de lote: `recursoRef` ↔ recursos exactos, sin dígitos en narración, opciones, mensaje, pista, alt ni descripcion (todo en palabras), sin abreviaturas «Jr.»/«Av.» en la narración, sin título repetido al inicio de la narración, momentos sin recurso sin «dibujo/imagen/tarjeta/tabla». alt ≤ 109; descripcion ≤ 241.
- SVG rasterizados con Chrome headless y vistos uno por uno antes de escribir alt y descripcion. Correcciones durante el proceso: luna que salió abierta (sin relleno), globos apilados que se pisaban, flecha que tapaba un número en `error` de p5, texto turquesa sobre franja maíz en el croquis.
- `pnpm nudito:validar-banco`: banco válido (2 238 fichas, 27 034 ejercicios). `pnpm typecheck`: sin errores. `git diff --check` sobre los 6 JSON: limpio.

## Errores de ejercicios existentes

Ninguno que afecte al alumno (respuestas recalculadas). Observación menor, sin editar: `mat.p5.decisiones-con-datos` e09 (resfrío en Cusco): la respuesta «Abril o mayo» es la única correcta, pero tanto abril como mayo sirven y la formulación «más oportuno» es algo abierta; conviene que el revisor decida si se afina.

## Riesgos y pendientes

- Sin revisión independiente ni recorrido en navegador (audio, móvil, movimiento reducido); los SVG se vieron sueltos.
- p5 `situacion`: la descripción no dice qué barra es más alta (no adelanta la respuesta), así que quien solo escucha no puede razonar la pregunta antes del ejemplo 1; es una decisión consciente.
- p6: los cinco lugares son rótulos de texto sin símbolos dibujados; la «esquina» de la biblioteca se lee por proximidad al cruce, no por superposición.
- p4: las siglas de las columnas (UM, C, D, U) aparecen en el dibujo; la narración dice los nombres completos.
- No se actualizaron `estado-refuerzo-primaria.json`, specs ni bitácora (fuera del encargo).

## Correcciones tras la revisión independiente (`revision-lote-44.md`)

`mat.p2.cuantas-veces-mas-largo` y `mat.p3.division` aprobadas: sin cambios.

- p1: en `grupos` los rótulos de color bajan de y=410 a y=445 (ya no tocan el nudo del cuarto globo azul); descripcion aclara que están en la parte baja.
- p4: `valores`.descripcion ahora dice «siete mil, doscientos, noventa, y el último, cuatro».
- p5: `situacion` (alt igual, descripcion nueva) da las alturas relativas sin números ni conclusión: Sogas media, Pelotas la más alta, Ajedrez más baja que Sogas, Ligas la más baja. En `error`, el globo «Me gusta» se corrió 10 px a la derecha. **Ejercicio e09 (autorizado por el orquestador):** solo el enunciado cambia «resfrío» por «gripe» y «¿En qué mes resulta más oportuno aplicar la campaña preventiva?» por «¿Cuándo conviene aplicar la campaña?»; id, dificultad, opciones, respuesta (c), pistas y retroalimentación intactos. Queda sin editar (solo reportado): e02, pista 2 menciona un gráfico que el enunciado no trae.
- p6: `ejemplo-1-razona` y descripcion de `cruce` añaden la referencia lateral (biblioteca a la izquierda del jirón Ica, arriba de la avenida; parque a la derecha); el contraejemplo dice «en otro croquis»; comprobación reformulada sin «entre» (Rosa cruza el jirón Ica y aún no llega al jirón Piura; opciones iguales, 19/19/22, respuesta b) con mensaje y pista nuevos; las dos postas de `error` pasan a índigo como en `situacion`.
- Rerasterizados `datos-categorias-grupos`, `decisiones-datos-error`, `croquis-planos-error` y vistos; banco válido, typecheck y `git diff --check` limpios.
