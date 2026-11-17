# Revisión independiente · Primaria, Ciencia y Tecnología (3.º y 4.º), lote 34

Fecha: 2026-11-16. Revisor independiente (solo lectura sobre banco y recursos). Informe del autor: `informe-editorial-primaria-lote-34.md`.

## Verificaciones técnicas

- `pnpm typecheck`: sin errores. `pnpm nudito:validar-banco`: válido (2 238 fichas, 27 034 ejercicios).
- Comparado con `HEAD` por JSON: en las seis claves solo cambió `claseGuiada` (ejercicios, ids, respuestas intactos).
- Script: 10 momentos por clave, primer momento sin recurso, todos los `recursoRef` resuelven, todos los `src` existen, alt ≤ 144, descripcion ≤ 281, sin «parte N de M», sin dígitos fuera de «Ejemplo N / Paso N» en los títulos, ningún momento sin recurso habla de «imagen/dibujo/esquema/tarjeta».
- Opciones de comprobación: diferencia de longitud ≤ 3 y correcta nunca la más larga en las seis. Letras de comprobación: b, c, a, c, a, b (no repiten).
- Las 14 imágenes y los 10 SVG se abrieron uno por uno (SVG rasterizados en headless).

## Visual (D), lote completo

Sin texto ni marca de agua incrustada, sin niños no pedidos, manos y animales bien formados, sin flechas incrustadas en las ilustraciones. Observaciones:

- V1. Estilo no uniforme: `carrito-carton` es casi 3D con desenfoque de fondo; `campo-lluvia` y `reflejo-olla` son más planas y granulosas; el resto, ilustración plana suave. Aceptable, pero el carrito desentona.
- V2. `agrupar-patio-cuatro`: la «llama» tiene cabeza esponjosa y orejas cortas, parece alpaca. No revela la clasificación; corregir solo si se quiere precisión (regenerar con cara larga y orejas curvas, o llamar «alpaca» en alt/narración/e04 no sirve porque e04 ya usa alpaca aparte).
- V3. `agrupar-estanque-cuatro`: bajo el pato hay una mancha marrón (patas) que se lee como un objeto extraño. Menor.
- V4. `ajustes-comedero-cuerda-fina` y `...-gruesa` son dos comederos distintos (techo de una tabla con dos postes frente a techo con caballete y bandeja más ancha, otro árbol, otro fondo). La narración dice que Luis «cambia solo la cuerda»: el antes/después debe ser el mismo comedero. Defecto de coherencia (ver ajustes, punto 1).
- V5. `adaptaciones-ballena-mar-calido`: descripcion dice «una aleta bajo el agua»; la aleta pectoral se ve en la superficie, junto al agua. Menor. La ballena es reconocible como jorobada.
- V6. `actos-reflejo-olla`: la niña tiene las dos manos juntas sobre el pecho (no se ve el gesto de retirar «la mano»); las manos están bien formadas. Coherente con alt, pero la narración dice «retiró la mano» (ver actos, punto 3).
- V7. `vicunas-grupo`: cinco vicuñas, dos comiendo, tres de pie (una en la lomita), coincide con narración, alt y descripcion. Cabezas con mechón blanco muy estilizado pero sin deformidad. No muestra la respuesta (no hay vigía marcado explícito).
- V8. SVG: texto legible, sin superposiciones. `absorcion-pared-solucion`: aparecen puntos nuevos en los pliegues y en el tubo sin que desaparezcan de la caja (6 arriba, 5 en pliegues, 5 en el tubo); da idea de que los nutrientes se copian en vez de pasar (ver absorción, punto 2). `actos-reflejo-y-voluntario-camino`: la flecha voluntaria sale del encéfalo y llega a la mano por fuera de la médula (ver actos, punto 2).
- Imágenes de situación y «observa»: ninguna revela la respuesta (campo con lluvia sin siembra; comedero vacío; patio de cuatro animales sin agrupar; mesa de desayuno; cocina sin persona; oso en cueva solo muestra el caso).

