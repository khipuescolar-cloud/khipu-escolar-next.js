# Informe editorial · Primaria, Matemática, lote 47

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. Solo cambió el campo `claseGuiada` de cada clave (cada archivo se releyó justo antes de escribir); ejercicios, ids, respuestas y dificultad quedan intactos. No se tocaron estado, huellas, BD, specs ni componentes.

## Alcance

Archivos bajo `src/lib/nudito/conocimiento/banco/matematica/`. Todas con 10 momentos (el primero sin recurso) y 5 recursos enlazados por `recursoRef` (situación, ejemplo 1 razona, ejemplo 2 razona, contraejemplo, paso 3). SVG a mano (generados con un script de código, sin generador de imágenes) en `public/nudito/diagramas/matematica/` (30 nuevos, prefijo = tema).

| Clave | Archivo | Momentos con recurso | Recursos (SVG `<prefijo>-<id>.svg`) |
|---|---|---|---|
| `mat.p1.contar-hasta-10` | `primaria-1/fichas/conteo-y-numeros-hasta-10.json` | situación, ej. 1 razona, ej. 2 razona, contraejemplo, paso 3 | `mangos-pregunta`, `choclos-contados`, `botones-contados`, `pollitos-error`, `tres-pasos` (prefijo `contar-hasta-10`) |
| `mat.p2.completar-la-decena` | `primaria-2/fichas/adicion-y-sustraccion-hasta-100.json` | idem | `paltas-pregunta`, `recta-treinta-y-ocho`, `recta-sesenta-y-dos`, `recta-error`, `tres-pasos` (`completar-la-decena`) |
| `mat.p3.comparar-tres-cifras` | `primaria-3/fichas/c23-numeracion-fracciones-dinero.json` | idem | `cestos-pregunta`, `tabla-centenas-iguales`, `tabla-centenas-deciden`, `tabla-error`, `tres-pasos` (`comparar-tres-cifras`) |
| `mat.p4.desplazamientos-cuadricula` | `primaria-4/fichas/ubicacion-y-recorridos.json` | idem | `cuadricula-pregunta`, `cuadricula-derecha-arriba`, `cuadricula-izquierda-abajo`, `casillas-error`, `tres-pasos` (`desplazamientos-cuadricula`) |
| `mat.p5.decadas-siglos` | `primaria-5/fichas/medicion-masa-y-tiempo.json` | idem | `anio-pregunta`, `linea-siglo-diecinueve`, `casona-siglos-decadas`, `limite-mil-novecientos`, `tres-pasos` (`decadas-siglos`) |
| `mat.p6.decimos-centesimos` | `primaria-6/fichas/numeros-decimales.json` | idem | `cuadricula-pregunta`, `cuadricula-veintitres`, `tiras-cinco-decimos`, `tres-decimos-error`, `tres-pasos` (`decimos-centesimos`) |

## Decisiones pedagógicas

