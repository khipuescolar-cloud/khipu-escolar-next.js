# Informe editorial · Primaria, Matemática, lote 39

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente** (el autor no aprueba su propio lote). No se tocaron estado, huellas, BD, specs ni componentes. Solo cambió el campo `claseGuiada` de cada clave (comparado con `HEAD`: el resto de cada clave y sus ejercicios son idénticos).

## Alcance

Archivos bajo `src/lib/nudito/conocimiento/banco/matematica/`. Todas con 10 momentos (el primero sin recurso) y 5 recursos SVG (640×480) en `public/nudito/diagramas/matematica/`, dibujados como código.

| Clave | Archivo | Recursos (id → `<prefijo>-<sufijo>.svg`) |
|---|---|---|
| `mat.p1.comparar-masa-balanza` | `primaria-1/fichas/medicion-masa-y-tiempo.json` | `situacion`, `papa-cebolla`, `lapiz-borrador-pregunta`, `lapiz-borrador`, `globo-piedra` (prefijo `comparar-masa`) |
| `mat.p2.clasificar-por-lados` | `primaria-2/fichas/figuras-planas.json` | `situacion`, `triangulo`, `panuelo-ventana-pregunta`, `panuelo-ventana`, `salto` (`clasificar-lados`) |
| `mat.p3.comparar-capacidades` | `primaria-3/fichas/c26-forma-movimiento.json` | `situacion`, `trasvase`, `tazas-pregunta`, `tazas`, `alto-ancho` (`comparar-capacidades`) |
| `mat.p4.comprobar-suma-resta` | `primaria-4/fichas/c23-suma-resta-cuatro-cifras.json` | `situacion`, `barra-suma`, `resta-pregunta`, `barra-resta`, `error` (`comprobar-suma-resta`) |
| `mat.p5.construir-angulos` | `primaria-5/fichas/cuadrilateros-y-angulos.json` | `transportador-pregunta`, `marca-setenta`, `abanico-pregunta`, `marca-ciento-treinta`, `escala-equivocada` (`construir-angulos`) |
| `mat.p6.comprobar-solucion-ecuacion` | `primaria-6/fichas/ecuaciones.json` | `situacion`, `panes-pregunta`, `cuadernos`, `panes`, `sentido` (`verificar-ecuacion`) |

25 SVG nuevos (el prefijo `verificar-ecuacion` evita chocar con los `comprobar-solucion-ecuacion-*` del lote 30). Momentos: idea → situación (recurso) → ejemplo 1 guiado (reutiliza el recurso de la situación) → ejemplo 1 razona → ejemplo 2 guiado (variante «pregunta») → ejemplo 2 razona → contraejemplo → tres pasos (sin recurso) → comprobación nueva.

## Decisiones pedagógicas

- **p1 (balanza):** la situación muestra la balanza vacía y pareja con los objetos al lado, para no adelantar cuál baja. Ejemplos: papa y cebolla (baja/sube) y lápiz y borrador (pareja). Contraejemplo: globo grande que sube frente a piedra pequeña que baja. Frases cortas. Comprobación: la manzana sube, ¿qué pesa más? (b).
- **p2 (lados):** alt y descripción de la situación no nombran triángulo, cuadrilátero ni pentágono. Ejemplo 1: triángulo con lados numerados; ejemplo 2: pañuelo cuadrado y ventana larga (mismo grupo por tener cuatro lados). Contraejemplo: pentágono con un lado saltado al contar. Comprobación: celda de panal, seis lados (c, hexágono).
- **p3 (capacidades):** jarra ancha y botella alta (trasvase y rebalse); dos ollas con tazas iguales (diez frente a seis, quedan cuatro de diferencia); contraejemplo: vaso alto y delgado (tres vasitos) frente a tazón ancho (cinco). Comprobación: jarra de seis vasos vaciada en botella de cuatro (a).
- **p4 (comprobar):** cuentas de tienda con barras de total y partes. Suma comprobada restando un sumando; resta comprobada sumando la respuesta con lo que se quitó. Contraejemplo: sumar la respuesta con el número del inicio (da nueve mil seiscientos cincuenta). Comprobación en forma de «qué cuenta lo comprueba», con opciones de longitud pareja (b).
- **p5 (ángulos):** transportador dibujado de media luna. Ejemplo 1: setenta grados; ejemplo 2: ciento treinta con línea punteada de noventa como referencia; contraejemplo: se pedían cuarenta y se leyó la otra escala (ciento cuarenta). Comprobación: cincuenta en la escala que parte de la derecha (c). Se evita decir agudo/obtuso; se usa «pequeño», «muy abierto» y «más que uno recto».
- **p6 (ecuaciones):** sustituir y comparar los dos lados con cuadernos (suma y producto) y panes (división, no sirve); contraejemplo: dos coma cinco entradas cumple la igualdad pero no tiene sentido. En la narración la letra nunca se pronuncia («la letra», «la cantidad de cuadernos»). Comprobación: triple menos dos igual a trece, cinco caramelos (a).
- Letras correctas: b, c, a, b, c, a. Opciones con diferencia de longitud ≤ 3 y la correcta nunca la única más larga (p6: empate en quince).

## Verificaciones

