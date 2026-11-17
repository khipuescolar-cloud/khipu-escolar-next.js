# Informe editorial · Primaria, Matemática, lote 26

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. No se tocaron estado, huellas, BD, specs ni componentes. Solo cambió el campo `claseGuiada` de cada clave (comparado con `HEAD`: el resto de cada clave es idéntico; ejercicios, ids, respuestas y dificultad intactos).

## Alcance

Archivos bajo `src/lib/nudito/conocimiento/banco/matematica/`. Todas con 10 momentos (el primero sin recurso) y 5 recursos. SVG en `public/nudito/diagramas/matematica/` (30 nuevos, 640×480, texto mínimo 26 px, sin `<tspan>`, con `<title>`, paleta crema/índigo/turquesa/maíz; rojo `#B5412A` solo para errores).

| Clave | Archivo | Momentos | Recursos (ID; SVG `<prefijo>-<id>.svg`) |
|---|---|---|---|
| `mat.p1.arriba-abajo` | `primaria-1/fichas/ubicacion-y-recorridos.json` | 10 | `patio-pregunta`, `cuerpo`, `edificio-pregunta`, `edificio-resuelto`, `agachado` (prefijo `arriba-abajo`) |
| `mat.p2.afirmaciones-comparacion` | `primaria-2/fichas/numeracion-hasta-100.json` | 10 | `bloques-pregunta`, `luis-decenas`, `rosa-unidades`, `errores`, `pasos` (`afirmaciones-comparacion`) |
| `mat.p3.barras-horizontales` | `primaria-3/fichas/c25-datos.json` | 10 | `tabla-pregunta`, `frutas-barras`, `belen-pregunta`, `belen-barras`, `errores` (`barras-horizontales`) |
| `mat.p4.clasificar-poligonos-lados` | `primaria-4/fichas/poligonos.json` | 10 | `figuras-pregunta`, `casita-lados`, `patio-lados`, `nombres`, `errores` (`clasificar-poligonos-lados`) |
| `mat.p5.area-perimetro-relacion` | `primaria-5/fichas/perimetro-y-superficie.json` | 10 | `huertos-pregunta`, `huertos-resuelto`, `baldosas-pregunta`, `baldosas-resuelto`, `errores` (`area-perimetro-relacion`) |
| `mat.p6.area-figuras-compuestas` | `primaria-6/fichas/longitud-perimetro-y-area.json` | 10 | `mural-pregunta`, `mural-resuelto`, `patio-pregunta`, `patio-resuelto`, `errores` (`area-figuras-compuestas`) |

## Decisiones pedagógicas

- Estructura común: idea (sin imagen) → situación con variante «pregunta» → ejemplo 1 (guiado sin imagen, «razona» con imagen resuelta) → ejemplo 2 (igual) → contraejemplo → tres pasos → comprobación nueva. Los momentos sin recurso no dicen «el dibujo/la imagen».
- Recursos de situación y guiado no muestran ni nombran resultado ni regla: `bloques-pregunta` solo la afirmación de Ana; `tabla-pregunta` y `belen-pregunta` sin eje ni barras; `figuras-pregunta` sin rótulos; `huertos-pregunta` y `baldosas-pregunta` sin áreas ni perímetros; `mural-pregunta` y `patio-pregunta` sin áreas.
- 1.º: frases cortas; patio (pájaro y gato), cuerpo con flechas arriba/abajo, edificio con Ana (piso cuatro) y Luis (piso dos). Contraejemplo: agacharse no cambia dónde es arriba. Comprobación: globo/pelota (b).
- 2.º: bloques de base diez (barras = decenas, cubitos = unidades). Ejemplo 1 con la trampa de Luis (45 y 54), ejemplo 2 con decenas iguales (83 y 80). Contraejemplo: mirar solo unidades (36 y 41). Comprobación: setenta y dos frente a sesenta y nueve (c).
- 3.º: tabla → gráfico; frutas (5, 3, 4) y Belén (6, 2) con un cuadradito por unidad. Contraejemplo: barra del vóley que no sale del cero. Comprobación: barra más corta entre siete, cinco y tres (a).
- 4.º: pentágono (cartel casita, lados numerados) y hexágono (patio en ele, cóncavo, sin lados iguales); contraejemplo: tres cuadriláteros que no son todos cuadrados. Comprobación: doble de lados que un triángulo (b).
- 5.º: huertos tres por cuatro y dos por seis (12 m², perímetros 14 y 16); baldosas (16: 4×4 con perímetro 16 y 2×8 con 20). Contraejemplo: tira uno por doce (perímetro 26) y el área no es el perímetro. Comprobación: 2×9 frente a 3×6 (perímetros 22 y 18) (c).
- 6.º: mural (24 + 6 = 30 m²), patio con esquina sin pavimentar (40 − 3 = 37 m²). Contraejemplo: el triángulo es la mitad del rectángulo (área 6, no 4 + 3). Comprobación: 36 + 9 = 45 (a).
- Letras correctas: b, c, a, b, c, a. Diferencia máxima de longitud de opciones: 2, 3, 1, 1, 3, 2; la correcta nunca es la más larga (p2: 37 contra 40/40; p3: 4 contra 5/5).
- Sin dígitos en narración, pregunta, opciones, mensaje, pista, alt y descripción (todo en palabras); los SVG usan cifras como rótulos.

## Verificaciones

