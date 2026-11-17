# Informe editorial · Primaria Comunicación 6.º, lote 11

Fecha: 2026-11-16. Autor: agente Sonnet. Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. No se aprueba ni se renueva ninguna huella. Solo cambió el campo `claseGuiada` de cada ficha (ids, ejercicios, respuestas y dificultad intactos; el diff solo agrega líneas y la coma tras `"revisado": null`).

## Alcance

| Clave | Archivo (`.../primaria-6/fichas/`) | Momentos | Recursos | Comprobación |
|---|---|---:|---|---|
| `com.p6.afiche-y-publicidad` | `reflexion-sobre-lo-leido.json` | 10 | 3 SVG | c |
| `com.p6.conectores-de-causa-y-contraste` | `coherencia-y-cohesion.json` | 10 | 3 SVG | a |
| `com.p6.escribo-una-noticia` | `escritura-de-textos.json` | 10 | 3 SVG | b |
| `com.p6.figuras-literarias` | `textos-literarios.json` | 10 | 3 SVG | c |
| `com.p6.inferencias-complejas` | `inferencias.json` | 10 | 3 SVG | a |
| `com.p6.resumen` | `sentido-global.json` | 10 | 3 SVG | b |

Estructura común: idea sin imagen; situación visual; ejemplo 1 (lee + razona); ejemplo 2 (lee + razona); error frecuente (tipo `ejemplo`); tres pasos; comprobación nueva.

## Decisiones

- Recursos «pregunta» (incógnita oculta) en situación y «lee»; la versión con solución solo en el momento «razona» y en el paso posterior. Ejemplos 2 sin recurso de solución (se razona en la narración).
- Texto a leer visible en el SVG y citado en la narración; la respuesta no siempre en la primera oración (noticia: la opción correcta es un hecho con datos; borrador: la oración que sobra es la 2).
- Afiche: análisis crítico (exageración no comprobable vs. dato verificable); ejemplo 2 contrasta con el anuncio de agua.
- Conectores: causa, consecuencia y contraste (porque / ya que, por eso / por lo tanto, pero / sin embargo); ejemplo 2 con dos espacios que piden relaciones distintas; puntuación de «sin embargo».
- Noticia: pirámide invertida, separación hecho/opinión, detalle que va al cuerpo.
- Figuras: solo comparación y personificación (alcance de la ficha); error «como» no siempre es comparación («tan alto como yo», «yo como pan»); se aclara que «poncho de neblina» es imagen pero lo definitorio es la acción humana del cerro.
- Inferencias: conclusión sostenida por ≥2 pistas, descartar lo sin pista («Camila copió», «el chofer estaba enojado»).
- Resumen: quitar, agrupar, unir; ejemplo 2 compara un resumen copiado con uno reformulado; error: opinión en el resumen.
- Letras correctas de la comprobación: c, a, b, c, a, b; longitudes de opciones similares.

## Recursos (SVG como código, viewBox 640×480, texto ≥26 px, renderizados con Chrome headless)

Ruta base: `public/nudito/diagramas/comunicacion/`

- afiche: `afiche-vacuna-partes.svg`, `anuncio-agua-pregunta.svg`, `anuncio-agua-analisis.svg`
- conectores: `conectores-ideas-pregunta.svg`, `conectores-ideas-resuelto.svg`, `conectores-texto-pregunta.svg`
- noticia: `noticia-apuntes.svg`, `noticia-resuelta.svg`, `noticia-borrador.svg`
- figuras: `figuras-poema-sierra.svg`, `figuras-analisis-comparacion.svg`, `figuras-analisis-personificacion.svg`
- inferencias: `inferencia-texto-bus.svg`, `inferencia-pistas-bus.svg`, `inferencia-texto-camila.svg`
- resumen: `resumen-texto-papa.svg`, `resumen-papa-resuelto.svg`, `resumen-camelidos-pregunta.svg`

Alt (≤200) y descripción escritos tras ver el render final. Sin imágenes generadas ni agy.

## Comandos y resultados

- `pnpm nudito:validar-banco`: «Banco válido: 2238 fichas activas; 27034 ejercicios.»
- `pnpm typecheck`: sin errores. `git diff --check`: sin hallazgos.
- Script propio: ids de momentos únicos; momento `idea` sin `recursoRef`; todos los `recursoRef` existen y todos los recursos se usan; archivos SVG existen; sin «Atención:», «¿Es verdad», «como puedes ver», «Recuerda», «el dibujo».

## Riesgos

- Audio/TTS, recorrido en la app (móvil, tema oscuro, movimiento reducido) y lector de pantalla no comprobados.
- Las descripciones se anexan a la narración en el audio: hay cierta repetición del texto leído (se mantiene por exigir texto visible y citado).
- `sentido-global.json` contiene también la clase de `com.p6.proposito-y-punto-de-vista` (otro lote); no se tocó.
- Ficha de `figuras-literarias`: los ejemplos del campo `ejemplos` no se revisaron en este lote.
- Datos ficticios plausibles (feria de Tacna, biblioteca de Abancay, plantones en Moquegua); revisar que no se lean como noticias reales.

## Correcciones tras la revisión independiente (2026-11-16)

Solo `claseGuiada` y SVG de `com.p6.escribo-una-noticia` y `com.p6.resumen`; las otras cuatro claves no se tocaron.

- noticia: los casos (feria de Tacna, biblioteca de Abancay, Moquegua) se declaran imaginarios en título, narración, alt/descripción y en los SVG (`noticia-apuntes`: «Apuntes: feria imaginaria»; `noticia-resuelta`: «Titular (noticia imaginaria)»; `noticia-borrador`: «Borrador de noticia imaginaria»); la pregunta de comprobación dice que las opciones son entradas de una noticia imaginaria.
- resumen: opción b y `mensajeCorrecto` ahora dicen «los mangles también protegen la costa»; longitudes de opciones 97/93/94.
- SVG renderizados a 360 px sin desbordes. Validación repetida: banco, typecheck y `git diff --check` sin errores.
