# Informe editorial · Primaria, Matemática, lote 24

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. No se tocaron estado, huellas, BD, specs, componentes ni git. Solo cambió el campo `claseGuiada` de cada clave; ejercicios, ids, respuestas y dificultad quedan intactos.

## Alcance

Archivos bajo `src/lib/nudito/conocimiento/banco/matematica/`. Todas con 10 momentos (el primero sin recurso).

| Clave | Archivo | Recursos (ID → SVG en `public/nudito/diagramas/matematica/`) |
|---|---|---|
| `mat.p1.balanza-equilibrio` | `primaria-1/fichas/igualdades-y-equivalencias.json` | `platillos-pregunta`, `equilibrio`, `inclinada`, `pasos` (`balanza-equilibrio-*.svg`) |
| `mat.p2.caras-y-puntas` | `primaria-2/fichas/cuerpos-geometricos.json` | `dado-pregunta`, `cubo-cuenta`, `cono`, `pasos` (`caras-puntas-*.svg`) |
| `mat.p3.colecciones-equivalentes` | `primaria-3/fichas/c24-regularidad.json` | `canastas-pregunta`, `pareadas`, `chapitas-pregunta`, `chapitas-resuelto`, `pasos` (`colecciones-equivalentes-*.svg`) |
| `mat.p4.cancelativa-igualdad` | `primaria-4/fichas/igualdades-y-equivalencias.json` | `balanza-pregunta`, `balanza-cancela`, `igualdad-pregunta`, `igualdad-resuelta`, `pasos` (`cancelativa-igualdad-*.svg`) |
| `mat.p5.comparar-ordenar-decimales` | `primaria-5/fichas/numeros-decimales.json` | `estantes-pregunta`, `recta-cuatro-cinco`, `tarjetas-pregunta`, `recta-dos-cuatro`, `pasos` (`decimales-orden-*.svg`) |
| `mat.p6.circunferencia-circulo` | `primaria-6/fichas/triangulos-cuadrilateros-y-circulo.json` | `moneda-pregunta`, `moneda-diametro`, `cuerda-pregunta`, `tres-segmentos`, `pasos` (`circunferencia-circulo-*.svg`) |

28 SVG nuevos, 640×480, texto ≥ 26 px, paleta crema/índigo/turquesa/maíz (más cochinilla en acentos), `<title>`, sin `<tspan>`.

Estructura: idea (sin imagen) → situación (recurso «pregunta») → ejemplo 1 guiado y razonado → ejemplo 2 guiado y razonado → contraejemplo → tres pasos (resumen visual en el paso 3) → comprobación nueva con tres opciones. En p1, p2 y p6 el guiado del ejemplo 1 (y en p1/p2 el del 2) va sin recurso y su narración no menciona imagen.

## Decisiones pedagógicas

- p1 (1.º, frases cortas): equilibrio con cubos de distinto color (5 y 5) y desequilibrio con papas (7 y 4). Contraejemplo: «baja el que tiene menos» y mirar color o tamaño en vez de contar. Comprobación 9 vs 7, correcta **b**.
- p2 (2.º): dado (6 caras y 8 puntas, caras ocultas con aristas punteadas y 8 puntos) y cono (1 cara plana, costado curvo, 1 punta). La idea no adelanta el resultado del dado. Comprobación: «¿cuál tiene una sola punta?» (dado, caja de zapatos, cono), correcta **c**.
- p3 (3.º): equivalencia sin dejarse engañar por tamaño/orden (9 y 9, emparejadas) e igualar pasando la mitad de la diferencia (12 y 8 → 2). Contraejemplo: «más grande = más» y pasar toda la diferencia. Comprobación: Luis 12 y Nora 6 → 3 figuritas, correcta **a**.
- p4 (4.º): balanza con cuyes (cancelar 4 cuyes → maíz = 5 kg) y igualdad numérica 18 + 11 = 18 + 6 + □ (□ = 5, con verificación 29 = 29). Contraejemplo: quitar de un solo lado o cantidades distintas. Comprobación: costal + 13 = costal + 5 + pesa → 8 kg, correcta **c**.
- p5 (5.º): unidades y luego décimos con la recta de 4 a 5 (4,2 y 4,7) y orden de 3,8; 2,9; 3,1 en la recta de 2 a 4. Narración con «coma» y números en palabras. Contraejemplo: comparar solo décimos (5,9 vs 6,1) y leer la recta al revés. Comprobación: 5,6; 6,2; 5,9 → 6,2 (trampa del nueve), correcta **b**.
- p6 (6.º, más formal): circunferencia vs círculo, radio/diámetro (2 + 2 = 4), cuerda no diametral y clasificación por extremos. Comprobación: dos radios en línea recta forman un diámetro, correcta **a**.
- Letras correctas: b, c, a, c, b, a. Longitudes de opciones (caracteres): p1 19/18/16, p2 18/19/17, p3 14/14/16, p4 11/11/10, p5 16/13/15, p6 11/13/10; la correcta nunca es la más larga y la diferencia máxima es 3.
- Recursos de situación y de guiado sin respuesta ni regla: p1 sin barra (solo dos platillos), p2 dado sin marcas, p3 canastas sin números, p4 «? kg» y cuadrado vacío (sin valor), p5 estantes de igual tamaño (no delatan la medida mayor), p6 tapa con cuerda sin decir si es diámetro (ni en `alt`).

