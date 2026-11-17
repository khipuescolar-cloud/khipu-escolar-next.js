# Revisión independiente · Lote 37 (Comunicación, primaria 2.º y 3.º)

Revisor: subagente Claude (no autor). Fecha: 2026-11-16. Solo lectura; no se editó contenido.

## Resumen

| Clave | Veredicto |
|---|---|
| com.p3.a-quien-se-refiere | CAMBIOS |
| com.p3.adivinanzas | CAMBIOS (menor) |
| com.p3.adjetivaciones-al-leer | APROBADA |
| com.p3.adjetivaciones-para-caracterizar | CAMBIOS |
| com.p2.causa-y-efecto | APROBADA |
| com.p2.comentar-lo-que-dice-otro | CAMBIOS (menor) |

## Verificación técnica (E)

- `pnpm typecheck`: sin errores. `pnpm nudito:validar-banco`: válido (2238 fichas, 27034 ejercicios).
- Comparado con `HEAD` por JSON: en las 6 claves solo cambió `claseGuiada` (HEAD no la tenía); ejercicios, ids, respuestas y dificultad idénticos.
- 10 momentos por clave, primer momento sin recurso, todos los `recursoRef` existen y todos los recursos se usan, archivos existentes, alt ≤200 y descripción ≤500, sin dígitos ni «parte N de M» en la narración (solo «Ejemplo 1/2», «Paso 1/2/3» en títulos), sin «dibujo/imagen» en momentos sin recurso.
- Opciones de comprobación: diferencia de longitud ≤3, correcta nunca la más larga, letras b, c, a, b, c, a.
- SVG: 18 archivos del lote, viewBox 640×480, texto ≥28 px, `<title>`, sin `<tspan>`, nada fuera del lienzo (la más alta termina en y=454), texto ámbar `#8A5A00`; no hay `#0F7C7A` en estos archivos. Rasterizados con Chrome headless y vistos: legibles, la tarjeta de situación y las de ejemplo no muestran la respuesta. Queda mucho espacio vacío bajo las tarjetas (cosmético).

## Visual (D): las 12 WebP abiertas con Read

Sin texto ni flechas incrustadas, sin manos deformes, sin animales deformes, una idea por imagen. Estilo coherente salvo el gato.

- referentes-feria: niña con canasto y niño con caja, correcto; niños de fondo coinciden con la descripción. OK.
- referentes-tejidos: tres gorros y UNA manta (el texto dice dos mantas); la narración ya dice «una manta». Ver defecto a-quien 2.
- adivinanzas-ronda: siete niños, coincide con alt. La niña que levanta la mano está al fondo del círculo, no «en el centro» (descripción). Ver adivinanzas 2.
- adivinanzas-paraguas: niño con paraguas amarillo abierto y lluvia, manos y mango correctos. OK.
- adjetivos-leer-cuento: dos niños con libro, correcto. OK.
- adjetivos-leer-patio: patio mojado, banca vacía, sin personas; coincide. OK.
- adjetivos-caracterizar-cuaderno: niño escribiendo, mano con lápiz correcta. OK.
- adjetivos-caracterizar-gato: gato gris dormido, anatomía correcta. Estilo distinto al resto del lote (contorno negro grueso, tipo «pegatina»), cosmético, no bloquea.
- causa-lluvia: tres niños de espaldas con impermeables, correcto.
- causa-fiebre: niña con termómetro (lo sostiene junto a la boca) y parque por la ventana; la descripción lo dice bien. OK.
- comentar-banca: niño que habla y niña que escucha, coincide con narración. OK.
- comentar-huerta: abuelo y niña con regadera, cinco plantitas; la niña tiene coletas, no trenzas (descripción, trivial).

## Por clave

### com.p3.a-quien-se-refiere (`primaria-3/fichas/ubicar-informacion.json`): CAMBIOS

