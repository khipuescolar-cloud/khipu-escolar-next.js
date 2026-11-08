# 39 — Tareas estilo Classroom (entregas, revisión y calificación)

> La vista compartida de calificaciones de Tareas y Registro de notas se documenta en [specs/47](47-registro-de-notas.md).

> Estado: implementado (backend completo; UI funcional) · Plan: Khipu Pro (`requireFeature("tareas")`) · Última actualización: 2026-11-07 (Claude)

Reemplaza el «tablón» de tareas de specs/12 (una tarea = un salón, fecha fija 08:00, sin entregas). La agenda y el .ics
siguen en specs/12; los adjuntos, en specs/14.

## Objetivo
Que el docente publique una tarea para uno o varios salones (o alumnos concretos), que el alumno —o su apoderado si no
tiene cuenta— la entregue con archivos y texto, y que el docente la revise, la devuelva para corrección y, si quiere,
la califique en el MISMO registro de notas (sin un segundo registro y sin NSP).

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Profesor (autor o profesor del curso de origen) | Crear, editar, publicar/programar, reabrir (si estaba cerrada), eliminar (sin entregas), cambiar plazos, elegir destinatarios | Crear tareas en cursos que no dicta (aunque sea tutor de ese salón); elegir alumnos de salones que no dicta o de otro colegio |
| Profesor del curso de una sección / autor | Revisar entregas de esa sección, devolver, marcar revisada, marcar «en físico», calificar, «Marcar NE», comentar en privado, moderar | Ver entregas de secciones de otros docentes |
| Otro profesor del salón (o tutor) | Descargar los materiales de la tarea si la ve en la agenda | Crear tareas en ese curso, verla en su lista de Tareas, ver entregas, archivos de entregas ni comentarios privados |
| Dirección | Ver todo, revisar, eliminar | Editar el contenido (solo consulta) |
| Apoderado | Ver y entregar en nombre de sus hijos asignados; comentar en privado | Ver tareas, entregas, comentarios o notas de otros alumnos |
| Alumno con cuenta | Ver y entregar sus tareas; comentar en privado | Ver lo de sus compañeros |
| Modo soporte | Ver tareas y materiales | Ver entregas ni sus archivos |

## Flujos
1. **Crear** (`/tareas` → «Nueva tarea»): curso de origen + secciones adicionales (cursos del docente con el mismo nombre en
   otros salones). Por sección: «Todos» o selección individual con búsqueda; contador y vista previa de destinatarios.
   Título, instrucciones (≤5000), indicaciones de entrega, materiales (archivos y enlaces http/https), fecha límite
   opcional con o sin hora (zona del colegio), «Permitir entregas tardías», «Comentarios generales», «Calificable».
   Guardar como borrador, publicar ahora o programar (`publicar_en`).
2. **Ver/entregar** (`/tareas/[id]?alumno=`): instrucciones, materiales, estado (ícono + palabra), borrador (texto +
   archivos), «Entregar» (hora real; tarde si pasó el plazo), «Anular entrega» antes de la revisión, reentrega si fue
   devuelta (nuevo intento numerado), comentarios privados, calificación solo si se publicó.
3. **Revisar y calificar** (`/tareas/[id]/revision?curso=`, rediseño 2026-11-07): un salón a la vez (botones por
   salón si la tarea tiene varios). Tabla con la lista del salón: N.º, Estudiante, Entrega («Entregado» con fecha,
   «con retraso» o «en físico»; «Pendiente» antes del plazo; «No entregó» al vencer), Nota y una acción: **«Revisar»**
   (entregó y aún no tiene nota) o **«Ver»** (el resto). El panel muestra solo lo que mandó el alumno (intentos, texto,
   archivos, comentarios) y el formulario de nota: AD/A/B/C con su significado o 0–20 según la escala del colegio, más
   un comentario opcional. Quien no entregó solo se califica marcando «Lo entregó en físico». Arriba: «N de M
   entregaron · K con nota» y **«Subir notas»**, habilitado cuando todos los que entregaron tienen nota. Al subir: «NE» a
   quienes no entregaron, se publica la columna del registro y cada apoderado y alumno con cuenta recibe el aviso.
   Después, la nota se corrige en el Registro de notas (con motivo). En celular, la entrega va bajo el nombre.
   Sin «Devolver para corregir» ni filtros en la UI (`devolverEntrega` queda en el servidor).

