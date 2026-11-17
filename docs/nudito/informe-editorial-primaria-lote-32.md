# Informe editorial — refuerzo de primaria, lote 32 (Matemática)

Autor: Claude (sin aprobar su propio lote; pendiente de revisión independiente).
Alcance: solo el campo `claseGuiada` (formato v1) de seis claves y sus recursos SVG. Ejercicios, ids, respuestas y dificultad quedan intactos.

## Estado de partida

Una ejecución anterior había dejado `claseGuiada` y 24 SVG para las seis claves. Se auditaron y se reutilizó lo correcto (estructura de momentos, `casita-solucion`, `carrito-solucion`, `lapices-seis-bolsas`, `caramelos-quince`, `errores`, `transporte`, `no-inventar`, `cinta-soga`). El resto se rehízo por defectos reales (ver más abajo). No quedan SVG huérfanos: los 24 archivos están referenciados.

## Tabla

| Clave | Archivo | Momentos | Recursos |
| --- | --- | --- | --- |
| mat.p1.comparar-longitudes | primaria-1/fichas/longitud.json | 10 | cintas-pregunta, lapices-alineados, cinta-soga, error-inicio |
| mat.p2.construir-con-cuerpos | primaria-2/fichas/cuerpos-geometricos.json | 10 | puente-pregunta, casita-solucion, carrito-solucion, base-error |
| mat.p3.dividir-por-10 | primaria-3/fichas/c23-multiplicacion-division.json | 10 | bolsas-pregunta, seis-bolsas, quince-decenas, errores |
| mat.p4.conclusiones-graficos | primaria-4/fichas/conclusiones.json | 10 | frutas-pregunta, frutas-conclusion, transporte, no-inventar |
| mat.p5.convertir-kg-g | primaria-5/fichas/medicion-masa-y-tiempo.json | 10 | balanza-pregunta, mangos, paquete, sentido |
| mat.p6.comparar-ordenar-fracciones | primaria-6/fichas/fracciones.json | 10 | tiras-pregunta, doceavos, veinteavos, error-numeradores |

Rutas completas bajo `src/lib/nudito/conocimiento/banco/matematica/`. SVG en `public/nudito/diagramas/matematica/` (prefijos `comparar-longitudes-`, `construir-cuerpos-`, `dividir-diez-`, `conclusiones-graficos-`, `convertir-kg-g-`, `comparar-fracciones-`).

## Decisiones y correcciones respecto al borrador previo

- Recursos rehechos a mano (viewBox 640×480, texto ≥26 px, sin solapes ni recortes, `<title>`, paleta de specs/18): `cintas-pregunta` (etiqueta tapada por la barra), `lapices-alineados`, `error-inicio` (la comparación incorrecta llevaba un visto bueno), `puente-pregunta`, `bolsas-pregunta` (texto desbordado), `frutas-pregunta`, `frutas-conclusion` (el eje mostraba números, no frutas), los cuatro de kg/g (texto recortado y encima de la balanza), `tiras-pregunta`, `doceavos`, `veinteavos` (rótulos recortados) y `error-numeradores` (la cruz cruzaba el borde).
- Contraste: texto turquesa a `#0C706E`; texto sobre relleno turquesa en blanco; ámbar `#8A5A00`.
- P1: se quitó el recurso de `ejemplo-1-guiado` (mostraba la respuesta); comprobación con opciones de longitud pareja (12, 12 y 11 caracteres), correcta b.
- P2: la comprobación repetía el problema de la situación (puente, bloque largo); ahora es nueva (remate de torre, cono), correcta a, opciones de 7, 7 y 10 caracteres.
- P4: se mantiene la comprobación (25, 27, 25; correcta c, no la más larga); enunciado más natural.
- P5: la correcta era la más larga; nueva comprobación de tres coma cinco kilogramos (28, 26, 26; correcta c). El contraejemplo ahora remite al esquema que lleva.
- P6: la comprobación repetía el par del contraejemplo (cinco sextos y siete novenos); el contraejemplo usa ahora tres quintos y dos tercios, y se quitó la mención a la recta, que no se trabaja en la ficha. Opción "Son equivalentes" cambiada a "Son iguales" (13, 12, 11; correcta b).
- Letras correctas de las seis comprobaciones: b, a, a, c, c, b.
- Descripciones reescritas tras ver cada imagen final; todas las alt ≤200 caracteres y descripcion ≤500 (tres entre 250 y 301: `cintas-pregunta`, `error-inicio`, `tiras-pregunta`).
- Situaciones y ejemplos guiados sin respuesta en dibujo, alt ni descripcion; los marcadores "? g" y las barras sin números no fijan valores.

## Verificaciones

- `pnpm nudito:validar-banco`: válido (2238 fichas activas; 27034 ejercicios).
- `pnpm typecheck`: sin errores.
- `git diff --check` sobre los seis JSON y los SVG: limpio.
- Los 24 SVG se parsean como XML y se rasterizaron en Chrome headless para revisarlos uno por uno.
- Script: 10 momentos por clave, primer momento sin imagen, todos los `recursoRef` apuntan a un recurso existente y todos los recursos se usan, ningún momento sin recurso dice "dibujo/imagen/esquema", sin cifras ni "parte N de M" en narración y opciones.
- Aritmética recalculada: 420÷10=42; 3,5 kg=3500 g; 25>18; 3/5=9/15<10/15=2/3; 5/6=15/18>14/18=7/9; 2/3=8/12<9/12=3/4; 2/5=8/20<1/2=10/20<3/4=15/20.

## Riesgos

- No se probó en navegador la lectura por voz ni la revelación de texto; solo contenido y SVG.
- En `veinteavos` y `doceavos` los rótulos de las barras son fracciones con cifras (como en lotes anteriores); la voz usa la narración, no el texto del SVG.
- Quedan descripciones algo largas (≤301), dentro del límite de 500.

## Errores o dudas en ejercicios existentes (no editados)

No hay errores matemáticos: se recalcularon todos los ejercicios de las seis fichas. Observaciones menores:

- mat.p1.comparar-longitudes e09–e11: razonar con "desde la marca A hasta la marca B" exige restar; algo exigente para primer grado.
- mat.p1.comparar-longitudes e05: el diagrama con puntos y barras verticales dentro del enunciado se lee mal con lector de pantalla.
- mat.p2.construir-con-cuerpos e05: "pelota" frente a "dado" como cabeza del robot es discutible (una pelota sobre una caja puede quedarse quieta); conviene reformular.
- mat.p4.conclusiones-graficos e09–e11: usan puntos como pictograma en texto; sin imagen, la lectura oral es incómoda.

## Correcciones tras la revisión independiente

Aprobadas sin cambios: mat.p3.dividir-por-10, mat.p4.conclusiones-graficos, mat.p5.convertir-kg-g.

- mat.p1: `ejemplo-1-guiado` dice «un extremo de cada lápiz» (antes «puntas de la izquierda»); `ejemplo-2-guiado` ya no entrega la respuesta.
- mat.p2: `paso-2` cierra la situación del puente («el bloque largo»); alt de `base-error` dice «bloque rectangular»; pista de la comprobación suavizada (sombrero de cumpleaños).
- mat.p6: título del SVG `tiras-pregunta` y su alt pasan a «Dos tiras del mismo largo» (SVG rerasterizado); la `idea` ya no menciona la recta numérica; el `contraejemplo` cierra el error (en quinceavos, tres quintos son nueve y dos tercios diez: dos tercios es mayor).
- Los ejercicios no se tocaron; sus hallazgos quedan en backlog.
