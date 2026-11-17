# Informe editorial · Lote 21 (Ciencia y Tecnología, 2.º de primaria)

Fecha: 2026-11-16. Estado: **escrito y validado técnicamente; pendiente de revisión independiente**. No se aprobó, ni se tocaron huellas, BD, estado-refuerzo-primaria.json, specs ni componentes. Solo se reemplazó el campo `claseGuiada` de cada clave (ejercicios, ids, respuestas y dificultad intactos).

## Claves, momentos y recursos

Archivos en `src/lib/nudito/conocimiento/banco/ciencia-tecnologia/primaria-2/fichas/`; imágenes en `public/nudito/ilustraciones/ciencia-tecnologia/primaria-2/` (todas Z-Image Turbo local, 1200×896, `*-zimage-v1.webp`, inspeccionadas con Read).

| Clave | Archivo | Momentos | Recursos (semilla) | Respuesta |
|---|---|---|---|---|
| cyt.p2.cadena-alimenticia | cadenas-alimenticias.json | 10 | cuy-pasto-chacra (2101), cuy-gavilan-chacra (2102), rio-garza-pez (2103) | c |
| cyt.p2.agua-dulce-y-salada | agua-aire-y-tierra-en-nuestro-planeta.json | 10 | laguna-lluvia (2111), rio-sierra-agua-clara (2112), pescador-mar-bote (2113) | b |
| cyt.p2.animales-diurnos-y-nocturnos | el-dia-la-noche-y-los-seres-vivos.json | 10 | campo-anochecer (2131), gallinas-patio-dia (2132), murcielago-cueva-noche (2134) | a |
| cyt.p2.cerros-montanas-valles | agua-aire-y-tierra-en-nuestro-planeta.json | 10 | cerros-pastizal (2121), valle-rio-cerros (2122), montana-nevada (2123) | c |

Estructura: idea sin imagen, situación visual, ejemplo 1 (observa + razona), ejemplo 2 (observa + razona), error frecuente o contraejemplo, tres pasos, comprobación nueva.

## Prompts (en inglés; el script añade estilo escolar sin texto)

- cuy-pasto-chacra: brown and white guinea pig eating fresh green grass in a small Andean farm field in Peru, mountains behind, sunny.
- cuy-gavilan-chacra: guinea pig on green grass in the foreground, hawk perched on a wooden fence post above looking down, mountains, no people.
- rio-garza-pez: white heron standing in shallow clear river water, green water plants, one small silver fish near the plants.
- laguna-lluvia: high Andean lake, totora reeds, rain from a gray cloud, snowy mountains, no people.
- rio-sierra-agua-clara: clear Andean river over round stones between green hills, sunny, no people.
- pescador-mar-bote: small wooden fishing boat with one fisherman alone on open Pacific sea, water to the horizon.
- cerros-pastizal: several rounded grassy hills of different heights, dirt path, few llamas far away, no snow, no river.
- valle-rio-cerros: wide green Andean valley from above, river winding along the low bottom with fields and small houses, tall hills on both sides.
- montana-nevada: one very tall snow-capped mountain above lower green hills, clear sky, no people.
- campo-anochecer: Peruvian countryside at dusk, low sun, crescent moon, first stars, adobe house with one lit window, no animals.
- gallinas-patio-dia: three hens pecking grains in a sunny farmyard, wooden coop with open door behind.
- murcielago-cueva-noche: single brown bat flying at night before a jungle-covered cave entrance, full moon and stars.

Reintento: murcielago-cueva-noche semilla 2133 salió con franjas blancas laterales (descartada); se usó 2134. Las demás, a la primera.

## Observaciones de imagen (reflejadas en alt y descripción)

Aparecen niños no pedidos en laguna-lluvia (dos, de espaldas), rio-sierra (dos en la orilla), cerros-pastizal (dos cerca y dos lejos) y cuy-pasto (dos muy lejos); descritos. El «pescador» salió como una persona con aspecto de niño; se describe como «una persona». Las lomas de cerros-pastizal son algo redondeadas; la narración las llama cerros. El murciélago tiene cara muy caricaturesca.

## Decisiones

- La situación nunca muestra la respuesta del ejemplo: cuy solo con pasto; laguna (no río ni mar); cerros sin valle ni nieve; anochecer sin animales.
- Rigor: cadena con plantas del agua/algas, nunca animales al inicio; flechas solo mencionadas en texto, no dibujadas; agua del mar salada y nunca beberla, agua dulce se bebe solo limpia y con adulto; aviso de no probar aguas desconocidas; murciélago orienta con eco; llanura/pampa tratada solo en texto (sin imagen) por el tope de tres.
- Comprobaciones nuevas (distintas de los ejercicios): maíz-ratón-lechuza; barco sin agua; lechuza nocturna; terreno plano. Letras c, b, a, c; opciones de longitud parecida.
- Sin «parte N de M», números en palabras, alt ≤ 200, ningún momento sin imagen alude al dibujo.

