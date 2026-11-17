# Informe editorial · Primaria, Ciencia y Tecnología (3.º a 6.º), lote 49

Fecha: 2026-11-16. Autor: subagente Claude (Sonnet). Estado: **escrito y validado técnicamente; pendiente de revisión independiente** (el autor no aprueba su lote). Solo cambió el campo `claseGuiada` de cada clave (cada archivo se releyó justo antes de escribir; ejercicios, ids, respuestas y dificultad intactos). No se tocaron estado, huellas, BD, specs ni componentes. Los JSON de `debates-sobre-ciencia-y-sociedad` y `estructura-externa-de-la-tierra` difieren de HEAD también en otras claves (`alimentos-transgenicos`, `agua-dulce-salada`) por trabajo de otros lotes, no de este.

## Alcance

Todas con 10 momentos (el primero sin recurso) y 4 recursos enlazados por `recursoRef`: 2 ilustraciones Z-Image (situación y ejemplo 1) y 2 SVG (ejemplo 2 y paso 3; en `public/nudito/diagramas/ciencia-tecnologia/`, prefijo = tema). Ilustraciones en `public/nudito/ilustraciones/ciencia-tecnologia/primaria-N/…-zimage-v1.webp`.

| Clave | Archivo (bajo `src/lib/nudito/conocimiento/banco/ciencia-tecnologia/`) | Momentos con recurso | Recursos (id) |
|---|---|---|---|
| `cyt.p3.alimentos-procesados` | `primaria-3/fichas/tecnologia-y-sociedad.json` | situación, ej. 1 (x2), ej. 2 (x2), paso 3 | `mercado` (Z), `despensa` (Z), `octogono` (SVG), `tres-pasos` (SVG) |
| `cyt.p4.adaptaciones-estructurales` | `primaria-4/fichas/adaptaciones.json` | situación, ej. 1 (x2), ej. 2 (x2), paso 3 | `colibri` (Z), `garza` (Z), `oso` (SVG ficha), `forma-funcion` (SVG) |
| `cyt.p5.asexual-sexual` | `primaria-5/fichas/reproduccion-de-los-seres-vivos.json` | ídem | `fresa` (Z), `alpacas` (Z), `papa` (SVG), `comparar` (SVG) |
| `cyt.p6.antenas-de-telefonia` | `primaria-6/fichas/debates-sobre-ciencia-y-sociedad.json` | ídem | `antena` (Z), `tecnico` (Z), `frases` (SVG), `pasos` (SVG) |
| `cyt.p5.atmosfera-hidrosfera-litosfera` | `primaria-5/fichas/estructura-externa-de-la-tierra.json` | ídem | `costa` (Z), `misti` (Z), `lluvia` (SVG), `capas` (SVG) |
| `cyt.p6.areas-naturales-protegidas` | `primaria-6/fichas/biodiversidad-del-peru.json` | ídem | `guardaparque` (Z), `pescador` (Z), `manglar` (SVG), `categorias` (SVG) |

Letras correctas de la comprobación: c, a, b, a, c, b. Opciones con diferencia de longitud ≤ 2 salvo p6 antenas (3); la correcta nunca es la más larga (lint).

## Decisiones

- Estructura: idea → situación (pregunta, sin respuesta) → dos ejemplos (observa / razona) → contraejemplo (sin recurso; en p4 y p5 resuelve la pregunta de la situación) → tres pasos (el 3.º con SVG-resumen) → comprobación nueva.
- Los recursos de situación y de «observa» no dicen la respuesta; la explicación está en «razona». En p6 áreas, el ej. 2 no nombra «santuario» hasta «razona».
- Comprobaciones nuevas (no repiten ejercicios): yogur y reciclaje (p3), rana arborícola (p4), rosal por esqueje (p5), vecino que reclama aviso (p6 antenas), glaciar e hidrosfera (p5), reserva y recolección con reglas (p6 áreas).
- Figuras tipo alpaca: se narran como «alpacas» (la ficha dice llamas; el dibujo es de alpacas).
- El «Misti» ilustrado es un cono marrón sin nieve, genérico (Z-Image no reproduce el volcán real).

## Imágenes (Z-Image local, una a la vez, todas vistas con Read)

