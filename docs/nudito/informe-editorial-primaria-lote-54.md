# Informe editorial · Primaria, Matemática, lote 54

Fecha: 2026-11-16. Autor: Claude (Sonnet 5.5), tras agotarse la cuota del autor Codex. Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. Solo cambió el campo `claseGuiada` de cada clave (resto de cada ficha idéntico a `HEAD`; verificado por JSON). No se tocaron estado, huellas, BD, specs ni componentes.

| Clave | Archivo (`src/lib/nudito/conocimiento/banco/matematica/`) | Momentos | Recursos (SVG `<prefijo>-<id>.svg`) |
|---|---|---|---|
| `mat.p4.encuestas-entrevistas` | `primaria-4/fichas/datos-y-tablas.json` | 10 | `transporte-pregunta`, `dos-preguntas`, `un-palito`, `registro-palitos`, `error-doble` (prefijo `encuestas-entrevistas`) |
| `mat.p5.litro-decimales` | `primaria-5/fichas/capacidad.json` | 10 | `jarras-pregunta`, `lectura-jarras`, `suma-alineada`, `errores-decimales`, `comparar-columnas` (prefijo `litro-decimales`) |
| `mat.p6.medir-construir-angulos` | `primaria-6/fichas/rectas-y-angulos.json` | 10 | `angulo-pregunta`, `medicion-80`, `trazar-pregunta`, `trazar-130`, `errores-medir` (prefijo `medir-construir-angulos`) |

15 SVG nuevos en `public/nudito/diagramas/matematica/` (nombres distintos de los SVG antiguos sin referencia que ya existían con esos prefijos; no se tocaron). 640×480, texto ≥ 26 px, sin `<tspan>`, con `<title>`, paleta crema/índigo/turquesa `#0C706E`/maíz, ámbar `#8A5A00`, rojo `#B5412A` y gris `#5B6170` solo en texto.

## Decisiones

- Estructura: idea (sin recurso) → situación (variante «pregunta») → ejemplo 1 guiado → razona → ejemplo 2 guiado → razona → contraejemplo → tres pasos → comprobación nueva. Los guiados de p4 no llevan recurso (y no dicen «dibujo»); los de p5 tampoco; el guiado 2 de p6 usa `trazar-pregunta`.
- p4: encuesta de cómo vienen al colegio (cuatro, tres y tres palitos, diez niños); contraejemplo: Luz contada dos veces. Comprobación: mejor pregunta sobre mascotas (c), opciones 45/42/42, la correcta no es la más larga.
- p5: jarras 1,25 L y 0,75 L (alturas proporcionales); ejemplo 1 lectura (1 L + 0,25 L = 1250 mL), ejemplo 2 suma alineada con llevadas (2 L); contraejemplo 1,25 L frente a 1,3 L (25 > 3) y 0,5 L ≠ 5 mL; paso 3 compara 1,60 y 1,45. Comprobación 0,8 L + 0,5 L = 1,3 L (a), opciones 20/22/19.
- p6: transportador dibujado con geometría exacta (marcas cada 10°); ejemplo 1 mide 80° (escala gris contraria = 100°), ejemplo 2 traza 130° (contraria = 50°); contraejemplo: escala contraria (100° no cabe en un ángulo más cerrado que la esquina de una hoja) y centro movido. Comprobación: 95 por escala interior (b), opciones 22/22/21.
- Letras correctas: c, a, b. Sin letras sueltas, sin dígitos en narración, opciones y pistas; números y decimales en palabras. La pista no contiene la opción correcta ni entrega la operación.

## Verificaciones

- `npx tsx scripts/nudito-lint-clase-guiada.ts` (las tres claves): 0 errores; 8 avisos `descripcion-larga` (293–380 caracteres, ≤ 500; necesarios para describir tablas y transportadores).
- `pnpm` no está en el PATH del entorno: se ejecutó lo equivalente: `npx tsx scripts/nudito-validar-banco.ts` → banco válido (2238 fichas, 27034 ejercicios); `npx tsc --noEmit` → sin errores; `git diff --check` limpio sobre los tres JSON.
- SVG rasterizados con Chrome headless y vistos; alt y descripción escritos después de ver el dibujo final. Ajustes hechos al verlos: tarjetas de `transporte-pregunta` más anchas, columnas de la tabla de `un-palito`, separación de encabezados en `suma-alineada`/`comparar-columnas`, etiquetas del transportador fuera de las marcas.
- Recalculado: 4 + 3 + 3 = 10; 3 niños frente a 4 palitos; 1,25 L = 1250 mL; 0,75 + 1,25 = 2,00; 1,30 > 1,25; 1,60 > 1,45; 0,8 + 0,5 = 1,3; 180 − 80 = 100; 180 − 130 = 50; 180 − 85 = 95.

## Errores en ejercicios existentes (no editados)

1. `mat.p6.medir-construir-angulos` e09, retroalimentación: «30° es complementaria en el dibujo». 150° + 30° = 180°, o sea suplementaria, no complementaria. Corrección mínima: «30° es la lectura de la escala contraria».
2. Menor, p4: e03 pista 2 («Hay una fila de ||||| con 5 palitos») entrega la respuesta; e04 y varios ejercicios de p4 son de nivel de 2.º–3.º.
3. Resto de ejercicios de las tres claves (36) recalculados: respuestas correctas y únicas.

## Riesgos y pendientes

- Sin revisión independiente ni recorrido en navegador (audio, móvil, movimiento reducido).
- p6: la escala interior del transportador solo rotula 0, 180 y la lectura gris del lado trazado; el resto de las marcas no lleva números por legibilidad (texto ≥ 26 px).
- p4: el «?» y la figura de la situación son esquemáticos (persona de palitos, combi y moto simples).
- No se actualizaron `estado-refuerzo-primaria.json`, specs ni bitácora (fuera del encargo).

## Correcciones (tras revisión independiente)

- p4: `paso-1` define la entrevista (una sola persona); `transporte-pregunta` describe el título «Cómo llegamos al colegio».
- p5: `errores-decimales` describe la nota «la mitad de mil mililitros»; línea punteada de `suma-alineada` y `comparar-columnas` movida a la derecha de las comas (SVG rerasterizados y vistos); contraejemplo con «Primer error / Segundo error».
- p6: pista de la comprobación reformulada («Las dos lecturas suman ciento ochenta; elige la que parte del cero del lado inicial.»); `medicion-80` y `trazar-130` con rótulos «escala de afuera / escala de adentro» y descripciones al día.
- p6 e09 (autorizado, cambio mínimo, sin tocar id/dificultad/respuesta): retroalimentación «30° es complementaria en el dibujo» → «30° es la lectura de la escala contraria».
- Borrados 16 SVG huérfanos (grep en src, tests, public, docs, specs, scripts: solo los nombra el informe de revisión, sin referencias reales).
- Pendiente: p4 e03 pista 2 (dato del revisor, ejercicio existente, no autorizado a editar).
