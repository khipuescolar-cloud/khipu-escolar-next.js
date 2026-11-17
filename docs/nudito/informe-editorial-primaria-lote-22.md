# Informe editorial · Primaria, Matemática, lote 22

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. No se tocaron estado, huellas, BD, specs ni componentes. En cada archivo solo se añadió el campo `claseGuiada` de la clave; ejercicios, ids, respuestas y dificultad quedan intactos (inserción de texto al final del objeto de la clave).

## Alcance

Archivos bajo `src/lib/nudito/conocimiento/banco/matematica/`. Todas con 10 momentos (el primero sin recurso) y comprobación nueva. SVG en `public/nudito/diagramas/matematica/`.

| Clave | Archivo | Recursos (id → SVG) |
|---|---|---|
| `mat.p1.aumenta-o-disminuye` | `primaria-1/fichas/adicion-y-sustraccion-hasta-20.json` | `situacion`, `lapices-pregunta`, `lapices-solucion`, `globos-solucion` (`aumenta-*.svg`) |
| `mat.p2.calculo-con-decenas` | `primaria-2/fichas/adicion-y-sustraccion-hasta-100.json` | `situacion`, `decenas-pregunta`, `setenta`, `unidades-pregunta`, `sesenta-y-cuatro` (`calculo-decenas-*.svg`) |
| `mat.p3.canjes-c-d-u` | `primaria-3/fichas/c23-numeracion-fracciones-dinero.json` | `situacion`, `canje-pregunta`, `canje-trece`, `desarmar-pregunta`, `desarmar-solucion` (`canjes-*.svg`) |
| `mat.p4.barras-escala-10` | `primaria-4/fichas/graficos.json` | `situacion`, `diez-pregunta`, `juegos`, `corta`, `libros` (`barras-escala-diez-*.svg`) |
| `mat.p5.clases-de-angulos` | `primaria-5/fichas/cuadrilateros-y-angulos.json` | `situacion`, `agudo-pregunta`, `agudo-solucion`, `obtuso-solucion`, `tres-clases` (`clases-angulos-*.svg`) |
| `mat.p6.barras-dobles` | `primaria-6/fichas/graficos-estadisticos.json` | `situacion`, `escala-pregunta`, `libros`, `excursiones-pregunta`, `excursiones-parque` (`barras-dobles-*.svg`) |

29 SVG nuevos, 640x480, texto >= 26 px, paleta crema/indigo/turquesa/maiz, `<title>` presente, sin `<tspan>`.

## Decisiones

- Estructura: idea (sin imagen) → situacion → ejemplo 1 guiado (pregunta) y razonado (solucion) → ejemplo 2 guiado y razonado → contraejemplo → tres pasos (con recurso solo cuando lo narrado coincide) → comprobacion.
- 1.º: llegan/se van (galletas, lapices, globos); frases cortas. Comprobacion: diez canicas pierde cuatro (b; 13/12/12 caracteres).
- 2.º: decenas con barras de diez; suma de decenas (50+20) y decena+unidades (60+4); resta de decenas en paso 2 y comprobacion (c; 17/18/17).
- 3.º: placa/barra/cubito; canje 13 cubitos y desarmar una placa para restar 235-70 (a; 24/25/25).
- 4.º: escala de 10 en 10 (juegos) y de 20 en 20 con un dato entre marcas (70, a mitad entre 60 y 80); contraejemplo con escala corta (b; 25/24/26). Nombre de SVG `barras-escala-diez-*` para no chocar con lote 20 (`barras-escala-*`).
- 5.º: clasificar con la esquina de la escuadra (agudo, obtuso; recto en idea, paso 3 y resumen). Comprobacion de 105 grados (c; 24/24/23).
- 6.º: barras dobles: construir (leyenda, escala comun) y leer/comparar (diferencia mayor, 20-6=14). Turnos «Mañana/Tarde» en el ejemplo 2 para no usar letras sueltas. Comprobacion: tercera y quinta marca de 4 en 4, 8 mas (a; 15/17/15).
- Letras correctas: b, c, a, b, c, a.
- Narracion sin digitos, sin «parte N de M», sin letras sueltas como nombres, sin repetir titulos; «imagen» solo en momentos con recurso.

## Verificaciones

