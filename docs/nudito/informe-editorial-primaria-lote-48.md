# Informe editorial · Primaria, Comunicación (1.º a 3.º), lote 48

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. No se tocaron estado, huellas, BD, specs ni componentes. Solo cambió el campo `claseGuiada` de cada clave (ejercicios, ids, respuestas y dificultad intactos).

## Alcance

Archivos bajo `src/lib/nudito/conocimiento/banco/comunicacion/`. Todas con 10 momentos (el primero sin recurso) y 5 recursos (2 ilustraciones Z-Image + 3 SVG).

| Clave | Archivo | Momentos | Recursos (id) | Comprobación |
|---|---|---:|---|---|
| `com.p1.agrupar-palabras` | `primaria-1/fichas/palabras-y-oraciones.json` | 10 | mesa, ropa, instrumentos, musica, error | c |
| `com.p1.como-son-lugares-y-objetos` | `primaria-1/fichas/inferir-e-interpretar.json` | 10 | lupa, playa, burro-pregunta, burro, error | a |
| `com.p1.contar-silabas` | `primaria-1/fichas/sonidos-letras-y-silabas.json` | 10 | palmadas, casa, zapato-pregunta, zapato-palmadas, error | b |
| `com.p2.antonimos` | `primaria-2/fichas/gramatica-y-vocabulario.json` | 10 | carrera, ligero, mascotas-pregunta, mascotas, error | c |
| `com.p2.comparar-en-el-texto` | `primaria-2/fichas/inferir-e-interpretar.json` | 10 | mochilas, verduras, aves-pregunta, aves, error | a |
| `com.p3.adjetivo-y-concordancia` | `primaria-3/fichas/gramatica-y-vocabulario.json` | 10 | puesto, sombrero, chacra-pregunta, chacra, error | b |

Estructura: idea (sin imagen) → situación con ilustración (en contar sílabas, también el ejemplo 1 es ilustración) → ejemplo 1 (tarjeta; razonamiento sin recurso) → ejemplo 2 (tarjeta; razonamiento con ilustración o esquema) → error frecuente (tarjeta roja/verde) → tres pasos → comprobación nueva.

## Recursos

- **Generador: solo Z-Image local** (ComfyUI, `~/comfyui-khipu/gen.py`, 1200×896 WebP, una imagen a la vez). **Bloqueo de Gemini:** `agy` funcionó una vez (la imagen salió con una figura fantasma y se descartó) y la segunda llamada devolvió «cuota del generador de imágenes agotada, reinicio 23:34 UTC». No se insistió más; las 12 imágenes (incluida la de la mesa) se hicieron con Z-Image. Todas vistas con Read; ninguna se regeneró.
- Ruta: `public/nudito/ilustraciones/comunicacion/primaria-{1,2,3}/<nombre>-zimage-v1.webp`. Prompts (se añade el estilo de `gen.py`), semilla:
  - agrupar-mesa (41): a single Peruvian girl alone sitting at a wooden table in a bright classroom, on the table are scattered mixed everyday objects: a red apple, a yellow banana, a pencil, a ruler, a toy car and a small sock, she looks at them thoughtfully
  - agrupar-musica (42): three Peruvian schoolchildren in a music class, one plays a pan flute, one plays a long wooden flute, one beats a small drum, happy faces, classroom
  - pistas-lupa (43): a Peruvian girl holding a magnifying glass over an open storybook, curious expression, sitting at a desk
  - pistas-burro (44): a brown donkey carrying two sacks on its back climbing a steep Andean hill path, farmer walking beside it, sunny
  - silabas-palmadas (45): four Peruvian schoolchildren standing in a circle in a school patio clapping their hands, smiling, sunny day
  - silabas-casa (46): a small cozy house with a red roof, a door and two windows, a tree beside it, simple clear drawing
  - antonimos-carrera (47): a tortoise walking slowly on a path while a hare runs fast far ahead of it, green meadow, sunny
  - antonimos-mascotas (48): a small brown dog standing awake with wagging tail next to a gray cat sleeping curled up on a cushion, cozy living room
  - comparar-mochilas (49): two school backpacks on a wooden bench, one big red backpack and one small blue backpack, school patio
  - comparar-aves (50): a colorful green parrot and a rooster standing side by side on a farm fence, both with colorful feathers, sunny morning
  - concordancia-puesto (51): a Peruvian market stall table with one straw hat and three colorful knitted scarves, a smiling vendor woman behind it
  - concordancia-chacra (52): two woven baskets in a field, one full of yellow potatoes and one full of purple sweet potatoes, Peruvian farm, sunny
- La narración, el alt y la descripción se escribieron tras ver cada imagen y se ajustaron a lo que muestra: la música tiene dos flautas de madera y un tambor (sin zampoña; el texto dice «flautas, como la quena»); el burro baja o camina por la ladera, así que la narración no afirma «sube» (solo cita las pistas del texto); el conejo no se llama liebre; la vendedora tiene cuatro bufandas (no tres); el perro está de pie con los ojos abiertos (no mueve la cola); las palmadas ocurren en un salón, no en el patio; la casa tiene fondo blanco (estilo algo distinto del resto).
- SVG como código en `public/nudito/diagramas/comunicacion/` (18 archivos, prefijos `agrupar-palabras-`, `como-son-`, `silabas-`, `antonimos-`, `comparar-`, `adjetivo-`): viewBox 640×480, texto ≥26 px, paleta de specs/18, ámbar de texto `#8A5A00`, sin `<tspan>`, con `<title>`. Rasterizados con Chrome headless y vistos (los esquemas de palmadas: círculos amarillos con tres rayitas, parecen soles pequeños; la descripción los llama «círculo amarillo con tres rayitas»). Queda espacio vacío bajo las tarjetas (cosmético).

