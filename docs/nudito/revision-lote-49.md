# Revisión independiente · Primaria CyT, lote 49

Fecha: 2026-11-16. Revisor independiente (no escribió el lote). Solo lectura sobre banco y recursos.

## Verificaciones técnicas (E)

- `tsc --noEmit` (`pnpm typecheck`): sin errores. `tsx scripts/nudito-validar-banco.ts` (`pnpm nudito:validar-banco`): válido (2238 fichas, 27034 ejercicios). (`pnpm` no está en el PATH de esta terminal; se usaron los binarios de `node_modules/.bin`, mismo script.)
- `scripts/nudito-lint-clase-guiada.ts` sobre las 6 claves: 0 errores, 0 avisos (solo info de «correcta más larga» en ejercicios existentes).
- Comparado con `HEAD` (JSON por clave): en las 6 claves solo cambia `claseGuiada`; ejercicios y demás campos idénticos.
- Narraciones: 10 momentos, primer momento sin recurso, ≤ 373 caracteres, sin dígitos ni «parte N de M»; las letras sueltas detectadas son solo «y/o/a» (conjunciones y preposiciones). alt ≤ 200 y descripcion ≤ 500. Letras correctas c, a, b, a, c, b.
- Las 12 ilustraciones Z-Image y los 12 SVG (rasterizados en Chrome headless) se abrieron uno por uno. Ninguna ilustración tiene texto o marcas incrustadas, niños no pedidos ni anatomía defectuosa (manos del técnico y del guardaparque correctas; garza, colibrí y alpacas sin deformaciones; pescador único y pequeño, sin parche visible). Estilo: familia coherente (plano/acuarela), con `despensa` (más pictórica, recortada), `alpacas` y `guardaparque`/`tecnico` (caritas sonrientes tipo mascota) algo distintas; no bloquea.

## Veredictos

| Clave | Veredicto |
|---|---|
| cyt.p3.alimentos-procesados | CAMBIOS |
| cyt.p4.adaptaciones-estructurales | APROBADA (con observaciones menores) |
| cyt.p5.asexual-sexual | CAMBIOS |
| cyt.p6.antenas-de-telefonia | CAMBIOS |
| cyt.p5.atmosfera-hidrosfera-litosfera | APROBADA (con observaciones menores) |
| cyt.p6.areas-naturales-protegidas | CAMBIOS |

## cyt.p3.alimentos-procesados (`primaria-3/fichas/tecnologia-y-sociedad.json`): CAMBIOS

1. Momento `situacion-mercado` y recurso `mercado` (descripcion): «Ninguno viene en bolsa ni en lata» / «Ninguna fruta ni verdura está en bolsa ni en lata» entrega la respuesta a la pregunta («¿por qué decimos que son frescos?») y además fija un criterio falso: lo fresco no se define por no estar envasado (lechuga en bolsa, verdura congelada), sino porque casi no cambió desde la cosecha. Corregir: quitar esa frase de la narración y de la descripcion; dejar «Nos preguntamos: ¿qué tienen en común estos alimentos?» y explicar «casi no han cambiado desde que se cosecharon» en el siguiente momento o en el paso 1.
2. Momento `ejemplo-1-observa`: «para no salir a comprar todos los días» anticipa la respuesta («dura más tiempo»). Cambiar por una pista neutra: «Doña Elena guarda allí varias latas de atún. Nos preguntamos: ¿qué ventaja tiene guardar el atún en lata?».
3. `despensa`: las latas no tienen etiqueta, así que «latas de atún» es solo narración (aceptable). La imagen está recortada a la izquierda y es más pictórica que `mercado`; opcional.
4. Contenido correcto (octógono «alto en azúcar», atún enlatado como procesado útil, reciclaje). Comprobación: opciones de 22–25 caracteres, correcta no es la más larga; correcta `c` sin respuesta ambigua.

## cyt.p4.adaptaciones-estructurales (`primaria-4/fichas/adaptaciones.json`): APROBADA

Ciencia correcta (pico del colibrí y néctar, patas de garza, garras/lengua del oso hormiguero, almohadillas de rana arborícola). `colibri` y `garza` coinciden con alt/descripcion (garza: pez a la izquierda, pico negro, ojo amarillo; sin personas). Observaciones menores, no bloquean:
1. `comprobacion.pista` («qué necesita para no caerse») casi entrega la opción a; sugerido: «Piensa dónde vive la rana y qué parte de su cuerpo toca las hojas».
2. `contraejemplo` nombra al cóndor (pico curvo), que no se trabaja en la clase (sí en el ejercicio e05); aceptable, o cambiar por «el pelícano» ya trabajado en e07.
3. `ejemplo-2-observa` usa una ficha de texto sin dibujo del animal y su texto ya liga «garras» y «lengua» con «come hormigas»; el alumno solo une datos. Mejora opcional: una ilustración del oso hormiguero (se descartó por la generación).