## Reglas de negocio
- **Visibilidad:** una familia/alumno ve una tarea solo con asignación vigente (`retirada_at` null) en una tarea
  `publicada` o `cerrada` con `publicar_en` null o ≤ ahora. Borrador, programada futura y archivada no se ven.
- **Destinatarios:** `tarea_asignaciones` unique(tarea, alumno). «Todos» = `sincronizarAsignaciones` idempotente
  (`createMany skipDuplicates`); los alumnos que llegan después se agregan al abrir la lista de tareas de la familia y la
  revisión. Quitar = `retirada_at` (deja de verla, se conservan entregas); volver a agregar la revive.
- **Solo cursos que dicta:** `cursosParaTareas`, `cursosGemelos`, `alumnosParaDestinatarios`, `vistaPreviaDestinatarios` y
  `crearTarea` usan `cursosQueDicta` / `requireCursoQueDicta` (`profesorId` = el docente). Ser tutor del salón NO da
  acceso a los cursos que dictan otros (mismo criterio que pasar lista, specs/04). Dirección no crea tareas.
- **Anti-manipulación:** cada sección debe ser un curso que el docente dicta con el mismo nombre que el de origen; cada alumno
  elegido debe estar activo en el salón de su sección y en el colegio (`ctx.db`). Nunca se lee un tenant del cliente.
- **Plazo:** `fecha_entrega` null = nunca vence. Sin hora se guarda a las 08:00 (compatibilidad con agenda/.ics) pero
  vence a las 23:59:59.999 del día en `tenant.zona_horaria` (`limiteEfectivo`). Cada sección puede tener fecha propia.
- **Cierre de entregas (2026-11-07):** lo deciden el plazo y «Permitir entregas tardías». Sin tardías, la tarea deja de
  recibir entregas al vencer; con tardías, las acepta marcadas «Con retraso». No hay botón «Cerrar entregas» en la UI:
  para cortar las tardías, el docente edita la tarea y desmarca la opción. Una tarea sin fecha no vence; para que se
  cierre, se le pone fecha. Solo queda «Reabrir entregas» en las tareas `cerrada` de antes de este cambio
  (`cambiarCierreTarea` sigue en el servidor).
- **Tarde / bloqueo:** `puedeEnviar`: tarea cerrada → «El profesor cerró las entregas»; no publicada → bloqueado;
  vencida sin tardías → rechazo. La condición «tarde» se fija al enviar y no se recalcula.
- **Cambio de plazo:** fila inmutable en `tarea_cambios_plazo` (trigger bloquea UPDATE) + `auditar` (antes/después,
  motivo) + aviso; las entregas ya enviadas conservan su hora real y condición.
- **Estados por alumno** (separados del estado de la tarea): asignada (Pendiente) → en_proceso → entregada ↔ devuelta →
  revisada. Anular solo desde `entregada` (no revisada, no en físico) y si aún se puede enviar.
- **Eliminar** solo sin entregas ni notas. La UI no ofrece «Archivar» (2026-11-07): una tarea con entregas se queda en la
  lista como historial. `archivarTarea` sigue en el servidor y las archivadas de antes no se listan.
- **Calificación (opcional):** si `calificable` y el colegio tiene `notas`, al publicar se crea una `Evaluacion` por
  sección con `crearEvaluacion(ctx, …, { tareaId })` (periodo abierto del nivel que contiene la fecha). La nota se
  escribe con `guardarNota` (historial incluido); se publica con `publicarEvaluacion`. Una evaluación con `tarea_id`
  **nunca genera NSP** (`sincronizarNsp` filtra `tareaId: null`; `guardarNota` rechaza NSP) y no admite nota de un
  alumno no asignado. «NE» solo por la acción explícita «Marcar NE a quienes no entregaron».
