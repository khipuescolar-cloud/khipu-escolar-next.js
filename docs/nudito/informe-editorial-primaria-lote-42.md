# Informe editorial · Primaria, Matemática, lote 42

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. No se tocaron estado, huellas, BD, specs ni componentes. Solo cambió el campo `claseGuiada` de cada clave (comparado con `HEAD`: el resto de cada clave es idéntico).

## Alcance

Archivos bajo `src/lib/nudito/conocimiento/banco/matematica/`. Todas con 10 momentos (el primero sin recurso) y 5 recursos. SVG a mano en `public/nudito/diagramas/matematica/` (30 archivos nuevos, `<prefijo>-<id>.svg`).

| Clave | Archivo | Momentos | Recursos (id; prefijo) |
|---|---|---|---|
| `mat.p1.contar-hasta-50` | `primaria-1/fichas/numeros-hasta-50.json` | 10 (5 con recurso) | `situacion`, `ejemplo-uno`, `ejemplo-dos`, `error`, `pasos` (`contar-hasta-cincuenta`) |
| `mat.p2.crear-patron` | `primaria-2/fichas/patrones-de-repeticion.json` | 10 (5) | idem (`crear-patron`) |
| `mat.p3.conclusiones-datos` | `primaria-3/fichas/c25-datos.json` | 10 (5) | idem (`conclusiones-datos`) |
| `mat.p4.cubo-prisma-entorno` | `primaria-4/fichas/cubos-y-prismas.json` | 10 (5) | idem (`cubo-prisma-entorno`) |
| `mat.p5.decena-centena-millar` | `primaria-5/fichas/numeros-hasta-999-999.json` | 10 (5) | idem (`decena-centena-millar`) |
| `mat.p6.conversion-tiempo` | `primaria-6/fichas/medidas-masa-tiempo-y-temperatura.json` | 10 (5) | idem (`conversion-tiempo`) |

Estructura común: idea (sin imagen) → situación (recurso «pregunta») → ejemplo 1 guiado (sin recurso) y «razona» (recurso) → ejemplo 2 guiado y «razona» → contraejemplo (recurso) → tres pasos, con la tarjeta de pasos en el tercero → comprobación nueva.

## Decisiones

- 1.º: bandejas de diez chapitas y columnas de diez tomates (dos representaciones del grupo de diez); error: no contar las sueltas. Comprobación: cuatro cajas de diez y siete sueltos (c).
- 2.º: collar de cuentas; núcleos de dos y de tres cuentas; contraejemplo con una sola vuelta y con cambio de orden. Comprobación: fila con el núcleo repetido dos veces (a).
- 3.º: gráfico de votos (taller de música) y tabla de visitas con dos frases (una apoyada en datos, una opinión); contraejemplo: opinión y generalización. Comprobación: ventas de títeres (b).
- 4.º: objetos de una tienda; cubo por medidas iguales (diez, diez, diez) y prisma de base cuadrada (ocho, ocho, veinte); contraejemplo: lata de leche y caja de velas. Comprobación: caja de seis, seis y doce (d).
- 5.º: paquetes de mil hojas; agrupar treinta y cinco paquetes (tres decenas de millar y cinco unidades de millar) y desagrupar dos centenas y cuatro decenas de millar (doscientos cuarenta paquetes); error: diez unidades de millar igual a cien mil. Comprobación: cuarenta y siete paquetes (c). En la narración, siglas siempre en palabras.
- 6.º: cronómetro de una hora y cincuenta minutos (ciento diez minutos); cuatro mil doscientos segundos a una hora y diez minutos; error: multiplicar en vez de dividir. Comprobación: nueve mil segundos (b).
- Letras correctas: c, a, b, d, c, b. Longitudes de opciones (caracteres): [15,17,16], [62,62,64], [51,50,49], [42,44,45,42], [41,42,41], [28,27,26]: diferencia máxima 3 y la correcta nunca es la única más larga.
- Los recursos de situación y de guiado no muestran ni nombran la respuesta (los alt y descripciones de situación no dicen «cubo», «treinta y cinco», etc.).