- Cuentas recalculadas: 6·4=24; 6·2÷2=6; 24+6=30; 8·5=40; 2·3÷2=3; 40−3=37; 9·4=36; 9·2÷2=9; 36+9=45 (distractores 54 = rectángulo + 9·2, 47 = 36 + 9 + 2); 2·(2+9)=22 y 2·(3+6)=18; 2·(1+12)=26; 2·(3+4)=14; 2·(2+6)=16; 4·4=16, 2·(2+8)=20; 36 y 41, 45 y 54, 83 y 80; 72 > 69; triángulo ×2 = 6.
- Script del lote (`check.py` en scratchpad): `recursoRef` ↔ recursos exactos (todos usados), 10 momentos, primer momento sin recurso, títulos únicos y no repetidos en la narración, sin dígitos, sin «parte N de M», sin letra suelta «x», «dibujo/imagen/tarjeta» solo en momentos con recurso, alt ≤ 200, descripción ≤ 500 (varias entre 250 y 311 por listar todo lo visible), longitudes de opciones.
- Los 30 SVG se rasterizaron con Chrome headless y se vieron antes de escribir alt y descripción. Correcciones durante el proceso: «cuerpo» con flechas separadas de la franja de piso; etiquetas de huertos fuera del borde y separadas entre sí; «2 m» del mural fuera de la arista del triángulo; casita con paredes verticales; filas de «nombres» a distancia pareja; recuadro de unidades de `rosa-unidades` en turquesa (el rojo se reserva a errores) y fuera del otro grupo.
- `pnpm nudito:validar-banco`: banco válido (2 238 fichas, 27 034 ejercicios). `pnpm typecheck`: sin errores. `git diff --check` sobre el banco de Matemática y los diagramas: limpio.

## Ejercicios existentes revisados

Respuestas recalculadas en las 6 claves: sin errores matemáticos ni de grado. Observaciones menores, sin editar:

- `mat.p2.afirmaciones-comparacion` e08: la pista «Una de ellas tiene un número menor a la izquierda con menos decenas» es confusa; e03: la opción correcta es la más larga.
- `mat.p3.barras-horizontales` e07: la pista «Liga está en el primer, tercer y cuarto lugar…» omite el séptimo.
- `mat.p5.area-perimetro-relacion` e07: «4 × 3» no cambia el perímetro; la única respuesta correcta es «1 × 12» (c), como corresponde.
- `mat.p1.arriba-abajo` e04 y e08: enunciados con cifras que la voz leerá bien; sin cambios necesarios.

## Riesgos y pendientes

- Sin revisión independiente ni recorrido en navegador (audio, móvil, movimiento reducido); los SVG se vieron sueltos.
- Los textos dentro de los SVG usan cifras y símbolos (`67`, `24 + 6 = 30 m²`); la narración y la descripción los dicen en palabras.
- Texto turquesa `#0F7C7A` sobre crema da contraste ≈ 4,4:1 (texto grande y en negrita, ≥ 26 px; pasa el umbral de texto grande). No se usó ámbar en texto.
- p1: la persona agachada es esquemática; p2 usa barras con rayitas para decenas; p4 `errores` usa una figura irregular de cuatro lados sin nombrar.
- p4: el patio en ele es un polígono cóncavo; la narración dice que no hace falta que los lados sean iguales.
- No se actualizaron `estado-refuerzo-primaria.json`, specs ni bitácora (fuera del encargo).

## Correcciones tras la revisión independiente (`revision-lote-26.md`)

Aprobadas en `claseGuiada`: p2, p3, p5. Rasterizados y vistos los SVG cambiados.

- p1: `patio-pregunta` (alt, descripción y aria-label) ahora dice gato oscuro de perfil sobre una franja celeste y pájaro sobre la copa; `agachado` redibujado en cuclillas (cadera baja, rodillas dobladas, manos en la rodilla, pies en el piso) con alt y descripción alineados; se quitó del contraejemplo la oración sobre «la pared».
- p4: tercera figura de `errores` redibujada como cuadrilátero claramente irregular (trapecio), aria-label «rosada»; `ejemplo-2-razona` sin «celda de panal» («aunque tenga forma de ele»).
- p6: `ejemplo-1-razona` dice «Mira el mural con sus dos piezas de colores»; alt, descripción y aria-label de `mural-resuelto` coinciden (piezas unidas y coloreadas).
- Contraste: el relleno de todo `<text>` turquesa pasó a `#0C706E` en los 11 SVG afectados; los rellenos de formas no cambian.
- p3: descripciones de `frutas-barras` y `errores` recortadas (sin repetir nombres, eje ni «cada cuadradito vale un voto»).
- Ejercicios existentes corregidos con autorización (ids, dificultad y respuesta correcta intactos): p2 e08 pista 2 → «El signo < pide que el primer número tenga menos decenas que el segundo.»; p2 e03 distractores a, b y d alargados (la correcta, 42, ya no es la más larga); p2 e09 distractores a, b y c ajustados (a 52, b 46, c 41; la correcta d de 49 deja de ser la más larga); p3 e08 opción c acortada a «A la izquierda de cada barra.» (29, ya no la más larga). Esto invalida las huellas de p2 y p3, que van a re-revisión.
- Validación: `pnpm nudito:validar-banco` válido (2 238 fichas), `pnpm typecheck` sin errores, `git diff --check` limpio.
