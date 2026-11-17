# Informe editorial · Primaria, Matemática, lote 38

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente** (el autor no aprueba su propio lote). No se tocaron estado, huellas, BD, specs ni componentes. Solo cambió el campo `claseGuiada` de cada clave (comparado con `HEAD`, el resto de cada clave es idéntico; ejercicios, ids, respuestas y dificultad intactos).

## Alcance

Archivos bajo `src/lib/nudito/conocimiento/banco/matematica/`. Todas con 10 momentos (el primero sin recurso) y 5 recursos SVG hechos a mano en `public/nudito/diagramas/matematica/` (25 archivos nuevos).

| Clave | Archivo | Momentos | Recursos (id; SVG `<prefijo>-<id>.svg`) | Comprobación |
|---|---|---:|---|---|
| `mat.p1.clasificar-por-forma` | `primaria-1/fichas/formas-del-entorno.json` | 10 | `objetos-pregunta`, `ruedan`, `cilindros`, `errores`, `pasos` (`clasificar-forma`) | c |
| `mat.p2.antecesor-sucesor` | `primaria-2/fichas/numeracion-hasta-100.json` | 10 | `cajas-pregunta`, `cuarenta-y-siete`, `ochenta`, `errores`, `pasos` (`antecesor-sucesor`) | a |
| `mat.p3.cero-posicional` | `primaria-3/fichas/c23-numeracion-fracciones-dinero.json` | 10 | `lapices-pregunta`, `cuatrocientos-siete`, `seiscientos`, `errores`, `pasos` (`cero-posicional`) | b |
| `mat.p4.comparar-angulos-recto` | `primaria-4/fichas/poligonos.json` | 10 | `angulos-pregunta`, `esquina-encima`, `libro-abierto`, `errores`, `pasos` (`comparar-recto`) | c |
| `mat.p5.cm2-m2` | `primaria-5/fichas/perimetro-y-superficie.json` | 10 | `superficies-pregunta`, `figurita-cuadritos`, `patio-cuadrados`, `errores`, `pasos` (`cm2-m2`) | b |
| `mat.p6.area-rectangulo-cuadrado` | `primaria-6/fichas/longitud-perimetro-y-area.json` | 10 | `taller-pregunta`, `filas-baldosas`, `patio-cuadrado`, `errores`, `pasos` (`area-rectangulo`) | a |

Estructura común: idea (sin imagen) → situación con variante «pregunta» → ejemplo 1 guiado (sin recurso) y «razona» (con recurso) → ejemplo 2 guiado y «razona» → contraejemplo → tres pasos (el último con la tarjeta resumen) → comprobación nueva. Los momentos guiados no tienen recurso y su narración no dice «dibujo/imagen/tarjeta».

## Decisiones pedagógicas

- 1.º: grupos por regla (ruedan / no ruedan), cilindros (lata, tarro, pila) y errores (dado en el grupo que rueda; juntar por color cuando piden forma). Frases cortas. Comprobación: grupo donde todos tienen esquinas.
- 2.º: cajas de Rosa numeradas; ejemplo 1 con antecesor y sucesor de cuarenta y siete; ejemplo 2 con antecesor de ochenta (cambio de decena); error: sucesor de veintinueve no es veinte ni doscientos diez. Comprobación: sucesor de cincuenta y nueve (opciones de una sola palabra, 7–9 caracteres).
- 3.º: tabla de centenas, decenas y unidades con lápices (cuatro cajas de cien, ninguna decena, siete sueltos → cuatrocientos siete); ejemplo 2: seiscientos cinco frente a seiscientos cincuenta; error: borrar o mover el cero. Comprobación: lugar del cero en «setecientos ocho».
- 4.º: esquina de hoja sobre tres ángulos (menor, igual, mayor) y sobre un libro abierto (mayor); error: el largo de los lados. Comprobación: un lado queda fuera de la esquina (mayor). Se evitó nombrar «recto/menor/mayor» en el dibujo de situación; los ángulos se nombran «primero, segundo, tercero» (sin letras sueltas).
- 5.º: elegir unidad por tamaño: figurita (cuadritos de un centímetro, cinco por tres) y patio (cuadrados de un metro, seis por cuatro); errores: moneda frente a un metro cuadrado y pared de «doce metros» frente a doce metros cuadrados. Comprobación: unidad para el techo de un auditorio.
- 6.º: baldosas de un metro cuadrado: piso de ocho por cinco (cuarenta) y patio cuadrado de siete (cuarenta y nueve); errores: sumar los lados y escribir metros en vez de metros cuadrados. Comprobación: pared de cinco por cuatro (veinte metros cuadrados; distractores: perímetro y suma).
- Letras correctas: c, a, b, c, b, a. Longitud de opciones: diferencias 2, 2, 1, 3, 3, 3; la correcta nunca es la más larga (p4: tiene un empate con otra de 18, la más larga es la «a»).
- Prefijo del lote 4.º: `comparar-recto-` (el prefijo `angulo-recto-` ya existe en otros recursos y no se tocó).

## Verificaciones