## cyt.p5.asexual-sexual (`primaria-5/fichas/reproduccion-de-los-seres-vivos.json`): CAMBIOS

1. Momento `situacion-fresa`, recurso `fresa` (imagen/alt/descripcion): la imagen muestra DOS plantas adultas con fruta, unidas por el estolón; el tallo termina en una rosetita pequeña al pie de la planta derecha. La pregunta «¿cuántos seres vivos hicieron falta para que naciera la planta nueva?» no dice cuál es la planta nueva, y el alumno ve dos plantas con fresa: la respuesta natural es «dos». Corregir narración, alt y descripcion para señalar la nueva: «una plantita pequeña con hojas brota al final del tallo» y preguntar «¿cuántas plantas hicieron falta para que naciera la plantita nueva?». Ajustar el contraejemplo («la plantita nueva nació de una sola planta»).
2. Momento `ejemplo-2-observa` y recurso `papa`: el SVG muestra tres plantas ya idénticas y la narración dice «tres trozos de una misma papa»; la pregunta «¿cómo serán entre sí?» queda respondida por el dibujo. Corregir: quitar «de una misma papa» de la narración observa (dejarlo para `razona`) o preguntar «¿de cuántas papas vienen estos tres trozos y cómo serán las plantas?».
3. `ejemplo-1-observa` / recurso `alpacas`: tres crías con dos adultos a la vez es poco realista (la alpaca pare una cría por vez). Mejora opcional: «tres crías de la familia, de distintos años».
4. Ficha original: «Una llama y un macho» en un ejemplo (no en la clase); anotar para el orquestador. Ciencia correcta (estolón y esqueje: asexual; crías variadas: sexual; esporas: asexual a este nivel). Comprobación: opciones 30–32 caracteres, correcta `b` no es la más larga.

## cyt.p6.antenas-de-telefonia (`primaria-6/fichas/debates-sobre-ciencia-y-sociedad.json`): CAMBIOS

1. Momento `paso-3`: «Resumen los pasos:» se lee como sustantivo («los resumen»). Corregir: «Resumiendo los pasos: escribe la pregunta, …» o «Este es el resumen: …».
2. `comprobacion.pista`: «Busca la respuesta que escucha al vecino y además usa datos» describe literalmente la opción a. Cambiar por: «Piensa qué respuesta toma en serio la queja del vecino y la responde con evidencia, sin atacar». Además el enunciado («con respeto y con datos») fuerza la respuesta: reformular «Quieres responderle. ¿Qué le dices?» con el mismo juego de opciones.
3. Momento `ejemplo-1-razona`: «Un comentario como me dijeron que enferma no prueba nada» sin comillas es ambiguo al oído; sustituir por «Un comentario como "me dijeron que enferma" no prueba nada» (el TTS no distingue comillas: mejor «un comentario del tipo: me dijeron que enferma, no prueba nada»).
4. Contenido correcto: dato de organismos de salud (no daño bajo los límites), contraejemplo (un caso aislado no prueba causa; «seguro sin datos» tampoco), `antena` (torre de seis antenas, tres casas, sin personas) y `tecnico` (manos correctas, aparato de mano) coinciden con alt/descripcion y no revelan respuesta. SVG `dos-frases` y `cinco-pasos` legibles.
5. G: e03 retro («Confundirla con un dato es un error») poco natural. No cambia respuestas; corrección mínima: «Una postura es la idea que defiendes; no es un dato.».

## cyt.p5.atmosfera-hidrosfera-litosfera (`primaria-5/fichas/estructura-externa-de-la-tierra.json`): APROBADA

Contenido correcto para 5.º: atmósfera = aire, hidrosfera = toda el agua (mares, ríos, lagos, glaciares y agua subterránea), litosfera = rocas y suelo (también bajo el mar); contraejemplo «solo el mar» adecuado; comprobación del glaciar de Huascarán sin ambigüedad (opciones 25–26 caracteres). `costa`, `misti`, `lluvia` y `capas` coinciden con alt/descripcion, sin personas ni texto. Observaciones menores:
1. `misti` es un cono genérico que recuerda al Fuji (sin nieve ni cráter claro); el autor lo declaró. Aceptable; opcional narrar «un volcán como el Misti» en lugar de afirmar que es el Misti.
2. `ejemplo-2-razona`: «La lluvia viene de la atmósfera» y «el agua que corre es hidrosfera» — la lluvia también es agua; coherente con el banco (nubes como atmósfera en e05/e08), pero conviene decir «la lluvia cae desde las nubes del aire».
3. `situacion-costa`: la narración enumera lo que se ve (olas, arena, roca, nubes), la pregunta casi se contesta sola; aceptable para una situación inicial.