1. Momentos `ejemplo-2-lee`/`ejemplo-2-razona`, recurso `ej2` (SVG `referentes-ej2-pregunta.svg`), alt y descripción: «Doña Aurora tejió tres gorros y dos mantas. Estos son de lana de alpaca». La respuesta no es única: en español el masculino plural abarca grupos mixtos, así que «estos» puede referirse a gorros y mantas juntos. La narración afirma que «estos» es solo los gorros. Corrección mínima: invertir para que el referente no sea el más cercano y el femenino sea inequívoco: «Doña Aurora tejió dos mantas y tres gorros. Estas son de lana de alpaca» (la pregunta pasa a «estas»; «estas» = mantas, el nombre más lejano, que conserva la lección). Actualizar narración de `ejemplo-2-razona` (concordancia: «estas» femenino plural = mantas; «gorros» es masculino), alt/descripción de `ej2`, y regenerar el SVG.
2. Momento `ejemplo-2-razona`, recurso `tejidos`: el texto habla de dos mantas y la imagen muestra una. La narración lo advierte («una manta, parecido a lo que cuenta»), pero con la corrección 1 conviene decir «una manta» y «tres gorros» sin sugerir que coincide exactamente. Opcional: regenerar con dos mantas.
3. Nota de audio (no bloquea): «ella/ello/estas/estos» van entre comillas; la voz distingue bien «estas» y «estos» solo si se pronuncian con claridad, por eso conviene que la narración repita el nombre completo («las mantas») al cerrar.

### com.p3.adivinanzas (`primaria-3/fichas/comprension-de-textos-orales.json`): CAMBIOS (menor)

1. Recursos `paraguas`, `error`, `paraguas-ill` y momentos `ejemplo-2-lee`, `ejemplo-2-razona`: la línea «cuando llueve, te cubro de las gotas» es castellano poco natural (se cubre de algo, no «de las gotas»). Corrección mínima: «cuando llueve, te protejo» (cambiar en narración, alt, descripción de `paraguas` y `error`, y regenerar los 2 SVG).
2. Recurso `ronda`, descripción: dice «En el centro, una niña levanta la mano» pero está al fondo del círculo; cambiar a «Al fondo del círculo, una niña levanta la mano».
3. Títulos `ejemplo-1-lee`/`ejemplo-2-lee`: dicen «escucha la adivinanza» pero la narración pide «Lee». Unificar a «lee» o «escucha» (cosmético).

### com.p3.adjetivaciones-al-leer (`primaria-3/fichas/inferir-e-interpretar.json`): APROBADA

Sin defectos en `claseGuiada`: respuesta única en los dos ejemplos y en la comprobación (el niño «triste», la abuela «serena y amable»), el texto está en las tarjetas, imágenes coherentes y sin revelar respuesta. Los errores de ejercicios existentes están en la sección G.

### com.p3.adjetivaciones-para-caracterizar (`primaria-3/fichas/recursos-literarios.json`): CAMBIOS

1. Momento `contraejemplo`, recurso `error` (`adjetivos-caracterizar-error.svg`): mezcla dos errores («lindo» vago y «las flores amarillo» sin concordancia). La concordancia (masculino/femenino, singular/plural) no se trabaja en ninguno de los dos ejemplos ni en la idea; aparece por primera vez aquí y en el paso 3. Es un concepto no trabajado. Corrección mínima: dejar solo el error de palabra vaga en el contraejemplo, o añadir una frase de concordancia en `ejemplo-2-razona` antes del contraejemplo.
2. Mismo recurso: «El niño es lindo» se corrige a «El niño es generoso», pero no hay ningún dato sobre el niño que justifique «generoso». Corrección: dar contexto («El niño comparte su pan. Es generoso») o cambiar el ejemplo a uno que sí tenga datos (p. ej. «El perro es lindo» → «El perro es peludo y juguetón» con una frase que lo respalde).
3. Momento `ejemplo-1-razona`, recurso `gato-ill`: la narración dice «gris y gordito»; la descripción no menciona «gordito». Quitar «gordito» o añadirlo a la descripción. (Estilo del gato distinto al resto del lote: opcional.)

### com.p2.causa-y-efecto (`primaria-2/fichas/inferir-e-interpretar.json`): APROBADA

Estructura completa, causa al final en el ejemplo 2, contraejemplo claro, comprobación con respuesta única («Como el pozo se secó, buscaron agua en el río»), imágenes coherentes y sin revelar. Sin defectos.

### com.p2.comentar-lo-que-dice-otro (`primaria-2/fichas/dialogo-y-cortesia.json`): CAMBIOS (menor)

1. Momento `paso-3`: «con «¿Y qué pasó cuando?»» es una frase incompleta, rara al oído. Corrección: «¿Y qué pasó después?».
2. Momento `ejemplo-2-razona`: la tarjeta de pregunta («¿Qué le dirías a Carla?») es abierta y se modela una respuesta distinta de la que marca el contraejemplo en verde («¿Cuántos frijoles sembraste?»); está bien como modelo, pero conviene decir «una respuesta posible» para no sugerir que es la única.

