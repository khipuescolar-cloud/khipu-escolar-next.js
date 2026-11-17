# Informe editorial primaria — lote 50 (Matemática)

Autor: Claude (terminó el trabajo parcial dejado por un autor Codex). Sin autoaprobación: pendiente de revisor.

| Clave | Archivo | Momentos | Recursos |
|---|---|---|---|
| mat.p1.explicar-como-crece | primaria-1/fichas/patrones-aditivos.json | 10 | 4 (fichas-pregunta, fichas-uno, pollitos-dos, error-salto) |
| mat.p2.datos-cualitativos | primaria-2/fichas/recogida-y-organizacion-de-datos.json | 10 | 4 (encuesta-pregunta, platos-agrupados, ojos, error-mezcla) |
| mat.p4.duplicar-repartir-lados | primaria-4/fichas/igualdades-y-equivalencias.json | 10 | 4 (igualdad-pregunta, igualdad-doble, igualdad-mitad, error-un-lado) |
| mat.p5.descomponer-dividendo | primaria-5/fichas/operaciones-con-naturales.json | 10 | 4 (libros-pregunta, libros-resuelto, panes, error) |
| mat.p6.desigualdades-signos | primaria-6/fichas/desigualdades.json | 10 | 4 (tapitas-pregunta, tapitas-resuelto, edad, error-signo) |

SVG en `public/nudito/diagramas/matematica/` (20 archivos, prefijos explicar-crece-, datos-cualitativos-, duplicar-repartir-, descomponer-dividendo-, desigualdades-).

## Decisiones
- p1, p5 y p6 ya tenían `claseGuiada` del autor Codex: se conservaron; se corrigieron avisos del lint.
- p2 y p4 no tenían `claseGuiada`: se escribieron completas sobre los SVG ya existentes (reutilizados, ajustados).
- Todos los SVG: se quitó `id="title"`/`aria-labelledby` (el lint exige `<title>` literal).
- Textos al pie acortados por desborde (p1 error-salto, p5 libros-pregunta, p2 ojos/platos, p4 pregunta). En p5 libros-pregunta además se quitó «Busca partes fáciles…» (adelantaba el método en un recurso de situación).
- p1 error-salto: la cruz tapaba el segundo «+1»; se movió debajo y se actualizó la descripción.
- p2 error-mezcla: rehecho (mango/llama en tarjetas separadas con «≠»; el dibujo anterior tenía la cruz solapando rótulos).
- p2 platos-agrupados: tarjetas ensanchadas (el texto tocaba el borde).
- p6: «La expresión menos de» → «La frase menos de» (lint de letra suelta); opción a de la comprobación «Ambos lados son iguales» (longitud pareja).
- Letras correctas de comprobación: p1 B, p2 A, p4 D (cuatro opciones), p5 B, p6 C. Respuesta nunca la opción más larga.

## Verificaciones
- `nudito-lint-clase-guiada` sobre las cinco claves: 0 errores, 0 avisos (1 nota informativa de ejercicio existente, ver abajo).
- `nudito-validar-banco`: banco válido. `tsc --noEmit`: sin errores. `git diff --check` en los SVG: limpio.
- Cálculos revisados a mano: 4+6=10→8+12=20; 12=6+6→6=3+3; 16=10+6→8=5+3; 42−7=35 y 6×6=36; categorías de la comprobación de p2 = perro, gato, conejo (tres).
- SVG rasterizados con Chrome headless y revisados visualmente.

## Errores en ejercicios existentes
Ninguno hallado. Nota: mat.p2.datos-cualitativos e01 tiene la opción correcta como la más larga (no editado).

## Riesgos
- `pnpm` no existe en el entorno: se ejecutó con `node_modules/.bin/tsx` y `tsc` equivalentes.
- Dibujos simbólicos (óvalos como ojos/panes, p5 «panes» con seis óvalos para ochenta y cuatro): revisor debe confirmar que las descripciones coinciden.
- p2 platos-agrupados y p4 igualdad-pregunta cercanos al límite de ancho; lint pasa.

## Correcciones (tras revisión independiente)
- p1: `fichas-pregunta` rótulos «Uno, Dos, Tres» (caben con margen) y círculos r=20 separados; `fichas-uno` círculos r=20 separados; `error-salto` alt alineado con la descripción (cruz bajo el segundo cambio). e10: opciones a/c/d igualadas en longitud (30/27/27; la correcta ya no es la más larga ni con diferencia >3).
- p2: `encuesta-pregunta` y `platos-agrupados` con títulos/ítems largos en dos líneas (≥26 px), cajas de 190 px separadas 20 px. e01 (autorizado por el colaborador; sin tocar id/dificultad/respuesta): a «Tengo siete años cumplidos», b «Mi plato favorito: ceviche», c «Tengo dos hermanos menores» (26 car. cada una); retroalimentación ajustada.
- p5: `libros-pregunta` «en cada / estante» en dos líneas (descripción actualizada); `panes` sin óvalos (dos tarjetas 70÷7=10 y 14÷7=2; descripción actualizada). e09/e10/e12: sin cambios (no aplicaba).
- p6: `tapitas-pregunta` dibuja 3 barras de diez + 6 sueltas (36) y 2 barras + 9 sueltas (29), coherente con «tres/dos decenas»; descripción actualizada. e06: retroalimentación «Es falso: 7 no es menor que 7; sirven valores como 6, 5, 4…».
- p4 (aprobada): sin cambios. SVG rasterizados con Chrome headless y revisados.