- **Comentarios:** privados por asignación (docente ↔ alumno/familia); generales solo si `comentarios_generales`
  (apagado por defecto); el docente los oculta (`oculto_at/oculto_por`).
- **Adjuntos:** PDF, JPG, PNG, WEBP, DOCX, XLSX, PPTX y ODT por magic bytes; la extensión debe coincidir con el tipo
  real; DOC/PPT/XLS antiguos NO (firma OLE común: no se distinguen de forma segura). Límites por colegio
  `tareas_max_archivos` (5) y `tareas_max_mb` (10), con techo duro 5 × 10 MB porque las server actions aceptan 55 MB.

## Modelo de datos
Migración `20261113090000_tareas_classroom` (aditiva, RLS cerrado en las tablas nuevas):
- `tareas`: + `estado` (EstadoTarea, default `publicada`), `publicar_en`, `publicada_at`, `avisada_at`, `con_hora`,
  `permite_tardias`, `cerrada_at`, `comentarios_generales`, `calificable`, `indicaciones_entrega`, `competencia_id`,
  `updated_at`; `fecha_entrega` pasa a NULL. Índice parcial `tareas_pendientes_aviso_idx` para el cron.
- `tarea_cursos` (secciones: `todos`, `fecha_entrega` propia, `evaluacion_grupo_id`), `tarea_asignaciones`,
  `tarea_entregas` (intentos; `archivos.entrega_id`), `tarea_comentarios`, `tarea_enlaces`, `tarea_cambios_plazo`.
- `tenants.tareas_max_archivos`, `tenants.tareas_max_mb`; `evaluaciones.tarea_id` (FK SET NULL).
- Backfill: cada tarea existente queda publicada/avisada con una sección «Todos» y una asignación por alumno activo.
  Los seeds usan `prisma/seed-tareas-destinos.ts` para lo mismo.

## Contratos de `src/lib/server/tareas/`
```ts
// gestion.ts
crearTarea(ctx, entrada, adjuntos?, ahora?) // también acepta la forma antigua {cursoId,titulo,descripcion,fechaEntrega}
actualizarTarea(ctx, tareaId, entrada, {nuevos, quitar}?) · cambiarPlazo(ctx, tareaId, {fechaEntrega?, horaEntrega?, tareaCursoId?, motivo?})
publicarTarea · cambiarCierreTarea(ctx, id, cerrar) · archivarTarea · eliminarTarea · editarDestinatarios(ctx, id, {tareaCursoId, todos, agregar, quitar})
cursosGemelos · alumnosParaDestinatarios · vistaPreviaDestinatarios · cursosParaTareas
// entregas.ts
guardarEntrega(ctx, tareaId, alumnoId, {texto?, enviar}, {nuevos, quitar}?) · anularEntrega · marcarEntregaFisica(ctx, asignacionId)
devolverEntrega(ctx, asignacionId, observacion?) · marcarRevisada · calificarEntrega · marcarNoEntregaron(ctx, tareaId, tareaCursoId)
// vistas.ts
tareasDeFamilia · detalleTareaFamilia · alumnosConTarea · tareasDelDocente(ctx, {cursoId?, estado?}) · revisionDeTarea
comentarTarea · ocultarComentario · comentariosGenerales · tareasVisiblesParaAgenda(ctx, desde, hasta)  // la usa agenda.ts
// comun.ts
sincronizarAsignaciones(tdb, tenantId, tareaId) · whereTareaVisible(ahora) · limitesTarea(ctx)
// notificaciones/avisos-tareas.ts
avisarTareaPublicada · avisarCambioPlazo · avisarDevuelta · procesarTareasProgramadas (cron)
```
Reglas puras compartidas: `src/lib/tareas.ts` (`limiteEfectivo`, `puedeEnviar`, `normalizarEnlace`, `extensionCoincide`);
`instanteEnZona` en `src/lib/fechas.ts`. Archivos: `requireArchivoVisible` (archivos.ts) — materiales con
`puedeVerTarea(ctx, tareaId)`; archivos de entrega solo alumno, apoderados, profesor del curso/autor y dirección, sin
modo soporte, con auditoría `tarea_entrega_archivo`.