- Script del lote: 10 momentos, primer momento sin recurso, cada `recursoRef` ↔ un recurso y viceversa, archivos SVG existentes, `alt` ≤ 200 y `descripcion` ≤ 500, sin dígitos en narración, títulos, pregunta, opciones, mensaje, pista, alt y descripción, sin «parte N», título no repetido en la narración, sin «dibujo/imagen/tarjeta/barras» en momentos sin recurso, opciones de longitud pareja.
- Cálculos recalculados: 10 − 6 = 4; 2 600 + 1 800 = 4 400; 4 400 − 1 800 = 2 600; 6 000 − 2 350 = 3 650; 3 650 + 2 350 = 6 000; 3 650 + 6 000 = 9 650; 5·4 + 4 = 24; 20 ÷ 4 = 5 ≠ 6; 6 × 2,5 = 15; 3·5 − 2 = 13 (3·7 − 2 = 19, 3·3 − 2 = 7); 3700 − 1200 = 2500.
- SVG rasterizados con Chrome headless y vistos antes de escribir alt y descripción. Corregido en el proceso: rótulo de la cebolla tapando el platillo y sobrepasando el margen; rótulo «130°» sobre el rayo; cruz y marca verde pegadas en p6; símbolo «distinto» con trazo doble; jarra con un trazo suelto; gotas fuera de la boca de la botella.
- Todos los SVG: viewBox 640×480, `<title>`, sin `<tspan>`, texto ≥ 26 px, texto turquesa `#0C706E`, ámbar `#8A5A00`, rojo `#B5412A` solo en errores; rellenos decorativos (marrón papa, morado cebolla, gris piedra, naranja líquido, azul claro) no son texto.
- `pnpm nudito:validar-banco`: banco válido (2 238 fichas, 27 034 ejercicios). `pnpm typecheck`: sin errores. `git diff --check` sobre bancos y diagramas: limpio.

## Errores en ejercicios existentes

Revisados los 72 ejercicios de las seis claves (respuestas recalculadas). No se halló ningún error de contenido que afecte al alumno. Observaciones menores, sin editar:
- `mat.p5.construir-angulos` e01: las opciones tienen longitudes muy dispares (la correcta es la más larga de las cuatro). Estético; no hay error.
- `mat.p5.construir-angulos` e08: el enunciado supone el rayo inicial hacia la izquierda y la escala exterior; es correcto pero exige imaginar un transportador con dos escalas que la ficha no dibuja.

## Riesgos y pendientes

- Sin revisión independiente ni recorrido en navegador (audio, móvil, movimiento reducido); los SVG se vieron sueltos.
- p5: los textos de los SVG usan cifras y «°»; la narración y las descripciones los dicen en palabras. En p5 el rótulo «0°» queda a la derecha y «180°» a la izquierda: el transportador no dibuja la segunda escala salvo en el contraejemplo (donde se lee «140°» y «40°» sobre el mismo trazo).
- p6: las descripciones dicen «c», «p» y «e» como letras porque se leen en pantalla; la narración nunca las pronuncia.
- p1: el globo se dibuja sobre el platillo con las cuerdas detrás; para primero basta, pero un revisor podría pedir más aire.
- p4: las cantidades largas en palabras («dos mil trescientos cincuenta») son pesadas al oído; se evitó listar más de dos por frase.
- No se actualizaron `estado-refuerzo-primaria.json`, specs ni bitácora (fuera del encargo).

## Correcciones tras la revisión independiente (`revision-lote-39.md`)

`mat.p3.comparar-capacidades` aprobada: sin cambios.

- **p1:** el título del SVG `lapiz-borrador-pregunta` pasa a «¿Qué podemos decir?» (alt/descripción alineadas); `ejemplo-1-guiado` ya no adelanta que baja la papa: pide predecir qué platillo baja y qué pesa más.
- **p2:** `ejemplo-2-guiado` dice «Mateo también guarda…»; `ejemplo-2-razona` cierra la figura amarilla (también tiene cuatro lados); la descripción de `situacion` describe la azul como «una casita» (sin contar esquinas).
- **p4:** la opción a de la comprobación pasa a «Sumar los sumandos con el total» (única correcta: «Restar mil doscientos del total»; longitudes 31, 31, 33).
- **p5:** los cuatro SVG con transportador dibujan ahora la segunda escala (ceros interiores a la izquierda y ciento ochenta a la derecha); la idea y la descripción de `transportador-pregunta` lo dicen y se cambió «escala correcta» por «cuenta desde el cero que queda sobre tu rayo». `escala-equivocada` (título «Se contó desde el otro cero») y el contraejemplo ya no afirman «la misma raya». `ejemplo-1-guiado` pregunta «¿Desde cuál cero contamos y hasta qué número llegamos?». **Ejercicio e01 editado con autorización** (id, tipo, dificultad, respuesta `c` y retroalimentación intactos): la opción c pasó de «Trazar un rayo o lado inicial con la regla y señalar el vértice» (62) a «Trazar un rayo con regla y marcar el vértice» (44); las otras miden 41-45. La ficha va a re-revisión.
- **p6:** alt y descripciones sin letras sueltas (se dice «la cantidad de cuadernos/panes/entradas», «la letra»); `cuadernos` y `panes` mencionan su título; las letras quedan solo en el SVG.
- SVG cambiados (p1 uno, p5 cinco) rasterizados en headless y vistos. Revalidados banco, typecheck y `git diff --check`.
