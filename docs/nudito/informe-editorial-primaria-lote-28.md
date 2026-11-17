# Informe editorial · Primaria, Matemática, lote 28

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. No se tocaron estado, huellas, BD, specs ni componentes. Solo cambió el campo `claseGuiada` de cada clave (cada archivo se releyó justo antes de escribir); ejercicios, ids, respuestas y dificultad quedan intactos.

## Alcance

Archivos bajo `src/lib/nudito/conocimiento/banco/matematica/`. Todas con 10 momentos (el primero sin recurso) y 5 recursos. SVG en `public/nudito/diagramas/matematica/` (30 nuevos, 640×480, texto mínimo 26 px, sin `<tspan>`, con `<title>`, texto ámbar `#8A5A00`, rojo `#B5412A` solo para errores).

| Clave | Archivo | Recursos (id; SVG `<prefijo>-<id>.svg`) |
|---|---|---|
| `mat.p1.calendario-mes` | `primaria-1/fichas/medicion-masa-y-tiempo.json` | `hoy-pregunta`, `contar`, `dia-pregunta`, `columna`, `errores` (prefijo `calendario-mes`) |
| `mat.p2.combinaciones-basicas` | `primaria-2/fichas/adicion-y-sustraccion-hasta-100.json` | `diez-pregunta`, `llenar-diez`, `resta-pregunta`, `suma-resta`, `errores` (`combinaciones-basicas`) |
| `mat.p3.calendario` | `primaria-3/fichas/c23-masa-tiempo.json` | `pregunta`, `saltos`, `fecha-pregunta`, `semanas`, `errores` (`calendario-setiembre`) |
| `mat.p4.compensacion-suma-resta` | `primaria-4/fichas/c23-suma-resta-cuatro-cifras.json` | `panes-pregunta`, `suma-compensada`, `resta-pregunta`, `resta-compensada`, `errores` (`compensacion-suma-resta`) |
| `mat.p5.clasificar-cuadrilateros` | `primaria-5/fichas/cuadrilateros-y-angulos.json` | `ventana-pregunta`, `ventana-pares`, `terreno-lados`, `errores`, `familias` (`clasificar-cuadrilateros`) |
| `mat.p6.comparacion-multiplicativa` | `primaria-6/fichas/numeros-naturales-y-operaciones.json` | `estampillas-pregunta`, `estampillas-bloques`, `papa-pregunta`, `papa-bloques`, `errores` (`comparacion-multiplicativa`) |

Momentos (todas): idea, situacion, ejemplo-1-guiado, ejemplo-1-razona, ejemplo-2-guiado, ejemplo-2-razona, contraejemplo, paso-1, paso-2, paso-3. Los momentos guiados y los pasos reutilizan por `recursoRef` el recurso de situación o de ejemplo que narran; solo `mat.p5` ejemplo-2-guiado no tiene recurso y su narración no dice «dibujo» (dice «imagina»).

## Decisiones pedagógicas

- p1: calendario de junio (cinco filas, siglas Lu–Do). Ejemplo 1: contar días desde mañana (nueve a trece, cuatro días). Ejemplo 2: día de la semana del diecisiete (miércoles) por columna. Contraejemplo: contar hoy (quince a dieciocho: cuatro mal, tres bien). Comprobación: dieciocho a veintitrés, cinco días (b).
- p2: marcos de diez con fichas. Ejemplo 1: siete más seis llenando el diez (trece). Ejemplo 2: trece menos cinco con la suma cinco más ocho. Contraejemplo: sumar las cuatro fichas completas en nueve más cuatro (catorce mal, trece bien). Comprobación: once menos cinco, seis huevos (a).
- p3: calendario de setiembre (inicia martes). Ejemplo 1: ocho a diecinueve = siete más cuatro = once. Ejemplo 2: el nueve es miércoles, ¿y el treinta? de siete en siete. Contraejemplo: veintisiete más siete no es treinta y cuatro de setiembre sino cuatro de octubre. Comprobación: veintiocho de abril más cinco días, tres de mayo (c).
- p4: modelos de barras. Ejemplo 1: quinientos noventa y nueve más doscientos treinta y cinco (seiscientos, menos uno, ochocientos treinta y cuatro). Ejemplo 2: seiscientos cuarenta menos doscientos noventa y siete (trescientos cuarenta, más tres, trescientos cuarenta y tres). Contraejemplo: quinientos treinta menos doscientos noventa y ocho, corrección en sentido contrario (doscientos veintiocho mal, doscientos treinta y dos bien). Comprobación numérica: cuatrocientos noventa y nueve más doscientos treinta y siete, setecientos treinta y seis (b).
- p5: tres familias por pares de lados paralelos, con marcas de flecha y rayas de prolongación. Ejemplo 1: paralelogramo (ventana); ejemplo 2: trapezoide (terreno, lados prolongados se cruzan); contraejemplo: un trapecio visto como paralelogramo. Comprobación: dos lados paralelos y otros dos no, trapecio (c).
- p6: bloques. Ejemplo 1: nueve por seis, cincuenta y cuatro. Ejemplo 2: cincuenta y seis entre siete, ocho (comprobación con la inversa). Contraejemplo: sumar en vez de multiplicar (ocho más cinco frente a cinco por ocho). Comprobación: elegir la operación de «cuatro veces menos» sobre ochenta, dividir (a).
- Letras correctas: b, a, c, b, c, a. Longitud de opciones (diferencia máxima): 2, 1, 3, 1, 2, 2; la correcta nunca es la única más larga (p1, p2, p4, p5 y p6 no es la más larga; p3 «Tres de mayo» tampoco).
- Recursos de situación y guiados sin respuesta: columnas «?» sin valor (`?` en `panes-pregunta`, `resta-pregunta`, `estampillas-pregunta`, `papa-pregunta`); en los calendarios solo se marcan las fechas del enunciado.