## Avisos (specs/38)
Bandeja + push con `entregarNotificaciones`, **sin correo**, al apoderado y al alumno con cuenta asignados:
`tarea:<id>` (publicada; la programada la envía el cron `/api/cron/avisos` con consulta acotada `estado = publicada AND
avisada_at IS NULL AND publicar_en <= now()` y reclamo atómico de `avisada_at`), `tarea-plazo:<cambioId>`,
`tarea-devuelta:<asignacionId>:<ms>`. Plantillas `tarea_nueva` (fecha opcional) y `tarea_actualizada`. La calificación
publicada la avisa el outbox de evaluaciones. Sin «avisar» al crear, `avisada_at` se fija al crear (el cron no avisa).

## Rutas y UI
- `/tareas` (profesor/dirección), `ListaDocente.tsx`:
  - **Para revisar** (solo profesor, arriba): dos columnas por sección de tarea publicada o cerrada (no programada).
    «Hoy» = el plazo vence hoy, o ya venció / no tiene fecha y quedan entregas por revisar (estado `entregada`).
    «Próximos 7 días» = el plazo vence en los próximos 7 días. Regla pura `agendaDeRevision` (`src/lib/tareas.ts`).
    Cada fila abre `/tareas/<id>/revision?curso=<cursoId>`. Ignora el filtro de estado (siempre mira las activas).
  - **Lista agrupada por salón y, dentro, por curso.** Una tarea con varias secciones aparece en cada salón, con
    «También en …», su plazo, «N por revisar» y contadores de esa sección. Filtros por curso y estado; «Nueva tarea»
    en un diálogo por secciones (Para quién, La tarea, Plazo, Publicación, Opciones). Encabezado «Académico».
  - **Acciones de cada fila**, en una sola línea alineada a la derecha (botones `sm`, misma altura), de izquierda a
    derecha: eliminar (ícono; solo si nadie empezó una entrega, `tieneEntregas`), «Reabrir» (solo tareas `cerrada` de
    antes), «Editar» (autor) y, al extremo, la principal con ancho mínimo fijo: «Revisar entregas» o «Publicar» en un
    borrador. Así la principal queda en la misma columna en todas las filas. Filtro de estado sin «Archivadas».
  - `tareasDelDocente` devuelve, por tarea, solo las `secciones` que el usuario puede revisar (`puedeRevisarSeccion`),
    con `contadores.porRevisar`; el profesor ve las que creó o con sección en un curso que dicta. Así «Revisar entregas»
    nunca lleva a la página «No tienes acceso» (antes el tutor veía tareas de cursos ajenos de su salón).
- `/tareas` (familia/alumno), `VistaFamilia.tsx` (rediseño 2026-11-08): un hijo a la vez (botones con su número de
  pendientes, `?alumno=`). Arriba, **«Vence pronto»**: tarjetas de lo que vence hoy o mañana o fue devuelto, con
  «Entregar →». Debajo, pestañas con contador (`?ver=`): **Pendientes** · **Entregadas** · **Sin entregar** (venció sin
  entrega). En cada pestaña, las tareas se agrupan por curso (tarjeta con docente y cantidad; dos columnas en
  escritorio). Cada fila lleva un nudo del estado, fecha o estado de entrega (ícono + palabra) y, si ya se subieron las
  notas, la nota (`ItemTareaFamilia.calificacion`, solo evaluaciones publicadas).
- `/tareas/[id]` (familia/alumno): detalle y entrega (`?alumno=` elige hijo). El personal es redirigido a la revisión.
  Rediseño 2026-11-08: encabezado estándar con curso y docente; dos columnas en escritorio. A la derecha, fijo al
  desplazar, el panel «Tu entrega» / «Entrega de <hijo>»: avance como cuerda de khipu con cuatro nudos (Asignada →
  Entregada → Revisada → Calificada, con `aria-current="step"`), la nota en grande con su significado («AD · Logro
  destacado»; «NE · No entregó»), lo enviado y el formulario (Guardar borrador · Entregar). A la izquierda,
  Instrucciones (con «Cómo entregar» y Materiales) y Comentarios como conversación: profesor a la izquierda y
  familia o alumno a la derecha, con el campo de escribir integrado. En celular, el panel de entrega va primero.
