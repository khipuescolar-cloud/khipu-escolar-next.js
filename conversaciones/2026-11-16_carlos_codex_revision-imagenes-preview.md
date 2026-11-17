# Revisión de imágenes en la vista previa

| Campo | Valor |
|---|---|
| Fecha | 2026-11-16 |
| Colaborador | Carlos (dueño del producto) |
| Agente y modelo | Codex · GPT-6.1 |
| Rama y commits | rama actual · sin commit en esta sesión |
| Specs afectadas | `specs/50-nudito-banco-de-conocimiento.md` |

## Pedidos del colaborador (textual)

> bueno acabo de revisar el tema  que me dejaste en http://lvh.me:3000/refuerzo-preview-temporal y solo veo 1 imagen

> vale ya lo puedo ver mejor, puedes unirlo a lo que tenemos porfavor

> entonces que otras fichas ya estan hechas?

> de los 9 me haz mostrado me parecen geniales , parece que ya vaz entendiendo como hacer las clases de kiphu

> perfecto, puedes comenzar con ese lote entonces

> puedes pedir una imagen a la vez porfavor

> y como hiciste anteriormente lo de antigravity? es antigravity cli, que estabas haciendo?

> no uses entoncces ese comando ps, usa el mismo que haz estado usando las otras veces

> puedes limpiar el select entonces por que veo que hay muchos ahi

> perfecto, me encanto lo que hiciste; unelo eso a lo que tenemos; veo que ya vas haciendolo todo bien asi que dejame un promp que le compartire a Claude, de tal manera que pueda orquestar multiagentes y pueda terminar mas rapido las tareas; necesito que orqueste los trabajos con codex si es que sobra aun creditos de codex y si no puede que orqueste todo con Sonnet , creo que sera suficiente, tambien que orqueste con gemini tal cual como tu lo hiciste , pero si no puede que lo haga con su modelo mas barato para generar imagenes; necesito pasarle toda la informacion de como estan estructuradas las clases de nudito para que asi siga las mismas indicaciones pero ahora lo hara de manera autonoma, yo no le dire que si subir y cual no, necesito que trabaje solo, por eso necesito que le especifiques todo

## Decisiones

- Se diagnosticó la vista previa sin generar recursos ni consumir cuota de Gemini.
- La ruta abría por defecto `com.p1.datos-del-texto`, borrador anterior con un solo recurso, en lugar de una de las diez claves del lote editorial.
- Se conserva el diseño de un recurso por momento y se hace visible la cantidad total de recursos del tema.
- La solicitud de unir lo revisado se aplicó únicamente a `com.p1.de-que-tratara`; no se interpretó como aprobación de las otras nueve claves.
- Se informó el estado sin mezclar niveles: doce clases completas, tres aprobadas e integradas, nueve completas pendientes de aprobación y diecisiete borradores que todavía no cuentan como terminados.
- El mensaje posterior se registró como aprobación expresa de las nueve fichas restantes del lote, sin extenderla a otros borradores ni a toda primaria.
- Se inició el lote siguiente con un solo agente y una sola solicitud agrupada a Antigravity para cuidar créditos.
- Después de la indicación de Carlos, la estrategia cambió a una imagen por solicitud, con inspección antes de continuar.
- Se descartó `antigravity chat`. El flujo correcto recuperado de los registros anteriores usa `agy`, Gemini 4 Argon Low y un único subagente `image-generator` por imagen.
- Para facilitar la aprobación del lote 02, el selector temporal muestra únicamente sus cinco claves; no se borran ni modifican las demás fichas del banco.
- El mensaje de Carlos aprueba expresamente las cinco claves del lote 02 y autoriza que los lotes futuros se revisen e integren localmente de forma autónoma con revisión independiente; no autoriza producción ni despliegues.

## Cambios realizados

