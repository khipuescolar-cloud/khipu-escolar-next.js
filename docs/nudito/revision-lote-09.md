# Revisión lote 09 (Comunicación 4.º, 6 claves)

| Clave | Veredicto |
|---|---|
| com.p4.conectores-basicos | APROBADA |
| com.p4.significado-por-contexto | APROBADA (menor: ejemplo-2-lee guía la respuesta) |
| com.p4.texto-instructivo | CAMBIOS (menor: pasos de siembra) |
| com.p4.escribo-una-descripcion | CAMBIOS |
| com.p4.informacion-relevante | CAMBIOS (menor: comprobación) |
| com.p4.noticia | CAMBIOS (menor: comprobación) |

Defectos:
- descripcion `ejemplo-1-detalles`: «Cada oración habla de un solo detalle» es falso: la 1.ª oración del picaflor dice tamaño y color. Corregir la frase (p. ej. «Cada detalle ocupa su fila»).
- descripcion comprobación: opción correcta (a) la más larga (71 vs 40/43 caracteres): pista por longitud. Igualar longitudes.
- relevante comprobación: correcta (b) la más larga (60 vs 43/31). noticia comprobación: correcta (c) la más larga (87 vs 49/55). Igualar.
- instructivo `situacion-partes`/svg partes: la siembra no pone el algodón en el vaso (paso 1 «moja el algodón»; el vaso solo aparece en el 3). Añadir «Pon el algodón en el vaso».
- contexto `ejemplo-2-lee`: la pregunta ofrece solo «da mucho» vs «no quiere compartir» y adelanta la respuesta. Opcional: preguntar solo «¿qué crees que significa?».

Técnica: validar-banco OK (2238 fichas), typecheck OK, ejercicios intactos (solo claseGuiada). SVG a 360 px legibles (texto 26/640 ≈ 14,6 px), sin solapes. Sin refs rotas ni recursos sin usar; 3 recursos por clave; idea sin imagen.
Sin comprobar: audio, UI real, lector de pantalla.
