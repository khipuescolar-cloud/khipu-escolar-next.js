# Informe editorial · Ciencia y Tecnología 2.º y 3.º, lote 12

Fecha: 2026-11-16. Estado: **escrito y validado técnicamente; pendiente de revisión independiente** (no aprobado, sin huella renovada, sin cambios en `estado-refuerzo-primaria.json`).

## Alcance

| Clave | Archivo (banco) | Momentos | Recursos | Letra correcta |
|---|---|---:|---|---|
| `cyt.p2.agua-aire-tierra` | `primaria-2/fichas/agua-aire-y-tierra-en-nuestro-planeta.json` | 10 | 2 ilustraciones + 1 SVG | b |
| `cyt.p2.cambios-luz-calor` | `primaria-2/fichas/cambios-por-la-luz-y-el-calor.json` | 10 | 2 ilustraciones + 1 SVG | c |
| `cyt.p2.padres-y-crias` | `primaria-2/fichas/crecimiento-y-parecido-entre-padres-y-crias.json` | 10 | 2 ilustraciones + 1 SVG | a |
| `cyt.p2.partes-externas-funciones` | `primaria-2/fichas/partes-externas-y-sus-funciones.json` | 10 | 2 ilustraciones + 1 SVG | b |
| `cyt.p2.dia-y-noche` (borrador elevado) | `primaria-2/fichas/el-dia-la-noche-y-los-seres-vivos.json` | 10 | 2 ilustraciones + 1 SVG | c |
| `cyt.p3.habitat` (borrador elevado) | `primaria-3/fichas/el-habitat-de-los-seres-vivos.json` | 10 | 2 ilustraciones + 1 SVG | a |

Solo se reemplazó el campo `claseGuiada` de cada clave; ejercicios, ids, respuestas y dificultad quedaron intactos. Estructura común: idea inicial sin imagen, situación visual, dos ejemplos (cada uno en «observa» y «razona»), un ejemplo titulado «Error frecuente: …», tres pasos y comprobación nueva con una sola respuesta correcta. Los dos borradores previos (`dia-y-noche`, `habitat`) se reescribieron conservando su idea (Tierra que gira; alimento, agua y refugio); el SVG antiguo `dia-y-noche.svg` y `habitat.svg` ya no se enlazan desde estas fichas (quedan en disco, sin tocar).

## Recursos

Ilustraciones: Z-Image Turbo (Apache-2.0) vía ComfyUI local (`~/comfyui-khipu/gen.py`, 1200×896 WebP, estilo escolar añadido por el script). Una por vez, secuenciales, cada una inspeccionada con Read. Ruta: `public/nudito/ilustraciones/ciencia-tecnologia/primaria-{2,3}/<id>-zimage-v1.webp`. Procedencia: modelo Z-Image Turbo (Apache-2.0), generación local; sin texto incrustado.

| Id | Clave | Prompt (resumen) | Semilla |
|---|---|---|---:|
| paisaje-rio-cerro-cometa | agua-aire-tierra | Andean valley, clear river, rocky hill, child with kite | 11 |
| playa-brisa-arena | agua-aire-tierra | Peruvian beach, waves, child with pinwheel, sand | 12 |
| patio-sol-ropa-helado | cambios-luz-calor | sunny patio, girl hanging clothes, ice cream on a table (2.º intento) | 33 (1.º: 13, descartado: libro en el tendedero) |
| nino-helado-plaza | cambios-luz-calor | boy with whole ice cream cone in sunny plaza | 14 |
| llama-cria-pastizal | padres-y-crias | mother and baby llama, Andean grassland | 15 |
| perra-cachorro-marron | padres-y-crias | brown dog and puppy with white patch on chest (2.º intento) | 31 (1.º: 16, descartado: mancha casi invisible) |
| chacra-nina-perro-maiz | partes-externas | girl and dog by maize and stream with fish | 17 |
| nino-escucha-banda | partes-externas | boy listening, side view with ear, musicians far away (2.º intento) | 41 (1.º: 18, descartado: el niño tocaba una trompeta) |
| mono-selva-dia | dia-y-noche | capuchin monkey on a branch in daylight | 19 |
| buho-noche-campo | dia-y-noche | owl on fence post at night with moon | 20 |
| vicunas-pastizal-andino | habitat | vicuñas grazing near lake with rocks | 21 |
| pez-rio-claro | habitat | trout in clear river with plants and pebbles | 22 |

SVG (viewBox 640×480, texto ≥26 unidades, renderizados a 360 px y revisados): `tres-partes-tierra.svg`, `pasos-luz-calor.svg`, `comparar-cria-adulto.svg`, `partes-planta-funciones.svg`, `dia-noche-tierra-sol.svg`, `habitat-necesidades.svg` en `public/nudito/diagramas/ciencia-tecnologia/`. Se corrigió en `comparar-cria-adulto` (dos círculos iguales en «Se parece») y en `dia-noche-tierra-sol` (texto centrado en cada mitad).

