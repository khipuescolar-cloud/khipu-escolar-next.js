# Revisión independiente · Primaria Comunicación 1.º y 2.º, lote 36

Revisor: subagente Claude (Sonnet). Fecha: 2026-11-16. Solo lectura sobre banco y recursos.

## Resumen

| Clave | Veredicto |
|---|---|
| com.p1.a-quien-le-hablo | CAMBIOS (menor) |
| com.p1.adivinanzas | APROBADA |
| com.p1.agregar-detalles | CAMBIOS (menor) |
| com.p2.adivinanzas-y-expresiones | CAMBIOS |
| com.p2.adjetivos | CAMBIOS |
| com.p2.ampliar-la-informacion | CAMBIOS |

Verificación técnica (E): `pnpm typecheck` sin errores; `pnpm nudito:validar-banco` válido (2238 fichas, 27034 ejercicios). Comparado por JSON contra HEAD: en las 6 claves solo cambió `claseGuiada` (ninguna la tenía antes); ejercicios intactos. 15 SVG nuevos rasterizados en Chrome headless y vistos: texto legible, todos con font-size >= 26, sin tspan, con `<title>`, sin errores de ortografía. Las 12 imágenes se abrieron con Read: sin texto incrustado, sin anatomía defectuosa (manos correctas), osos y animales sin deformaciones, estilo acuarela coherente en el lote (solo varía que unas tienen borde de papel y otras a sangre; aceptable). Opciones de las comprobaciones: diferencias de longitud <= 3, letras c,a,b,c,a,b, correcta nunca la única más larga.

## com.p1.a-quien-le-hablo (conversacion-y-cortesia.json): CAMBIOS (menor)

1. `ejemplo-1-razona` (sin recurso) dice «La segunda frase la llama profesora... La primera no dice...». Sin pantalla, «primera/segunda» no se ubican al oído. Corregir citando la frase: «La frase "Profesora, ¿me presta el libro, por favor?" la llama profesora... La frase "Oye, dame eso" no dice...». (O dar recursoRef `frases`.)
2. Sin otros defectos. Imágenes `hablo-profesora` y `hablo-companero` limpias y coherentes con alt/descripcion; narración de `ejemplo-2-guiado` dice «mira a una niña con una sonrisa» y la imagen muestra al niño extendiendo la mano (coincide con alt); aceptable.

## com.p1.adivinanzas (escucha-y-comprension-de-relatos.json): APROBADA

Sin defectos. Pistas visibles en SVG; guiados no revelan respuesta; contraejemplo (una sola pista, tres respuestas) correcto; comprobación pez (a) con pista que no entrega la respuesta. Imágenes `adivinanza-circulo` (cinco niños, canasta tapada) y `adivinanza-platano` limpias; la imagen del plátano solo aparece en el momento «razona», donde se revela la respuesta, como corresponde.

## com.p1.agregar-detalles (palabras-y-oraciones.json): CAMBIOS (menor)

1. Recurso `bus`, `ejemplo-2-guiado`: la `descripcion` dice «luz suave del amanecer» y la imagen muestra un amanecer claro, mientras la narración pregunta «en qué momento del día». Revela la respuesta («por la mañana») en el momento guiado. Quitar «el cielo tiene la luz suave del amanecer» de la descripcion; si es posible, preferir una imagen con luz neutra (o aceptar el riesgo, menor, porque la narración no lo menciona).
2. Recurso `bus`, `alt`: dice «cuatro niños con mochila saludan»; la imagen tiene cinco niños (uno corre y una de ellas lleva bolso, no mochila) y la `descripcion` dice «un niño corre y otros cuatro». Alinear alt con descripcion («niños con mochila saludan»).
3. Autobús con cara sonriente en el frente: aceptable en estilo cuento para 1.er grado (consulta del orquestador). No altera la tarea. Único reparo: se aparta del realismo del resto del lote.

## com.p2.adivinanzas-y-expresiones (comprension-de-textos-orales.json): CAMBIOS

1. `ejemplo-2-guiado` + recurso `agua-pregunta`: la narración y el SVG dicen «La situación es que tiene mucho trabajo y poco tiempo», que ya es el significado de la expresión; luego `ejemplo-2-razona` solo lo repite como «muy apurada». El guiado entrega la respuesta. Corregir: en narración y SVG dejar la situación sin la conclusión (p. ej. «Hoy hay muchos clientes en su puesto»), y que el significado salga en el razona.
2. Recurso `rosa`: doña Rosa aparece sonriente y relajada, contradice «agua al cuello» (estrés). La narración (manos llenas, muchos niños) es correcta; el gesto no ayuda a inferir apuro. Mejora opcional: regenerar con gesto apurado, o decirlo en la narración.
3. `paso-2` y `contraejemplo` correctos; `comprobacion` (me muero de risa) bien. Observación: la pista «algo muy gracioso» repite el enunciado, no entrega nada nuevo; OK.
4. Sobre G (ejercicio existente e08, no editar sin decisión del orquestador): afecta al alumno. La adivinanza real es «Tiene corona y no es rey, tiene escamas y no es pez» (respuesta: piña). La versión «tiene sol y no da calor» es inventada, ambigua y contradice el folclor; la retroalimentación admite que la piña cumple la pista de la corona y el girasol también tiene «corona». Corrección mínima propuesta (mantiene respuesta `false`): enunciado «En la adivinanza «Tiene corona y no es rey, tiene escamas y no es pez», la respuesta puede ser un girasol.»; retroalimentación «Es falso: la respuesta es la piña, que tiene corona de hojas y una cáscara con forma de escamas; un girasol no tiene escamas.»; pistas: «Una de las pistas habla de escamas.», «Piensa en una fruta con corona de hojas.». La alternativa (respuesta `true` con piña) también sirve pero cambia la distribución v/f.
5. Hallazgo adicional en ejercicio existente e10: dice «Escribe dos palabras» pero la respuesta es `tiza` (una palabra; se aceptan «una tiza», «la tiza»). Cambiar a «Escribe la palabra.» o similar. Impacto bajo, confunde.

