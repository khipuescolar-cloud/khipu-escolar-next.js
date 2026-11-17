# Informe editorial · Primaria, Matemática, lote 41

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. No se tocaron estado, huellas, BD, specs ni componentes. Solo cambió el campo `claseGuiada` de cada clave; ejercicios, ids, respuestas y dificultad quedan intactos (comparado con `HEAD` por JSON: el resto de cada clave es idéntico; ninguna tenía `claseGuiada` antes).

## Alcance

Archivos bajo `src/lib/nudito/conocimiento/banco/matematica/`. Todas con 10 momentos (el primero sin recurso) y 5 recursos. SVG en `public/nudito/diagramas/matematica/` (30 archivos nuevos, `<prefijo>-<id>.svg`).

| Clave | Archivo | Recursos (id) | Prefijo |
|---|---|---|---|
| `mat.p1.contar-hacia-atras` | `primaria-1/fichas/conteo-y-numeros-hasta-10.json` | `rio-pregunta`, `rio-saltos`, `cohete-pregunta`, `cohete-completo`, `errores` | `contar-atras` |
| `mat.p2.conclusiones-grafico` | `primaria-2/fichas/graficos-y-pictogramas.json` | `mascotas-pregunta`, `mascotas-comparar`, `panes-pregunta`, `panes-cuenta`, `errores` | `conclusiones` |
| `mat.p3.completar-centena` | `primaria-3/fichas/c23-adicion-sustraccion.json` | `recta-pregunta`, `recta-saltos`, `tapitas-pregunta`, `tapitas-saltos`, `errores` | `completar-centena` |
| `mat.p4.croquis-referencias` | `primaria-4/fichas/ubicacion-y-recorridos.json` | `calle-pregunta`, `calle-colegio`, `farmacia-pregunta`, `farmacia-croquis`, `errores` | `croquis-referencias` |
| `mat.p5.croquis-calles` | `primaria-5/fichas/ubicacion-y-transformaciones.json` | `plano-pregunta`, `plano-posta`, `cruce-pregunta`, `cruce-escuela`, `errores` | `croquis-calles` |
| `mat.p6.construir-triangulos-cuadrilateros` | `primaria-6/fichas/triangulos-cuadrilateros-y-circulo.json` | `triangulo-pregunta`, `triangulo-arcos`, `rectangulo-pregunta`, `rectangulo-pasos`, `errores` | `construir-figuras` |

## Decisiones pedagógicas

Estructura común: idea (sin imagen) → situación (variante «pregunta») → ejemplo 1 guiado y «razona» → ejemplo 2 guiado y «razona» → contraejemplo → tres pasos → comprobación nueva. Los recursos de situación y guiado no muestran la respuesta.

- 1.º: sapo sobre piedras numeradas (siete, dos saltos hacia atrás hasta el cinco) y cohete con un número faltante en la cuenta regresiva (el tres). Contraejemplo: contar el lugar de salida como salto. Comprobación: tortuga en el cuatro, tres lugares atrás (uno), b.
- 2.º: gráfico de barras de mascotas (ocho perros, tres gatos: cinco más) y pictograma de panes con cada figura valiendo dos (seis y diez: cuatro más). Contraejemplo: contar figuras sin su valor. Comprobación sin gráfico: fresas siete, uvas cuatro, tres fresas más (c).
- 3.º: recta numérica; 284 → 300 (seis y diez: dieciséis) y 462 → 500 (ocho y treinta: treinta y ocho). Contraejemplo: detenerse en la decena (342 → 350 en vez de 400). Comprobación: 648 a 700 (cincuenta y dos), a.
- 4.º: croquis de una calle visto desde arriba; colegio al frente del mercado y farmacia a la izquierda del colegio. Contraejemplo: referencia que se mueve (mototaxi) frente a una fija (iglesia); se menciona además invertir izquierda y derecha. Comprobación: ferretería a la derecha de la posta (b).
- 5.º: mapas con calles y avenidas (Tacna, Junín, Puno / Brasil, Arica, Colón; Cusco, Piura, Tumbes / Norte, Centro, Sur). Ejemplo 1: leer el cruce de la posta; ejemplo 2: ubicar la escuela dado su cruce. Contraejemplo: nombrar solo la calle (mercado y posta en la misma calle). Comprobación: se necesitan calle y avenida (c).
- 6.º: triángulo de cuatro, cinco y seis centímetros con compás y rectángulo de seis por cuatro con escuadra. Contraejemplo: lados tres, cuatro y ocho no cierran (arcos que no se tocan). Comprobación: un rectángulo exige cuatro ángulos rectos (a).
- Letras correctas: b, c, a, b, c, a. Longitudes de opciones con diferencia ≤ 3 y la correcta nunca la más larga (p1: 3, 3, 5; p2: 31, 29, 29; p3: 15, 14, 16; p4: 26, 24, 25; p5: 32, 33, 30; p6: 29, 30, 27).
- Los textos de los SVG llevan cifras y símbolos (`284`, `6 + 10 = 16`, `cm`); narración, alt, descripción y comprobación los dicen en palabras. La narración no nombra vértices con letras.
- Las imágenes de situación no escriben la respuesta: p5 `plano-pregunta` y `cruce-pregunta` describen los marcadores sin nombrar su cruce (la lectura del cruce es la tarea).

## Verificaciones