---

## cyt.p3.actividades-segun-la-epoca — CAMBIOS

Archivo: `primaria-3/fichas/el-clima-durante-el-ano.json`. La clase guiada está bien (secuencia, imágenes coherentes, comprobación nueva con maíz y mayo, cuadro coherente). Cambios pedidos:

1. Momento `idea`: «en la época de lluvias se siembra… en la época seca se cosecha» está dicho sin restricción geográfica; solo la ropa lleva «en la sierra». Corregir: «Como idea principal, en la sierra, en la época de lluvias se siembra y se usa impermeable. En la época seca se cosecha y se usa ropa de abrigo por el frío.» (el desarrollo de la ficha ya habla de sierra).
2. Ejercicio existente e10 (no reportado por el autor): «Ana, Puno, septiembre… ya empiezan las lluvias» contradice el cuadro de la propia clase (época seca de abril a septiembre; lluvias de octubre a marzo), y en Puno las lluvias empiezan en noviembre. Corrección mínima: cambiar «septiembre» por «octubre» y «Puno» por «Cusco» en el enunciado; la retro y las opciones quedan. (Esto sí afecta al alumno: la clase le enseña un calendario y el ejercicio lo contradice.)

## cyt.p3.agrupar-seres-vivos — CAMBIOS

Archivo: `primaria-3/fichas/diversidad-de-especies.json`.

1. Momento `ejemplo-2-razona`: «El pato vive en el agua, igual que el pez.» Un pato flota y nada pero no «vive en el agua» (anida y se alimenta también en tierra). Corregir: «El pato pasa mucho tiempo en el agua, igual que el pez.» (coherente con e02 y con el criterio «lugar»).
2. Ejercicio e05 (error real, reportado): la pista 2 dice «La mosca y la abeja son insectos y no tienen pelo.» Es falso (la abeja es peluda; ambas tienen pelillos). Corrección mínima: cambiar el enunciado a «Agrupas la lagartija, el gato, el pez y el perro. Con el criterio «tienen pelo», ¿cuántos animales van en ese grupo?» (respuesta 2 sigue igual) y la pista 2 a «La lagartija y el pez tienen escamas, no pelo.» Con ello desaparece la ambigüedad; el cambio de «pelo» a «pelaje» que propone el autor no resuelve la abeja.
3. Ejercicio e02 (reportado): «pasan tiempo en el agua» frente a respuesta «viven en el agua». Sí afecta (la rana y el pato no «viven» solo en el agua), pero no es error factual grave. Corrección mínima: `respuesta` pasa a «pasan tiempo en el agua», y «viven en el agua» queda como alternativa aceptada; retro ya dice «viven o pasan tiempo en el agua».
4. Visual V2 y V3 (opcional): llama parecida a alpaca y mancha bajo el pato.

## cyt.p3.ajustes-para-mejorar — CAMBIOS

Archivo: `primaria-3/fichas/construccion-prueba-y-evaluacion.json`.