## Verificaciones

- `pnpm nudito:validar-banco`: banco válido, 2238 fichas y 27034 ejercicios. `pnpm typecheck`: sin errores.
- `git diff --check` sobre el directorio de fichas: sin salida (el diff de ese directorio incluye otras claves de otros lotes ya modificadas por otras sesiones).
- Script propio: cada recurso usado y resuelto, primer momento sin recurso, archivos existen, alt ≤ 200. El JSON se reescribió con formato idéntico (ida y vuelta exacta).

## Posibles errores en ejercicios (no editados)

- `cyt.p2.animales-diurnos-y-nocturnos` e12: el gato montés «nocturno si lo ves cazar al oscurecer» es ambiguo (más bien crepuscular); sugerir revisión.
- `cyt.p2.agua-dulce-y-salada` e05: opción b, beber agua de una poza de la orilla, es un distractor poco claro; la respuesta d es correcta.
- `cyt.p2.cadena-alimenticia` e11 y pasos del banco: coherentes con la clase.

## Riesgos

Sin revisión independiente, sin recorrido de navegador ni audio. Estilo mixto posible con imágenes Gemini de otras fichas. Las claves agua-dulce y cerros comparten archivo; se editaron en secuencia.

## Correcciones (ronda 2, tras `revision-lote-21.md`)

Imágenes regeneradas una a la vez con Z-Image y revisadas con Read (primera semilla aceptada en todas); alt y descripción reescritos tras verlas.

| Imagen | Semilla | Cambio |
|---|---|---|
| pescador-mar-bote | 2201 | Pescador adulto con sombrero de paja, de espaldas, remando con dos remos cerca de una costa rocosa con casitas (hay personas muy pequeñas en la orilla, descritas). Prompt: adult fisherman in straw hat rowing a small wooden boat near the coast of Peru, rocky shore with fishing-village houses. |
| cerros-pastizal | 2202 | Cinco cerros irregulares verdes y marrones con camino, sin llama ni personas. Prompt: irregular natural hills with ichu grass, winding dirt road, no animals, no people. |
| montana-nevada | 2203 | Nevado andino de laderas rocosas con nieve solo arriba, laguna turquesa y dos niños de espaldas. Prompt: tall jagged Andean snow-capped peak near Cusco, snow only near the summit, turquoise lake, lower hills. |
| valle-rio-cerros | 2204 | Valle con río, campos grandes y casitas junto al río, sin figuras ni artefactos. Prompt: wide Andean valley, river, big crop fields, houses next to the river, simple flat colors, no tiny figures. |

Texto:
- cadena: `rio-garza` (alt, descripción y narración) ahora dice que la garza está en la orilla de pasto con las patas junto al agua; la pregunta de `ejemplo-chacra-observa` pasó a «¿qué come cada animal?» y su narración ya no dice que el gavilán mira al cuy.
- agua: `ejemplo-rio-observa` ya no entrega la respuesta ni sugiere probar el agua (lluvia y nieve derretida); `ejemplo-rio-razona` ajustado; narración del pescador alineada con la imagen nueva; totoras «amarillas» (narración, alt, descripción); comprobación nueva (agua de lluvia en un balde limpio, respuesta b) para no repetir el caso del mar.
- cerros: solo «cerros» (sin lomas ni colinas); campos y casitas «junto al río»; `ejemplo-montana-observa` menciona la laguna y los niños; `paso-2` dice «suele correr un río»; pista de la comprobación: «Piensa si hay elevaciones o zonas bajas.».

Ejercicios editados (autorizados, sin tocar id ni dificultad):
- `cyt.p2.animales-diurnos-y-nocturnos` e12: «gato montés» pasa a «murciélago» en enunciado, opción c, pistas[2] y retroalimentación; opciones igualadas en longitud: a «La paloma en el patio», b «El cuy en su corral», c «El murciélago al volar». Respuesta sigue siendo c y es única: la paloma es diurna y el cuy en su corral no es nocturno.
- `cyt.p2.agua-dulce-y-salada` e05: opción b «Beber el agua de una poza de mar entre las rocas»; pistas[1] «Las pozas de mar entre las rocas guardan agua salada.» Respuesta d intacta.

Validación: `pnpm nudito:validar-banco` válido (2238 fichas, 27034 ejercicios); `pnpm typecheck` sin errores; `git diff --check` sin salida; recursos usados y resueltos, alt ≤ 200. No se tocaron `cyt.p2.agua-aire-tierra` ni `cyt.p2.dia-y-noche`.
