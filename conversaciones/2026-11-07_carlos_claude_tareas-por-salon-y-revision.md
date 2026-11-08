# Tareas por salón y curso, agenda de revisión y solo cursos que dicta

| Campo | Valor |
|---|---|
| Fecha | 2026-11-07 |
| Colaborador | Carlos (producto) |
| Agente y modelo | Claude Code · claude-opus-5-5 (Codex sin créditos hasta 2026-11-11) |
| Rama y commits | sin commit al cerrar la sesión (cambios en el árbol de trabajo de `main`) |
| Specs afectadas | `specs/39-tareas.md` |

## Pedidos del colaborador (textual)
> ahora vamos por e modulo de tareas, de igual manera tiene que estar agrupados por salones y cursos; tambien me tiene que mostrar cuales son las tareas que
> debo revisar el dia de hoy o estan proximas a revisar, [Image #2] tambien tengo esto al querer revisar una tarea asi que solucionalo, ademas no entiendo
> como puedo dejar tarea a un salon que no enseño, no deberia dejar hacer eso , porfavor trabajar con mucho cuidado y cualquier duda que tengas me dices

## Decisiones
- La imagen no llegó al agente. Se reprodujo con la tutora de 3.° B: la lista mostraba tareas de cursos de su salón que dictan otros profesores y «Revisar entregas» llevaba a «No tienes acceso a esta sección» (403). Se asumió que ese era el error.
- Causa común de los dos problemas: tareas usaba `cursosDelDocente`/`requireCursoDelProfesor`, que incluyen los cursos de los salones que el docente tutorea. Para tareas ahora solo cuentan los cursos que dicta (`profesorId`), igual que pasar lista (specs/04).
- «Para revisar»: «Hoy» = vence hoy, o venció / sin fecha con entregas sin revisar; «Próximos 7 días» = vence en la semana. Solo para profesores, y siempre mira las tareas activas.
- Una tarea con varias secciones aparece en cada salón, con «También en …» y los contadores de esa sección.

## Cambios realizados
- `src/lib/server/cursos.ts`: `cursosQueDicta`.
- `src/lib/server/tareas/comun.ts`: `requireCursoQueDicta`; `gestion.ts` lo usa en crear, gemelos, destinatarios y vista previa.
- `src/lib/server/tareas/vistas.ts`: `tareasDelDocente` devuelve secciones revisables con contadores por sección (`porRevisar`) y tipo `TareaDocente`.
- `src/lib/tareas.ts`: regla pura `agendaDeRevision`.
- `src/app/colegio/[slug]/tareas/ListaDocente.tsx` (nuevo) y `page.tsx`: bloque «Para revisar» y lista agrupada por salón → curso.
- Pruebas: unit `tareas-reglas` (agenda), integración `tareas-classroom` (tutor sin cursos ajenos, contadores por sección), e2e `tareas-classroom` y `tareas-agenda` adaptados a la lista agrupada.

## Validación
- `pnpm lint`, `pnpm typecheck`: sin errores.
- `pnpm test`: 155 archivos, 1239 pruebas en verde, más las nuevas de tareas (29 en los dos archivos de tareas).
- e2e (puerto 3060): `tareas-classroom`, `tareas-agenda`, `registro-notas` y `materiales-clase` en verde.
- Navegador: en todos los «Revisar entregas» de la tutora y de un docente con 4 salones, ningún 403. Sin desplazamiento horizontal a 390 px.

## Pendientes y preguntas abiertas
- Confirmar con Carlos que el error de la imagen era el 403.
- El tutor ya no ve en Tareas las de otros cursos de su salón. Si dirección quiere que lo vea solo para consulta, habría que agregar una vista aparte.
- Cada fila sigue mostrando todas sus acciones (Editar, Cerrar, Archivar, Eliminar). Se podría agrupar las secundarias en un menú «Más».

## Segunda parte: tareas de prueba
> puedes agregarle tarea de prueba para este usuario: Carla Mendoza Rivera
> carla.mendoza@nuevohorizonte.demo

- Se crearon en la BD local, con las funciones del servidor y un script temporal ya borrado, 7 tareas de DPCC para Carla en 1.° A/B, 2.° A, 3.° A, 4.° A y 5.° A Sec. Incluyen una vencida con 4 entregas por revisar, una que vence hoy en dos salones, una sin fecha con entregas, dos en los próximos días, una vencida ya revisada y un borrador. Las entregas las hicieron los apoderados demo.
- No están en el seed: `pnpm db:reconstruir` las borra.

## Tercera parte: sin botón «Cerrar entregas»
> algo aqui no comprendo, no se cierran automaticamente? por que solicita un boton para cerrar entregas?

> me gustaria que lo quites , si ya el sistema permite cerrar entregas si le dejas de seleccionar a esta opcion [Image #3] creo que esta demas ese boton verdad?

- Se quitó «Cerrar entregas» de la lista. El cierre lo deciden el plazo y «Permitir entregas tardías». Para cortar las tardías se edita la tarea y se desmarca la opción; el texto de ayuda lo explica al crear y al editar.
- Se mantiene «Reabrir entregas» solo para las tareas que ya estaban `cerrada`. `cambiarCierreTarea` sigue en el servidor.
- Nueva prueba de integración: desmarcar tardías al editar rechaza las entregas posteriores al plazo. Spec 39 actualizada.

## Cuarta parte: sin «Archivar» y acciones alineadas
> para que esta la opcion de archivar? quitalo tambien y porffavor que los botones se vean mas profesionales y alineados

- Se quitaron «Archivar» y el filtro «Archivadas». `archivarTarea` sigue en el servidor y las archivadas de antes no se listan. Los mensajes de error ya no mencionan archivar.
- Las acciones de cada fila van en una sola línea, todas a la misma altura. En escritorio, la principal tiene ancho fijo y queda a la derecha; en celular ocupa el ancho de la fila. Orden: eliminar (ícono, solo si nadie empezó una entrega), «Reabrir» (solo tareas cerradas antes), «Editar» y la principal («Revisar entregas» o «Publicar»). Se midió en el navegador: en escritorio, «Editar» y el botón principal quedan en la misma columna en todas las filas.
- Validación: lint, typecheck, `pnpm test` (1247 pruebas) y los e2e `tareas-agenda` y `tareas-classroom` en verde.

## Quinta parte: revisar como lista del salón, con nota y «Subir notas»
> cuando se quiere revisar lo que los alumnos han entregado, [Image #4] me aparece de esta manera y no me gusta, deberia aparecer como la lista de alumnos de ese curso y poder tener una columna que diga entregado o no entregado  y luego otra columna que diga revisar o ver (cual creas el mas adecuado) y solo se debera revisar lo que el alumno mando y agregar la nota que le corresponde y cuando se termine de corregir a todos los alumnos , recien podra darle en subir notas y hara el proceso de crear un nuevo registro dentro de la competencia que le corresponda y a cada alumno y apoderado le llegara la notificacion que la tarea fue evaluada y se mostrara la nota correspondiente

Respuestas de Carlos a las preguntas del agente:
- Todas las tareas llevan nota (se quita «Calificable»).
- Al subir notas, quien no entregó recibe «NE» automático.
- Se quita «Devolver para corregir».
- La columna aparece en el Registro de notas desde que se publica la tarea (como antes); «Subir notas» la publica.

Cambios:
- Servidor: `revisarConNota`, `subirNotasDeSeccion` y `activarCalificacion` para tareas anteriores sin columna. La acción de crear siempre envía la tarea calificable. Aviso «Tarea calificada» con enlace a la tarea, también al alumno con cuenta. Se borraron las acciones de UI sin uso (devolver, marcar revisada, física, NE manual, ocultar comentario, archivar).
- UI: `/tareas/[id]/revision` reescrita como tabla del salón (Entrega · Nota · Revisar/Ver) con `PanelRevision` (escala AD/A/B/C o 0–20). «Subir notas» se habilita cuando todos los que entregaron tienen nota. En celular, la entrega va debajo del nombre; medido sin desborde a 360 y 390 px.
- Datos de Carla: se activó la competencia de «Reflexión escrita» (2.° A Sec.) desde la pantalla. Sus otras tareas piden elegir competencia al abrirlas.
- Pruebas: integración (flujo completo con NE, publicación y avisos a apoderado y alumno; activar competencia), e2e `tareas-classroom` (crear → entregar → calificar → subir → la apoderada ve «Calificación: AD» y el aviso), `tareas-agenda`, `registro-notas` y `materiales-clase` adaptados.
- Validación: lint, typecheck, `pnpm test` (1249) y esos 4 e2e en verde.

Pendientes:
- Las notificaciones de calificación al alumno con cuenta van solo a la bandeja (sin push).
- El tutor ya no ve tareas de otros cursos de su salón (confirmar si quiere una vista de consulta).

## Sexta parte (2026-11-08): detalle de la tarea para alumno y familia
> [Image #6] esta vista mejoralo , no me gusta como se ven, se visualiza muy generico , mejoralo porfavor

- `/tareas/[id]` rediseñada con el lenguaje Khipu: panel lateral «Tu entrega» (fijo en escritorio, primero en celular), avance como cuerda de nudos, nota destacada con su significado, comentarios como conversación y campo de escribir integrado. La insignia «Revisada» se oculta cuando ya hay nota.
- Se ajustaron las comprobaciones del e2e `tareas-classroom` («Enviado el», «Logro destacado», paso actual «Calificada»).
- Validación: lint, typecheck y los e2e `tareas-classroom` y `tareas-agenda` en verde. Revisado en el navegador como alumna (calificada) y como apoderada (pendiente) a 1440 y 390 px, sin desborde.
- Pendiente: el selector de archivos sigue con el aspecto nativo del navegador («Choose Files»); es un componente compartido (`CamposAdjuntos`).

## Séptima parte (2026-11-08): lista de tareas del alumno y la familia
> [Image #8] esta vista tambien mejorala porfavor que se veo mejor organizado entre las tareas que se tienen de manera pentientes y las tareas que ya se entregaron, creo que hasta podrias agruparlo por cursos y mostrar cuantas tienes pendientes y cuantas ya fueron entregadas y cuales ya estan por vencerse, no lo se , usa tu creatividad para esta parte porfavor

- `/tareas` para familia y alumno (`VistaFamilia.tsx`): «Vence pronto» arriba; pestañas Pendientes · Entregadas · Sin entregar con contador; tareas agrupadas por curso; la nota publicada en cada fila; un hijo a la vez con su número de pendientes.
- `tareasDeFamilia` devuelve `calificacion` (solo notas publicadas).
- e2e `tareas-agenda` ajustado a «Vence pronto». Se borró una tarea que había dejado una corrida e2e interrumpida (otra sesión corría Playwright a la vez).
- Validación: lint, typecheck, `pnpm test` (1250) y los e2e `tareas-classroom` y `tareas-agenda` en verde. Revisado a 1440, 390 y 360 px, sin desborde.
