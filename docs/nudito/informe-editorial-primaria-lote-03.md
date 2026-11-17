# Informe editorial · Primaria Comunicación 2.º–6.º, lote 03

Fecha: 2026-11-16. Autor: agente Sonnet. Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. No se aprueba ni se renueva ninguna huella.

## Alcance

| Clave | Momentos | Recursos | Estado |
|---|---:|---|---|
| `com.p2.informacion-en-partes` | 11 | 1 WebP Gemini + 1 SVG existente + 1 SVG nuevo | escrito; falta 1 ilustración Gemini (ver Riesgos) |
| `com.p3.informacion-explicita` | 11 | 1 SVG existente + 1 SVG nuevo | escrito; 2 ilustraciones Gemini pendientes |
| `com.p4.causa-y-efecto` | 11 | 1 SVG existente + 1 SVG nuevo | escrito; 2 ilustraciones Gemini pendientes |
| `com.p5.idea-principal` | 11 | 1 SVG existente + 1 SVG nuevo | escrito; 2 ilustraciones Gemini pendientes |
| `com.p6.proposito-y-punto-de-vista` | 11 | 1 SVG existente + 1 SVG nuevo | escrito; 2 ilustraciones Gemini pendientes |

Todas: momento inicial sin imagen, situación visual, dos ejemplos (3 momentos cada uno), tres pasos, comprobación nueva y específica, recursos enlazados por `recursoRef`. Solo cambió el campo `claseGuiada` de cada ficha: ejercicios, ids, respuestas y dificultad quedaron intactos (el diff solo agrega líneas).

## Decisiones pedagógicas

- **p2 (2.º):** inicio/medio/final con cartel de feria; la pregunta decide la parte del texto. Ejemplo 2 con el día de Pedro: la palabra de tiempo («al atardecer») orienta hacia el final y se descarta un dato verdadero pero de otro momento.
- **p3 (3.º):** información explícita = señalable en el texto. Ejemplo 1 (Lucía, quesos) guiado con palabra clave y evidencia; ejemplo 2 (don Raúl) distingue dos datos explícitos en la misma oración (dónde / con quién) y lo que no está escrito (cuántos peces), para no responder con suposiciones.
- **p4 (4.º):** causa y efecto con conectores; el orden de la oración puede invertirse («como…» / «porque…»); un efecto puede ser causa en una cadena (el paso intermedio «tomó mucho sol» se declara como imaginado, no como dato del texto). La comprobación usa orden inverso con «porque».
- **p5 (5.º):** idea principal = abarca casi todo el párrafo. Ejemplo 1 con idea al inicio y prueba de un detalle; ejemplo 2 (huerto) con idea al final y esquema de posiciones.
- **p6 (6.º):** propósito (para qué) vs punto de vista (qué piensa). Ejemplo 1 convencer (afiche); ejemplo 2 informar sin opinión explícita; menos infantilizado. Comprobación con dos dimensiones.
- Los textos de lectura de cada ficha se leen en la narración; el audio apoya y no sustituye la lectura. Las comprobaciones y ejemplos no repiten los textos de los ejercicios.

## Recursos

Imagen Gemini (1 inspeccionada):

- `public/nudito/ilustraciones/comunicacion/primaria-2/partes-feria-gemini-v1.webp` (1200 × 896). Prompt: «Usa el generador de imágenes de Gemini y crea exactamente una imagen en formato horizontal 4:3. Ilustración escolar cálida… sin texto… feria escolar un sábado soleado en el patio de un colegio peruano; niños con soga y rayuela bajo banderines, una niña en primer plano sostiene una botella de agua reutilizable». Alt: «Niños juegan en el patio de un colegio con banderines mientras una niña sostiene una botella de agua.» Inspeccionada con Read antes de escribir alt y descripción; sin texto incrustado (la rayuela solo tiene figuras).

SVG nuevos como código (inspeccionados en navegador local, texto sin desbordes) en `public/nudito/diagramas/comunicacion/`:

- `informacion-en-partes-pedro.svg` (p2), `informacion-explicita-evidencia.svg` (p3), `causa-y-efecto-cadena.svg` (p4), `idea-principal-posiciones.svg` (p5), `proposito-pistas.svg` (p6).

