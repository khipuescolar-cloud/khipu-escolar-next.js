# Revisión independiente · Lote 21 (Ciencia y Tecnología 2.º)

Fecha: 2026-11-16. Solo lectura. Revisor distinto del autor.

Técnico (E): `pnpm nudito:validar-banco` OK (2238 fichas, 27034 ejercicios); `pnpm typecheck` OK. Diff contra HEAD por clave: en las 4 claves del lote solo cambió `claseGuiada` (ejercicios, ids, respuestas, fuentes intactos). Cambios ajenos al lote en los mismos archivos: `cyt.p2.agua-aire-tierra` (solo claseGuiada) y `cyt.p2.dia-y-noche` (claseGuiada, **ejercicios y fuentes**), de otro lote; no evaluados. Las 12 imágenes se abrieron con Read (convertidas a PNG en scratchpad).

Veredictos: cadena-alimenticia CAMBIOS (menor) · agua-dulce-y-salada CAMBIOS · animales-diurnos-y-nocturnos APROBADA (con corrección recomendada en e12, fuera de la clase) · cerros-montanas-valles CAMBIOS.

## cyt.p2.cadena-alimenticia (cadenas-alimenticias.json) — CAMBIOS (menor)

Ciencia correcta: planta primero, flechas solo en texto («de lo comido hacia quien lo come»), plantas del agua/algas, gavilán–cuy, garza–pez. Estructura y comprobación (c, maíz-ratón-lechuza; opciones de igual orden de longitud) bien. Imágenes cuy-pasto y cuy-gavilan: anatomía correcta, sin texto, estilo limpio.

1. Recurso `rio-garza` (alt y momento `ejemplo-rio-observa`): dicen «de pie en el agua poco profunda»; en `rio-garza-pez-zimage-v1.webp` la garza está sobre el borde de pasto de la orilla, con las patas apenas tocando el agua. Corregir texto a «junto al agua, en la orilla» (alt y narración), o regenerar con patas dentro del agua.
2. `ejemplo-chacra-observa`: la imagen `cuy-gavilan` ya muestra al gavilán mirando al cuy, o sea la relación depredador-presa; la pregunta «¿quién come a quién?» queda casi respondida por el dibujo. Aceptable porque es «observa», pero conviene que la pregunta sea «¿qué come cada animal?» para que el razonamiento no sea solo describir lo visto. Menor.
3. `ejemplo-rio-observa` narración: «plantas de agua y un pez pequeño» no dice que el pez coma las plantas hasta el momento siguiente: bien. Sin defecto; solo se anota que el pez es diminuto y poco visible (alt lo describe).

## cyt.p2.agua-dulce-y-salada (agua-aire-y-tierra-en-nuestro-planeta.json) — CAMBIOS

1. `ejemplo-rio-observa`: «Imaginemos que su agua no sabe a sal» entrega la respuesta (dulce) en el propio enunciado y además sugiere probar el agua, contradiciendo el aviso de no probar aguas desconocidas del momento siguiente. Cambiar a «Imaginemos que su agua es de lluvia y de nieve derretida de los cerros. Nos preguntamos: ¿es dulce o salada?» o quitar la frase y dejar que el razonamiento use «los ríos son dulces».
2. `pescador-mar` (pescador-mar-bote-zimage-v1.webp): la figura es un niño de pelo rizado solo en un bote en alta mar, sentado con el remo apoyado (no rema). Contradice «pescador de Paita», «una persona rema» y da mensaje de riesgo (menor solo en el mar). Regenerar con un adulto con gorra o sombrero, remando, o cambiar el texto a «un bote» sin persona y quitar «Imaginemos que tiene sed»; alt: quitar «rema» si no rema.
3. `laguna-lluvia`: totoras «secas» y doradas; la totora viva es verde. Cambiar a «totoras amarillas» o «totoras» sin adjetivo (precisión; la descripción dice «doradas»: unificar).
4. Estilo/composición: `rio-sierra` y `laguna-lluvia` incluyen niños no pedidos (descritos, no contradicen la ciencia). Aceptable. `rio-sierra`: agua con espuma y niños junto a la orilla de un río rápido; el texto avisa de no probar el agua: aceptable.
5. `paso-1` usa `recursoRef` laguna-lluvia y dice «como en la imagen de la laguna»: coherente. Comprobación (b, longitudes 36/33/31) correcta, pero es casi el mismo caso que `ejemplo-mar` (mar, sed, no beber); proponer un caso nuevo (p. ej. «el agua de la lluvia que cae en un balde limpio») para evaluar transferencia. Menor.

