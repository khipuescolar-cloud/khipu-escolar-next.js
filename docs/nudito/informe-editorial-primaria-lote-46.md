# Informe editorial · Primaria, Matemática, lote 46

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. Solo cambió el campo `claseGuiada` de cada clave; ejercicios, ids, respuestas y dificultad quedan intactos. No se tocaron estado, huellas, BD, specs ni componentes. Los demás cambios que `git diff` muestra en esos archivos son de otros lotes.

## Alcance

Archivos bajo `src/lib/nudito/conocimiento/banco/matematica/`. Todas con 10 momentos (el primero sin recurso) y 5 recursos (4 en p3). SVG a mano (generados con un script de Python) en `public/nudito/diagramas/matematica/`, 29 archivos.

| Clave | Archivo | Recursos (SVG `<prefijo>-<id>.svg`) |
|---|---|---|
| `mat.p1.construir-con-bloques` | `primaria-1/fichas/formas-del-entorno.json` | `bloques-pregunta`, `torre`, `camion`, `techo-columnas`, `errores` (prefijo `construir-con-bloques`) |
| `mat.p2.base-diez-y-abaco` | `primaria-2/fichas/numeracion-hasta-100.json` | `material-pregunta`, `material-resuelto`, `abaco-pregunta`, `abaco-resuelto`, `errores` (`base-diez-y-abaco`) |
| `mat.p3.comparar-longitudes` | `primaria-3/fichas/c26-forma-movimiento.json` | `cintas-pregunta`, `cintas-alineadas`, `cintas-ordenadas`, `cuerda-error` (`comparar-longitudes-alinear`; el prefijo `comparar-longitudes-` ya lo usa otra clave) |
| `mat.p4.desarrollo-cubo` | `primaria-4/fichas/cubos-y-prismas.json` | `cuadrados-sueltos`, `cruz-pregunta`, `cruz-caras`, `fila-error`, `errores` (`desarrollo-cubo`) |
| `mat.p5.construir-cuadrilateros` | `primaria-5/fichas/cuadrilateros-y-angulos.json` | `instrumentos-pregunta`, `rectangulo-base`, `rectangulo-listo`, `romboide-listo`, `errores` (`construir-cuadrilateros`) |
| `mat.p6.area-unidades-cuadradas` | `primaria-6/fichas/longitud-perimetro-y-area.json` | `figura-pregunta`, `figura-contada`, `patio-pregunta`, `patio-contado`, `errores` (`area-unidades-cuadradas`) |

Momentos: idea, situación, ejemplo 1 guiado y razona, ejemplo 2 guiado y razona, contraejemplo, tres pasos. Los momentos sin recurso (ejemplo guiado de p1, ejemplo 2 guiado de p3, p4, p5 y p1 ejemplo 1) no dicen «mira», «dibujo» ni «imagen».

## Decisiones pedagógicas

- p1 (1.º, frases cortas): torre de cubos y camión (caja + cilindros como ruedas, columnas con techo). Contraejemplo: cubo sobre esfera frente a cubo sobre caja. Comprobación: apilar latas, correcta «De pie, sobre su base plana» (c).
- p2 (2.º): barras y cubitos (dos barras y cinco cubitos = veinticinco), ábaco (cuatro decenas y una unidad = cuarenta y uno). Contraejemplo: leer las varillas al revés (sesenta y tres en vez de treinta y seis). Comprobación: fichas de decenas del treinta y cinco, «Tres fichas» (b).
- p3 (3.º): comparar cintas que empiezan en lugares distintos, alinear, ordenar tres con centímetros (azul 12, turquesa 16, amarilla 20, sin listas de números ambiguas: una frase por cinta). Contraejemplo: cuerda enrollada frente a estirada. Comprobación: listón del medio (Ana, a).
- p4 (4.º): seis cuadrados sueltos, cruz que sí cierra el cubo, fila de seis que no. Contraejemplo: un cuadrado más chico y una plantilla de cinco cuadrados. Comprobación: dos cuadrados caen en el mismo lugar, «No sirve: queda una cara sin cubrir» (c).
- p5 (5.º): instrumentos, rectángulo de seis por cuatro (base y lados con escuadra, luego cierre) y romboide de cinco y tres con sesenta grados. Contraejemplo: rectángulo inclinado y lados opuestos desiguales. Comprobación: lado superior de un rectángulo de base nueve, «Nueve centímetros» (b).
- p6 (6.º): contar cuadritos enteros y juntar mitades (seis más uno = siete cm²) y patio en m² (nueve más uno = diez m²). Contraejemplo: dos mitades contadas como dos cuadritos y «cm» en vez de «cm²». Comprobación: doce enteros y cuatro medios = catorce cm², «Catorce centímetros cuadrados» (a).
- Letras correctas: c, b, a, c, b, a. Longitud de opciones (caracteres): 29/30/27, 14/11/12, 9/9/10, 34/36/35, 18/17/16, 29/31/28. En p1 y p2 la correcta es la más corta; en ninguna es la más larga.
- Recursos de situación y de ejemplo guiado no muestran ni nombran la respuesta ni la regla; sin marcadores «?» con valor.

