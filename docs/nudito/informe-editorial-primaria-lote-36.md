# Informe editorial · Primaria, Comunicación 1.º y 2.º, lote 36

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. No se tocaron estado, huellas, BD, specs ni componentes. Solo cambió el campo `claseGuiada` de cada clave (ejercicios, ids, respuestas y dificultad intactos).

## Alcance

Archivos bajo `src/lib/nudito/conocimiento/banco/comunicacion/`. Todas con 10 momentos (el primero sin recurso): idea, situación, ejemplo 1 (guiado y razona), ejemplo 2 (guiado y razona), contraejemplo, tres pasos, comprobación nueva.

| Clave | Archivo | Recursos (id → archivo) | Comprobación |
|---|---|---|---|
| `com.p1.a-quien-le-hablo` | `primaria-1/fichas/conversacion-y-cortesia.json` | `profesora` (img `hablo-profesora`), `frases` (svg), `companero` (img `hablo-companero`), `invitacion` (svg) | c |
| `com.p1.adivinanzas` | `primaria-1/fichas/escucha-y-comprension-de-relatos.json` | `circulo` (img), `pistas-platano` (svg), `platano` (img), `pistas-libro` (svg), `una-pista` (svg) | a |
| `com.p1.agregar-detalles` | `primaria-1/fichas/palabras-y-oraciones.json` | `huerto` (img), `gata-pregunta` (svg), `gata-silla` (svg), `bus` (img), `bus-manana` (svg) | b |
| `com.p2.adivinanzas-y-expresiones` | `primaria-2/fichas/comprension-de-textos-orales.json` | `abuelo` (img), `libro-pregunta` (svg), `libro-solucion` (svg), `agua-pregunta` (svg), `rosa` (img) | c |
| `com.p2.adjetivos` | `primaria-2/fichas/gramatica-y-vocabulario.json` | `cuarto` (img), `casa-pregunta` (svg), `casa-grande` (svg), `ositos` (img), `ositos-suaves` (svg) | a |
| `com.p2.ampliar-la-informacion` | `primaria-2/fichas/textualizar.json` | `abuela` (img), `abuela-pregunta` (svg), `abuela-ampliada` (svg), `parque` (img), `parque-ampliada` (svg) | b |

Imágenes en `public/nudito/ilustraciones/comunicacion/primaria-{1,2}/` (`<tema>-<id>-gemini-v1.webp`, 1200×896); SVG en `public/nudito/diagramas/comunicacion/` (prefijos `a-quien-le-hablo-`, `adivinanza-`, `agregar-detalles-`, `adivinanza-expresiones-`, `adjetivos-`, `ampliar-`).

## Generador y prompts

Todas las ilustraciones (11) las produjo **Gemini vía `agy`** (`gemini-4-argon-low`, una conversación por imagen, JPEG convertido a WebP con ffmpeg). Sin Z-Image. Sufijo común de cada prompt: «ilustración escolar cálida estilo cuento infantil acuarela, relación 4:3, sin texto ni letras ni carteles con palabras, niños peruanos de seis a siete años, colores suaves». Contenido: `hablo-profesora` (niña y profesora en banca del patio), `hablo-companero` (niño con pelota invita a una niña en el recreo; 2.ª versión, la 1.ª se descartó por estilo menos consistente), `adivinanza-circulo` (cinco niños en círculo con canasta tapada), `adivinanza-platano` (niña pela un plátano en la cocina), `detalles-huerto`, `detalles-bus`, `adivinanzas-abuelo` (abuelo cuenta adivinanzas de noche), `adivinanzas-rosa` (vendedora de mercado con las manos llenas), `adjetivos-cuarto`, `adjetivos-ositos`, `ampliar-abuela` (abuela cocina mazamorra), `ampliar-parque` (primos con cometa). Todas inspeccionadas con Read: sin texto incrustado ni anatomía defectuosa. Una sola generación por imagen salvo `hablo-companero`.

15 SVG nuevos (640×480, texto ≥26 px, paleta crema/índigo/turquesa/maíz, ámbar de texto `#8A5A00`, sin `<tspan>`, con `<title>`), rasterizados con Chrome headless y vistos. En Comunicación el texto que se lee está visible en el recurso (adivinanzas, oraciones, frases).

## Decisiones

