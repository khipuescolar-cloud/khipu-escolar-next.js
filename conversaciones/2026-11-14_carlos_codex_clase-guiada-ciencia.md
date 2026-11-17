# Prueba de clase guiada: La tecnología avanza con la ciencia

| Campo | Valor |
|---|---|
| Fecha | 2026-11-14 |
| Colaborador | Carlos (dueño del producto) |
| Agente y modelo | Codex · gpt-5.6-luna |
| Rama y commits | `dev` · pendiente de registrar |
| Specs afectadas | `specs/41-nudito-tutor.md`, `specs/50-nudito-banco-de-conocimiento.md` |

## Pedidos del colaborador (textual)
> okey me gusta , podrias probar algo similar con ese tema para ver como funciona

> bueno me gusta , pero estamos tratando el tema "La tecnología avanza con la ciencia" verdad? ya puedes implementarlo en el sistema para probarlo porfavor

## Decisiones
- La prueba queda acotada a «La tecnología avanza con la ciencia» de Ciencia y Tecnología de 5.°.
- No se cambia `src/lib/nudito/contratos.ts`, que el proyecto mantiene congelado.
- Se conserva el formato de respuesta de la API; la selección y retroalimentación de la pregunta viven en la UI.
- El diagrama se guarda como SVG versionado dentro de la ficha del banco.
- Se aclara que refrigerar retrasa el crecimiento de muchos microbios, pero no los elimina a todos.

## Cambios realizados
- La pantalla de repaso separa los ejemplos en tarjetas y muestra los pasos como lista numerada.
- Se agregó un diagrama de la relación mutua entre ciencia y tecnología.
- Se agregó una pregunta de opción múltiple con pista al equivocarse y retroalimentación al responder bien; habilita la práctica después de acertar.
- Se mejoró la idea central, ejemplos y errores frecuentes de la ficha `cyt.p5.ciencia-y-tecnologia`.
- Se actualizaron las specs 41 y 50.

## Validación
- Banco, ESLint y TypeScript validados durante la implementación. Ver las comprobaciones posteriores registradas abajo.

## Pendientes y preguntas abiertas
- Probar visualmente en móvil y escritorio desde el perfil de alumno de 5.°.
- Si Carlos aprueba el formato, definir una estructura general de interacciones en el contrato de lecciones antes de expandirlo a otras fichas.

## Consulta posterior: tema ausente del selector del alumno