Rechazadas y regeneradas: quiosco de refrigerios (marca tipo «Lay's», texto falso), despensa con latas de atún (texto falso en la etiqueta; pasó a latas lisas), colibrí v1 (dos niños al fondo), antena v1 (niños y carteles con pseudo-texto), Misti v1 (parecía el Fuji, con tres niños), pescador de Paracas (v1 y v2 con niños en la orilla; v3 con dos figuras diminutas lejanas, borradas con un parche de arena en PIL). Sin usar y borradas: `alimentos-envases-reciclaje`, `alimentos-kiosco-refrigerios`, `estructurales-oso-hormiguero` (ya no hacía falta). Semillas vigentes: mercado 1, despensa 2, colibrí 2, garza 1, fresa 1, alpacas 1, antena 2, técnico 1, costa 1, Misti 2, guardaparque 1, pescador 3.

## Verificaciones

- `pnpm exec tsx scripts/nudito-lint-clase-guiada.ts` sobre las 6 claves: 0 errores, 0 avisos (solo info de ejercicios existentes).
- `pnpm nudito:validar-banco`: válido (2 238 fichas, 27 034 ejercicios). `pnpm typecheck`: sin errores. `git diff --check` sobre los 6 JSON: limpio.
- Comparación con HEAD por clave: solo cambia `claseGuiada` en las seis claves del lote.
- SVG rasterizados con Chrome headless y vistos; el tallo de la planta del SVG de papa, los octógonos y los manglares son dibujos esquemáticos.

## Errores en ejercicios existentes (no editados)

Ningún error factual que cambie una respuesta. Menores:
- `cyt.p6.areas-naturales-protegidas` e03: «Una área» debería ser «Un área»; e02 incluye «Machu Picchu» como distractor (es santuario histórico, correcto como distractor).
- `cyt.p3.alimentos-procesados` e10: el enunciado ya da las dos opciones («azúcar o fibra»); e11 es larga para 3.º.
- `cyt.p5.asexual-sexual` ejemplo de la ficha: «Una llama y un macho» (redacción rara en la ficha, no en la clase guiada); e07 trata las esporas del helecho como asexual (válido a este nivel).
- `cyt.p6.antenas-de-telefonia` e03: la retroalimentación dice «Confundirla con un dato es un error» (poco natural).
- En varias fichas la opción correcta es la más larga (e04, e08, e09, e10 en p4; e06, e08, e10 en p5; etc.), defecto ya conocido de los ejercicios existentes.

## Riesgos y pendientes

- Sin revisión independiente ni recorrido en navegador (audio, móvil, movimiento reducido).
- El SVG `antenas-de-telefonia-dos-frases` pone dos frases de debate entre comillas con letras; narración y descripción las leen en palabras.
- La ilustración del técnico no muestra torre: se narra solo el aparato de mano y la calle.
- La planta nueva de la fresa se ve como una planta con hojas pequeñas al pie; la descripción lo dice así.
- No se actualizaron `estado-refuerzo-primaria.json`, specs ni bitácora (fuera del encargo).

## Correcciones (2026-11-16, tras `revision-lote-49.md`)

Solo las 4 claves en CAMBIOS; `adaptaciones-estructurales` y `atmosfera-hidrosfera-litosfera` no se tocaron.
- `cyt.p3.alimentos-procesados`: quitado «ninguno viene en bolsa ni en lata» (narración y descripcion de `mercado`); pregunta «¿qué tienen en común?»; «casi no ha cambiado desde que se cosechó» pasa al paso 1; `ejemplo-1-observa` sin «para no salir a comprar…». Ejercicio e10 (autorizado, mínimo): enunciado sin las opciones «azúcar o fibra»; id, dificultad y respuesta intactos.
- `cyt.p5.asexual-sexual`: fresa regenerada con Z-Image (`asexual-fresa-estolon-zimage-v2.webp`, semilla 11; vista con Read: una planta grande con una fruta, tallo largo y una plantita pequeña de dos hojitas, sin texto ni personas; v1 borrada). Narración, alt y descripcion señalan la plantita nueva y preguntan «¿cuántas plantas hicieron falta…?». Papa: observa ya no dice «de una misma papa» y pregunta «¿de cuántas papas vienen…?».
- `cyt.p6.antenas-de-telefonia`: «Resumiendo los pasos»; «un comentario del tipo: me dijeron que enferma, no prueba nada»; comprobación reformulada («Quieres responderle. ¿Qué le dices?») con pista nueva y mismas opciones/respuesta. Ejercicio e03 (autorizado): retro «Una postura es la idea que defiendes; no es un dato…».
- `cyt.p6.areas-naturales-protegidas`: «arbustos» → «árboles» (narración, alt, descripcion y SVG del manglar); el área se nombra solo en `razona` y se pregunta «¿qué tipo de área es?»; pista de la comprobación sin la definición. Ejercicios (autorizados): e03 «Un área», e11 «ha» → «hectáreas».
- Pendiente opcional no aplicado: observaciones menores de las 2 aprobadas, `despensa` más pictórica, «tres crías de distintos años».
