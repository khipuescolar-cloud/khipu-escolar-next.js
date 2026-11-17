# Informe editorial · Primaria, Matemática, lote 43

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente** (no se aprueba el propio lote). No se tocaron estado, huellas, BD, specs ni componentes. Solo cambió el campo `claseGuiada` de cada clave (comparado con `HEAD`: en las seis claves el único campo distinto es `claseGuiada`; ejercicios, ids, respuestas y dificultad intactos).

## Alcance

Archivos bajo `src/lib/nudito/conocimiento/banco/matematica/`. Todas con 10 momentos (el primero sin recurso) y 5 recursos SVG en `public/nudito/diagramas/matematica/` (30 SVG nuevos, 640×480, texto mínimo 26 px, sin `<tspan>`, con `<title>`, paleta crema/índigo/turquesa/maíz; texto turquesa `#0C706E`, ámbar `#8A5A00`, rojo `#B5412A` solo para errores).

| Clave | Archivo | Recursos (id; SVG `<prefijo>-<id>.svg`) |
|---|---|---|
| `mat.p1.cuantos-faltan-equilibrio` | `primaria-1/fichas/igualdades-y-equivalencias.json` | `situacion`, `agregar`, `quitar-pregunta`, `quitar`, `error` (prefijo `faltan-equilibrio`) |
| `mat.p2.croquis-del-aula` | `primaria-2/fichas/ubicacion-y-desplazamientos.json` | `situacion`, `detras`, `izquierda-pregunta`, `izquierda`, `sin-leyenda` (`croquis-aula`) |
| `mat.p3.continuar-patron-repeticion` | `primaria-3/fichas/c24-regularidad.json` | `situacion`, `triangulo`, `doce-pregunta`, `doce`, `error` (`continuar-repeticion`) |
| `mat.p4.decisiones-encuesta` | `primaria-4/fichas/conclusiones.json` | `situacion`, `mayor`, `condicion-pregunta`, `condicion`, `error` (`encuesta-decisiones`) |
| `mat.p5.decimales-con-dinero` | `primaria-5/fichas/numeros-decimales.json` | `situacion`, `lectura`, `ciento-pregunta`, `ciento`, `error` (`decimales-dinero`) |
| `mat.p6.criterios-divisibilidad` | `primaria-6/fichas/divisibilidad.json` | `situacion`, `cuatro-mil`, `tres-mil-pregunta`, `tres-mil`, `error` (`criterios-divis`) |

Estructura común: idea (sin imagen) → situación (variante «pregunta») → ejemplo 1 guiado (reutiliza el recurso de la situación) → ejemplo 1 razonado → ejemplo 2 guiado (recurso «pregunta») → ejemplo 2 razonado → contraejemplo → tres pasos (sin recurso, sin «dibujo/mira») → comprobación nueva.

## Decisiones

- p1: balanza de platillos; ejemplo 1 agregar (seis contra cuatro), ejemplo 2 quitar (cuatro contra nueve); contraejemplo: agregar al lado que ya tiene más. Comprobación ocho contra tres (c, «Cinco»).
- p2: croquis 3×3 con leyenda; ejemplo 1 «detrás de la planta» (delante/detrás), ejemplo 2 «izquierda del armario»; contraejemplo: leyenda vacía. Comprobación: mochila a la derecha de la mesa (a).
- p3: núcleo de tres figuras; ejemplo 1 terminar el tercer núcleo; ejemplo 2 lugar doce con núcleo círculo-círculo-cuadrado; contraejemplo: poner una figura «para variar». Comprobación: octavo lugar de círculo-cuadrado-cuadrado (b, «Un cuadrado»).
- p4: barras horizontales; ejemplo 1 opción más votada y total (treinta y cinco niños); ejemplo 2 condición (salón ocupado, se elige la siguiente); contraejemplo: elegir por gusto. Comprobación: color de mural con pintura agotada (c).
- p5: etiquetas y monedas; ejemplo 1 leer tres con veinticinco; ejemplo 2 doscientos ocho céntimos son dos soles con ocho céntimos; contraejemplo: cinco céntimos escritos como cincuenta. Comprobación: trescientos seis céntimos (a).
- p6: casillas de cifras; ejemplo 1 cuatro mil setecientos veinticinco por cinco y por nueve; ejemplo 2 tres mil cuatrocientos sesenta por dos, tres y diez; contraejemplo: usar solo la última cifra para el tres (mil doscientos cincuenta y tres). Comprobación: divisible por nueve y por diez (b, «Ochocientos diez»).
- Letras correctas: c, a, b, c, a, b. Longitudes de opciones (diferencia ≤ 3 y correcta no la más larga): p1 4/6/5; p2 26/28/26; p3 10/11/12; p4 38/38/37; p5 28/31/31; p6 15/16/17.
- Números, fracciones y decimales en palabras en narración, opciones, pregunta, mensaje, pista, alt y descripción (dentro de los SVG se usan cifras y símbolos). Sin «parte N de M», sin títulos repetidos en la narración.
- Recursos de situación y de ejemplo guiado no muestran ni nombran la respuesta ni la regla (el único «?» es un marcador sin valor; en p3 el lugar doce lleva «?»).