- `src/app/refuerzo-preview-temporal/page.tsx`: abre `com.p1.de-que-tratara` y explica cuántas imágenes o diagramas distintos contiene la ficha y cómo recorrerlos.
- `specs/50-nudito-banco-de-conocimiento.md`: documenta el comportamiento de revisión temporal.
- La huella de `com.p1.de-que-tratara` se renovó individualmente en la BD local mediante una transacción condicional y auditoría `curriculum_revision_local_codex`.
- `docs/nudito/estado-refuerzo-primaria.json` e informe del lote: aprobación, huella y visibilidad actualizadas por clave.
- Las otras nueve huellas se renovaron de forma individual en la BD local, con nueve auditorías separadas `curriculum_revision_local_codex`.
- Cinco clases nuevas o ampliadas quedaron escritas con 54 momentos; la vista temporal no las ofrece todavía porque sus diez ilustraciones están pendientes.
- Se solicitó solo `datos-huerto-gemini-v1` mediante Antigravity CLI; el certificado vencido bloqueó la conexión antes de la generación. No se pidió la segunda imagen.
- Con el flujo anterior de `agy`, se generó un único JPEG para `datos-huerto-gemini-v1`, se inspeccionó y se convirtió a WebP de 1200 × 896. No se solicitó la imagen siguiente.
- Se completaron las diez solicitudes secuenciales del lote 02. Cada recurso se inspeccionó antes de iniciar el siguiente y se integró como WebP de 1200 × 896.
- En la solicitud de la planta de tomate, el subagente de Antigravity autocorrigió internamente un borrador y produjo un segundo JPEG `clean`; no se lanzó una segunda conversación y solo se integró el resultado limpio.
- La vista temporal quedó regenerada con las cinco claves y abre por defecto `com.p1.datos-del-texto` para facilitar la revisión del lote 02.
- El selector de la vista temporal se filtró a las cinco claves del lote 02.
- Las cinco huellas se renovaron individualmente con cinco auditorías `curriculum_revision_local_codex`; después se verificaron plan publicado, estado, huella, filtro, fuente efectiva y alumnos elegibles.
- `docs/nudito/PROMPT-ORQUESTADOR-PRIMARIA.md` se convirtió en un prompt autónomo para Claude con preferencia por Codex, fallback a Sonnet y flujo secuencial de imágenes con Gemini/Antigravity.

## Validación

- Las diez claves del lote contienen entre dos y tres recursos visuales distintos y entre cinco y ocho momentos con recurso.
- ESLint de la ruta temporal, `pnpm typecheck` y `git diff --check`: aprobados.
- La clave está en la versión publicada 1 de Comunicación de 1.º, mantiene estado `revisado`, tiene huella vigente, usa la ficha del banco como fuente efectiva y existe un alumno local elegible en el curso.
- Pruebas dirigidas de clase guiada y sesiones: 2 archivos y 26 pruebas aprobadas; JSON de estado y `git diff --check`: aprobados.
- Para las nueve claves adicionales se verificaron versión publicada 1, estado `revisado`, huella vigente, filtro editorial positivo, ficha del banco como fuente efectiva, auditoría y diez alumnos locales elegibles por área.
- Banco, pruebas unitarias dirigidas y TypeScript aprobaron para el lote 02. Antigravity falló antes de generar por certificado vencido y autenticación no sincronizada; no se gastó ImageGen como sustituto.
- Tras integrar los recursos, `pnpm nudito:validar-banco`, la suite completa de 175 archivos y 1 336 pruebas, `pnpm typecheck`, JSON y `git diff --check` aprobaron.
- La vista temporal contiene las cinco claves, pero la inspección automatizada de escritorio/móvil quedó bloqueada por el permiso guardado del navegador para `lvh.me`; no se intentó eludirlo.

## Pendientes y preguntas abiertas

- El navegador mantiene un permiso guardado que impide a Codex inspeccionar la pestaña local; Carlos puede refrescar la vista y comprobar el cambio directamente.
- El lote de diez claves queda aprobado e integrado localmente; continúa pendiente el resto de primaria.
- Continuar el siguiente lote prioritario de primaria siguiendo el prompt autónomo; no publicar ni desplegar en producción.