1. Recursos `comedero-fino` y `comedero-grueso` (V4): son comederos distintos, pero el momento `ejemplo-2-razona` dice «Luis cambia solo la cuerda». Regenerar el grueso a partir del fino (mismo techo, postes y fondo; solo cambia la cuerda) o, como mínimo, cambiar la narración y la descripcion para no afirmar «solo la cuerda». Es el único defecto serio de imágenes del lote.
2. Momentos `ejemplo-1-observa` y `ejemplo-2-observa`: ya dicen qué falla («las ruedas rozan el cuerpo», «la cuerda se estira y el comedero se cae») y luego preguntan «¿qué parte debe cambiar?». Entrega la respuesta antes de pedirla. Corregir: dejar solo el síntoma («el carrito se detiene casi enseguida» / «el comedero se cae») y mover la causa a los momentos «razona».
3. Ejercicio e07 (reportado): el enunciado entrega la respuesta («Escribe “ajustar”») y usa «ajustar» como apretar, distinto de la clase (ajustar = cambiar una parte). Corrección mínima: «…¿qué debe hacer con la cuerda para que esté firme: apretarla o aflojarla? Escribe la palabra.»; `respuesta`: «apretarla»; alternativas: apretar, ajustarla, ajustar, amarrarla, amarrar más; retro: «Debe apretar la cuerda…».
4. Ejercicio e10 (reportado): «Escribe “más agujeros”» entrega la respuesta. Corrección mínima: terminar el enunciado en «¿Qué ajuste puedes hacer? Escribe una frase corta.»; añadir alternativas: «hacerle más agujeros», «más huecos», «más hoyos», «hacer más agujeros» (ya está), «perforar más agujeros».
5. Menor: la letra de la comprobación (a) coincide con la del ejercicio ya muy repetido; sin acción.
6. Visual V1: el carrito se ve más 3D que el resto; aceptable.

## cyt.p4.absorcion-de-nutrientes — CAMBIOS (menores)

Archivo: `primaria-4/fichas/sistema-digestivo.json`. Contenido científico correcto para 4.º (vellosidades aumentan la superficie, pasan a la sangre, la sangre reparte; no hay atajo estómago-músculos). Cambios:

1. `comprobacion`: es la misma escena que `ejemplo-1-observa` (pared con pliegues y tubo rojo), no un caso nuevo; se resuelve de memoria. Corregir con un caso distinto, por ejemplo: «Después del almuerzo, los nutrientes de las lentejas ya están pequeños dentro del intestino delgado. ¿Qué ocurre después?» con opciones de longitud similar: «Pasan a la sangre»; «Salen por la boca»; «Vuelven al estómago» (ajustar longitudes a diferencia ≤ 3 y correcta no la más larga).
2. Recurso `pared-solucion` (V8): los puntos se duplican en lugar de trasladarse. Corregir quitando de la caja los mismos puntos que pasaron (p. ej. dejar 1 de 6 arriba) o añadir a la descripcion «algunos nutrientes ya pasaron». Menor.
3. Sin errores en ejercicios (de acuerdo con el autor).

## cyt.p4.actos-voluntarios-reflejos — CAMBIOS

Archivo: `primaria-4/fichas/relacion-y-locomocion.json`.

1. Rigor: momento `idea` y `contraejemplo` generalizan «un acto reflejo… lo ordena la médula espinal» y «en el reflejo responde primero la médula espinal». Es cierto para retirar la mano del calor o la rodilla; no para parpadear, estornudar ni la pupila (tronco encefálico), que los propios ejercicios (e04, e06, e08, e12, comprobación) dan como reflejos. Corrección mínima: en `idea`, «…que no decides y que se produce muy rápido para protegerte; al retirar la mano de algo caliente, lo ordena la médula espinal.»; en `contraejemplo`, «No es así: en un reflejo como retirar la mano responde primero la médula espinal.» También `ideaCentral` de la ficha, si se quiere consistencia.
2. Recurso `camino-orden` (V8) y narración `paso-3`: la flecha voluntaria va del encéfalo a la mano esquivando la médula; la orden voluntaria baja por la médula. Corregir en la narración: «Una flecha más larga lleva la orden del encéfalo a la mano, pasando por la médula espinal» (la imagen ya tiene la línea que une los tres cuadros), o hacer que la flecha larga pase por el cuadro de la médula.
3. Momento `ejemplo-1-observa`: «tocó la olla sin querer y retiró la mano de golpe» ya dice la respuesta (sin querer, de golpe) antes de preguntar si es voluntario o reflejo; y la imagen muestra las dos manos al pecho, no «la mano». Corregir: «Hace un momento, la niña tocó la olla. En la imagen, está junto a la cocina, con las manos pegadas al pecho y la boca abierta de sorpresa. Nos preguntamos: ¿lo que hizo con su mano fue un acto voluntario o un acto reflejo?»
4. `comprobacion`: el enunciado habla de «mano» y las opciones son pie, ojos y pelota; reemplazar «Mi mano se movió rápido» por «Mi cuerpo se movió rápido». Menor.
5. Ejercicio e10 (reportado): afecta al alumno y es error factual. Recuperar el equilibrio al tropezar lo coordinan el cerebelo y el tronco encefálico, no es un reflejo espinal simple. Corrección mínima (enunciado y retro): «Al doctor le toca la rodilla con un martillito y la pierna de Luis salta sola; luego Luis decide reírse y contarlo. ¿Qué parte respondió primero? Escribe «médula espinal» o «encéfalo».» Respuesta «médula espinal» sin cambio; retro: «La médula espinal respondió primero con el reflejo; el encéfalo decidió después reírse». Ajustar las pistas (quitar «tropieza»).
6. Ejercicio e06 (reportado): la respuesta «reflejo» es correcta; el enunciado y la retro no dicen «médula». No es error factual del ejercicio; la tensión es con la idea de la clase, que se resuelve con el punto 1. No editar el ejercicio.