- `/tareas/[id]/revision` (docente/dirección): ver flujo 3. Componentes `PanelRevision.tsx` (diálogo con la entrega y
  la nota) y la tabla en `page.tsx`.
- Componentes: `SeccionFormulario` (secciones de formulario), `CamposNuevaTarea` y `CamposPublicacion` (secciones, destinatarios con búsqueda, contador, vista previa, publicación),
  `insignias.tsx` (`FechaEntrega`, `EstadoEntrega`, `EstadoTarea`: ícono + palabra), `FormularioEnLinea`;
  `CamposAdjuntos` acepta límites propios (`maxArchivos`, `maxMb`, `accept`, `tiposTexto`). Objetivos táctiles de 44 px.
- La agenda enlaza la entrega a `/tareas/<id>` para familias y a `/tareas` para el personal.

## Errores y casos borde
- Programada no visible antes de su hora; sin fecha nunca vence y no aparece en la agenda.
- Dos clics en «Entregar» no crean dos envíos (reclamo `updateMany` por estado).
- Alumno nuevo en el salón: recibe las tareas «Todos» vigentes al abrir sus tareas.

## Pruebas
- unit: `tests/unit/tareas-reglas.test.ts` (zona horaria, tarde/vencida, envío, enlaces, extensiones, límites, agenda de revisión).
- integración: `tests/integracion/tareas-classroom.test.ts` (multi-sección, anti-manipulación, programada, puntual vs.
  tarde, sin fecha, sin tardías, tutor sin cursos ajenos, contadores por sección, cerrar, devolver/reentregar, físico, quitar destinatario, privacidad, archivos de
  entrega, profesor de otro curso, comentarios, plazo auditado, calificación sin NSP y NE explícito, avisos sin correo,
  extensión falsa y límites). Ajustadas: `notas-libreta-tareas-agenda`, `adjuntos-comunicados-tareas`,
  `bandeja-general`, `extras-edicion-ics-zip`.
- e2e: `tests/e2e/tareas-classroom.test.ts` (docente crea multi-sección → apoderado entrega → docente devuelve → reentrega).

## Selector de materiales por carpetas (2026-11-07)

«Elegir de mis materiales» muestra curso, salón y subcarpeta para ubicar cada material. La referencia `TareaMaterial` sigue fijando la versión y no copia archivos.