## com.p2.adjetivos (gramatica-y-vocabulario.json): CAMBIOS

1. `idea`: el ejemplo «casa grande» es exactamente la respuesta del `ejemplo-1-guiado` («la casa» + «Una casa que mide mucho»). Cambiar el ejemplo de la idea por otro («niña alegre» y «perro pequeño»).
2. `ejemplo-2-guiado`: la narración dice «Fíjate en que ositos es masculino y plural: la palabra nueva debe ir igual», es decir, entrega la regla que el razona vuelve a explicar. Dejar solo «Hablamos de más de uno, los ositos. ¿Cómo son? Piensa en la palabra que lo diga» y la regla en el razona.
3. Recurso `ositos`, `descripcion`: «Tienen pelaje esponjoso» anticipa el adjetivo «suaves» en el momento guiado. Quitar esa frase.
4. Recurso `cuarto`, `alt`: «oso de peluche grande» introduce el adjetivo «grande», respuesta del ejemplo 1. Quitar «grande» del alt (y de la descripcion si se prefiere). Sobre la duda del autor: los colores/rasgos de las imágenes son contexto y no revelan la respuesta; el reparo es solo con «grande» y «esponjoso».
5. `ejemplo-1-guiado`: «Hay una casa que mide mucho» no hay imagen de casa; mejor «Piensa en una casa que mide mucho». Menor.
6. `comprobacion` (las flores rojas, a): correcta, sin defectos (las tres opciones miden 16).

## com.p2.ampliar-la-informacion (textualizar.json): CAMBIOS

1. `ejemplo-2-guiado` (recurso `parque`): la narración dice «Dos primos juegan con una cometa» y luego pregunta «cuándo y con quién»; «primos» entrega el «con mi primo» del razona. Cambiar a «Dos niños juegan con una cometa» (y en alt/descripcion ya dicen niño y niña, coherente). Así el «con quién» lo da el SVG.
2. `situacion-abuela` y descripcion de `abuela`: «maíz morado y canela» sobre la mesa y «líquido morado» anticipan «mazamorra morada» (respuesta de «¿qué cocina?»). Menor: decir «Sobre la mesa hay frutas y especias» y quitar «líquido morado» de la descripcion (la imagen sí mostrará el plato; aceptable). El dato «Ica» no se revela.
3. `comprobacion` (b) correcta; las tres opciones miden 30 a 32.
4. Vocabulario oral: «mazamorra morada», «Ica» sin problemas para voz.

## Notas generales (F, vocabulario oral)

Sin números en palabras ni fracciones; no hay opciones ilegibles en audio. «Lomo» se explica en el razona. Los títulos «Ejemplo N»/«Paso N» llevan cifras, como en lotes previos.

## Ronda 2

Revisor: subagente Claude (Sonnet). Fecha: 2026-11-16. Solo lectura. `pnpm nudito:validar-banco` válido (2238 fichas, 27034 ejercicios); `pnpm typecheck` sin errores. Imágenes `bus`, `rosa`, `abuela`, `cuarto` abiertas con Read y contrastadas con alt/descripción.

| Clave | Veredicto |
|---|---|
| com.p1.a-quien-le-hablo | APROBADA |
| com.p1.agregar-detalles | APROBADA |
| com.p2.adivinanzas-y-expresiones | APROBADA |
| com.p2.adjetivos | APROBADA |
| com.p2.ampliar-la-informacion | APROBADA |

- a-quien-le-hablo: `ejemplo-1-razona` ya cita las frases; sin defectos nuevos.
- agregar-detalles: `bus` sin «amanecer» ni «cuatro»; alt y descripción coinciden con la imagen (niño que corre y cuatro más con mochila o bolso, autobús con cara sonriente). La luz de amanecer sigue en la imagen pero ningún texto la menciona; riesgo menor aceptado.
- adivinanzas-y-expresiones: el guiado y el SVG dejan solo «hoy hay muchos clientes»; el significado sale en el razona. Doña Rosa sonriente: aceptable. La narración lo explica («aunque sonríe… cajas y sacos… muchos niños… manos llenas»), y la imagen muestra papas y telas en las manos, cajas, sacos y niños pidiendo, tal como dicen alt y descripción. No hace falta regenerar. e08: la adivinanza real (piña) con «puede ser un girasol» es falsa, sin ambigüedad (el girasol no tiene escamas); retroalimentación y pistas coherentes, id/tipo/respuesta/dificultad intactos. e10: «Escribe una palabra» coincide con la respuesta `tiza`.
- adjetivos: idea con «niña alegre» y «perro pequeño»; ejemplo 1 sin imagen de casa y sin «grande» en recursos; guiado 2 sin la regla; `ositos` sin «esponjoso»; `cuarto` sin «grande». Sin adjetivos adelantados.
- ampliar-la-informacion: «frutas y especias» en situación y alt; descripción con «mazorcas» (sin «morado» ni «líquido»); guiado 2 dice «dos niños». La imagen muestra la olla morada, inevitable, pero ningún texto nombra la mazamorra ni Ica antes del razona.