- Calculos: 4+3=7; 9-4=5; 5+2=7 decenas=70; 60+4=64; 50-20=30; 13=1 decena+3; 235-70=165 (13-7=6 barras, 100+60+5); 90..: escala 4 marcas hasta 80 con paso 10 (9 numeros desde 0); 70 entre 60 y 80; 105>90; 12 y 20 → 8; 12/8, 18/10, 6/20 → mayor diferencia 14 en parque.
- Ejercicios existentes de las 6 claves revisados por grado: no se hallaron errores de calculo ni de respuesta. Observaciones menores sin editar: p4 `e06` («escala mas comoda» admite lectura subjetiva, la respuesta 20 en 20 es defendible); p5 `e01`/`e04` usan vocabulario formal («grados sexagesimales», «denominacion») algo alto para 5.º.
- Los 29 SVG se rasterizaron con Chrome headless y se vieron antes de escribir alt y descripcion; corregidos durante la revision: arrow de escala corta que parecia 50, etiquetas desbordadas en angulos, bracket cerca del borde, etiquetas amontonadas.
- Script del lote: `recursoRef` ↔ recursos exactos, 10 momentos, primer momento sin recurso, alt <= 200, opciones con diferencia <= 3 y correcta no la mas larga.
- `pnpm nudito:validar-banco`: banco valido (2238 fichas, 27034 ejercicios). `pnpm typecheck`: sin errores. `git diff --check` sobre banco de Matematica y diagramas: limpio.

## Riesgos y pendientes

- Sin recorrido en navegador con audio, movil ni movimiento reducido; falta revision independiente.
- p3 `canje-pregunta` muestra la barra de diez cuadritos (la pregunta «cuantos cubitos hacen una barra» se responde contando); p5 `agudo-pregunta` muestra el lado dentro de la zona de la escuadra (la clase se nombra solo despues). Revisar si el revisor lo considera pista excesiva.
- Los SVG usan fuente sans-serif del sistema; revisar lectura en movil pequeno.
- Archivos de ficha compartidos con otras claves de otras sesiones: solo se inserto `claseGuiada` de la clave propia.
- No se compararon contra HEAD (el repo del proyecto no tenia commit accesible desde el cwd del script); la insercion es solo de texto al final del objeto.

## Correcciones tras la revisión independiente (`revision-lote-22.md`)

p1 y p6 aprobadas, sin cambios.

- p2: `alt` de `unidades-pregunta` alineado con el dibujo («marcadas con 60 … marcado con 4»); contraejemplo con «setenta más nueve es ochenta y nueve» en lugar de un número de tres cifras.
- p3: `alt` y `descripcion` de `canje-pregunta` sin «diez cuadritos»; rótulos de `desarmar-pregunta` separados (cubitos desplazados, ~35 px de aire); `paso-2` sin `recursoRef` (narraba el canje hacia arriba y la imagen era el inverso).
- p4: `corta` redibujado a escala (la barra de 80 mide 80 sobre el mismo eje; el eje y la línea punteada terminan en 50); `juegos` con barras más angostas y rótulos separados; `libros` subido (nota con más aire al borde); `paso-3` sin `recursoRef` (narra «entre dos marcas»). Ejercicio `e06` editado (solo enunciado): «¿Qué escala tiene pocas marcas y deja todos los datos justo en una marca?». Respuesta b única: de 1 en 1 tiene demasiadas marcas; de 3 en 3 no cae en 20, 40 ni 100; de 100 en 100 deja 20, 40 y 60 entre marcas.
- p5: en `agudo-pregunta` y `agudo-solucion` el lado mide menos que el radio de la escuadra y queda dentro de la zona; se quitó la etiqueta «ángulo» de la pregunta; `descripcion` de `agudo-pregunta` sin «dentro de la zona» y `alt` con «adentro, igual o afuera»; en `situacion` el ángulo 2 pasa de 90° a 75°. Ejercicios editados (id, respuesta y dificultad intactos): `e01` «¿Cuántos grados mide un ángulo recto? Escribe solo el número.»; `e04` «¿Cómo se llama un ángulo que mide entre 0° y 90°: agudo u obtuso?» y su retroalimentación «se llama agudo»; pistas y respuesta siguen coherentes.
- SVG cambiados rasterizados y revisados. Revalidado: `pnpm nudito:validar-banco` (2238 fichas, 27034 ejercicios), `pnpm typecheck` y `git diff --check` limpios.
