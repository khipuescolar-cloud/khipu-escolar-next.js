# Informe editorial · Primaria, Matemática, lote 45

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. Solo cambió el campo `claseGuiada` de cada clave (cada archivo se releyó justo antes de escribir); ejercicios, ids, respuestas y dificultad quedan intactos. No se tocaron estado, huellas, BD, specs ni componentes.

## Alcance

Archivos bajo `src/lib/nudito/conocimiento/banco/matematica/`. Todas con 10 momentos (el primero sin recurso) y 5 recursos enlazados por `recursoRef`. SVG en `public/nudito/diagramas/matematica/` (25 nuevos, prefijo = tema).

| Clave | Archivo | Momentos con recurso | Recursos (id; SVG `<prefijo>-<id>.svg`) |
|---|---|---|---|
| `mat.p1.delante-detras` | `primaria-1/fichas/ubicacion-y-recorridos.json` | situación, ej. 1 razona, ej. 2 guiado, ej. 2 razona, contraejemplo | `panaderia-pregunta`, `justo-detras`, `autobus-pregunta`, `autobus-resuelto`, `contar-de-mas` (prefijo `delante-detras`) |
| `mat.p2.cuantos-dias-faltan` | `primaria-2/fichas/medicion-masa-y-tiempo.json` | situación, ej. 1 razona, ej. 2 guiado, ej. 2 razona, contraejemplo | `paseo-pregunta`, `contar-desde-manana`, `teatro-pregunta`, `semana-y-mas`, `contar-hoy` (`cuantos-dias-faltan`) |
| `mat.p4.descomposicion-multiplicativa` | `primaria-4/fichas/c23-multiplicacion-division-calculo.json` | situación, ej. 1 razona, ej. 2 razona, contraejemplo, paso 3 | `bolsas-pregunta`, `veinticinco-por-dieciseis`, `cincuenta-por-catorce`, `parar-a-la-mitad`, `tres-pasos` (`descomposicion-multiplicativa`) |
| `mat.p5.desarrollo-prismas` | `primaria-5/fichas/prismas-rectos.json` | situación, ej. 1 razona, ej. 2 razona, contraejemplo, paso 3 | `caja-pregunta`, `caja-bases-laterales`, `hexagonos-falta-uno`, `una-sola-base`, `tres-pasos` (`desarrollo-prismas`) |
| `mat.p6.decimales-entre-decimales` | `primaria-6/fichas/argumentacion-numerica.json` | situación, ej. 1 razona, ej. 2 razona, contraejemplo, paso 3 | `cuerda-pregunta`, `lupa-cinco-tres`, `lupa-tres-cuarenta-y-cinco`, `nada-en-medio`, `tres-pasos` (`decimales-entre-decimales`) |

## Decisiones pedagógicas

- Estructura: idea (sin imagen) → situación (variante «pregunta») → dos ejemplos (guiado y razona) → contraejemplo → tres pasos → comprobación nueva.
- p1: fila con niños de lado mirando a la derecha (pelo atrás, cara adelante) hacia una panadería. Ej. 1: quién va justo detrás de Tito. Ej. 2: fila de cinco hacia un autobús, cuántos delante y detrás de Nina (dos y dos). Contraejemplo: contar a Rosa, la primera, y decir cuatro en vez de tres. Comprobación: Lucía, Omar, Paco, Zoe; justo detrás de Omar = Paco (a).
- p2: calendario de abril (sábado uno, 30 días, 5 filas). Ej. 1: martes cuatro al sábado ocho = cuatro días (tira semanal con números uno a cuatro). Ej. 2: lunes tres al jueves trece = siete más tres = diez días. Contraejemplo: contar hoy (lunes diez a viernes catorce, cinco frente a cuatro). Comprobación: jueves quince a martes veinte = cinco días (c). Sin cruce de mes (ya lo cubren e06 y e09).
- p4: cadenas de cajas con flechas «por». Ej. 1: veinticinco por dieciséis = 25×4×4 = cuatrocientos. Ej. 2: cincuenta por catorce = 50×2×7 = setecientos. Contraejemplo: detenerse en cien (fila errónea y fila correcta). Comprobación: veinticinco por veinticuatro con 4×6 = seiscientos (b); distractores cuatrocientos (usar dos veces el cuatro) y ciento seis (sumar en vez de multiplicar).
- p5: plantillas. Situación y ej. 1: caja de pañuelos (base rectangular, 2+4 caras). Ej. 2: dos hexágonos y cinco rectángulos, falta un lateral. Contraejemplo: una sola base triangular. Comprobación: bases pentagonales, cinco rectángulos (c).
- p6: recta numérica con lupa. Ej. 1: cinco coma tres y cinco coma cuatro, once marcas, cinco coma treinta y cinco. Ej. 2: tres coma cuarenta y cinco y tres coma cuarenta y seis, hace falta la milésima (tres coma cuatrocientos cincuenta y cinco). Contraejemplo: «no cabe nada» entre uno coma dos y uno coma tres. Comprobación: siete coma seis y siete coma siete = siete coma sesenta y cinco (b), con distractores siete coma cincuenta y cinco y siete coma setenta y cinco.
- Letras correctas: a, c, b, c, b. Longitudes de opciones: diferencia máxima 2; la correcta nunca es la más larga.
- Los recursos de situación y de ej. guiado no muestran respuesta ni regla (sin marcas intermedias en la recta de p6; calendario solo con hoy y evento; plantilla sin colores diferenciados en p5; «?» solo como incógnita total en p4).

