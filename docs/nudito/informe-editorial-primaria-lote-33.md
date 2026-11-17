# Informe editorial · Primaria, Matemática, lote 33

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. Solo cambió `claseGuiada` de cada clave (ejercicios, ids, respuestas y dificultad intactos). No se tocaron estado, huellas, BD, specs ni componentes.

## Alcance

| Clave | Archivo (`src/lib/nudito/conocimiento/banco/matematica/`) | Momentos | Recursos (SVG `public/nudito/diagramas/matematica/`) |
|---|---|---|---|
| `mat.p1.completar-10-para-sumar` | `primaria-1/fichas/adicion-y-sustraccion-hasta-20.json` | 10 | `completar-diez-{situacion,ocho-cinco,nueve-seis-pregunta,nueve-seis,error}` |
| `mat.p2.continuar-completar-patron` | `primaria-2/fichas/patrones-de-repeticion.json` | 10 | `continuar-patron-{situacion,alternado,doble-pregunta,doble,error}` |
| `mat.p4.conmutativa-multiplicacion` | `primaria-4/fichas/c23-terminos-propiedades.json` | 10 | `conmutativa-{situacion,tres-cuatro,bolsas-pregunta,seis-dos,error}` |
| `mat.p5.convertir-km-m-cm` | `primaria-5/fichas/longitud.json` | 10 | `convertir-longitud-{situacion,km-m,cm-pregunta,cm-m,error}` |
| `mat.p6.completar-tablas-doble-entrada` | `primaria-6/fichas/recojo-y-organizacion-de-datos.json` | 10 | `tabla-doble-{situacion,fila,columna-pregunta,columna,error}` |

## Trabajo previo reutilizado (ejecución interrumpida de Codex)

Las cinco claves ya tenían `claseGuiada` (10 momentos) y 21 SVG; faltaban los 4 SVG de p5 (situacion, cm-pregunta, cm-m, error). Se revisó todo y se corrigió:

- SVG: texto turquesa a `#0C706E` en los 25; se rehicieron los defectuosos (p1 `error`; p2 los cinco, con núcleos mal alineados y rótulo recortado en `situacion`; p4 los cinco, con puntos pegados al borde y tachaduras sobre texto; p6 `error`, con la equis tapando datos) y se crearon los 4 de p5. Se quitaron pistas de regla en recursos de situación/guiado (p1 «Busca una forma rápida de sumar», p2 rótulo del núcleo, p6 «Usa solo los datos de esa fila» y «Mira el total de la columna»). Sin SVG huérfanos: los 25 están referenciados.
- Texto: p1 `ejemplo-1-guiado` ya no entrega la separación; contraejemplos de p1, p2 y p6 ajustados a lo que muestra el dibujo; alt y descripción reescritos tras ver cada SVG rasterizado (Chrome headless).
- Comprobaciones: se rehicieron p1 (ocho más siete) y p5 (qué operación para ochocientos centímetros); en p2, p4 y p6 solo se reordenaron/ajustaron opciones. Letras correctas: c, a, b, c, b (p1, p2, p4, p5, p6). Longitudes de opciones: diferencia máxima 3; la correcta nunca es la más larga.

## Verificaciones

- Script: recursoRef ↔ recursos exactos, 10 momentos, alt ≤ 200, descripciones ≤ 279, archivos existentes, sin dígitos en narración, pregunta, opciones, mensaje ni pista.
- Ejercicios existentes de las cinco claves recalculados (8+5, 9+8, 6+7−10; núcleos y posiciones; 27×18=486, 16×24=384, 19×11=209, 32×7=224; 0,8 km+650 m+45 000 cm=1900 m, 1,2 km÷4 m=300, 850 vs 1000 cm; tablas con totales): **sin errores de contenido ni de grado**.
- `pnpm nudito:validar-banco`: válido (2 238 fichas, 27 034 ejercicios). `pnpm typecheck`: sin errores. `git diff --check` sobre `public` y `docs`: limpio.

## Riesgos

- Sin revisión independiente ni recorrido en navegador (audio, móvil); SVG vistos sueltos.
- p1: las aves de `nueve-seis-pregunta` son círculos esquemáticos. p2 `situacion`: gran espacio vacío bajo la fila. p5 `cm-pregunta`: la cinta es un trazo ondulado sin escala (a propósito). p6: `situacion`/`columna-pregunta` tienen la pregunta en el dibujo; la regla de resta solo aparece en el ejemplo razonado.
- No se actualizaron `estado-refuerzo-primaria.json`, specs ni bitácora (fuera del encargo).

## Correcciones tras la revisión independiente (`revision-lote-33.md`)

p2, p4 y p5 aprobadas: sin cambios.

- p1: `completar-diez-error` redibujado para mostrar el error (marco con siete y tres usadas, tres fichas con anillo rojo «Dejó tres fuera», «Del cinco solo quedan dos»); narración del `contraejemplo`, alt y descripción reescritos; narración de `situacion` sin «dos espacios vacíos».
- p6: `tabla-doble-columna` añade la línea «Ocho más siete confirma quince» (alt/descripción actualizados, coincide con `ejemplo-2-razona`); pregunta de `ejemplo-2-guiado` reformulada («¿Cuántos del grupo azul van a pie?»); contraejemplo dice «De los dos totales marcados, solo el segundo sirve».
- SVG cambiados rasterizados en headless y revisados.