## cyt.p4.adaptaciones-conductuales — CAMBIOS (menores)

Archivo: `primaria-4/fichas/adaptaciones.json`.

1. Momento `ejemplo-2-observa`: «Si ve un puma, avisa al grupo.» entrega la ventaja que luego se pregunta. Corregir: quitar esa frase de la observa (queda en `ejemplo-2-razona`: «…el aviso permite huir a tiempo»).
2. Momento `contraejemplo` y `situacion-oso`: «el oso pardo» no vive en el Perú y el oso andino no hiberna; la clase no dice lo contrario, pero un alumno peruano puede asociarlo con el oso andino. Corregir en `situacion-oso`: «un oso pardo, de los bosques fríos del hemisferio norte, duerme…». Además, «con el cuerpo casi detenido» no describe bien al oso (baja el metabolismo, pero no se detiene como en la ardilla de tierra): en el contraejemplo cambiar por «pasar meses gastando muy poca energía».
3. Ejercicios existentes: sin errores (de acuerdo con el autor).
4. Ballena y vicuñas: ciencia correcta (migración desde aguas frías del sur a Piura y Tumbes; la vicuña vigía existe).

---

## Resumen

- APROBADAS: ninguna sin cambios.
- CAMBIOS (6): actividades-segun-la-epoca (idea sin «en la sierra»; ejercicio e10 contradice el cuadro), agrupar-seres-vivos (pista falsa de e05; «el pato vive en el agua»; e02), ajustes-para-mejorar (comederos distintos; «observa» entrega causa; e07 y e10), absorcion-de-nutrientes (comprobación repite ejemplo; puntos duplicados), actos-voluntarios-reflejos (generalización médula; flecha voluntaria; observa revela; e10 error factual), adaptaciones-conductuales (observa revela; oso pardo y «casi detenido»).
- Los defectos más graves: e10 de actos (error factual), pista falsa de e05 de agrupar (error factual), e10 de actividades (contradice el cuadro), comederos distintos en ajustes.

---

## Ronda 2

Fecha: 2026-11-16. `pnpm nudito:validar-banco`: válido (2 238 fichas, 27 034 ejercicios). `pnpm typecheck`: sin errores. Comparación con `HEAD` por JSON: fuera de `claseGuiada` solo cambiaron los ejercicios autorizados (ids y dificultad intactos); `e06` de actos e `ideaCentral` sin tocar. `comedero-fino`, `comedero-grueso`, `pared-solucion` y `camino-orden` abiertos (SVG rasterizados con sharp).

