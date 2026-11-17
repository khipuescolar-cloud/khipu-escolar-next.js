# Informe editorial lote 09 (Comunicación 4.º, 6 claves)

Autor: Claude Sonnet (autor de contenido). Estado: escrito y validado técnicamente; pendiente de revisión independiente. No se declara aprobado.

## Claves

| Clave | Archivo | Momentos | Recursos (SVG) | Respuesta comprobación |
|---|---|---|---|---|
| com.p4.conectores-basicos | coherencia-y-cohesion.json | 11 | 3 | c |
| com.p4.escribo-una-descripcion | escritura-de-textos.json | 11 | 3 | a |
| com.p4.informacion-relevante | ubicar-informacion.json | 10 | 3 | b |
| com.p4.noticia | textos-informativos-e-instructivos.json | 10 | 3 | c |
| com.p4.significado-por-contexto | inferencias.json | 11 | 3 | a |
| com.p4.texto-instructivo | textos-informativos-e-instructivos.json | 11 | 3 | b |

Solo se escribió el campo `claseGuiada` de cada clave. Ejercicios, ids, respuestas y dificultad no cambian (el diff solo añade el campo y una coma tras `revisado`).

## Decisiones

- Idea inicial sin recurso; situación visual en el segundo momento; ejemplo 1 guiado y ejemplo 2 razonado, con textos nuevos (no repiten los de la ficha); error frecuente; 3 o 4 pasos; comprobación nueva con una sola respuesta.
- Comunicación: cada texto a leer se cita completo en la narración y/o aparece escrito en el SVG; el SVG enseña la estructura (partes de noticia y de texto instructivo, ejemplo/contraejemplo de conectores, descripción vaga contra descripción con detalles, relevante contra detalle, prueba de reemplazo).
- El esquema solo admite tipos `idea|recurso|ejemplo|paso`: los momentos de error frecuente usan `ejemplo` con título «Error frecuente: …».
- Se evitó que la imagen revele la respuesta antes de razonarla (p. ej. el SVG del perro famélico no incluye el significado; el de la noticia se muestra tras leer el texto).
- Letra correcta de la comprobación variada: c, a, b, c, a, b. Alt de cada recurso ≤ 200 caracteres (límite del esquema); alt y descripción se escribieron tras ver el render.
- Contextos: Tarma, Arequipa, Cusco, Huancavelica, Huancayo; sin datos personales.

## Recursos SVG (public/nudito/diagramas/comunicacion/)

- conectores: `conectores-tres-relaciones.svg`, `conectores-uniones.svg`, `conectores-porque-al-reves.svg`
- descripción: `descripcion-comparar.svg`, `descripcion-picaflor.svg`, `descripcion-orden-escuela.svg`
- información relevante: `relevante-o-detalle.svg`, `relevante-cartel-resaltado.svg`, `relevante-cuatro-preguntas.svg`
- noticia: `noticia-partes.svg`, `noticia-marcada.svg`, `noticia-o-cuento.svg`
- significado por contexto: `contexto-mapa-pistas.svg`, `contexto-pistas-famelico.svg`, `contexto-prueba-reemplazo.svg`
- texto instructivo: `instructivo-partes.svg`, `instructivo-barquito-orden.svg`, `instructivo-pasos-desordenados.svg`

Todos 640×480, texto de 26 px o más, paleta de `specs/18-sistema-de-diseno.md`, generados como código. Renderizados con Chrome headless a 360 px de ancho y corregidos (flecha faltante, leyenda, márgenes).

## Comandos ejecutados

- `pnpm nudito:validar-banco`: Banco válido, 2238 fichas, 27034 ejercicios.
- `pnpm typecheck`: sin errores. `git diff --check`: limpio.
- Script propio: ids de momento únicos, idea sin recursoRef, todo recursoRef existe y todo recurso se usa, los 18 SVG existen, sin «Atención:», «¿Es verdad que…?» ni «como puedes ver».

## Riesgos y pendientes

- Sin prueba en navegador con la UI de Nudito ni con audio real (pronunciación de «famélico», «molle», «Sacsayhuamán», «Chili»).
- Texto de los SVG a 360 px ronda 13 a 14 px; revisar legibilidad en móvil real.
- Los textos de comprobación están en `pregunta`; conviene confirmar que se muestran completos en pantalla.
- `inferencias.json` contiene además cambios de otro agente en una ficha distinta; no se tocaron.
- Sin ilustraciones generadas (cuota); se añadirían por id.
- Falta revisión independiente, estado en `estado-refuerzo-primaria.json`, specs y bitácora (fuera de alcance de este encargo).

## Ronda 2 (tras revisión independiente)

- descripcion: reformulado «Cada detalle ocupa su fila del cuadro»; opciones de comprobación igualadas en longitud (57/53/54).
- relevante y noticia: opciones igualadas (51/56/57 y 65/63/62); en noticia el titular de la lectura incluye «en Huancavelica».
- texto-instructivo: la siembra ahora tiene 5 pasos (1. Pon el algodón en el vaso); narración, alt, descripción y `instructivo-partes.svg` actualizados y re-renderizados a 360 px.
- significado-por-contexto: ejemplo-2-lee pregunta «¿Qué crees que significa «tacaño»?».
- Revalidado: validar-banco, typecheck, git diff --check.