## G. Errores de ejercicios existentes reportados por el autor (no editados)

Los cuatro son reales; afectan al alumno en distinto grado.

1. `com.p3.adjetivaciones-al-leer` e12: «cómo está la abuela por la noticia»; el texto no menciona noticia. Afecta (premisa falsa, el alumno busca algo que no está). Corrección mínima: «por la noticia» → «al ver a su nieto». Respuesta «emocionada» sigue siendo única.
2. `com.p3.adjetivaciones-al-leer` e07: «oscuro» y «silencioso» defendibles como «da miedo». Afecta: un alumno que escribe «silencioso» es marcado mal. Corrección mínima: enunciado «¿qué adjetivo muestra que el camino no tiene luz y da miedo?» (coherente con la pista y la retroalimentación, que ya hablan de luz); alternativa: aceptar también «silencioso/silenciosa» (peor, contradice la retroalimentación).
3. `com.p3.adjetivaciones-al-leer`, `ejemplos[2]`: la respuesta usa «concurrido y bullicioso» y el texto dice «lleno y ruidoso». Afecta poco, pero es incoherente. Corrección: respuesta «El mercado está lleno y ruidoso».
4. `com.p3.adjetivaciones-para-caracterizar` e10: el enunciado lista los cuatro adjetivos entre paréntesis, por lo que no hace falta leer el texto. Afecta (ejercicio sin comprobación real; la pista 3 «Suma 2 y 2» ya da la cuenta). Corrección mínima: quitar «(peludo, juguetón, tierno y amigable)» del enunciado; respuesta 4 sigue siendo única (los otros adjetivos describen el rincón y el hueso).

## Pendientes para el orquestador

- Tras corregir SVG o imágenes, regenerar y volver a ver en Read.
- Revisión en navegador (audio, móvil, movimiento reducido) sigue sin hacerse.

## Ronda 2

Revisor: subagente Claude (no autor). Fecha: 2026-11-16. Solo lectura. `pnpm nudito:validar-banco`: válido (2238 fichas, 27034 ejercicios). `pnpm typecheck`: sin errores. Diff contra `HEAD` por JSON fuera de `claseGuiada`: solo los cambios autorizados (al-leer e07 enunciado, e12 enunciado, `ejemplos[2].respuesta`; para-caracterizar e10 enunciado y pista 3); id, dificultad y respuesta intactos. SVG cambiados rasterizados con Chrome headless: legibles, sin desbordes, sin revelar respuesta.

| Clave | Veredicto |
|---|---|
| com.p3.a-quien-se-refiere | APROBADA |
| com.p3.adivinanzas | CAMBIOS (menor) |
| com.p3.adjetivaciones-al-leer | APROBADA |
| com.p3.adjetivaciones-para-caracterizar | APROBADA |
| com.p2.comentar-lo-que-dice-otro | APROBADA |

- a-quien: «Doña Aurora tejió dos mantas y tres gorros. Estas…» tiene respuesta única (mantas) y narración, alt, descripción y SVG coinciden. `referentes-tejidos-zimage-v1.webp` vista con Read: tres gorros (rosado, verde azulado, rojo oscuro) y dos mantas (una a cada lado), mujer de suéter morado y niña de suéter rosado; alt y descripción exactos.
- adivinanzas: defecto residual. El alt del recurso `paraguas` aún dice «flor sin pétalos que cubre de las gotas» (debe decir «que me protege de la lluvia» o similar); el resto («te protejo» en narración, descripciones y SVG, «Al fondo del círculo», títulos «lee») está corregido.
- al-leer: e12 («al ver a su nieto», «emocionada» única), e07 («no tiene luz y da miedo», «oscuro» único, retroalimentación coherente) y el ejemplo «El mercado está lleno y ruidoso» corresponden al texto. `claseGuiada` sin defectos nuevos.
- para-caracterizar: contraejemplo con un solo error y dato que lo justifica; sin concordancia en paso 3; sin «gordito»; e10 sin paréntesis, pista 3 correcta y respuesta 4 única.
- comentar: `paso-3` «¿Y qué pasó después?», «Una respuesta posible es…», «coletas» en `comentar-huerta`. (Trivial no bloqueante: el alt/descripción de `comentar-banca` dice «trenza»; solo informativo.)