## Verificaciones

- Script de lote: `recursoRef` ↔ recursos exactos; 10 momentos; primer momento sin recurso; sin dígitos en narración, pregunta, opciones, mensaje, pista, alt y descripcion; sin «parte N de M»; sin títulos repetidos en la narración; sin «dibujo/imagen/tarjeta» en momentos sin recurso; alt ≤ 200 y descripcion ≤ 500; SVG existentes.
- Recalculado: 3·10 + 5 = 35; 4·10 + 8 = 48; 4·10 + 7 = 47; 21 − 14 = 7; 15 − 9 = 6; 10 − 8 = 2; 2·100 + 4·10 = 240 unidades de millar; 35 paquetes = 3 decenas de millar y 5 unidades de millar; 47 paquetes = 4 decenas de millar y 7 unidades de millar; 60 + 50 = 110; 4 200 ÷ 60 = 70 = 1 h 10 min; 300 ÷ 60 = 5; 300 × 60 = 18 000; 9 000 s = 150 min = 2 h 30 min.
- SVG rasterizados con Chrome headless y revisados antes de escribir alt y descripcion: 640×480, texto ≥ 26 px, sin `<tspan>`, con `<title>`, texto turquesa `#0C706E`, ámbar `#8A5A00`, rojo `#B5412A` solo para errores. Se corrigieron al verlos: lata de la situación de 4.º que cruzaba la línea del estante, tarjetas de tres líneas de los pasos (más altas) y rojo del tomate más oscuro.
- `pnpm nudito:validar-banco`: banco válido (2 238 fichas, 27 034 ejercicios). `pnpm typecheck`: sin errores. `git diff --check` sobre los 6 JSON: limpio.

## Errores de ejercicios existentes (no editados)

Ninguno de contenido. Observaciones menores: `mat.p1.contar-hasta-50` e12, la pista 3 («los números que dijiste son los grupos») es confusa: lo que se cuenta son los grupos, no los totales. e08 usa cincuenta y tres, fuera del rango hasta cincuenta, aunque la respuesta es falso.

## Riesgos y pendientes

- Sin revisión independiente ni recorrido en navegador (audio, móvil, movimiento reducido).
- Los SVG llevan cifras y símbolos (`10 000`, `÷ 60`); la narración y las descripciones los dicen en palabras. En 5.º los SVG usan las siglas UM, DM y CM, explicadas en la descripcion y al pie del recurso `error`.
- 2.º: los colores de las cuentas (rojo, azul, amarillo, turquesa) se distinguen también por forma y por el nombre en la situación.
- 4.º: las perspectivas son esquemáticas; en `ejemplo-dos` solo se ve una de las dos bases cuadradas.
- Un `ejemplo-1-guiado` y `ejemplo-2-guiado` sin recurso repiten los datos en palabras (no aluden al dibujo).
- No se actualizaron `estado-refuerzo-primaria.json`, specs ni bitácora (fuera del encargo).

## Correcciones tras la revisión independiente (`revision-lote-42.md`)

`mat.p2.crear-patron`, `mat.p3.conclusiones-datos` y `mat.p6.conversion-tiempo` aprobadas: sin cambios.

- `mat.p4.cubo-prisma-entorno`: la descripcion de `situacion` dice ahora «caja amarilla más pequeña» (antes «baja», que sugería un cubo).
- `mat.p5.decena-centena-millar`: la descripcion de `ejemplo-dos` incluye «200 UM» y «4 DM = 40 UM» y explica UM y DM; la narración de `ejemplo-1-razona` dice qué significan DM y UM.
- `mat.p1.contar-hasta-50` (autorizado por el coordinador): pista 3 de e12 cambiada a «Cada número que dices cierra un grupo: cuenta cuántos números dijiste (10, 20, 30, 40, 50).» No se tocaron id, dificultad ni respuesta; e08 intacto. Por tocar la ficha, p1 va a re-revisión.
- Revalidados: `pnpm nudito:validar-banco`, `pnpm typecheck` y `git diff --check`.
