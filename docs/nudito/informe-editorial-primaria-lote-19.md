# Informe editorial primaria, lote 19 (Matemática)

Autor de contenido. Pendiente de revisión independiente: este informe no aprueba el lote. Solo cambió el campo `claseGuiada` de cada clave (ejercicios, ids, respuestas y dificultad intactos). No se tocaron componentes, specs, estado JSON ni BD.

## Alcance

Rutas del banco bajo `src/lib/nudito/conocimiento/banco/matematica/`. SVG en `public/nudito/diagramas/matematica/` (640×480, texto ≥ 26 px, `<title>` presente, sin `<tspan>`).

| Clave | Archivo | Momentos | Recursos (id) | Correcta |
|---|---|---:|---|---|
| `mat.p1.alto-bajo` | `primaria-1/fichas/longitud.json` | 10 | `mismo-piso`, `tito-pregunta`, `tito-resuelto`, `torres-pregunta`, `torres-resuelto` | c |
| `mat.p2.balanza-platillos` | `primaria-2/fichas/igualdades-y-equivalencias.json` | 10 | `inclinada`, `nueve-pregunta`, `nueve-resuelto`, `diez-pregunta`, `diez-resuelto` | a |
| `mat.p3.balanza-masa` | `primaria-3/fichas/c23-masa-tiempo.json` | 10 | `sandia-pesa`, `saco-pregunta`, `saco-resuelto`, `aguja-pregunta`, `aguja-resuelto` | b |
| `mat.p4.angulo-recto` | `primaria-4/fichas/poligonos.json` | 10 | `tres-angulos`, `ventana-pregunta`, `ventana-resuelto`, `triangulo-pregunta`, `triangulo-resuelto` | c |
| `mat.p5.barras-desde-tabla` | `primaria-5/fichas/graficos.json` | 10 | `tabla-ejes`, `frutas-tabla`, `frutas-barras`, `granja-pregunta`, `granja-barras` | a |
| `mat.p6.ampliacion-reduccion` | `primaria-6/fichas/ubicacion-y-transformaciones.json` | 10 | `casitas`, `rectangulo-pregunta`, `rectangulo-resuelto`, `plano-pregunta`, `plano-resuelto` | b |

SVG nuevos (30): `alto-bajo-{mismo-piso,tito-lucia-pregunta,tito-lucia-resuelto,torres-pregunta,torres-resuelto}`, `balanza-platillos-{inclinada,nueve-seis-tres-pregunta,nueve-seis-tres-resuelto,diez-siete-pregunta,diez-siete-resuelto}`, `balanza-masa-{sandia-pesa,saco-papa-pregunta,saco-papa-resuelto,aguja-pregunta,aguja-resuelto}`, `angulo-recto-{tres-angulos,ventana-pregunta,ventana-resuelto,triangulo-pregunta,triangulo-resuelto}`, `barras-desde-tabla-{tabla-a-ejes,frutas-tabla,frutas-barras,granja-pregunta,granja-barras}`, `ampliacion-reduccion-{casitas,rectangulo-tres-dos-pregunta,rectangulo-tres-dos-resuelto,plano-triangulo-pregunta,plano-triangulo-resuelto}`.

Estructura común: idea (sin imagen) → situación (recurso) → ejemplo 1 guiado (variante «pregunta») → ejemplo 1 razonado (variante «resuelto») → ejemplo 2 guiado → ejemplo 2 razonado → contraejemplo de errores frecuentes (sin recurso) → tres pasos (reusan recursos por `recursoRef` de id) → comprobación nueva.

## Decisiones pedagógicas

- 1.º: frases cortas; mismo piso, línea punteada desde la cabeza, torres de cubos. Contraejemplo: silla y cercanía.
- 2.º: equilibrio como igualdad (9 = 6 + 3) y desigualdad (10 y 7, faltan 3). La variante «pregunta» dibuja los platillos sueltos, sin viga, para no mostrar si hay equilibrio ni qué lado baja. Contraejemplo: misma cantidad de objetos no es mismo peso; no se quita al platillo que sube.
- 3.º: saco de papa con 5 kg + 2 kg; balanza de aguja con lectura de 8 kg; contraejemplo: lado que sube y contar pesas en vez de sumar kilogramos.
- 4.º: comprobación con hoja sobre el vértice. Un ejemplo encaja (ventana) y otro deja hueco (triángulo con ángulo de 120°). Se menciona «noventa grados». Comprobación sobre independencia del largo de los lados.
- 5.º: dos ejemplos complementarios: elegir escala (cinco en cinco) y ubicar barras entre marcas (escala de veinte, puntos medios 50 y 30). Contraejemplo: escala irregular y barras de distinto ancho.
- 6.º: ampliación ×3 de rectángulo 3 por 2 y reducción a la mitad en el plano con centro en el origen; contraejemplo: sumar en vez de multiplicar y cambiar una sola medida.
- Letra correcta variada: c, a, b, c, a, b. Opciones de longitud parecida; cantidades en palabras en opciones y narración (sin dígitos en narración).
- Las variantes «pregunta» no incluyen la respuesta ni la regla; los recursos «resuelto» van solo en los momentos «razona» y pasos.