Los alt y descripciones se escribieron después de ver cada imagen final; las narraciones se ajustaron a lo que se ve (p. ej. el mono camina por una rama, el niño escucha a un grupo de músicos de cuerda, la mancha blanca del cachorro está en el pecho).

## Decisiones

- Los SVG con etiquetas (tres partes, pasos, función de la planta, habitat-necesidades) solo aparecen en pasos o en el error frecuente, nunca en los ejemplos que deducen esa conclusión; las ilustraciones de ejemplos muestran la escena sin rotular.
- `cambios-luz-calor`: el helado se muestra entero («antes»); el cambio lo razona el texto. Se aclara que el agua de la ropa pasa al aire.
- `dia-y-noche`: el modelo Sol–Tierra se declara no a escala; el error frecuente («el Sol se apaga») se corrige con el dibujo.
- `habitat`: para la vicuña se evita decir que el pastizal la protege del frío; se habla de ver a lo lejos si hay peligro.
- `agua-aire-tierra`: se aclara que el aire no se ve pero se siente (viento, molinete).
- Comprobaciones nuevas, distintas de los ejercicios del banco; distractores plausibles y de longitud parecida (el de `dia-y-noche` difiere en ≤ 6 caracteres).

## Validación

- `pnpm nudito:validar-banco`: 2 238 fichas, 27 034 ejercicios válidos.
- `pnpm typecheck`: sin errores. `git diff --check` sobre el banco de CyT y los SVG: limpio.
- Script propio de aplicación: ids de momentos y recursos únicos, momento «idea» sin `recursoRef`, cada `recursoRef` existe y todos los recursos se usan, archivos de imagen presentes, alt ≤ 200 caracteres.
- Búsqueda de «Atención», «recuerda» y «como puedes ver» en narraciones: sin coincidencias tras la corrección.
- Pendiente: recorrido de navegador con audio, móvil y movimiento reducido, e inspección de la vista previa temporal.

## Riesgos y puntos para el revisor

- La cuota de GPU compartida hizo lenta la generación (≈ 2–5 min por imagen); tres imágenes se regeneraron por defectos visibles. Revisar de nuevo `patio-sol-ropa-helado` (niña de espaldas), `nino-escucha-banda` (la mano sobre la boca es un gesto algo ambiguo) y `pez-rio-claro` (trucha cerca de la superficie).
- `cyt.p2.padres-y-crias`: el cachorro es un tono más claro que la perra; el texto habla de pelo marrón en ambos, con manchas blancas solo en el cachorro.
- La trucha del hábitat es una especie introducida en ríos andinos; el texto dice solo «un pez».
- Descripción visual del helado en «patio» menciona «un helado en un vasito», tal como se ve.
- No se tocó `estado-refuerzo-primaria.json`, huellas, BD, specs ni componentes; la spec 50 y la bitácora de conversación quedan para el integrador.

## Correcciones tras la revisión independiente (2026-11-16)

- `cyt.p2.cambios-luz-calor`: sin cambios (aprobada). `pasos-luz-calor.svg` solo lo usa esa clave; no se tocó para no invalidar su huella.
- `partes-externas-funciones`: `nino-escucha-banda` rehecha (semilla 52; perfil limpio, brazos abajo, seis niños músicos con guitarras y violines al fondo); alt y descripción actualizados. `ejemplo-oir-observa` ya no lleva recurso ni pregunta con la oreja a la vista: la imagen aparece en «razona». `situacion-chacra` y `paso-1` mencionan solo lo visible (sin peces ni aletas); alt/descripción de `chacra` alineados.
- `padres-y-crias`: texto, alt y descripción hablan de pelo marrón (el del cachorro, más claro) con pecho y patitas blancos; la comprobación habla de plumón o plumas y del pico y las patas.
- `dia-y-noche`: `ejemplo-mono-observa` y `ejemplo-buho-observa` ya no dan la respuesta («¿cuándo crees que está activo?»). `dia-noche-tierra-sol.svg`: Sol y rayos desplazados, rayo izquierdo a ~34 unidades del borde.
- `agua-aire-tierra`: se retiraron «sin que se escurra» y «mantiene su forma»; queda «puedes pisarlo y tocarlo». `paso-1` lista solo lo que muestra el valle.
- `habitat`: `ejemplo-pez-observa` dice «una trucha, cerca de la superficie; abajo hay piedras y plantas».
- Revalidado: `pnpm nudito:validar-banco`, `pnpm typecheck` y `git diff --check` sin errores. Imagen descartada adicional: `nino-escucha-banda` semilla 41.