SVG existentes reutilizados: `informacion-en-partes`, `informacion-explicita`, `causa-y-efecto`, `idea-principal`, `proposito-y-punto-de-vista`.

## Pendientes de imagen Gemini (no generadas)

Tras la primera imagen, Antigravity devolvió `429 RESOURCE_EXHAUSTED` (cuota del modelo de imagen, reinicio en ~4 h). No se eludió. Se cubrió cada clave con diagramas SVG exactos, pero quedan por generar (cuando haya cuota), a añadir como recursos extra enlazados por id sin tocar el resto:

1. p2 `partes-pastor`: pastor joven guía ovejas a un corral de piedra al atardecer, vacas al fondo.
2. p3 `explicita-feria-quesos`: Lucía en su puesto de quesos de la feria de Cajamarca.
3. p3 `explicita-pesca-titicaca`: don Raúl y su hijo pescando en bote de totora.
4. p4 `causa-trafico-via-expresa`: bus atascado en la Vía Expresa, niña mirando por la ventana.
5. p4 `causa-playa-paracas`: niño sin sombrero con la cara enrojecida junto a otros con sombrero.
6. p5 `idea-maiz-mesa`: mesa con choclos hervidos, tamales y chicha morada.
7. p5 `idea-huerto-escolar`: niños sembrando y regando lechugas en cajones.
8. p6 `proposito-lavado-manos`: niños lavándose las manos en el patio del colegio.
9. p6 `proposito-chasqui`: chasqui con quipu en un camino del Qhapaq Ñan, tambo al fondo.

## Comandos y resultados

- `pnpm nudito:validar-banco`: «Banco válido: 2238 fichas activas; 27034 ejercicios.»
- `pnpm typecheck`: sin errores.
- `git diff --check` sobre banco y `public/nudito`: sin hallazgos.
- Comprobación propia: `claseGuiada` de las 5 claves validada por el esquema; 11 momentos, `recursoRef` existentes, respuesta de cada comprobación identifica una opción única y se verificó a mano contra el texto de la pregunta.
- ESLint no aplica (solo JSON/SVG/WebP). No se corrió navegador de alumno ni audio.

## Riesgos

- Faltan 9 ilustraciones de Gemini; las clases funcionan con 2 recursos distintos (3 en p2), pero el atractivo visual de 3.º–6.º es menor que el previsto.
- Los SVG tienen texto en Arial fijo; el audio debe apoyarse en `descripcion` (ya redactada con su contenido exacto).
- Revisión de audio, móvil, movimiento reducido y visibilidad del alumno pendiente. La BD y las huellas no se tocaron.

## Correcciones tras la revisión independiente (2026-11-16)

Solo `claseGuiada` y recursos; sin ejercicios, git, estado ni huellas.

- p2: `situacion-feria` redactada natural («Un cartel de esta feria da cada dato en un lugar distinto…»).
- p4: `recursoRef: cadena` movido de `ejemplo-sombrero-lee` a `ejemplo-sombrero-efecto` (se indica mirar solo el primer y el último cuadro); `ejemplo-sombrero-cadena` introduce el cuadro del medio.
- p5: «Se hacen tamales» en `ejemplo-maiz-lee` y `-prueba`; `ejemplo-huerto-posicion` describe el esquema por primera vez (sin «otra vez») y apoya el color con posición («resaltada», primera/tercera/última); comprobación reformulada con la idea principal en la última oración (respuesta `b`).
- p6: `situacion-columnas` dice «tres líneas»; `ejemplo-chasqui-lee` ahora muestra el texto citado (sin cifras históricas: caminos, tambos y relevos) y se ajustó la narración de propósito.
- SVG rehechos en viewBox 640×480 con texto ≥26 px, renderizados sin solapes: `idea-principal-posiciones`, `proposito-pistas`, `informacion-explicita-evidencia`; alt y descripción actualizados (p5, p6; p3 sin cambio de contenido).
- Validación: `pnpm nudito:validar-banco` (2238 fichas, 27034 ejercicios), `pnpm typecheck` y `git diff --check` sin errores.
- Pendiente fuera de alcance: el campo `ejemplos` de `com.p5.idea-principal` conserva «Se hace tamales» (línea de la ficha, no es `claseGuiada`); corregir con la ficha.