## Verificaciones

- SVG renderizados con Chrome headless en hojas de contacto y revisados a ojo; corregidos solapes (título/torre, árbol, números de la esfera, pesas fuera de platillo, textos que desbordaban el margen). Descripciones y `alt` escritos después de revisar los dibujos. Alt ≤ 200 caracteres.
- Script: todos los `recursoRef` existen y todos los recursos se usan; primer momento sin imagen; sin dígitos ni «parte N de M» en narraciones; ningún momento sin recurso habla de «dibujo» o «imagen»; ningún título repetido en la narración; SVG con `<title>`, viewBox 640×480 y fuentes ≥ 26.
- Cálculos recalculados en script y a mano: 6 + 3 = 9; 10 − 7 = 3; 15 − 9 = 6; 5 + 2 = 7; 4 + 3 + 2 = 9; frutas 15/25/35/20 = 3/5/7/4 intervalos de 5; puntos medios (40 + 60)/2 = 50 y (20 + 40)/2 = 30; 3 × 3 = 9 y 2 × 3 = 6; (4,2), (8,2), (4,6) a (2,1), (4,1), (2,3); 12 ÷ 3 = 4 y 18 ÷ 3 = 6 (distractores: 12 − 3 = 9, 18 − 3 = 15).
- `pnpm nudito:validar-banco`: banco válido, 2 238 fichas activas, 27 034 ejercicios. `pnpm typecheck`: sin errores. `git diff --check` sobre banco de Matemática y diagramas: limpio.

## Ejercicios existentes revisados

Los 72 ejercicios de las seis claves son correctos en cálculo. Un defecto de redacción (no editado):

- `mat.p5.barras-desde-tabla`, `e08` (heladería, escala de 30 en 30): «¿cuál es el número de la marca más baja del eje que permite contener a todas las barras?». La respuesta guardada es 120, que es la marca más alta necesaria; la marca más baja de una escala desde 0 sería 0. Redacción ambigua: debería decir «marca más alta» o «hasta qué marca debe llegar el eje».

## Riesgos y pendientes

- No se recorrió el flujo en navegador con audio, móvil ni movimiento reducido; falta la revisión independiente (pedagógica, factual, visual, oral).
- Como en lotes anteriores, la lección publicada prevalece sobre el banco: editar el JSON no cambia lo que ve el alumno hasta que el orquestador renueve la fuente efectiva.
- La descripción de cada recurso la lee el reproductor; la narración no la repite íntegra, pero sí nombra lo esencial.
- p4: la situación `tres-angulos` incluye un ángulo de 90° (B) sin rotularlo como recto; la narración evita decirlo. Un revisor debe confirmar que no revela la regla.
- p3 `sandia-pesa` muestra el platillo inclinado (el que baja es el de mayor masa); la narración lo enuncia como parte de la idea. Un revisor debe decidir si cuenta como regla mostrada en la situación.
- No se verificó si algún nombre de SVG choca con archivos de otros lotes (el directorio está sin seguimiento en git); los nombres llevan el tema y el rol para minimizar ese riesgo.

## Correcciones tras la revisión independiente (`revision-lote-19.md`)

p2 y p5 aprobadas, sin cambios (el e08 de p5 lo corrigió el orquestador).

- p1: la descripción de `torres-pregunta` ya no dice cuál torre es más larga; la de `tito-resuelto` menciona el trazo corto hacia la cabeza de Lucía.
- p3: `aguja-pregunta` alinea alt y descripción con el SVG (solo el eje rojo, la aguja todavía no se detiene); la bolsa de harina se redibujó más baja y completa, separada de la caja kg (`aguja-pregunta` y `aguja-resuelto`); `ejemplo-2-razona` ahora dice «el ocho viene después del seis y antes del diez, y allí está la punta de la aguja».
- p4: alt de `triangulo-pregunta` sin «muy abierta»; ángulo B de `tres-angulos` girado veinte grados (sigue siendo de noventa) y descripción sin «lado vertical»; opciones de 27, 27 y 26 caracteres; pregunta «¿Cuáles son ángulos rectos?»; pista «Recuerda para qué sirve la escuadra: ¿qué compara?».
- p6: `ejemplo-2-razona` dice que los trazos punteados unen cada punto con su nuevo punto y, prolongados, pasan por el origen; descripciones de `plano-resuelto` («más cerca del origen») y `plano-pregunta` (ejes de cero a ocho y de cero a seis) corregidas; en voz se usan «coordenada horizontal y vertical» y «las dos coordenadas» en lugar de «x e y».
- SVG cambiados rerasterizados y revisados (tres-angulos, aguja-pregunta, aguja-resuelto). Validación repetida: banco válido (2 238 fichas, 27 034 ejercicios), typecheck y `git diff --check` limpios.