## Verificaciones

- Cuentas recalculadas con script de estructura y a mano: 599+235=834; 640−297=343; 530−298=232; 499+237=736; 7+6=13; 13−5=8; 11−5=6; 19−8=11; 9, 16, 23, 30 en miércoles; 27+7 = 4 de octubre; 28 de abril + 5 = 3 de mayo; 6×9=54; 56÷7=8; 5×8=40; 80÷4=20; junio de 2026 empieza en lunes y setiembre en martes.
- Script de lote: recursoRef ↔ recursos exactos (todos usados y solo ellos), 10 momentos, primer momento sin recurso, sin dígitos en narración, pregunta, opciones, mensaje, pista, alt y descripción, sin «parte N de M», sin títulos repetidos en la narración, ningún momento sin recurso nombra «dibujo/imagen/barra/tarjeta», alt ≤ 200 y descripción ≤ 500 caracteres, SVG existentes y texto ≥ 26 px.
- Los 30 SVG se rasterizaron con Chrome headless y se vieron antes de escribir alt y descripción. Se corrigieron durante el trabajo: arco rojo del contraejemplo de p4 solapado con las cifras, etiqueta «se cruzan» sobre una raya en p5, filas de `familias` apretadas, pieza «3» estrecha en `resta-compensada`, trazo sobrante en `suma-compensada`.
- `pnpm nudito:validar-banco`: válido (2 238 fichas, 27 034 ejercicios). `pnpm typecheck`: sin errores. `git diff --check` sobre los 6 JSON: limpio.

## Revisión de los ejercicios existentes

Recalculados los 72 ejercicios de las 6 claves: **sin errores de contenido ni de grado**. Observaciones menores, no editadas:

- p6: «veces más» se usa como multiplicar (cuatro veces más que veinticuatro = noventa y seis en e06). Es la convención de la ficha y coincide con la clase guiada, pero en el habla cotidiana «cuatro veces más» a veces significa «veces más que»; riesgo de ambigüedad si otro revisor prefiere «veces más que».
- p5: e03 tiene como pista final «Su nombre termina en el sufijo -oide», que casi entrega la respuesta (trapezoide frente a romboide).
- p5: e08 acepta «rectangulo» sin tilde en la respuesta; correcto si la normalización ignora tildes.
- p1: los enunciados de e01-e04 usan un calendario de mayo en texto; la clase guiada usa junio (no hay conflicto, solo cambia el mes).

## Riesgos y pendientes

- Sin revisión independiente ni recorrido en navegador (audio, móvil, movimiento reducido); los SVG se vieron sueltos.
- Los textos dentro de los SVG usan cifras y símbolos (`9 + 4`, `640 − 297 = ?`); la narración y la descripción los dicen en palabras.
- Los calendarios inevitablemente muestran el día de la semana en la cabecera de columna (p1 `dia-pregunta`, p3 `fecha-pregunta`): la respuesta se deduce mirando la columna, que es justo lo que pide la tarea.
- p1 y p3: los calendarios usan las siglas Lu, Ma, Mi... como los ejercicios; las descripciones lo aclaran.
- p3: el curso usa «setiembre», como el resto del banco.
- p4: las piezas amarillas de uno y de tres no están a escala (se ven más anchas para poder rotularlas).
- p5: «trapezoide» se define como cuadrilátero sin lados paralelos (definición de la ficha).
- No se actualizaron `estado-refuerzo-primaria.json`, specs ni bitácora (fuera del encargo). Existía `calendario-mes-completo.svg` de otra clave (p2 `medicion-masa-y-tiempo`); no se tocó y no hay colisión de nombres.

## Correcciones tras la revisión independiente (`revision-lote-28.md`)

Cuatro claves aprobadas sin cambios. Solo `mat.p5.clasificar-cuadrilateros` (claseGuiada; los SVG no cambian):

- `ejemplo-2-guiado`: se quita «lados se inclinan en direcciones diferentes» (daba la respuesta); ahora habla de cuatro lados de distinto largo y de prolongarlos con rayas para ver si se cruzan.
- Descripción de `ventana-pregunta`: «No lleva marcas.» (el dibujo sí lleva el título).
- Se cambia «marca(s)» por «punta(s) de flecha» en `ejemplo-1-razona`, `paso-2` y `contraejemplo`, para no confundir con lados iguales.
- Revalidado: `pnpm nudito:validar-banco`, `pnpm typecheck` y `git diff --check`.