- Script de lote: `recursoRef` ↔ recursos exactos (todos usados y solo ellos), 10 momentos, primer momento sin recurso, sin dígitos en narración, pregunta, opciones, mensaje, pista, alt y descripción (todo en palabras), sin «parte N de M», sin título repetido en la narración, sin «dibujo/imagen/tarjeta» en momentos sin recurso, sin letras mayúsculas sueltas en narración, alt ≤ 200 y descripción ≤ 500, archivos SVG existentes.
- Cálculos revisados: cuarenta y siete ± uno (cuarenta y seis, cuarenta y ocho); ochenta − uno = setenta y nueve; veintinueve + uno = treinta; cincuenta y nueve + uno = sesenta; cuatro·cien + cero·diez + siete = cuatrocientos siete; cinco·cuatro = veinte; ocho·cinco = cuarenta; siete·siete = cuarenta y nueve; cuatro·tres = doce; cinco·tres = quince (cuadritos); seis·cuatro = veinticuatro (cuadrados).
- SVG: 640×480, texto ≥ 26 px (comprobado con aserción), medición de cajas de texto con Noto Sans para detectar solapes y bordes (sin avisos), sin `<tspan>`, con `<title>`, espacios no separables con `&#160;`, texto solo en `#1E2A78`, `#0C706E`, `#8A5A00`, `#B5412A` y blanco sobre turquesa. Todos rasterizados con Chrome headless (sin ventanas) y vistos antes de escribir alt y descripción. Correcciones durante el proceso: lápices tapados por las casillas de cifras (3.º), recorte de la figurita (5.º), arco simétrico en `ochenta` (2.º), figurita horizontal para coincidir con la cuadrícula (5.º).
- `pnpm nudito:validar-banco`: banco válido (2 238 fichas, 27 034 ejercicios). `pnpm typecheck`: sin errores. `git diff --check` sobre los 6 JSON: limpio.

## Errores o dudas en ejercicios existentes (sin editar)

- `mat.p3.cero-posicional` e04: la opción «046» no es un número de tres cifras (cero inicial). Conviene sustituirla por un número de tres cifras que no termine en cero y no repita las otras opciones (por ejemplo «506»). La respuesta correcta (460) es única.
- `mat.p6.area-rectangulo-cuadrado` e11: la retroalimentación «42 m es la superficie expresada sin cuadrado» es confusa (42 es el área en metros cuadrados; no se pide expresarla sin cuadrado).
- `mat.p5.cm2-m2` e06: el enunciado pide la unidad del área de una mesa de 120 por 60 cm; «cm²» es correcta, pero daría 7 200 cm² (0,72 m²); podría admitirse m² por comodidad. Es opinable, no es error.
- Sin errores de respuesta ni de grado en las demás claves (respuestas recalculadas).

## Riesgos y pendientes

- Sin revisión independiente ni recorrido en navegador (audio, móvil, movimiento reducido); los SVG se vieron sueltos.
- Los SVG llevan cifras y símbolos (`48`, `m²`, `8 × 5 = 40 m²`); la narración, alt y descripción los dicen en palabras.
- 5.º: la comprobación solo evalúa «metros cuadrados» frente a longitudes; el contraste cm² / m² se trabaja en los ejemplos (las opciones con «centímetros» dejaban diferencias de longitud mayores que tres).
- 5.º `superficies-pregunta`: la figurita y el patio no están a escala real (ratio visual pequeño); la narración dice «mucho más grande».
- 4.º `libro-abierto`: libro esquemático (dos tapas turquesa en V), descrito así.
- 3.º `errores`: la fila «sin cero» deja una casilla vacía con borde rojo punteado en las centenas.
- No se actualizaron `estado-refuerzo-primaria.json`, specs ni bitácora (fuera del encargo).

## Correcciones tras la revisión independiente (`revision-lote-38.md`)

`mat.p4.comparar-angulos-recto` aprobada: sin cambios.

- p1: `clasificar-forma-cilindros.svg` con el recuadro agrandado (alto 110) que contiene las dos líneas del rótulo; descripción ajustada («un recuadro contiene dos líneas de texto»). Se mantiene el dado turquesa de `errores` (la descripción ya dice «ambos turquesa»; es el único modo de ilustrar «mismo color»).
- p2: descripción de `cajas-pregunta` sin «una placa» («Tres cajas en fila»).
- p3: narración del `contraejemplo` sin nombrar los tres números casi homófonos; ahora dice «el cuatro baja a las decenas y el siete a las unidades» y «el siete se corre a las decenas». Ejercicio existente autorizado: e04, opción a «046» → «506» (sigue siendo única la que termina en cero: 460).
- p5: comprobación con opciones «Los metros de largo» (19), «Los metros cuadrados» (20, correcta, b) y «Centímetros cuadrados» (21): diferencia 2, la correcta no es la más larga, respuesta única, mensaje ajustado y pista sin cambios. Ejercicio existente autorizado: e06, enunciado «Una mesa mide aproximadamente 120 cm de largo y 60 cm de ancho. Si multiplicas esas dos medidas, ¿en qué unidad queda el resultado?»; opciones y respuesta (a, cm²) intactas y coherentes.
- p6: `area-rectangulo-taller-pregunta.svg` con el rótulo «8 m» bajado a y=366. Ejercicio existente autorizado: e11, retroalimentación «Debe medir 7 m de largo, porque 6 × 7 = 42. El 42 es el área en metros cuadrados, no el largo.»
- SVG cambiados rasterizados en headless y vistos. Revalidados: `pnpm nudito:validar-banco` (2 238 fichas, 27 034 ejercicios), `pnpm typecheck` y `git diff --check` limpios.
- Pendiente: re-revisión de p1, p2, p3, p5 y p6 (p3, p5 y p6 por tocar ejercicios). La sección «Errores o dudas en ejercicios existentes» de arriba queda resuelta por estas ediciones.
