# Informe editorial · Primaria, Matemática, lote 51

Fecha: 2026-11-16. Autor: Codex. Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. Este informe no aprueba el lote. No se tocaron estado, huellas, BD, specs ni componentes. En las cinco claves solo cambió `claseGuiada`; ejercicios, ids, respuestas y dificultad permanecen intactos.

## Alcance

| Clave | Archivo | Momentos | Recursos |
|---|---|---:|---:|
| `mat.p1.siempre-a-veces-nunca` | `primaria-1/fichas/nociones-de-azar.json` | 10 | 4 (`siempre-veces-nunca-*.svg`) |
| `mat.p2.explicar-patron-aditivo` | `primaria-2/fichas/patrones-aditivos.json` | 10 | 4 (`explicar-patron-*.svg`) |
| `mat.p4.duracion-actividades` | `primaria-4/fichas/medicion-masa-y-tiempo.json` | 10 | 4 (`duracion-actividades-*.svg`) |
| `mat.p5.doble-entrada-5` | `primaria-5/fichas/datos-y-tablas.json` | 10 | 4 (`doble-entrada-cinco-*.svg`) |
| `mat.p6.grafica-proporcionalidad` | `primaria-6/fichas/proporcionalidad.json` | 10 | 4 (`grafica-proporcionalidad-*.svg`) |

Los 20 recursos están en `public/nudito/diagramas/matematica/`. Todos se enlazan mediante `recursoRef`, se usan al menos una vez y tienen `viewBox` 640 × 480, `<title>`, texto de 26 px o más, sin `<tspan>`, texto turquesa `#0C706E` y ámbar `#8A5A00`.

## Decisiones editoriales

- Estructura uniforme: idea sin imagen, situación, dos ejemplos con razonamiento, contraejemplo, tres pasos y comprobación nueva.
- Las variantes de situación y pregunta muestran solo los datos necesarios. No nombran la clasificación, regla, duración, total ni conclusión buscada.
- Primer grado usa frases cortas y tres casos concretos: todos, algunos y ninguno. Segundo grado separa los numerales en frases breves para evitar listas ambiguas al oído.
- Duración se resuelve por tramos hasta una hora completa; doble entrada distingue lectura de casilla y total de columna; proporcionalidad exige alineación y paso por el origen, sin pronunciar letras de ejes.
- Letras correctas: C, B, A, C y B. Las opciones difieren como máximo en tres caracteres; la correcta no es la opción más larga en ninguna clave.

## Verificaciones

- Recursos rasterizados con Chrome headless y vistos en hoja de contacto. Se corrigieron antes de integrar: montones no contables, manecillas incoherentes, una recta fuera de escala y coordenadas mal espaciadas.
- Cálculos comprobados por script: quince más sesenta más quince son noventa; cuarenta más cinco son cuarenta y cinco; cincuenta más veinticinco son setenta y cinco; cinco más siete son doce; ocho más siete son quince; dieciséis más cuatro son veinte; treinta menos cinco son veinticinco; tres por tres son nueve.
- Comparación estructural con `HEAD`: fuera de `claseGuiada`, cada una de las cinco claves es idéntica; ejercicios y metadatos intactos.
- `pnpm exec tsx scripts/nudito-lint-clase-guiada.ts ...`: cero errores y cero avisos.
- `pnpm nudito:validar-banco`: válido, 2 238 fichas activas y 27 034 ejercicios.
- `pnpm typecheck`: sin errores.
- `git diff --check` dirigido: pendiente de la comprobación final posterior a este informe.

## Riesgos y pendientes

- Falta revisión independiente por clave; el lote no está aprobado editorialmente.
- No se hizo recorrido real con audio, móvil ni movimiento reducido. La inspección visual fue de los SVG rasterizados a 640 × 480.
- Los archivos de segundo y sexto grado contienen cambios de otras claves de sesiones paralelas; se preservaron al releer cada JSON inmediatamente antes de escribir.

## Errores y observaciones de ejercicios existentes

- No se hallaron respuestas matemáticas incorrectas ni ejercicios inadecuados por contenido en las cinco claves.
- `mat.p1.siempre-a-veces-nunca`, ejercicios `e01` a `e12`: la tercera pista repite el defecto «Como … . la respuesta…», con punto antes de «la» en minúscula. Es un error de redacción existente; no se editó.
- `mat.p2.explicar-patron-aditivo`, `e10`: la opción correcta tiene 20 caracteres, frente a 19 y 16; la diferencia máxima es cuatro y la correcta es la más larga. Es un riesgo menor de adivinación; no se editó.
- `mat.p5.doble-entrada-5`, `e10`: las opciones miden entre 22 y 26 caracteres. La correcta no es la más larga y sigue siendo única, pero el balance supera por uno el criterio de tres caracteres usado en las comprobaciones nuevas; no se editó.

## Correcciones

Tras `revision-lote-51.md` (las 5 claves con cambios), se corrigió solo `claseGuiada` y los SVG del lote; los SVG cambiados se rerasterizaron a 640 × 480 y se revisaron uno a uno.

- `mat.p1.siempre-a-veces-nunca`: comprobación nueva (bolsa solo de fichas azules, «¿saldrá una roja?», respuesta «nunca», opción `b`), que además practica «nunca»; frase concreta de «nunca» en `paso-3`; `ejemplo-1-guiado` sin revelar la regla; sol con rayos en `mixtas-pregunta`.
- `mat.p2.explicar-patron-aditivo`: escalera dibujada descendente (alt/descripcion ajustados) y pregunta «peldaño con el signo»; título de mandarinas acortado («Cuatro montones»); tachado sobre «+4» en `error-salto` (raya fina, legible); opciones «Aumenta cinco / Disminuye diez / Disminuye cinco cada vez».
- `mat.p4.duracion-actividades`: ejemplo 1 rehecho con el método (8:15 → 9:00 = 45 min, 9:00 → 9:45 = 45 min; 90 min), línea resuelta a escala y con alt/descripcion nuevos; `error-horas` tacha solo el cálculo 5 − 3; contraejemplo dice «de las tres y media a las cinco»; relojes con marcas y aguja corta índigo gruesa / larga turquesa.
- `mat.p5.doble-entrada-5`: `movilidad-pregunta` con casilla vacía «?» (sin 6 ni «?» externo; el 6 queda solo en `movilidad-resuelta`); `error-fila` sin símbolo que tape el 3 y con flecha separada de la etiqueta; «?» de `libros-pregunta` bajo la columna Ciencia.
- `mat.p6.grafica-proporcionalidad`: opciones «No, no pasa por el origen» y «Sí, porque sube de a tres», mensaje ajustado; ejes numerados en `error-coordenadas` (equis reducida) y `fruta-resuelta` (kilos 1–5, soles 3-6-9); `ejemplo-2-razona` reformulado sin depender de una gráfica inexistente.
- Ejercicios: sin ediciones (id, dificultad y respuestas intactos). `mat.p2.explicar-patron-aditivo` `e10` queda como riesgo menor documentado arriba: la revisión lo deja a decisión del orquestador y no es bloqueante.