## Ejercicios existentes: revisión (sin editar)

Recalculados a mano y por script de lógica: sin errores en respuestas. Observaciones menores, no editadas:

- `mat.p3.colecciones-equivalentes`: el título dice «hasta 20» pero e11 suma 27 y e12 compara 15 y 16; aceptable, pero fuera del rango declarado.
- `mat.p5.comparar-ordenar-decimales`: en `erroresFrecuentes` la frase «5,9 es menor que 6,1 porque 9 es menor que 1» es falsa como razonamiento (9 no es menor que 1); debería decir «porque compara solo 9 y 1 sin mirar las unidades». No afecta a los ejercicios.
- `mat.p4.cancelativa-igualdad` e07: enunciado verdadero/falso redactado como «La igualdad … es falsa porque …» con respuesta verdadera; correcto pero confuso para el grado.
- `mat.p2.caras-y-puntas` e12: la pista 2 («El cono tiene 2 partes distintas») es poco clara.

## Verificaciones

- Cálculos recalculados: 12 − 8 = 4, mitad 2, 12 − 2 = 8 + 2 = 10; 18 + 11 = 29 = 18 + 6 + 5; 13 = 5 + 8; 12 − 6 = 6, mitad 3, 9 y 9; 8 puntas del dado; 2 + 2 = 4; 6,2 > 5,9 > 5,6; 2,9 < 3,1 < 3,8.
- Script de lote: 10 momentos, primer momento sin recurso, recursoRef ↔ recursos exactos (todos usados), ids únicos, `alt` ≤ 200 y `descripcion` ≤ 500 (el validador rechazó una de 3.º y se acortó), archivos SVG existentes, narración sin dígitos, sin «parte N de M», sin título repetido, sin «imagen/dibujo» en momentos sin recurso, sin letras sueltas usadas como variable.
- Los 28 SVG se rasterizaron con Chrome headless y se vieron antes de escribir `alt` y `descripcion`. Se corrigieron: SVG roto por «<» sin escapar (recta de 2 a 4), canasta con paltas pegadas al borde, base de la balanza tapando la leyenda, cuyes pisando la pesa, tachado de «18» ilegible, etiquetas «2,9» y «3,1» casi juntas y nota inferior pegada al borde.
- `pnpm nudito:validar-banco`: banco válido (2 238 fichas, 27 034 ejercicios). `pnpm typecheck`: sin errores. `git diff --check` sobre el banco de Matemática y diagramas: limpio.
- Comparación con `HEAD`: en las 6 claves solo cambió `claseGuiada`. En tres de los archivos (`igualdades-y-equivalencias` de 1.º y 4.º, `numeros-decimales` de 5.º) hay además cambios de `claseGuiada` en otras claves (`mat.p1.igualdades`, `mat.p4.igualdades-dos-equivalencias`, `mat.p5.numeros-decimales`) que son de otros lotes en curso: se conservaron intactos (se releyó cada archivo justo antes de escribir).

## Riesgos y pendientes

- Sin revisión independiente ni recorrido de navegador con audio, móvil o movimiento reducido; los SVG se vieron sueltos.
- Los SVG llevan cifras (5, 12, 4,2…); la narración y las opciones usan palabras.
- La voz leerá «coma» en los decimales; conviene probar el TTS con «cuatro coma dos» y «cuatro coma siete».
- p2 `ejemplo-2-guiado` y p1/p6 guiados del ejemplo 1 no llevan imagen: dependen de la situación anterior.
- No se actualizaron `estado-refuerzo-primaria.json`, specs ni bitácora (fuera del encargo).

## Correcciones tras la revisión independiente (`revision-lote-24.md`)

Aprobadas sin tocar: p2, p3, p4 y p6.

- p1 `mat.p1.balanza-equilibrio`: opción a cambiada a «Ninguno de los dos» (18/18/16 caracteres, la correcta sigue siendo b); `platillos-pregunta` ahora dibuja cinco cubos rojos apilados en dos filas y cinco amarillos en una sola fila (la igualdad ya no se ve por la forma) y su `descripcion` lo dice; la idea añade «Todos los objetos pesan lo mismo.»
- p5 `mat.p5.comparar-ordenar-decimales`: `erroresFrecuentes[0].error` (único cambio fuera de `claseGuiada`, autorizado) pasa a «Creer que 5,9 es mayor que 6,1 porque 9 es mayor que 1 al mirar cifras aisladas.»; en `ejemplo-2-razona` ahora dice «un décimo es menor que ocho décimos»; el rótulo «3,1» de `recta-dos-cuatro` lleva una línea fina hasta su punto y la `descripcion` lo menciona.
- Los dos SVG se rerasterizaron y se revisaron. Se regeneraron solo esos dos archivos, sin tocar los demás (incluido el retoque del coordinador a `chapitas-pregunta`).