## Verificaciones

- Script de lote: `recursoRef` ↔ recursos exactos (todos usados y solo ellos), 10 momentos, primer momento sin recurso, ningún dígito en narración, pregunta, opciones, mensaje, pista, alt y descripción, sin «parte N de M», sin títulos repetidos en la narración, alt ≤ 200 (máx. 153), descripcion ≤ 500 (máx. 354; algunas pasan de 250), SVG existentes, opciones con diferencia ≤ 3 y correcta no la más larga.
- Cálculos recalculados: 2·10 + 5 = 25; 4·10 + 1 = 41; 12 < 16 < 20; 45 < 55 < 60 (Ana al medio); 6 + 1 = 7; 9 + 1 = 10; 12 + 4/2 = 14; rectángulo de base 9 y lados 3 cierra con 9; ángulos 60° y 120° suman 180°.
- SVG: 640×480, texto ≥ 26 px, `<title>`, sin `<tspan>`, paleta del sistema de diseño; texto turquesa `#0C706E`, ámbar `#8A5A00`, rojo `#A63A22` (solo errores). Rasterizados con Chrome headless y revisados; se corrigieron: «tren» redibujado como camión (se leía como camión), tachado de «63» y de «más corta» que tapaba el texto (ahora equis o raya fina), leyenda pegada al borde inferior en p6, etiqueta de lado del romboide pegada, caja plana separada de los cilindros.
- `pnpm nudito:validar-banco`: banco válido (2 238 fichas, 27 034 ejercicios). `pnpm typecheck`: sin errores. `git diff --check` sobre el banco de Matemática y los diagramas: limpio.
- Ejercicios existentes de las 6 claves revisados y recalculados (72 ejercicios): sin errores de contenido ni de grado. Notas menores sin cambio: en p4, e06 opción d (fila de cuatro con un cuadrado arriba del primero y otro debajo del último) es un desarrollo válido; en p5 e01, la opción d «un transportador circular roto» es un distractor poco natural pero inequívoco.

## Riesgos y pendientes

- Sin revisión independiente ni recorrido en navegador (audio, móvil, movimiento reducido); los SVG se vieron sueltos.
- Los textos dentro de los SVG usan cifras y símbolos (`20 + 5 = 25`, `60°`, `4 cm²`); la narración y las descripciones lo dicen en palabras.
- p1: el camión tiene una cabina (caja alta con ventana) que la narración menciona; la «esfera» y los «cilindros» son esquemáticos.
- p3: en `cintas-pregunta` la turquesa llega más lejos que la amarilla; es la trampa del ejemplo 1 y la narración lo dice sin dar la respuesta.
- p4: en `fila-error` los arcos unen cuadrados que caen en el mismo lugar; la narración da la razón (se amontonan) sin afirmar nada que el dibujo no muestre.
- p5: `errores` presenta el lado de arriba más corto como error de un rectángulo; no se introduce el nombre «trapecio».
- p6: las mitades se dibujan como medios rectángulos separados con contorno punteado de la celda; la narración dice «separadas» solo en la descripción.
- No se actualizaron `estado-refuerzo-primaria.json`, specs ni bitácora (fuera del encargo).

## Correcciones (tras revisión independiente, 2026-11-16)

- p1: quitada la cabina (narración, alt, descripcion y SVG del camión); `ejemplo-2` pregunta «gira en línea recta» y explica por qué no la esfera; `paso-3` cierra con «una pieza con base plana se apoya firme»; «caja plana» → «caja larga» (SVG y textos de `techo-columnas`); «llave» → «corchete» en `torre`.
- p3: `paso-1` dice «una al lado de la otra»; `cintas-alineadas` descripcion con «corchete» y «línea punteada vertical marca donde termina la turquesa». Observación opcional de audio y de e01 (p5) no aplicadas: exigen tocar ejercicios.
- p5: arco de 120° del romboide ahora abarca 120° (termina en 420, 355.4) y el rótulo está pegado al arco; alt de `errores` dice «cuadrilátero inclinado que quería ser rectángulo».
- Validación: lint 0 errores (2 avisos de longitud), `tsc` limpio, `git diff --check` limpio. `nudito-validar-banco` falla hoy por `mat.p1.contar-hasta-10: pista repetida e12`, de otro lote ajeno (no tocado).