Solicitud del colaborador, copiada literalmente:
> por que no me aparece el curso [Image #2] si ahi mismo esta

Diagnóstico: la implementación de la clase editó el JSON de la ficha. El sistema calcula una huella sobre tema y ficha; si la huella actual difiere de `huellaContenidoRevisado`, `temaVisibleParaAlumno` oculta el tema. El estado “Habilitado para alumnos” en el temario indica que se publicó la versión del plan, pero no elimina este filtro editorial por tema. El panel de contenido muestra “pendiente_revision” y “El contenido o la ficha cambió desde la última revisión. Los alumnos no lo ven.” La causa estática encaja con que el plan del docente incluya el tema, pero el alumno no lo reciba.

Pendiente: verificar en el panel Plataforma > Contenido la ficha `cyt.p5.ciencia-y-tecnologia` para primaria 5.° y volver a revisarla con el checklist editorial. No se modificó el estado editorial en la base de datos ni se eludió esa revisión.

## Aclaración: revisión aprobada pero el tema no aparece

Solicitud del colaborador, copiada literalmente:
> si esta aprobado la revision, pero aun asi no aparece

Corrección al diagnóstico previo: la revisión editorial aprobada descarta la hipótesis de que siga pendiente, si corresponde a la versión actual. No se confirmó el estado consultando la base de datos. El código del selector carga exclusivamente la foto de la última versión publicada del plan para el año, nivel, grado y curso del salón del alumno (`temasPublicadosDelAlumno`), luego aplica el catálogo y la huella editorial. No usa directamente la lista editable del temario.

Hallazgo comparativo: la profesora muestra “La tecnología avanza con la ciencia” como tema 1, pero el selector del alumno empieza con “Célula animal y célula vegetal”. Como la foto del plan conserva su orden, esto apunta a que la vista del alumno está consultando otra cohorte/versión publicada o que la clave no pasa alguno de los filtros. No alcanza para afirmar cuál sin confirmar que ambas pantallas corresponden al mismo colegio, año, nivel, grado y curso, y sin inspeccionar los datos del plan publicado.

Pendiente: confirmar coincidencia de año/grado/salón entre la alumna y el temario de Pedro; después verificar la versión publicada y clave exacta sin consultar datos personales innecesarios.

## Evidencia: botón de reanudación rechaza el tema

Solicitud del colaborador, copiada literalmente:
> mira esto me dice, pero en realidad el tema si esta seleccionado y si esta aprobado

La captura muestra la bienvenida ofreciendo reanudar «La tecnología avanza con la ciencia», seguida del error «Ese tema ya no está disponible». Causa confirmada en el flujo: `iniciarSesion` ofrecía reanudar una sesión al encontrar el tema en el catálogo, pero `temaDeSesion` al continuar también exige que el tema pertenezca al plan publicado actual y tenga práctica. Se alineó la condición de la bienvenida con esa validación y se actualizó la spec 41; no se cambió el plan ni se modificó la aprobación editorial. Si el tema sí está en la última versión publicada, la validación nueva permitirá reanudarlo; si no, la bienvenida dejará de ofrecer esa sesión y aún habrá que revisar la versión/cohorte.

Validación de esta corrección: ESLint sobre `src/lib/server/nudito/sesiones.ts`, `pnpm typecheck` y `git diff --check` terminaron sin errores. La validación del banco ya se había ejecutado antes en esta sesión y confirmó 2,238 fichas activas y 27,034 ejercicios. No se ejecutó la suite de pruebas.

## Resolución verificada del tema ausente

Solicitud del colaborador, copiada literalmente:
> aun asi, no aparece, puede encontrar el problema y solucionarlo porfavor

Se consultó exclusivamente el índice editorial global y el plan demo local, sin imprimir credenciales ni datos personales. Causa confirmada en la BD: `cyt.p5.ciencia-y-tecnologia` tenía estado `revisado`, con fecha 2026-11-12, pero `huellaContenidoRevisado` no coincidía con `huellaActualDeTema`. El estado revisado permanecía aprobado para la ficha anterior; la edición de esta sesión venció esa coincidencia. Las hipótesis anteriores de curso/cohorte no quedaron confirmadas y no eran necesarias para explicar la ausencia.

Con la confirmación explícita del colaborador de que el contenido está aprobado y su solicitud de corregirlo, se sincronizó únicamente la huella de esta ficha en la BD local. La transacción usó comparación con la huella anterior para evitar cambios concurrentes y registró `curriculum_revision_local_codex` bajo la identidad administrativa demo, con detalle explícito de que ejecutó Codex en workspace local, a solicitud del colaborador. Conservó estado y metadatos de la revisión anterior; no se modificaron otros temas, planes ni datos de alumnos.

Verificación con la foto publicada y las funciones compartidas `catalogoDelCursoConIndice`, `huellaActualDeTema` y `temaVisibleParaAlumno`: 15 temas publicados, 15 visibles, tema piloto incluido. `tests/unit/curriculum-autorizacion.test.ts`: 10 pruebas aprobadas. Se añadió a la spec 50 la necesidad de recapturar la revisión cuando cambia una ficha piloto.

Pendiente: recargar el selector del navegador. Si el proceso de desarrollo conserva la huella anterior en memoria, reiniciar `pnpm dev` y volver a entrar al curso. No se verificó visualmente en una sesión del navegador.

## Lección narrada y guiada

Solicitud del colaborador, copiada literalmente:
> okey me gusta lo que acabas de hacer y porfavor la solucion que acabas de impartir guardala por si en un futuro alteramos otras cosas ya sabes como solucionarlo; pasando a lo que me muestras; veo que todo esta muy bien; pero veo que necesitamos que esto se explique solo, que tenga audio como hablandole; la imagen tambien debe tener una descripcion , luego los ejemplos tambien debe ser hablado y que se muestre poco a poco lo que se vaya leyendo, de igual manera con todos los pasos a seguir, pero que esto sea como un paso a paso, que termine uno y solicite pasar y pasar y pasar; me dejo entender?

Decisión: el piloto se convierte en una lección guiada que el alumno controla. Divide la explicación en idea central, diagrama, tres tramos por ejemplo (situación, explicación e idea clave), pasos individuales y comprobación. La voz utiliza `SpeechSynthesis` del navegador en español peruano, sin proveedor externo, claves ni almacenamiento de audio. Al seleccionar «Siguiente», se muestra y se narra el siguiente momento; el alumno puede repetir, detener y volver. No hay avance automático.

Se añadió `descripcion` opcional a los recursos de las fichas para texto alternativo y un bloque visible de descripción. Se documentó en specs/50 que una huella vencida debe recapturarse únicamente tras revisión pedagógica explícita; nunca se sincroniza en masa automáticamente.

Validación: `pnpm nudito:validar-banco` confirmó 2,238 fichas activas y 27,034 ejercicios; ESLint en los archivos modificados, `pnpm typecheck` y `git diff --check` terminaron sin errores. No se ejecutó E2E visual ni se creó audio almacenado: la narración usa la capacidad local del navegador.

Como la descripción nueva cambia la ficha, se recapturó su huella solamente en la BD local luego de la aprobación explícita del colaborador para esta implementación. Verificación posterior: el plan publicado contiene 15 temas, los 15 son visibles y el piloto está incluido.

## Ajuste de voz escolar

Solicitud del colaborador, copiada literalmente:
> uhmmm...
> No me gusta el concepto de la idea principal, puedes hacerlo mas colegial? no me gusta su estilo de escritura; quiero que le des una estilo mas escolar, mas dinamico, mas entuciasta : este texto no me convence: La ciencia investiga cómo funciona la naturaleza. La tecnología crea herramientas para resolver necesidades y aplicar conocimientos. Se ayudan mutuamente: las herramientas permiten nuevas observaciones, y esos descubrimientos pueden mejorar la tecnología.

Se reemplazó la idea central por una invitación directa a observar, hacer preguntas y descubrir. Mantiene la relación bidireccional entre ciencia y tecnología y usa el microscopio como ejemplo cercano.

Validación: el banco volvió a validar con 2,238 fichas activas y 27,034 ejercicios. Se recapturó la huella de esta ficha aprobada en la BD local para conservar su visibilidad.

## Reaparición del tema oculto durante desarrollo

Solicitud del colaborador, copiada literalmente:
> volvio a desaparecer el tema del temario de nudito para el alumno

Causa confirmada: `huellaActualDeTema` mantenía en memoria las fichas y los temarios propuestos. En un servidor de desarrollo que ya había leído la ficha anterior, el cálculo de visibilidad seguía usando esa copia aunque la base local ya tuviera la huella nueva. Se corrigió el cálculo: en desarrollo lee las fuentes desde el disco en cada consulta; en producción conserva la caché, donde el contenido solo cambia con un despliegue. La política editorial se mantiene: cambiar una ficha todavía requiere una revisión explícita para actualizar su huella.

Validación: ESLint, TypeScript y la comprobación de espacio del diff terminaron sin errores. La lectura de huella en modo desarrollo fue estable y la verificación del plan local devolvió 15 temas publicados, 15 visibles e incluyó el tema piloto.

## Voz pedagógica del piloto

Solicitud del colaborador, copiada literalmente:
> en la observacion de la situacion , menciona directo : "Una lupa permite ver detalles pequeños de una tela. ¿Cómo ayuda el conocimiento sobre la luz a fabricar una herramienta así?" pero me gustaria que explique un poco mejor lo que esta haciendo como "Ahora te presentare una situacion de la cual podrias vivirlo en tu dia a dias, por ejemplo una de las tecnologias de los ultimo tiempos es la lupa y su uso para poder ver pequeños detalles, ¿Como crees que ayuda el conocimiento sobre la luz, el fabricar una herramienta como esa?" ; bueno algo asi me gustaria que diga , pero mas jovial, mas colegial, mas educativo e interactivo, porfavor asi para todos los textos de este tema porfavor, para luego poder revisarlo y si lo apruebo poder usarlo para todos los temas que tenemos, pero primero necesito que estructuremos el tipo de respuesta, mensaje y forma de enseñar para nudito

Decisión: definir y probar el patrón «conectar, invitar a pensar, acompañar, cerrar» solo en la ficha piloto. Se reescribieron idea central, pasos, descripción del diagrama, ejemplos, correcciones de errores, vocabulario, enunciados, pistas y retroalimentación de los 12 ejercicios. Se preservaron las respuestas, alternativas y la progresión de dificultad. El patrón queda documentado en specs/41 para revisión pedagógica antes de extenderlo al resto del banco.

Validación: `pnpm nudito:validar-banco`, `pnpm typecheck` y `git diff --check` no reportaron errores. Tras la validación se recapturó la huella de esta ficha aprobada en la BD local.

## Error al abrir Nudito por límite diario

Solicitud del colaborador, copiada literalmente:
> me da este error : Encountered a script tag while rendering React component. Scripts inside React components are never executed when rendering on the client. Consider using template tag instead (https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template).

El registro del servidor mostró la causa primaria: el alumno alcanzó `sesionesPorDia` y `iniciarSesion` lanzó `ErrorDeNegocio` con «¡Hoy practicaste un montón! Mañana seguimos con más.». Al propagarse desde la página de servidor produjo GET `/nudito` 500; el aviso sobre `script` era un efecto secundario del overlay de error de desarrollo. Se corrigió la ruta para reconocer los mensajes de límite y presentar un estado de descanso amigable, sin ocultar otros errores de negocio inesperados.

Validación: ESLint en la página, la lección y la huella; `pnpm typecheck`; `pnpm nudito:validar-banco`; y `git diff --check` finalizaron sin errores.

## Voz femenina y expresiva

Solicitud del colaborador, copiada literalmente:
> puedes poner la voz de una mujer? que sepa usar los latos y bajos de las explicaciones?

Se ajustó la narración local del navegador. Como Web Speech no expone el género de una voz de forma fiable, prioriza voces españolas disponibles con nombres habituales de voces femeninas (por ejemplo, Mónica, Paulina, Sabina, Helena o Dalia); si el equipo no tiene una, usa la mejor voz española disponible. La explicación se divide por frases: las preguntas elevan suavemente el tono y ritmo; las explicaciones se narran más pausadas; los cierres bajan ligeramente el tono. El alumno conserva los controles para repetir o detener la lectura.

## Habilitación temporal de pruebas locales

Solicitud del colaborador, copiada literalmente:
> bueno ahora me aparece asi: Por hoy terminamos de practicar
> ¡Hoy practicaste un montón! Mañana seguimos con más.
>
> Puedes descansar, volver a mirar tus apuntes y regresar cuando Nudito esté disponible.
> necesito hacer las pruebas yaaa

Se ajustó únicamente la configuración de Nudito en la base local del colegio demo: `sesionesPorDia` pasó de 6 a 50 y `minutosPorDia` permanece sin límite. El primer intento con 100 fue rechazado por la restricción de base de datos que admite como máximo 50; no produjo cambios. No se modificó código, producción ni datos de alumnos.

## Clase audiovisual continua e ilustrada

Solicitud del colaborador, copiada literalmente:
> sigo escuchandolo como varon, no como mujer; ahora lo otro que te dije fue que mientras va hablando la letra va apareciendo, de esa manera se vuelve un poco mas dinamico, ademas que me gustaria que muestren imagenes o iluciones que representen lo que estan pidiendo imaginarse, cuando hablan de un microscopio o de una lupa , me gustaria que se mas dinamico, ademas que me gustaria que cuando termine de hablar la idea principal, pase automaricamente a hablar el siguiente o pase al siguiente automaticamente, como si fuera un video por eso mismo te pedia que tenga como imagenes que ilustren las explicaciones y tambien que las letras sean dinamicas , que si quieren pausar la explicacion que tengan un boton en la parte superior donde esta el progreso , y si quieren seguir con la explicacion pueden seguir sin problemas

Decisión: el piloto pasa de una lección por pasos exclusivamente manual a una reproducción continua, similar a una clase breve en video. Al iniciarla, cada texto se revela gradualmente mientras se narra; al acabar cada momento, avanza al siguiente. La barra de progreso contiene los controles de iniciar, pausar y reanudar, y se conservan la navegación y la repetición manuales. Se añadieron ilustraciones originales locales para la lupa y tejido, el microscopio y células, y la comparación entre charqui y refrigeradora, siempre con texto alternativo.

La API Web Speech del navegador no proporciona una propiedad fiable para saber el género de una voz ni puede instalar una voz que el equipo no posea. Ahora prioriza voces españolas cuyos nombres habituales corresponden a voces femeninas y muestra un selector con las voces españolas instaladas, de modo que se pueda elegir explícitamente una voz femenina cuando el sistema la ofrezca. Para una voz femenina garantizada se requeriría aprobar posteriormente un proveedor de voz o archivos de audio, lo cual no se agregó.

Recursos generados con la herramienta interna de imágenes: `public/nudito/ilustraciones/lupa-y-tejido.png`, `public/nudito/ilustraciones/microscopio-y-celulas.png` y `public/nudito/ilustraciones/charqui-y-refrigeradora.png`.

## Transición a comprobación y navegación hacia atrás

Solicitud del colaborador, copiada literalmente:
> entonces no hay problema, seguiremos usando esta voz ; aqui va otra pregunta, el paso 4 no comprendo para que sirve si no explica nada, solo dice esto: "
> Para cerrar, cuenta la historia completa: la ciencia y la tecnología se ayudan una a la otra." en vez de eso solo podrias mencionar el "Comprobemos lo aprendido" y mencionas las alternativas , ademas me gustaria que quites la opcion de "voz" ya que como te dije no se puede cambiar de voz, asi que esta de mas dejarlo ahi ; otra cosa importante es que no deja retroceder , estoy en el momento 12 de 13 y no me deja retroceder

Decisiones: se retiró el selector de voz y se mantiene la voz predeterminada del navegador. El cuarto paso ahora anuncia «Comprobemos lo aprendido»; durante la narración enumera las alternativas reales de la pregunta y deja sus botones visibles para responder. El contador ya no suma la comprobación como un momento separado: forma parte del último paso. Se conserva siempre el botón «Anterior» desde el segundo momento, incluido el último, para que la reproducción automática nunca bloquee el retroceso.

Como el texto de la ficha cambió tras la aprobación explícita del colaborador, se validó el banco y se recapturó solo la huella de `cyt.p5.ciencia-y-tecnologia` en la base local, mediante actualización condicional y auditoría `curriculum_revision_local_codex`. No se cambiaron temas, planes ni información de alumnos.

## Comprobación directa y locución natural

Solicitud del colaborador, copiada literalmente:
> el boton de "Tengo una pregunta" hay que ocultarlo por mientras porfavor; ademas este tipo de textos : ""Atención: el frío no elimina a todos los microbios, pero ayuda a que el alimento dure más tiempo."" no me parecen correctos por que al escucharlo no tienen un buen dialogo; creo que deberias de dejar de usar esos tipos de mensajes que llevan ":" ; debido a que no ayudan al audio; otra cosa que deberia mencionarte es que en el puesto 4, dejes de mostrar el texto y muestres lo que tenemos para poder interactuar, s

> el boton de "Tengo una pregunta" hay que ocultarlo por mientras porfavor; ademas este tipo de textos : ""Atención: el frío no elimina a todos los microbios, pero ayuda a que el alimento dure más tiempo."" no me parecen correctos por que al escucharlo no tienen un buen dialogo; creo que deberias de dejar de usar esos tipos de mensajes que llevan ":" ; debido a que no ayudan al audio; otra cosa que deberia mencionarte es que en el puesto 4, dejes de mostrar el texto y muestres lo que tenemos para poder interactuar, quita esto [Image #1] y muestra esto [Image #2] ya que actualmente se ve asi: [Image #3] y no me gusta

Decisiones: «Tengo una pregunta» queda oculto temporalmente, sin eliminar su implementación. Se eliminó el cuarto paso narrativo y, al acabar el tercer paso, aparece directamente el bloque interactivo de «Comprobemos lo aprendido» con sus alternativas y el control «Anterior». Se retiró la narración que repetía tanto la idea como las alternativas. La idea central y los ejemplos del piloto reemplazan los dos puntos de rótulos conversacionales por oraciones cortas con pausas naturales, incluida la advertencia sobre el frío y los microbios.

Validación: `pnpm nudito:validar-banco` confirmó 2,238 fichas activas y 27,034 ejercicios. ESLint sobre los dos componentes, `pnpm typecheck` y `git diff --check` terminaron sin errores. Tras la aprobación explícita del cambio editorial se recapturó únicamente la huella de la ficha piloto en la BD local con auditoría.

## Cierre concreto y comprobación narrada

Solicitud del colaborador, copiada literalmente:
> como te digo este texto : "Para cerrar, cuenta la historia completa: la ciencia y la tecnología se ayudan una a la otra." no me transmite nada, no comprendo , tambien me gustaria que el siguiente paso que es para comprobar lo aprendido se pueda escuchar tambien

Se confirmó que esa frase ya no existe en la ficha vigente; podía seguir visible en una sesión cargada antes de la corrección. La comprobación ahora conserva la interfaz directa, sin mostrar otro bloque de texto, pero se narra automáticamente. El audio conecta una conclusión concreta con la lupa, la luz, las lentes, el microscopio y las nuevas preguntas científicas; después lee la pregunta y cada alternativa. El alumno también dispone de «Escuchar pregunta y alternativas» para repetirlo.

## Regreso a la teoría desde la práctica

Solicitud del colaborador, copiada literalmente:
> aqui me gustaria un boton para poder volver a la teoria, una vez ya ayas empezado a practicar

Se añadió «Volver a la teoría» en los controles de cualquier ejercicio. No termina ni reemplaza el ejercicio abierto; muestra el repaso actual y, al volver a usar «¡A practicar!», el servidor devuelve ese mismo ejercicio abierto. Así el alumno puede reforzar la explicación sin perder su avance ni generar un ejercicio nuevo.

## Corrección de regreso vacío desde una sesión reanudada

Solicitud del colaborador, copiada literalmente:
> le acabo de dar click y me aparece la pantalla vacia

Causa: al reanudar una sesión que ya estaba en práctica, el cliente recuperaba el ejercicio abierto pero no cargaba el objeto del repaso. El botón cambiaba de vista de inmediato y no había contenido que mostrar. Se corrigió `Volver a la teoría`: si el repaso ya está en memoria navega de inmediato; si no, solicita primero el repaso al servidor y cambia de vista únicamente cuando llega una respuesta válida. El ejercicio abierto no se modifica.

## Controles superiores, animación y audio de ejercicios

Solicitud del colaborador, copiada literalmente:
> los botones de anterior y siguiente en la vista de teoria, deberian verse al costado de donde dice "Iniciar Clase" ; ademas que para que las letras aparezcan de manera interactiva y con mas estilo podrias usar librerias como esta : ## Integrate the <SplitText /> component from React Bits

> ... ademas me gustaria que los ejercicios tambien tengan la opcion de poder escucharse y que tengan una mejor diseño por que se ve desorganizados, si pudieras instalar la skill de Impecable que esta para Claude pero que tu lo uses seria genial para que asi puedas tener esa base de conocimiento para poder mejorar el diseño

Se movieron «Anterior» y «Siguiente» a la franja superior, junto a iniciar, pausar y reanudar la clase. GSAP y `@gsap/react` ya eran dependencias del proyecto; se integró `SplitText` en `TextoAnimado` para revelar por letras los enunciados de ejercicios, con respeto a `prefers-reduced-motion`. La tarjeta de ejercicio ahora separa visualmente avance, lectura, enunciado y respuesta, y permite escuchar o detener la narración de la lectura y el enunciado.

Se localizó la skill pública Apache-2.0 `pbakaus/impeccable`, se revisó su manifiesto y se instaló en el directorio de skills de Codex. Según su instalador, estará disponible en el siguiente turno; no se añadieron hooks al proyecto ni dependencias nuevas. Validación de esta iteración: ESLint de los componentes afectados y `pnpm typecheck` sin errores.

## Ejercicios inclusivos para escucha

Solicitud del colaborador, copiada literalmente:
> veo doble la pregunta, ademas no veo el signo de pregunta y tampoco menciona las alternativas, tienes que hacer que el sistemas en este modulo sea Inclusivo para personas que no puedan leer , solo escuchar, entonces tienes que explicar a mas detalle las cosas que muestras

Con la revisión de Impeccable se corrigió la jerarquía del ejercicio. En verdadero/falso la tarjeta presenta ahora «¿Esta afirmación es verdadera o falsa?» y la afirmación una sola vez; los botones mantienen su etiqueta accesible. «Escuchar ejercicio» narra una instrucción completa y las alternativas disponibles. Para opción múltiple enumera cada alternativa; para lectura, relacionar, escritura y respuestas breves adapta la guía a las preguntas y acciones reales. Esto permite completar el ejercicio escuchando, sin depender de que el alumno lea los botones.

## Pregunta natural para verdadero/falso

Solicitud del colaborador, copiada literalmente:
> pero en este tipo de preguntas no deberia decir , "¿es verdad que la ciencia busca conoccer y explicar como funciona la naturaleza?" en vez de " la ciencia busca conocer y explicar cómo funciona la naturaleza."

Se ajustó el formato de verdadero/falso para convertir automáticamente la afirmación en una pregunta natural, tanto en la tarjeta como en la narración. Por ejemplo, «La ciencia busca conocer y explicar cómo funciona la naturaleza» se presenta como «¿Es verdad que la ciencia busca conocer y explicar cómo funciona la naturaleza?». El audio continúa indicando que las opciones son «Verdadero» y «Falso».

## Corrección de texto visible en verdadero/falso

Solicitud del colaborador, copiada literalmente:
> pero no veo el texto

La captura mostraba una compilación anterior que aún enseñaba la pregunta genérica. Se reforzó el componente para construir el texto visible desde la primera afirmación real del ejercicio, en vez de depender del enunciado general. Así la tarjeta debe mostrar siempre la pregunta completa y natural. Para cargar el cambio en un servidor de desarrollo que no haya actualizado el módulo, se requiere recarga forzada o reiniciar `pnpm dev`.

## Pregunta contextualizada de ciencia

Solicitud del colaborador, copiada literalmente:
> que es esta pregunta, esta mal redactada "¿Es verdad que empecemos pensando como científicas y científicos: la ciencia busca conocer y explicar cómo funciona la naturaleza?"; lo ideal seria "Empecemos pensando como científicas y científicos; comencemos ¿Es verdad que la ciencia busca conocer y explicar cómo funciona la naturaleza?" ; asi deberia preguntarse , porfavor tienes que utilizar tu coherencia e inteligencia para poder formular tus preguntas

Decisión: separar la invitación de la pregunta, sin convertir todo el texto mecánicamente. La ficha ahora dice: «Empecemos pensando como científicas y científicos. ¿Es verdad que la ciencia busca conocer y explicar cómo funciona la naturaleza?». El componente conserva los enunciados que ya contienen una pregunta y solo transforma afirmaciones que aún no la tienen. También oculta la afirmación interna cuando su contenido ya está incluido en la pregunta contextualizada.

Validación: `pnpm nudito:validar-banco` confirmó 2,238 fichas activas y 27,034 ejercicios; ESLint, TypeScript y `git diff --check` no reportaron errores. Con aprobación explícita, se recapturó únicamente la huella de la ficha piloto en la BD local y se registró auditoría.

## Corrección de animación durante el audio

Solicitud del colaborador, copiada literalmente:
> cuando el audio empieza , el texto se queda en un bucle infinito que no deja terminar de escribir todo el texto, soluciona ello porfavor

Causa: el texto progresivo cambia en cada palabra hablada y `TextoAnimado` reiniciaba GSAP SplitText ante cada cambio, por lo que la animación no alcanzaba a terminar. Se añadió un control para desactivar esa animación mientras hay reproducción; el texto sigue apareciendo palabra por palabra sincronizado con el audio. Fuera de la reproducción, el revelado animado se conserva.

Validación: ESLint, TypeScript y `git diff --check` finalizaron correctamente.

## Transición suave palabra por palabra

Solicitud del colaborador, copiada literalmente:
> pero no me gusta como esta, cuando se escucha el audio el estilo de mostrar el texto es muy brusco, no tiene el estilo que te dije que tenga donde todo es delicado y usa una buena transicion, porfavor quiero que sea el de la transicion pero sin ese bug que te comente

Se conserva el texto incremental y ahora cada fragmento nuevo entra con opacidad y un desplazamiento vertical de 3 px durante 550 ms; los fragmentos anteriores no se vuelven a animar ni reinicia la frase. La ruta de texto estático mantiene SplitText, y la preferencia de movimiento reducido evita los efectos. ESLint, TypeScript y `git diff --check` pasaron.

## Corrección de visualización y ejercicios guardados

Solicitud del colaborador, copiada literalmente:
> ahora se ve asi, porfavor solucionalo ; y el texto de las preguntas de verdad y falso se ven asi : [Image #2] supuestamente no habiamos arreglado la pregunta? para que tenga una mejor formato?

Se reemplazó la manipulación manual del texto incremental por fragmentos controlados por React, con transición suave y movimiento reducido respetado. Esto evita conservar texto anterior y espacios vacíos al reiniciar o cambiar de pantalla. Los ejercicios abiertos guardan una copia del enunciado anterior en la sesión; para esa copia, se separa la introducción de la afirmación y se formula la pregunta correctamente sin modificar la respuesta guardada.

## Revelado de teoría por letras

Solicitud del colaborador, copiada literalmente:
> no tiene el estilo que esperaba tener, por que ? quiero la transicion que te habia pedido, la misma que tiene la pregunta de practica

Se cambió la transición de cada palabra nueva para revelar sus letras individualmente con el mismo desplazamiento y tiempos de la pregunta de práctica, sin reiniciar el texto ya mostrado. Se mantiene una alternativa para lectores de pantalla y la preferencia de movimiento reducido.

## Pregunta anterior al avanzar de ejercicio

Solicitud del colaborador, copiada literalmente:
> en las demas preguntas no cambia la pregunta, pero si se escucha la pregunta que le corresponde, por que sucede eso ? puedes solucionarlo?

La tarjeta reutilizaba el mismo componente al cambiar de ejercicio, mientras SplitText gestionaba nodos del enunciado anterior; esto podía dejar el texto visible desactualizado aunque el audio y las alternativas recibieran los datos nuevos. Se identifica la tarjeta por el identificador del ejercicio para desmontar la animación y crearla de nuevo al avanzar. También se detiene el audio anterior al desmontar la tarjeta.