## cyt.p6.areas-naturales-protegidas (`primaria-6/fichas/biodiversidad-del-peru.json`): CAMBIOS

1. Momento `ejemplo-2-observa` y recurso `manglar` (alt, descripcion y texto del SVG `areas-naturales-protegidas-manglar-raices.svg`): «arbustos». Los mangles de Tumbes son árboles (varios metros) y la narración los llama luego «un bosque de costa». Corregir a «árboles» en narración, alt, descripcion y en el rótulo del SVG («Árboles con raíces en el agua»).
2. `ejemplo-2-observa`: la narración dice «el área que los protege se llama Los Manglares de Tumbes» y pregunta «¿qué cuida?»; el nombre ya da la respuesta. Corregir: no nombrar el área hasta `razona` («Es el Santuario Nacional Los Manglares de Tumbes») y preguntar «¿qué tipo de área es?».
3. `comprobacion.pista` («Busca la categoría que acepta usar los recursos, pero con reglas») reproduce casi la definición de reserva nacional (opción b); reformular: «Piensa en una categoría donde la gente puede usar el bosque, pero sin acabarlo».
4. Contenido verificado: parque nacional = protección estricta; reserva nacional = uso sostenible (Paracas, pesca artesanal con reglas: correcto); Santuario Nacional Los Manglares de Tumbes (correcto). `guardaparque` y `pescador` (un solo pescador, pequeño, sin parche visible) coinciden con alt/descripcion; `pescador` no revela la categoría.
5. G: e03 «Una área» → «Un área» (afecta al alumno: error ortográfico visible y se lee en voz alta); corrección mínima de enunciado. e02 con «Machu Picchu» (santuario histórico) como distractor: válido. e11 («1 500 000 ha», 10 %) correcto, pero «ha» se leerá mal en voz alta; cambiar a «hectáreas» (mínimo).

## G. Ejercicios existentes (resumen para el orquestador)

- `areas-naturales-protegidas` e03: «Una área» → «Un área» (aplicar). e11: «ha» → «hectáreas» (recomendado por audio).
- `alimentos-procesados` e10: el enunciado trae las opciones («azúcar o fibra»), pista que la entrega; corrección mínima: «¿Qué ingrediente en exceso olvida? Escribe una palabra.». e11 larga para 3.º, no bloquea.
- `antenas-de-telefonia` e03: retro poco natural (ver arriba), no afecta respuestas.
- Ficha p5 asexual: ejemplo «Una llama y un macho» (redacción), no afecta la clase guiada.
- «Correcta más larga» en varias fichas (lint info): defecto conocido de los ejercicios existentes, sin cambios dentro de este lote.

## Ronda 2 (2026-11-16)

Verificaciones: lint de clase guiada sobre las 4 claves: 0 errores, 0 avisos (solo info «correcta más larga» en ejercicios existentes); `nudito-validar-banco`: válido (2238 fichas, 27034 ejercicios); `tsc --noEmit`: sin errores. Letras de comprobación: c, b, a, b. Se abrieron la fresa v2 (una planta grande, una fresa, tallo largo y plantita de dos hojitas; sin texto ni personas; coincide con alt/descripcion) y los SVG manglar (rótulo «Árboles con raíces en el agua», tres árboles) y papa; ambos coinciden con alt/descripcion.

| Clave | Veredicto |
|---|---|
| cyt.p3.alimentos-procesados | APROBADA |
| cyt.p5.asexual-sexual | APROBADA |
| cyt.p6.antenas-de-telefonia | APROBADA |
| cyt.p6.areas-naturales-protegidas | APROBADA |

Defectos de ronda 1 resueltos: mercado sin «ni en bolsa ni en lata» y despensa sin pista; fresa señala la plantita nueva y pregunta por plantas; papa sin «de una misma papa» en observa; «Resumiendo los pasos», «del tipo: me dijeron…», comprobación y pista de antenas sin revelar; «árboles» en narración, alt, descripcion y SVG del manglar, área nombrada solo en razona, pista sin definición. Ejercicios autorizados (e10, e03, e03/e11) con id, dificultad y respuesta intactos. Sin defectos nuevos.