## Decisiones

- Las tarjetas de situación y ejemplo guiado no muestran la respuesta; las ilustraciones de «razona» sí muestran el escenario.
- Ejemplos nuevos, distintos de `ejemplos` y de los ejercicios de la ficha. Cada tarjeta de pregunta trae el texto que se lee y una pregunta aparte.
- Números y fracciones en palabras en narración, opciones, mensaje, alt y descripción (solo «Ejemplo N», «Paso N» en los títulos). Sin letras sueltas, sin «parte N de M».
- Comprobaciones nuevas, opciones de longitud pareja (diferencias 1, 1, 3, 1, 2, 1) y correcta nunca la más larga; letras c, a, b, c, a, b.
- En 3.º no se dice «-o» ni «-a» en la narración: siempre se citan las palabras completas.
- Ficha de contar sílabas: el primer ejemplo se lee en un dibujo («casa») para 1.º; se evita «a/b/c» como letras.

## Verificaciones

- Script: `recursoRef` ↔ recursos exactos, 10 momentos por clave, primer momento sin recurso, archivos existentes, alt ≤ 124, descripción ≤ 292, sin dígitos en narración/opciones/mensaje/pista, momentos sin recurso sin «dibujo/imagen/tarjeta/escena».
- `pnpm nudito:validar-banco`: válido (2 238 fichas, 27 034 ejercicios). `pnpm typecheck`: sin errores. `git diff --check` sobre los 6 JSON y los recursos: limpio.
- Cada JSON se releyó justo antes de escribir y solo cambió `claseGuiada` de la clave.

## Errores de ejercicios existentes (reportados, NO editados)

1. `com.p1.agrupar-palabras` **e07**: el enunciado entrega la respuesta («con la fruta piña») y la retroalimentación habla de «Piedra», que no aparece. **e12**: igual («con el animal llama»; la retro habla de «Lana»). **e01**: la pista 3 dice «Mango es una fruta» (da la respuesta). Afectan al alumno (ejercicio sin comprobación real; retro incoherente). Corrección mínima: quitar «con la fruta piña» / «con el animal llama» del enunciado y reescribir las retros.
2. `com.p1.como-son-lugares-y-objetos` **e12**: la opción c «La plaza era una manta» es un distractor absurdo. Menor.
3. `com.p2.antonimos` **e04**: la opción «tapar poco» es poco natural. Menor.
4. Sin errores factuales o de respuesta en contar sílabas, comparar en el texto ni adjetivo y concordancia (12 ejercicios de cada una recalculados).

## Riesgos y pendientes

- Sin revisión independiente ni recorrido en navegador (audio, móvil, movimiento reducido).
- El burro de `como-son-burro` baja por la ladera mientras el texto dice «sube el cerro»; la narración lo evita, pero un revisor puede pedir regenerar.
- `silabas-casa` tiene fondo blanco liso, distinto del resto; `antonimos-carrera` muestra un conejo, no una liebre.
- Gemini/agy queda disponible desde las 18:34 hora local; no se usó en ninguna clave.
- No se actualizaron `estado-refuerzo-primaria.json`, specs ni bitácora (fuera del encargo).

## Correcciones (revisión independiente, 2026-11-16)

- `com.p1.como-son-lugares-y-objetos`: el burro ya no «sube» el cerro (la imagen lo muestra bajando/caminando): «Camina por el cerro sin parar» en la narración de `ejemplo-2-lee`, en la descripción de `burro-pregunta` y en `como-son-burro-pregunta.svg` (rerasterizado y visto). No se regeneró la imagen. e12 (autorizado): opción c → «La plaza era angosta; la calle, amplia.».
- `com.p2.comparar-en-el-texto`: narración de `situacion` reescrita para no repetir el título (lint `titulo-repetido` resuelto).
- `com.p3.adjetivo-y-concordancia`: narración, alt y descripción de `chacra` ya no dan las formas flexionadas («papas, de color amarillo»; «camotes de color morado»).
- `com.p1.agrupar-palabras` (autorizado, solo enunciado/retro/pista): e07 y e12 sin la respuesta en el enunciado y con retro correcta («Piña», «Llama»); pista 3 de e07, e12 y e01 ya no entrega la respuesta. Sin cambios de id, dificultad ni respuesta.
- `com.p2.antonimos` e04 (autorizado): opción d «tapar poco» → «pintar».
- Verificación: lint de las 5 claves 0 errores (1 aviso falso positivo «por c»); typecheck limpio; `git diff --check` limpio. `nudito-validar-banco` falla por «pista repetida» en `mat.p1.contar-hasta-10` (matemática, de otra sesión; no es de este lote).