## Reutilización de archivos y cuota (reestructuración de Documentos, 2026-11-07; especificado, sin implementar)
W2 implementa la referencia `TareaMaterial` al crear o editar una tarea. Cada enlace guarda la versión elegida, por lo que una versión nueva del material no cambia el adjunto de la tarea. Las vistas de familia, revisión y agenda unen los adjuntos propios con los de la versión referenciada; borrar la tarea deja intactos los archivos del material. El selector «Elegir de mis materiales» envía IDs y el servidor comprueba autoría, estado de papelera y versión.
El selector también aparece en «Editar tarea» y precarga las referencias existentes. Al guardar, la lista enviada reemplaza las referencias anteriores de esa tarea.
Tareas ya recibe entregas y no se rehace. Cambia solo cómo usa archivos (detalle en `specs/31` y `specs/45`):
- **Materiales existentes:** al crear o editar una tarea el docente puede «Elegir de mis materiales de clase». Se crea `tarea_materiales` (`tareaId`, `materialId`, `versionId` fijada): es una **referencia, no una copia**. `crearTarea`/`actualizarTarea` aceptan `materialesExistentes?: { materialId: string; versionId?: string }[]`; solo materiales propios y fuera de la papelera. Los materiales subidos directamente siguen con `Archivo.tareaId`. Las vistas devuelven ambos como `AdjuntoVista[]`.
- **Descarga:** un archivo de material lo puede descargar quien ve una tarea publicada que lo referencia (`puedeVerTarea`), aunque el material no estuviera compartido con su sección. Borrar una tarea no borra el archivo; no se elimina físicamente un material referenciado.
- **Cuota:** materiales y entregas pasan por `iniciarSubida`/`confirmarSubida` (carga directa, `specs/45`). Las entregas son categoría crítica: pueden usar la reserva de cuota del colegio, con aviso previo a dirección en 70/85/95 %.
- **Límites de entrega:** 10 MB por archivo y **3 archivos** por entrega, desde `almacenamiento_colegio` (`maxBytesEntrega`, `maxArchivosEntrega`). `tenants.tareas_max_archivos/tareas_max_mb` quedan como valor de respaldo para materiales (no se eliminan columnas) y `limitesTarea(ctx)` lee primero la configuración central. Cambia el valor por defecto de 5 a 3 archivos en entregas: las pruebas `tareas-classroom` y `adjuntos-comunicados-tareas` se ajustan.
- Sin cambios: estados de entrega, reentregas, revisión, calificación, avisos y la regla de descarga de entregas (alumno, apoderados, docente del curso o autor, dirección; sin soporte; auditada).

## Pendientes
- Recordatorio «vence mañana»: no se envía (el cron de Vercel Hobby es diario); dejarlo para cuando haya cron horario.
- Reasignar al cambiar a un alumno de salón (hoy conserva la asignación en su sección anterior).
- Editar secciones ya creadas (agregar/quitar salones) desde la UI; hoy solo destinatarios por sección.
- Configurar `tareas_max_archivos`/`tareas_max_mb` desde la configuración del colegio (hoy solo en BD).
- Rúbricas y calificación con varias competencias por tarea.

## Toda tarea lleva nota (2026-11-07)

- La UI ya no ofrece «Calificable»: la acción de crear envía `calificable = tieneFeature("notas")` y exige la
  competencia de cada salón («Competencia que evalúa»). `crearTarea` sin `calificable` sigue aceptándose en el
  servidor (forma antigua y pruebas) y esa tarea queda sin columna.
- Tarea sin columna (anterior o creada así): la revisión muestra «Esta tarea aún no tiene notas» con las competencias
  activas del curso; `activarCalificacion(ctx, tareaId, tareaCursoId, competenciaId)` la marca calificable y crea la
  columna (solo el profesor del curso o autor; competencia del mismo curso).
- `revisarConNota(ctx, asignacionId, { valor, observacion?, enFisico? })`: `guardarNota` + entrega `revisada` +
  comentario privado. Rechaza «NE» (se pone al subir), a quien no entregó sin `enFisico` y cambios después de subir.
- `subirNotasDeSeccion(ctx, tareaId, tareaCursoId)`: exige nota en cada asignación vigente entregada/revisada/devuelta,
  aplica `marcarNoEntregaron` y `publicarEvaluacion` (reclamo atómico + outbox). La acción procesa el outbox en
  `after()`. Aviso (specs/38): «Tarea calificada» · «Se calificó la tarea «X» de Mateo en Curso.» → `/tareas/<id>?alumno=`,
  al apoderado (bandeja y push) y al alumno con cuenta (solo bandeja). Nunca la nota en el texto.

## Relación con Registro de notas (2026-11-07)

Una tarea nueva calificable exige elegir una competencia activa en cada curso/sección incluido. La elección se guarda en `TareaCurso.competenciaId`. La entrega por sí sola no crea una nota. La evaluación vinculada por `tareaId` y `TareaCurso.evaluacionGrupoId` es la misma columna que lee `/notas/[cursoId]`; `Nota` sigue siendo única por evaluación y alumno; `Evaluacion(tareaId, cursoId)` es única para evitar columnas duplicadas ante reprocesos. Las tareas anteriores sin competencia aparecen en «Sin competencia» y el profesor del curso puede asignarles una competencia activa explícitamente.