## cyt.p2.animales-diurnos-y-nocturnos (el-dia-la-noche-y-los-seres-vivos.json) — APROBADA

Ciencia correcta: gallina diurna, murciélago y lechuza/búho nocturnos, eco como orientación (nivel 2.º razonable, bien simplificado). La clase no menciona el gato montés. Situación sin animales (no revela). Comprobación (a; longitudes 40/39/34) sin delatar. Letras del lote c, b, a, c sin repetir seguidas. Imágenes:

1. `murcielago-cueva-noche` (opcional): cara con ojos muy grandes y boca abierta, estilo caricatura; no es inapropiada ni contradice alt («ojos grandes»). Aceptable.
2. `campo-anochecer`: el sol está sobre las lomas y es atardecer, no noche; el texto lo dice bien («se esconde»). Sin defecto. La pregunta «¿qué animales se van a dormir...?» no puede contestarse con la imagen (no hay animales): es pregunta abierta, correcta.

## cyt.p2.cerros-montanas-valles (agua-aire-y-tierra-en-nuestro-planeta.json) — CAMBIOS

1. `cerros-pastizal` (cerros-pastizal-zimage-v1.webp): las «lomas» son cúpulas casi perfectas, de aspecto de montículos artificiales, no cerros naturales; en una clase que contrasta cerro/montaña/valle es un modelo pobre. Además la «llama» lejana parece un animal de cuello largo, sin identificar. Regenerar con laderas irregulares y, de ser posible, sin llama (o quitarla del texto); la descripción dice «cuatro lomas» y se ven cinco.
2. `montana-nevada` (montana-nevada-zimage-v1.webp): es un cono casi simétrico tipo Fuji, con nieve cubriendo casi todo el cono; el texto dice «Lalo mira desde Cusco» y «punta cubierta de nieve». No es un nevado andino. Regenerar con pico andino irregular (tipo Ausangate/Salkantay) y nieve solo arriba, o quitar «Cusco» del texto.
3. `valle-rio-cerros` (valle-rio-cerros-zimage-v1.webp): hay figuras diminutas en fila en la orilla derecha y un puntito parecido a una cara de panda abajo a la izquierda (artefactos), no descritos en alt ni descripcion. Además la narración dice «en el fondo hay campos y casitas»: están en primer plano y a lo largo del río. Corregir a «junto al río» y regenerar sin figuras minúsculas. Estilo más detallado y texturado que `cerros-pastizal` y `montana-nevada` (planos): inconsistencia entre las dos imágenes de la misma clave.
4. Vocabulario: la narración alterna «cerros», «lomas», «colinas»; para 2.º unificar a «cerros» (y «las colinas» del ejemplo de la montaña a «cerros más bajos»), ya que la clase compara con «cerro».
5. `paso-2`: «Si por allí corre un río, es un valle» contradice la idea («suele correr un río»). Cambiar a «Si por allí suele correr un río, es un valle».
6. Comprobación (c, llanura): repite el contraejemplo `contraejemplo-pampa` casi literal; la pista («terreno plano, sin elevaciones») casi define la respuesta. Cambiar la pista a «Piensa si hay elevaciones o zonas bajas».

## Estilo entre claves (D)

Cuy, garza y gallinas: ilustración con textura y brillo; cerros y montaña: planos y minimalistas; valle: acuarela detallada; mar y anochecer: planos. Aceptable en conjunto, pero valle y montaña desentonan. Sin texto ni flechas incrustados; sin manos ni anatomías deformes en las 12; murciélago, gallinas y cuy correctos.