- Texto leído visible: pistas de las adivinanzas, oraciones a ampliar y frases a elegir van en SVG; las imágenes son escenas de contexto. Los momentos «guiado» con SVG no muestran la respuesta; los «razona» la muestran.
- Sin recurso en `ejemplo-2-razona` (p1 adivinanzas), `ejemplo-1-razona` (a-quien-le-hablo) y `contraejemplo` de todas las claves salvo adivinanzas p1 (`una-pista`); esos momentos no dicen «dibujo/imagen/pantalla».
- a-quien-le-hablo: destinatario y propósito; contraejemplos «Oye, dame eso» y «eso de ayer». Comprobación: abuela, «¿qué hay de comer?» (c).
- adivinanzas p1: unir todas las pistas; contraejemplo con una sola pista (sol, plátano, limón). Comprobación: pez (a).
- agregar-detalles: cómo/dónde/cuándo; ejemplos de la ficha (gata, bus). Comprobación: «El perro ladra en el jardín» (b).
- adivinanzas y expresiones p2: libro (hojas, lomo, historias) y «agua al cuello»; contraejemplo «Ana está en las nubes». Comprobación: «Me muero de risa» (c), distinta de las expresiones ya usadas en los ejercicios.
- adjetivos: ejemplo 1 «la casa grande», ejemplo 2 concordancia plural «los ositos suaves»; contraejemplo «niñas contentos» y uso de «bonito». Comprobación «las flores rojas» (a).
- ampliar: ejemplo 1 abuela (qué y dónde), ejemplo 2 parque (cuándo y con quién); contraejemplo: oración de otro tema y repetición. Comprobación «Mi hermano juega con su perro» (b).
- Letras correctas: c, a, b, c, a, b. Opciones de longitud pareja (diferencia ≤3; la correcta nunca es la única más larga; en adjetivos las tres miden 16).

## Verificaciones

- Script: ids únicos, `recursoRef` ↔ recursos exactos, primer momento sin recurso, alt ≤200, descripcion ≤500, archivos existen, sin dígitos en narración (solo en los títulos «Ejemplo N»/«Paso N», como en lotes previos), sin «parte N de M», sin título repetido en la narración, sin «dibujo/imagen/pantalla» en momentos sin recurso.
- Comprobaciones nuevas no repiten enunciados de los ejercicios de su ficha.
- `pnpm nudito:validar-banco`: banco válido (2238 fichas, 27034 ejercicios). `pnpm typecheck`: sin errores. `git diff --check` sobre los 6 JSON: limpio. Los JSON se reescribieron con el mismo formato (indent 2); el diff solo añade `claseGuiada` (los dos archivos con más líneas contienen además cambios de otras claves hechos por otros lotes).

## Errores / dudas en ejercicios existentes (no editados)

- `com.p2.adivinanzas-y-expresiones` e08: la adivinanza «Tiene corona y no es rey, tiene sol y no da calor» no es una adivinanza conocida; la pista 2 dice que el sol «da luz» y la retroalimentación afirma que apunta a un girasol, pero «tiene corona» también encaja con girasol y la respuesta «falso» depende de una interpretación no evidente. Conviene revisarla o reemplazarla.
- El resto de los 73 ejercicios, revisados en lista (enunciado y respuesta), parece correcto y apropiado al grado; no se recalcularon pistas ni retroalimentaciones una por una.

## Riesgos y pendientes

- Sin revisión independiente ni recorrido en navegador (audio, móvil, movimiento reducido).
- En adjetivos, las imágenes `cuarto` y `ositos` y sus descripciones nombran colores y rasgos («roja», «esponjoso») que son el contexto de la actividad; los SVG guiados no dan la respuesta.
- `ampliar-abuela` muestra mazamorra morada y `ampliar-parque` muestra a los primos: la imagen del ejemplo 2 deja ver «con quién» (el dato lo da el SVG posterior).
- `detalles-bus`: el autobús tiene una cara sonriente en el frente (estilo cuento).
- `doña Rosa` aparece sonriente; la narración habla de manos llenas y muchos niños, no de su gesto.
- Los títulos visibles llevan cifras («Ejemplo 1», «Paso 1»), como en los lotes anteriores.
- No se actualizaron `estado-refuerzo-primaria.json`, specs ni bitácora (fuera del encargo).

## Correcciones tras la revisión independiente (`revision-lote-36.md`)

`com.p1.adivinanzas`: aprobada, sin cambios. Solo `claseGuiada`, descripciones/alt, un SVG y los dos ejercicios autorizados; ninguna imagen se regeneró.

- `com.p1.a-quien-le-hablo`: `ejemplo-1-razona` cita las frases en vez de «primera/segunda».
- `com.p1.agregar-detalles`: `bus` sin «amanecer» ni «cuatro niños» (alt y descripción alineados con la imagen).
- `com.p2.adivinanzas-y-expresiones`: guiado y SVG `agua-pregunta` dicen solo «hoy hay muchos clientes» (el significado sale en «razona»); la narración de `rosa` reconoce que doña Rosa sonríe pero tiene las manos llenas y muchos pedidos (imagen sin cambios). Ejercicios existentes corregidos por autorización del coordinador (id, tipo, respuesta y dificultad intactos): e08 ahora usa la adivinanza real «Tiene corona y no es rey, tiene escamas y no es pez» con «la respuesta puede ser un girasol» (sigue `false`; nuevas pistas y retroalimentación «la respuesta es la piña»); e10: «Escribe una palabra.» en lugar de «dos palabras».
- `com.p2.adjetivos`: la idea usa «niña alegre» y «perro pequeño»; `ejemplo-1-guiado` dice «Piensa en una casa»; `ejemplo-2-guiado` sin la regla de concordancia; quitados «esponjoso» (`ositos`) y «grande» (alt y descripción de `cuarto`).
- `com.p2.ampliar-la-informacion`: `ejemplo-2-guiado` dice «dos niños»; situación de la abuela con «frutas y especias»; descripción de `abuela` sin «líquido morado» ni «maíz morado» (queda «mazorcas»).
