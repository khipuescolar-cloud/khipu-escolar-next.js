# Traspaso para Codex y siguientes sesiones: refuerzo de primaria

Actualizado: 2026-11-16, 05:00. Lee primero `docs/nudito/INSTRUCCIONES-CONTINUAR-REFUERZO-PRIMARIA.md` (criterios, definición de terminado) y este archivo. Fuente de verdad del avance: `docs/nudito/estado-refuerzo-primaria.json`.

## Estado

- **332 claves terminadas** con huella individual vigente en la BD local (cifras de `estado-refuerzo-primaria.json`, incluye lotes 01 a 57). **Todo lo que los alumnos ven por plan publicado (Matemática, Comunicación y Ciencia y Tecnología de 1.º a 6.º) ya tiene clase guiada.**
- **Faltan 1 657 claves fuera de planes publicados:** Matemática 525, Comunicación 564, Ciencia y Tecnología 568.
- Ninguna está validada con audio real ni recorrido humano completo. El QA automático en navegador (Playwright) pasó en 1.º, 2.º, 4.º, 5.º y 6.º (`docs/nudito/qa-navegador-*.md`).

## Cómo generar imágenes (acordado con Carlos)

1. **Generador local gratuito, ya instalado:** ComfyUI + Z-Image Turbo (Apache-2.0) en `~/comfyui-khipu`. Arranque: `nohup ~/comfyui-khipu/start.sh > ~/comfyui-khipu/comfy.log 2>&1 &` (escucha solo en `127.0.0.1:8188`; para detenerlo `pkill -f "ComfyUI/main.py"`). Una imagen: `source ~/comfyui-khipu/venv/bin/activate && python ~/comfyui-khipu/gen.py --prompt "<escena en inglés>" --out <ruta>.webp --seed N` (1200 × 896, 30–60 s con la GPU libre; con varios agentes en paralelo se encolan). Úsalo para escenas, seres vivos y fenómenos cotidianos. Los esquemas con partes (célula, partículas, capas de la Tierra, diagramas matemáticos) se hacen en SVG como código.
2. **Gemini por `agy` y ImageGen de Codex** siguen disponibles cuando haya cuota (flujo en las instrucciones). Las ilustraciones aprobadas de `la-celula` y del lote 02 de 1.º son de Gemini: valorar coherencia de estilo con las de Z-Image.
3. Una imagen a la vez, inspeccionada con Read antes de integrarla; alt y descripción después de ver la imagen final; si falla, otra semilla (máx 3 intentos) o SVG.

## Reparto de trabajo acordado con Carlos (2026-11-16, 05:xx)

| Quién | Qué hace |
|---|---|
| Z-Image local (gratis) | Volumen: escenas, animales, paisajes y fenómenos cotidianos (Comunicación 1.º–3.º, Ciencia y Tecnología). Sin cuota. |
| Gemini (`agy`) | Imágenes que exigen más fidelidad o escenas donde el local falló 3 veces. Cuota vuelve hacia las 5:50. |
| SVG como código | Diagramas de Matemática y esquemas con partes. No gasta generador. |
| Sonnet | Texto de cada `claseGuiada`, estructura, código de la app y pruebas. Revisor independiente distinto del autor. |

Reglas: un solo generador por ficha (evita estilo mezclado); toda imagen se inspecciona con Read antes de integrarla; el generador local atiende una petición a la vez (más agentes en paralelo solo encolan).

**Lotes 17 a 25 terminados** (51 claves: Matemática con SVG y CyT 2.º con Z-Image), todas aprobadas por revisor independiente y con huella vigente local. Lotes 26 a 45 (118 claves más, Matemática, CyT y Comunicación) también terminados. **Lotes 46 a 57 (53 claves, Matemática con SVG, Comunicación 1.º–3.º y CyT 3.º–6.º con Z-Image) también terminados.** Total según `estado-refuerzo-primaria.json`: **332 terminadas con huella vigente y 1 657 pendientes** (Matemática 525, Comunicación 564, Ciencia y Tecnología 568) de 1 989 fichas. Estado exacto en el campo `lote` del mismo JSON. Siguiente: lote 58 en adelante. Modelo de orquestación y reglas: `docs/nudito/ORQUESTACION-REFUERZO.md`. Detalle de los lotes 26 a 45 en `specs/50-nudito-banco-de-conocimiento.md`.

## Siguiente trabajo sugerido (en este orden)

1. **Audio y recorrido humano** de una muestra de las clases terminadas: cómo lee la voz «equis», «la letra n», números en palabras y tildes. Si hay fallos, corregir en la app con prueba.
2. **Resto del banco**, por lotes de 6 a 7 claves, priorizando los grados con más alumnos reales y las áreas sin cobertura por plan publicado. Matemática se explica bien con SVG; Comunicación de 1.º a 3.º y Ciencia y Tecnología ganan con ilustraciones.
3. Revisar las observaciones menores del QA: imágenes repetidas en varios momentos de una clase y posible sesgo de posición de la respuesta correcta.

## Lecciones de calidad de los lotes 03–11 (aplicar desde el primer borrador)

- Cada `recursoRef` debe corresponder exactamente a lo que narra ese momento; no aludir a «el dibujo» en momentos sin recurso.
- Los recursos de la situación y de los ejemplos guiados no deben mostrar la respuesta ni la regla que el ejemplo deduce (usar versión «pregunta» y dejar la que resuelve para el momento «razona»).
- La letra de la respuesta correcta debe variar y las opciones deben tener longitud parecida, sin pistas por forma.
- En Comunicación el texto a leer debe estar visible; la idea principal no siempre en la primera oración; los casos de noticias deben marcarse como ejemplos imaginarios.
- Ciencia y Tecnología: revisión factual rigurosa (no decir que las plantas comen tierra, etc.), una idea visual por imagen, sin texto incrustado.
- Un autor nunca aprueba su propio lote; revisión independiente por clave antes de renovar la huella. Cualquier edición posterior de una clave renovada la invalida.

## Hecho esta madrugada (para no repetirlo)

- Barrido de espacios frágiles en SVG (`&#160;` en `<tspan>`), alt de `punto-final`, y QA de navegador con Playwright. Los alumnos de 1.º a 4.º se prueban desde el apoderado en modo hijo (`/nudito?alumno=<id>`; cuentas `mariela.palomino@familia.demo`, `rosa.quispe@gmail.com`, contraseña `demo123`); no crear cuentas de alumno en esos grados (regla `gradoMinimoCuentaAlumno: 5`). El consentimiento de IA de las familias de prueba se siembra con `pnpm exec tsx scripts/nudito-consentimiento-prueba.ts` (solo BD local).
- Arreglos de la app (modo hijo con 403, partición de frases de la voz, entonación de títulos con «?», acierto duplicado) en `specs/50-nudito-banco-de-conocimiento.md`.

## Pendientes menores y notas

- La narración añade «La imagen relacionada con esta parte muestra lo siguiente: <descripcion>» y esa descripción también aparece en el `figcaption`: valorar si alarga demasiado el audio.
- Recorrido humano y audio real de las clases integradas (cómo lee la voz «equis», «la letra n», números y tildes).
- Commit ordenado: casi todo sigue sin commitear, mezclado con cambios de Codex.