## Verificaciones

- Script de lote: `recursoRef` ↔ recursos exactos (todos usados y solo ellos), 10 momentos, primer momento sin recurso, sin dígitos en textos hablados, «dibujo/imagen/tarjeta» solo en momentos con recurso, alt ≤ 200 (máx. 117), descripción ≤ 267 caracteres, SVG existentes.
- SVG rasterizados con Chrome headless y vistos antes de escribir alt y descripción. Corregidos en el proceso: círculos fantasma superpuestos y etiqueta pisada (p1 `quitar`), leyenda desbordada y rótulo inferior solapado (p2), símbolos pegados en la leyenda, líneas de núcleo pegadas (p3), globo con cola engañosa (p4), subrayado fuera de lugar y etiqueta cerca del borde (p5).
- Recalculado: 9 + 13 + 6 + 7 = 35; 4 725 = 5 · 945 = 9 · 525; 4 + 7 + 2 + 5 = 18; 3 460 no es múltiplo de tres (suma 13); 1 253 no es múltiplo de tres (suma 11); 208 = 100 + 100 + 8; 306 céntimos = S/ 3,06; 810 es múltiplo de 9 y de 10, 140 no es de 9, 504 no es de 10; octavo lugar de ○□□ = □; lugar doce de ○○□ = □.
- `pnpm nudito:validar-banco`: banco válido (2 238 fichas, 27 034 ejercicios). `pnpm typecheck`: sin errores. `git diff --check` sobre los seis JSON y los SVG: limpio.

## Errores en ejercicios existentes (no editados)

Ninguno que afecte la respuesta. Observaciones menores:

- `mat.p2.croquis-del-aula` e02: el enunciado empieza «Para qué sirve un croquis del aula?» sin el signo de apertura «¿».
- `mat.p6.criterios-divisibilidad` e12: la respuesta exige el formato exacto «2,3,5,9,10» (sin `alternativasAceptadas`); un alumno que escriba «2, 3, 5, 9, 10» podría ser marcado incorrecto según cómo normalice el validador.
- `mat.p3.continuar-patron-repeticion` e09: la retroalimentación final («Si pusiste 6, contaste todas las cuentas que faltan») es confusa.

## Riesgos y pendientes

- Sin revisión independiente ni recorrido en navegador (audio, móvil, movimiento reducido); los SVG se vieron sueltos.
- p4 `situacion`: la barra más larga es visualmente el teatro; es inevitable porque el dato es el problema.
- p5: el `S/` y las cifras figuran dentro de los SVG; descripción y narración los dicen en palabras.
- p6 `paso-1`/`paso-2` usan la palabra «divisor» sin definirla en la idea.
- No se actualizaron `estado-refuerzo-primaria.json`, specs ni bitácora (fuera del encargo).

## Correcciones tras la revisión independiente (`revision-lote-43.md`)

p1, p2, p3 y p6 aprobadas: sin cambios.

- p4: el contraejemplo y el alt/descripción de `error` empiezan con «En otra votación…» (usa datos distintos a `situacion`). Comprobación reescrita: opciones «Esperar la pintura verde nueva» / «Elegir rojo, el último en votos» / «Elegir azul, segundo en votos» (longitudes 30/31/29, correcta c y no la más larga, todas plausibles) y pista nueva: «Busca la opción que respeta los votos y que además se puede realizar.»
- p5: en el SVG `lectura` las dos monedas de «Después de la coma» quedan centradas en su recuadro (rerasterizado y visto); alt y descripción sin cambios. `paso-2` pasa a «Cinco céntimos llevan un cero delante del cinco.»
- Revalidados `pnpm nudito:validar-banco`, `pnpm typecheck` y `git diff --check`.