## Verificaciones

- Cálculos recalculados: 25×16 = 400; 50×14 = 700; 25×24 = 600; 4+... abril de 2023 empieza en sábado (4 abr martes, 8 sáb, 3 lun, 10 lun, 13 jue, 14 vie; 15 jun jue, 20 jun mar); 6 lados del hexágono, 5 del pentágono; 5,35 está entre 5,30 y 5,40; 3,455 entre 3,450 y 3,460; 1,25 entre 1,20 y 1,30; 7,65 entre 7,60 y 7,70 (7,55 y 7,75 quedan fuera).
- Script de lote: recursoRef ↔ recursos exactos (todos usados una vez), 10 momentos, primer momento sin recurso, sin dígitos en narración ni comprobación, sin «parte N de M», sin título repetido en la narración, «dibujo/imagen/tarjeta» solo en momentos con recurso, alt ≤ 200 (máx. 136) y descripción ≤ 500 (máx. 315), archivos SVG existentes.
- SVG: 640×480, texto ≥ 26 px, `<title>`, sin `<tspan>`, paleta crema/índigo/turquesa/maíz (texto turquesa #0C706E, ámbar #8A5A00, rojo #B5412A solo en errores). Rasterizados con Chrome headless y vistos antes de escribir alt y descripción. Se corrigieron: pico de los niños (parecían aves), líneas de «delante» invertida, números pegados a las cabezas, rótulo «Hoy no» fuera de su columna, calendarios con mucho vacío, texto de la situación del autobús pegado al borde.
- `pnpm nudito:validar-banco`: banco válido (2 238 fichas, 27 034 ejercicios). `pnpm typecheck`: sin errores. `git diff --check` sobre los 5 JSON: limpio.

## Errores en ejercicios existentes (no editados)

- **`mat.p2.cuantos-dias-faltan` e07 (error real):** «Hoy es martes 12… dentro de 3 días. ¿Qué día de la semana será?» tiene respuesta `jueves` (con alternativa «el jueves»), pero martes más tres días es **viernes**; la propia retroalimentación lo dice («el tercero es el viernes»). Corrección sugerida: respuesta `viernes`/`el viernes`, o cambiar el enunciado a «dentro de 2 días».
- p5 e11, retroalimentación algo confusa («Confundir bases con laterales puede dar dos…»); no afecta la respuesta (uno). Opcional.
- Resto de ejercicios (60 en total) recalculados: sin errores y adecuados al grado.

## Riesgos y pendientes

- Sin revisión independiente ni recorrido en navegador (audio, móvil, movimiento reducido).
- Los textos de los SVG llevan cifras y símbolos (`25 × 16 = 400`, `5,35`); narración y descripción los dicen en palabras.
- Niños y bolsa son figuras esquemáticas (la bolsa de p4 parece una pesa a primera vista; se describe como bolsa amarilla con un número).
- Ej. 2 guiado de p1 narra el orden de cinco nombres; el dibujo los muestra, pero al oído son cinco nombres seguidos.
- p5 ej. 2 guiado no lleva recurso: narra la plantilla de hexágonos solo con palabras (el dibujo aparece en el razona).
- No se actualizaron `estado-refuerzo-primaria.json`, specs ni bitácora (fuera del encargo).

## Correcciones tras la revisión independiente (`revision-lote-45.md`)

`mat.p1.delante-detras` y `mat.p5.desarrollo-prismas` aprobadas: sin cambios.

- p2: ejercicio e07 («Hoy es martes 12… dentro de 3 días»): con autorización de Carlos/orquestador, `respuesta` pasa de «jueves» a «viernes» y `alternativasAceptadas` a `["el viernes"]` (id, dificultad y enunciado intactos; pista y retroalimentación ya decían viernes). El enunciado aparece solo en ese archivo (búsqueda en `src`, `tests` y `docs`).
- p4: `descomposicion-multiplicativa-bolsas-pregunta.svg` redibujado: bolsa de tela con cuello atado con moño y dos caramelos envueltos (verde y rojo), con el mismo «25»; alt, descripción y narración de la situación actualizados («bolsa de tela amarilla»). Rerasterizado y revisado.
- p6: `mensajeCorrecto` ahora dice «el primer extremo es siete coma sesenta y el segundo es siete coma setenta»; `ejemplo-2-guiado` usa frases cortas separadas («El primero es… El segundo es…»).
- Revalidado: `nudito:validar-banco`, `typecheck` y `git diff --check` sin errores.
