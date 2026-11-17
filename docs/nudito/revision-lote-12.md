# Revisión lote 12 (Ciencia y Tecnología 2.º y 3.º, 6 claves)

| Clave | Veredicto |
|---|---|
| cyt.p2.agua-aire-tierra | APROBADA (menores) |
| cyt.p2.cambios-luz-calor | APROBADA |
| cyt.p2.padres-y-crias | CAMBIOS (texto o imagen del cachorro) |
| cyt.p2.partes-externas-funciones | CAMBIOS (rehacer nino-escucha-banda) |
| cyt.p2.dia-y-noche | CAMBIOS (menor: observa revela la respuesta) |
| cyt.p3.habitat | APROBADA (menor: texto del pez) |

Defectos:
- padres `ejemplo-perros-observa/razona`, alt/descripcion: dicen pelo marrón en ambos; la imagen muestra perra marrón oscuro y cachorro caramelo claro. Corregir texto: «pelo marrón, un poco más claro» (y razona: «los dos tienen pelo marrón, aunque el del cachorro es un tono más claro»). Si se quiere «mismo color», rehacer: mismo tono marrón chocolate en madre y cachorro; solo el cachorro con pecho, patitas y franja facial blancos. Descripcion cita franja facial que la narración no. Menor: comprobacion «pollito… plumas» (tiene plumón).
- partes `nino-escucha-banda`: la mano ante la boca es ambigua (silencio/bostezo/pensar), no la menciona alt ni descripcion y distrae de la oreja. REHACER (prompt: niño de ~7 años en perfil limpio de hombros arriba, pelo corto que deja la oreja visible, boca cerrada relajada, brazos abajo sin manos cerca de la cara, mira a la izquierda; al fondo plaza con casas de colores y seis niños músicos con guitarras y violines delante de atriles; sin texto). Menor: `ejemplo-oir-observa` muestra la oreja visible al preguntar qué parte usa; peces de `chacra` diminutos, aletas apenas visibles (situacion-chacra).
- dia-noche `ejemplo-mono-observa` («bajo la luz del Sol… ¿Cuándo está activo?») y `ejemplo-buho-observa` («Cuando cae la noche… ¿Cuándo está activo?»): el texto ya da la respuesta. Reformular sin el dato (p. ej. «un mono recorre las ramas… ¿cuándo crees que está activo?»); el recurso ya muestra Sol/Luna.
- habitat `ejemplo-pez-observa`: «entre plantas acuáticas y piedritas» pero la trucha está en medio del agua cerca de la superficie, con anillos y boca abierta; las plantas solo asoman abajo a la izquierda. Imagen aceptable (truchas comen en superficie); ajustar texto: «un pez, una trucha, que nada cerca de la superficie de un río de agua clara; abajo hay piedras y plantas».
- agua-aire `ejemplo-cerro-razona` y `paso-2`: «sin que se escurra» / «mantiene su forma, como la tierra, la arena»: la arena se escurre. Quitar «mantiene su forma» y dejar «puedes pisarlo y tocarlo». Menor: `paso-1` (ref valle) lista arena y viento, que el valle no muestra.
- SVG menores: `pasos-luz-calor` rayos del sol a 3 px del borde de la tarjeta; `dia-noche-tierra-sol` rayo izquierdo a 6 px del borde del lienzo.

Aceptado: patio-sol-ropa-helado (niña de espaldas) coherente con alt/descripcion, sin texto, apto.
Ilustraciones (12): sin texto, anatomía plausible, aptas; fieles salvo lo anotado.
Técnica: validar-banco OK (2238 fichas), typecheck OK. Ejercicios intactos vs HEAD en 4 claves; dia-y-noche y habitat difieren en ejercicios (y fuentes en dia-y-noche) por borradores previos, aceptado. Sin refs rotas ni recursos sin usar, idea sin imagen, 3 recursos por clave.
Sin comprobar: audio, UI real; SVG renderizados con sharp a 360 px, no navegador; informe editorial no leído.