- Estructura: idea (sin imagen) → situación (variante «pregunta») → dos ejemplos (guiado sin recurso, razona con recurso) → contraejemplo → tres pasos → comprobación nueva. Los guiados no dicen «dibujo/imagen/tarjeta» porque no llevan recurso; los datos que necesitan van en la voz.
- p1 (1.º): frases cortas; mangos (situación sin cantidad), cuatro choclos en fila numerados, siete botones desordenados numerados, contraejemplo de repetir un número (pollitos 1, 2, 2, 3). Comprobación: Mateo cuenta seis pollitos; `b` (Cinco, Seis, Siete; 5/4/5 letras).
- p2 (2.º): salto por la decena en recta numérica. Situación 28 + 6 (paltas, sin resolver); ej. 1: 38 + 5 (2 y 3); ej. 2: 62 − 7 (2 y 5); contraejemplo: 37 + 6 sumando seis otra vez (46 en vez de 43). Comprobación 46 + 7 = 53; `c` (51/55/53, 15/17/16 letras).
- p3 (3.º): tabla centenas-decenas-unidades. Situación y ej. 1: 574 y 547 (empate en centenas, deciden decenas); ej. 2: 692 y 701 (deciden centenas aunque el menor tenga cifras mayores); contraejemplo: 483 y 438 comparando solo unidades. Comprobación: lanchas 643 y 634; `a` (13/14/15 letras).
- p4 (4.º): cuadrícula 6 × 5, columnas de izquierda a derecha y filas de abajo hacia arriba. Situación: cuy y comedero sin números; ej. 1: (2, 1) a (5, 3) = 3 derecha, 2 arriba; ej. 2: (6, 4) a (2, 2) = 4 izquierda, 2 abajo; contraejemplo: contar la casilla de salida (4 en vez de 3). Comprobación: (1, 2) a (5, 5) = 4 derecha, 3 arriba; `c` (41/38/39 letras).
- p5 (5.º): década 10 años, siglo 100 años. Situación: 1821 (sin bloques de siglos); ej. 1: 18 + 1 = 19, siglo diecinueve; ej. 2: dos siglos y cinco décadas = 250 años; contraejemplo: 1900 es el último año del siglo diecinueve. Comprobación: año 1480 = siglo quince; `b` (13/12/15 letras). En la voz los siglos van en palabras («siglo diecinueve»); los números romanos solo aparecen en los dibujos.
- p6 (6.º): cuadrícula de cien cuadritos y tiras. Situación: cuadrícula con una parte pintada (sin conteo ni fracción en el dibujo ni en alt/descripción); ej. 1: 2 décimos + 3 centésimos = 23 centésimos; ej. 2: 5 décimos = 50 centésimos (× 10); contraejemplo: tres décimos no son tres centésimos (30 y 3 cuadritos). Comprobación: un décimo y cuatro centésimos = 14 cuadritos; `a` (17/15/18 letras).
- Letras correctas: b, c, a, c, b, a. En todas la correcta no es la más larga y la diferencia máxima de longitud es 3.

## Verificaciones

