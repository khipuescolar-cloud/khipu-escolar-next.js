# Informe editorial · Primaria Comunicación 5.º, lote 10

Fecha: 2026-11-16. Autor: agente Sonnet. Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. No se aprueba ni se renueva ninguna huella.

## Alcance

| Clave | Archivo | Momentos | Recursos (SVG nuevos) | Letra correcta |
|---|---|---:|---|:-:|
| `com.p5.escribo-una-carta` | `escritura-de-textos.json` | 11 | `carta-partes`, `carta-mateo-pregunta`, `carta-tono-comparar` | c |
| `com.p5.hecho-y-opinion` | `reflexion-sobre-lo-leido.json` | 11 | `hecho-opinion-dos-pruebas`, `hecho-opinion-pregunta`, `hecho-opinion-separar` | a |
| `com.p5.inferencias` | `inferencias.json` | 11 | `inferencias-pistas-saber`, `inferencias-pregunta`, `inferencias-expresion` | b |
| `com.p5.informacion-complementaria` | `ubicar-e-integrar-informacion.json` | 11 | `complementaria-dos-fuentes`, `complementaria-pregunta`, `complementaria-horario` | c |
| `com.p5.punto-aparte-y-parrafos` | `ortografia-y-puntuacion.json` | 11 | `parrafos-bloque-vs-parrafos`, `parrafos-pregunta`, `parrafos-separado` | a |
| `com.p5.tildes-agudas-graves-esdrujulas` | `ortografia-y-puntuacion.json` | 11 | `tildes-posicion-tonica`, `tildes-pregunta`, `tildes-regla-terminacion` | b |

Archivos en `src/lib/nudito/conocimiento/banco/comunicacion/primaria-5/fichas/`. Solo cambió el campo `claseGuiada` de cada clave (comprobado contra HEAD: ejercicios, ids, respuestas y dificultad intactos). Estructura común: idea sin imagen; situación con recurso; ejemplo 1 guiado (3 momentos, con SVG «pregunta»); ejemplo 2 razonado (2-3 momentos, la versión con solución solo en el momento «razona»); error frecuente (tipo `ejemplo`, titulado «Error frecuente: …»); 3 pasos; comprobación nueva con una sola respuesta.

## Decisiones

- **Carta:** cinco partes en orden; el tono (saludo/despedida) depende del destinatario. Ej. 1 Mateo a su tía Rosa (SVG con «Saludo: ?» y «Despedida: ?»); ej. 2 curso a la bibliotecaria de Huaraz (comparación solo en «razona»). Comprobación: error del punto y coma tras el saludo.
- **Hecho y opinión:** ej. 1 reseña con dos oraciones (SVG con «¿Hecho u opinión?» sin respuesta); ej. 2 oración mixta opinión + hecho de apoyo. Error: creer que un número vuelve hecho toda la oración.
- **Inferencias:** ej. 1 causa (balde, charcos) con una consecuencia prevista; ej. 2 expresión «se me hace agua la boca» (no «estar en las nubes», ambigua). Error: elegir la explicación más espectacular. Comprobación: deducir el estado de Camila.
- **Información complementaria:** ej. 1 párrafo (S/ 5) + tabla (12 jugadores) = S/ 60; ej. 2 condiciones del párrafo + horario de talleres (Cerámica). Error: responder con un solo dato. Comprobación: diferencia de dinero (S/ 15) con distractores = total de cada uno.
- **Punto aparte y párrafos:** ej. 1 dos ideas (huerto/biblioteca) con seis oraciones numeradas; ej. 2 cambio de momento marcado por «Al día siguiente». Error: cortar una idea por la mitad. Comprobación con el punto aparte entre la tía Julia y el primo Beto.
- **Tildes:** verificadas a mano: balcón (aguda en n), difícil (grave en l), examen (grave en n, sin tilde), murciélago y pájaro (esdrújulas), pared y reloj (agudas en d/j, sin tilde), mesa (grave en vocal). El SVG de situación no muestra tildes ni la regla de terminación; la regla aparece en el SVG `tildes-regla-terminacion` desde el momento «razona» del ejemplo 2.
- Los textos de lectura están visibles en SVG y citados en la narración. Letras de la comprobación: c, a, b, c, a, b; sin pistas por longitud.

## Rutas SVG (`public/nudito/diagramas/comunicacion/`, viewBox 640×480, texto ≥ 26 px)

`carta-partes`, `carta-mateo-pregunta`, `carta-tono-comparar`, `hecho-opinion-dos-pruebas`, `hecho-opinion-pregunta`, `hecho-opinion-separar`, `inferencias-pistas-saber`, `inferencias-pregunta`, `inferencias-expresion`, `complementaria-dos-fuentes`, `complementaria-pregunta`, `complementaria-horario`, `parrafos-bloque-vs-parrafos`, `parrafos-pregunta`, `parrafos-separado`, `tildes-posicion-tonica`, `tildes-pregunta`, `tildes-regla-terminacion` (todos `.svg`, 18 en total). Renderizados con Chrome headless a 360 px: sin solapes ni cortes. Alt (≤ 200) y descripción escritos tras ver el render.

## Comandos y resultados

- `pnpm nudito:validar-banco`: «Banco válido: 2238 fichas activas; 27034 ejercicios.»
- `pnpm typecheck`: sin errores.
- `git diff --check` sobre banco de primaria-5 y `public/nudito`: limpio.
- Script propio: ids de momento únicos; momento `idea` sin `recursoRef`; todo `recursoRef` existe y todo recurso se usa; alt ≤ 200 y descripción ≤ 500; sin «Atención:» ni «¿Es verdad que».

## Riesgos

- No se escuchó audio ni se recorrió la app (móvil, escritorio, movimiento reducido). La descripción del recurso se lee junto con la narración: en los SVG «pregunta» solo describe la incógnita, no la respuesta.
- El ejemplo 2 de tildes y los textos usan palabras sin tilde a propósito («balcon», «dificil», «murcielago», «mesa» con tilde como error); el TTS las leerá igual, conviene revisión oral.
- Sin ilustraciones Gemini: recursos solo SVG como código. No se tocaron estado, huellas, BD, specs ni componentes.

## Correcciones tras la revisión independiente (2026-11-16)

Solo `claseGuiada`/SVG de 3 claves; las otras 3 (carta, complementaria, punto aparte) quedaron aprobadas y no se tocaron.

- `com.p5.hecho-y-opinion`: las pistas de opinión del recurso `pruebas` (SVG `hecho-opinion-dos-pruebas`, narración y descripción) ya no incluyen «la mejor»: ahora «creo que», «me parece», «horrible», «aburrido», «el más lindo». SVG re-renderizado a 360 px.
- `com.p5.inferencias`: opciones de la comprobación igualadas (56, 61 y 59 caracteres; respuesta b intacta).
- `com.p5.tildes-agudas-graves-esdrujulas`: `ejemplo-1-lee` ya no dice «Pronúnciala despacio: bal-CON».
- Revalidado: `pnpm nudito:validar-banco` (2238 fichas, 27034 ejercicios), `pnpm typecheck`, `git diff --check` sin errores.