## F) Errores en ejercicios existentes (no editados)

- `animales-diurnos-y-nocturnos` e12: «gato montés … si lo ves cazar al oscurecer» es ambiguo (crepuscular) y la opción lo hace correcto por un criterio no enseñado. Corrección mínima: en enunciado, opción c, pistas[2] y retroalimentación sustituir «gato montés» por «murciélago» (p. ej. «Cuy, lechuza, murciélago, paloma … ¿qué animal de su lista también es nocturno?»; opción c «El murciélago»; pista «El murciélago sale de noche»; retro «El murciélago es nocturno porque está activo de noche»). Además opción b («El cuy en el corral a mediodía») es más larga que las otras y delata. Afecta lo que ve el alumno (ejercicio), no la clase guiada.
- `agua-dulce-y-salada` e05 opción b «Beber agua de una poza de la orilla»: poza ambigua (puede ser agua de lluvia). Corrección mínima: opción b «Beber el agua de una poza de mar entre las rocas»; pistas[1] «Las pozas de mar entre las rocas guardan agua salada.»; la retro sigue válida. Afecta lo que ve el alumno (ejercicio y pista 2).
- Fuera de lo pedido: `cyt.p2.dia-y-noche` tiene ejercicios y fuentes modificados contra HEAD; verificar que pertenezca a otro lote.

## Resumen de acciones prioritarias

Regenerar: pescador-mar-bote (adulto/rema), cerros-pastizal (laderas naturales), montana-nevada (nevado andino), valle-rio-cerros (sin figuras minúsculas). Reescribir: `ejemplo-rio-observa` (agua), paso-2 de cerros, pista de comprobación de cerros, alt de rio-garza. Corregir e12 y e05 aparte.

## Ronda 2

Fecha: 2026-11-16. Solo lectura. `pnpm nudito:validar-banco` OK (2238 fichas, 27034 ejercicios); `pnpm typecheck` OK. Diff contra HEAD: en las 4 claves solo cambió `claseGuiada` salvo e05 (agua-dulce-y-salada) y e12 (animales-diurnos-y-nocturnos), ids y dificultades intactos; el resto del diff en los archivos (agua-aire-tierra, dia-y-noche y otras fichas) es ajeno. Imágenes abiertas con Read: las 4 regeneradas más rio-garza y cuy-gavilan: anatomía correcta, sin texto, sin artefactos, estilo plano coherente; alt y descripcion coinciden con lo visto.

Veredictos: cadena-alimenticia APROBADA · agua-dulce-y-salada APROBADA · animales-diurnos-y-nocturnos APROBADA · cerros-montanas-valles APROBADA (con notas menores).

- cadena-alimenticia: defectos 1 y 2 corregidos (garza en la orilla, patas junto al agua; pregunta «¿qué come cada animal?»). Ciencia y comprobación (c) intactas.
- agua-dulce-y-salada: rio sin respuesta ni «probar»; pescador adulto remando coincide con alt/descripcion/narración; totoras amarillas; comprobación nueva (lluvia, b) sin repetir el mar. e05: opción b «poza de mar entre las rocas» (más larga que las demás pero incorrecta, no delata), pistas[1] coherente, respuesta d única. Nota menor: alt de rio-sierra dice «lomas», narración «cerros».
- animales-diurnos-y-nocturnos: e12 con murciélago: opciones 25/22/25, respuesta c única, retro coherente. Nota menor: pistas[0] «uno caza al oscurecer» podría incluir la lechuza de la lista; no afecta la respuesta.
- cerros-montanas-valles: vocabulario unificado a «cerros»; paso-2 «suele correr»; pista nueva sin definir la respuesta; valle sin figuras, casitas junto al río, estilo plano coherente; montaña andina asimétrica con nieve arriba, laguna y dos niños como se describe. Nota menor: en cerros-pastizal las lomas siguen siendo bastante redondeadas (la central casi una cúpula), pero irregulares, sin llama, y aceptables para 2.º.