- **cyt.p3.actividades-segun-la-epoca — CAMBIOS.** `idea` corregida; e07 sin «impermeable o abrigo grueso»; e10 pasó a Cusco/octubre (coherente con el cuadro). Defecto nuevo: la pista 1 de e10 sigue diciendo «Fíjate en qué cambia en septiembre», pero el enunciado ahora dice octubre (el informe afirma que se cambió; no es así). Corregir a «octubre».
- **cyt.p3.agrupar-seres-vivos — APROBADA.** `ejemplo-2-razona` dice «pasa mucho tiempo en el agua»; e02 con respuesta «pasan tiempo en el agua» y «viven en el agua» como alternativa; e05 con lagartija/pez (respuesta 2 correcta, pista «escamas, no pelo» sin falsedad).
- **cyt.p3.ajustes-para-mejorar — CAMBIOS.** Los «observa» ya no entregan la causa; e07 («apretarla», alternativas, retro) y e10 correctos. Pero `comedero-fino` regenerado sigue sin ser el mismo comedero que `comedero-grueso`: el techo del fino es de una sola tabla con otra inclinación, los postes están en otras posiciones y la bandeja es más pequeña; el grueso tiene techo de tres tablas, ramas con hojas y proporciones distintas. Solo el fondo/árboles se parecen. La narración dice «cambia solo la cuerda»: regenerar el fino con la estructura exacta del grueso (img2img/misma semilla de composición) o regenerar ambos desde la misma base. Alt/descripcion del fino coinciden con la imagen.
- **cyt.p4.absorcion-de-nutrientes — APROBADA.** Comprobación nueva (lentejas; correcta c, longitudes 17/19/17); `pared-solucion` ahora traslada puntos (1 arriba, 2 en pliegues, 3 en tubo = 6) y la narración/descripcion/alt lo dicen; texto legible; ciencia correcta para 4.º.
- **cyt.p4.actos-voluntarios-reflejos — APROBADA.** `idea` y contraejemplo limitados a retirar la mano; `ejemplo-1-observa` ya no revela; comprobación con «Mi cuerpo»; `camino-orden` rehecho (índigo encéfalo→médula→mano, turquesa corta médula→mano) y narración/alt/descripcion alineadas; e10 de la rodilla es científicamente correcto (reflejo rotuliano espinal; el encéfalo decide reírse después), pistas sin «tropieza».
- **cyt.p4.adaptaciones-conductuales — APROBADA.** Puma retirado de `ejemplo-2-observa`; oso pardo «de los bosques fríos del norte»; contraejemplo «gastando muy poca energía»; descripción de la ballena «aleta junto al agua». (Menor, sin acción: la `mensajeCorrecto` de la comprobación dice «cuerpo casi detenido» para la ardilla de tierra, aceptable para esa especie.)

Resumen: APROBADAS 4 (agrupar, absorción, actos, adaptaciones); CAMBIOS 2 (actividades: pista 1 de e10 con «septiembre»; ajustes: `comedero-fino` aún distinto del grueso).

## Ronda 3

Fecha: 2026-11-16. `pnpm nudito:validar-banco`: válido (2 238 fichas, 27 034 ejercicios).

- **cyt.p3.actividades-segun-la-epoca — APROBADA.** e10 coherente de punta a punta: Cusco/octubre, pista 1 «Fíjate en qué cambia en octubre», respuesta b (única; a es falsa porque octubre ya es lluvias), retroalimentación y cuadro (lluvias octubre–marzo, seca abril–septiembre). Menor sin acción: la opción b dice «se necesita botas» (mejor «se necesitan»).
- **cyt.p3.ajustes-para-mejorar — APROBADA.** `ejemplo-2-observa`/`razona` hablan de «dos comederos» (cuerda blanca / cuerda gruesa); ninguna mención de «mismo» ni «solo la cuerda» en `claseGuiada` (los «cambias solo esa parte» restantes son genéricos del método y correctos). Alt/descripcion del fino y del grueso coinciden con la narración; la regeneración visual de la imagen no se re-inspeccionó en esta ronda.