- Script del lote (`build47.py`, en el scratchpad de la sesión): `recursoRef` coincide 1 a 1 con los recursos, 10 momentos, primer momento sin recurso, sin dígitos en narración ni en la comprobación, sin «parte N de M», sin «dibujo/imagen/tarjeta» en momentos sin recurso, sin repetir el título en la narración, alt ≤ 200 (máx. 125), descripción ≤ 500 (máx. 429), todos los SVG existen.
- SVG: 640 × 480, texto ≥ 26 px, `<title>`, sin `<tspan>`, paleta crema/índigo/turquesa/maíz con tintes ya usados en otros lotes (#FBE3AE, #BFE3E1, #FFF9ED); texto turquesa #0C706E, ámbar #8A5A00, rojo #B5412A solo en errores. Los 30 se rasterizaron en Chrome headless y se vieron; se corrigieron: pollitos/choclos/mangos poco reconocibles, palta que parecía un par de ojos, rótulos pisados por los arcos de la recta de error de p2, banda «Bien» de p2 pegada a los números, rótulo ambiguo entre las dos filas de p4, bloque de 1821 mal ubicado, rojo con relleno fuera de paleta. Alt y descripción se escribieron después de ver el dibujo final.
- `pnpm nudito:validar-banco`: banco válido (2 238 fichas, 27 034 ejercicios). `pnpm typecheck`: sin errores. `git diff --check` sobre los seis JSON: limpio.
- Comparado con HEAD: en las seis claves solo difiere `claseGuiada`. (En los mismos archivos otras claves, `mat.p1.contar-hacia-atras`, `mat.p2.completar-a-100`, `mat.p3.cero-posicional`, tienen cambios de otros lotes en paralelo; no son de este lote.)

## Errores en ejercicios existentes (no editados)

Ninguno que afecte una respuesta. Los 72 ejercicios de las seis claves se recalcularon (conteos, 47 + 5, 56 + 7 = 4 + 3, 45 + 8 ≠ 55, 4_7 entre 485 y 497 = 8, recorridos en cuadrícula, 1911 siglo veinte, 1879 y 1866 siglo diecinueve y 13 años, afirmación 1 y 3 de e11 verdaderas, 3 décimos + 12 centésimos = 42, etc.). Observaciones menores, opcionales:

- `mat.p1.contar-hasta-10`: los enunciados repiten la palabra («Cuenta cada objeto una sola vez: dados, dados») y la lista de e03 y e07 («Toca con la mirada cada palabra») es una lista de palabras repetidas sin dibujo; es un artificio de plantilla, no un error. Un alumno de 1.º ve texto poco natural.
- `mat.p5.decadas-siglos`: `ideaCentral` dice «se analiza la centena y se añade 1 a los dígitos que preceden a las decenas», fórmula poco clara; la clase guiada usa la regla «dos primeras cifras más uno, salvo año terminado en dos ceros».
- `mat.p6.decimos-centesimos` e02: la opción d de e01 («10/10») y la unidad «centésimos» en e02 están bien, pero e01 mezcla fracciones sin ceros a la izquierda con respuesta `b`; correcto.
- `mat.p4.desplazamientos-cuadricula`: la convención de filas de e03 y e04 no se dice, pero no cambia la respuesta (solo usan izquierda y abajo). e05 y siguientes sí la declaran.

## Riesgos y pendientes

- Sin revisión independiente ni recorrido en navegador (audio, móvil, movimiento reducido).
- Los guiados no llevan recurso: p1 ej. 1 («una fila de choclos») y p6 ej. 1 («la cuadrícula de la situación») apoyan la imagen de otro momento; si el revisor lo considera impropio, habría que añadir recurso de variante «pregunta».
- Las figuras (cuy, choclo, mango, pollito, palta) son esquemáticas; el cuy se parece a un roedor redondo y el mango a una fruta ovalada amarilla.
- Los dibujos de p3 llevan las siglas C, D y U en los encabezados de la tabla; la narración y la descripción usan los nombres completos.
- La situación de p6 describe «algunos cuadritos pintados de verde» sin cantidad (a propósito, para no adelantar la respuesta); el dibujo sí muestra dos columnas y tres cuadritos.
- No se actualizaron `estado-refuerzo-primaria.json`, specs ni bitácora (fuera del encargo).

## Correcciones (tras revision-lote-47.md)

Solo `claseGuiada` y, con autorización, enunciados/pistas/retroalimentación de p1 y enunciados de p4 (id, dificultad y respuesta intactos). No se tocó ningún SVG ni las claves aprobadas.

- `mat.p1.contar-hasta-10`: ejemplo 1 ahora dice «una fila de cuatro choclos»; contraejemplo: «el segundo dos y el tres que sigue están en rojo»; descripción de `choclos-contados` añade el rótulo «Un número por choclo». Ejercicios e01–e12 (autorizado): enunciados con una marca (●) por objeto y lugar; e04/e08/e12 conservan su enunciado de marcas; pistas y retroalimentación reescritas («Toca la primera marca…»), únicas por ejercicio.
- `mat.p3.comparar-tres-cifras`: «cifra» en lugar de «decenas/unidades» como cantidad (ej. 1 razona, ej. 2 guiado y razona); ej. 1 razona explica «C, D y U quieren decir centenas, decenas y unidades»; las tres descripciones de tabla mencionan las letras C, D y U.
- `mat.p4.desplazamientos-cuadricula`: situación, alt y descripción de `cuadricula-pregunta` sin direcciones («el cuy en una casilla y el comedero en otra, más lejos»); contraejemplo presenta «una ficha… una bandera». Enunciados e07, e09, e11, e12 (autorizado): frase de convención (columna a la derecha, fila hacia arriba) y «(columna, fila)».
- Checks: lint de las 3 claves 0 errores (5 avisos de descripción larga), validar-banco válido (2238 fichas, 27034 ejercicios), `tsc --noEmit` sin errores, `git diff --check` limpio. `pnpm` no está en el PATH: se usaron `node_modules/.bin/tsx` y `tsc`.
- Pendiente: re-revisión de p1, p3, p4. Sin navegador ni voz (el símbolo ● en p1 no se probó en el lector).

### Correcciones · ronda 2 (p4)
- `mat.p4.desplazamientos-cuadricula` e07 (autorizado): enunciado añade «Cada casilla se escribe (columna, fila).» para fijar (5, 5) → (5, 2) = «3 abajo». Id, dificultad, respuesta y opciones intactos. Informe del revisor: `revision-lote-47.md` (no existe `revision-lote-47b.md`).