- Cuentas recalculadas: 7 − 2 = 5; 8 − 3 = 5; 6 y 10 = 16; 284 + 16 = 300; 8 y 30 = 38; 462 + 38 = 500; 342 + 8 = 350 y + 50 = 400; 700 − 648 = 52; 5 × 2 = 10 y 3 × 2 = 6 (diferencia 4); 7 − 4 = 3; 4 − 3 = 1. Triángulo 4-5-6: vértice en la intersección de dos arcos (calculada y dibujada a escala de 50 px por centímetro); 3 + 4 < 8 (los arcos dibujados dejan un hueco de 40 px).
- Script de lote: `recursoRef` ↔ recursos exactos (todos usados y solo ellos), 10 momentos, primer momento sin recurso, sin dígitos en narración, pregunta, opciones, mensaje, pista, alt y descripción, sin «parte N de M», sin títulos repetidos en la narración, sin «mira/imagen/dibujo/tarjeta» en momentos sin recurso, alt ≤ 200 y descripción ≤ 500, SVG existentes, texto ≥ 26 px, sin `<tspan>`, colores de texto solo `#1E2A78`, `#0C706E`, `#8A5A00`, `#B5412A` y `#FFFFFF`.
- Todos los SVG se rasterizaron en Chrome headless (sin ventana) y se vieron antes de escribir alt y descripción; se corrigieron: flechas y etiquetas de saltos pegadas a rótulos (p1), `Dice 6` tapando una piedra (p1), recuadro punteado pegado a las figuras y texto sobre el borde de la tarjeta (p2), insignias que desbordaban su texto y rótulo cortado en el borde (p3), `Calle` sobre la línea de eje (p4), etiqueta del parque pegada a la de la avenida (p5).
- `pnpm nudito:validar-banco`: banco válido (2 238 fichas, 27 034 ejercicios). `pnpm typecheck`: sin errores. `git diff --check` sobre los 6 JSON y los diagramas: limpio.

## Errores de ejercicios existentes (no editados)

Ningún error de contenido ni de grado en las respuestas de las seis claves (todas recalculadas). Observaciones menores:

- `mat.p1.contar-hacia-atras`: enunciados con concordancia numérica incorrecta cuando el número es uno («cuenta 1 números», «retrocede 1 veces», «1 lugares»; e01, e04, e09) y retroalimentación igual («Al retroceder 1 lugares»). Conviene singular.
- `mat.p1.contar-hacia-atras`: enunciados con doble contexto redundante («En la actividad con choclos en el patio, en un juego en el patio dices…»; e02, e06, e10).
- `mat.p6.construir-triangulos-cuadrilateros` e11: la opción correcta es mucho más larga que las otras (se nota por longitud).
- `mat.p2.conclusiones-grafico`: los ejercicios dependen de la «lectura» textual del gráfico (no de una imagen); correcto, pero el alumno debe leer una tabla de bloques en texto.

## Riesgos y pendientes

- Sin revisión independiente ni recorrido en navegador (audio, móvil, movimiento reducido); los SVG se vieron sueltos.
- p4 y p5: el sentido de izquierda y derecha y de «al frente» está fijado a la vista de la pantalla (croquis visto desde arriba); la narración lo anuncia («de izquierda a derecha»).
- p4 `errores`: la mototaxi y la iglesia son dibujos esquemáticos (descritos así).
- p5: la narración dice «las calles van de lado a lado y las avenidas, de arriba abajo» como convención de esta ficha; no es una norma general de la urbanística.
- p6 contraejemplo menciona de forma elemental que los lados cortos no alcanzan (idea de la desigualdad triangular), tema ya presente en el ejercicio e09.
- No se actualizaron `estado-refuerzo-primaria.json`, specs ni bitácora (fuera del encargo).

## Correcciones tras la revisión independiente (`revision-lote-41.md`)

`mat.p2.conclusiones-grafico` y `mat.p4.croquis-referencias`: aprobadas, sin cambios.

- p3 `contraejemplo`: la narración ahora dice de dónde parte el error («parte de trescientos cuarenta y dos»).
- p5: el mercado pasa a Junín×Brasil en `plano-pregunta` y `plano-posta` (coincide con `errores`; alt y descripciones no nombran la fila). Los rótulos de los mapas dicen «Aquí: calles de lado a lado y avenidas de arriba abajo»; la situación dice «En este croquis…»; el contraejemplo ya no da esa orientación como regla general y usa en su lugar «el nombre de las avenidas lleva la palabra avenida». Comprobación reescrita con opciones de forma y longitud parejas (28, 28, 29; correcta c: calle Puno con avenida Arica), pista y mensaje nuevos. SVG `plano-pregunta`, `plano-posta` y `cruce-pregunta` rasterizados y revisados.
- Ejercicios existentes corregidos con autorización (id, dificultad y respuesta intactos):
  - `mat.p1.contar-hacia-atras` e01, e04, e09: singular en enunciado, pista 2 («Retrocede 1 vez») y retroalimentación («1 número», «1 lugar»).
  - `mat.p6.construir-triangulos-cuadrilateros` e11: opciones de longitud pareja (38, 38, 39): «Traza 5 cm, marca 60°, mide 5 cm y une» (correcta, a), «…90°…», «Dibuja los tres lados de 5 cm sin medir»; enunciado, pistas y retroalimentación sin cambios.
- Revalidados: `pnpm nudito:validar-banco`, `pnpm typecheck` y `git diff --check`. p1, p3, p5 y p6 quedan para re-revisión.
