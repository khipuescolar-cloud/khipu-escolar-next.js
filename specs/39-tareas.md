# 39 — Tareas estilo Classroom (entregas, revisión y calificación)

> La vista compartida de calificaciones de Tareas y Registro de notas se documenta en [specs/47](47-registro-de-notas.md).

> Estado: implementado (backend completo; UI funcional) · Plan: Khipu Pro (`requireFeature("tareas")`) · Última actualización: 2026-11-03 (Claude)

Reemplaza el «tablón» de tareas de specs/12 (una tarea = un salón, fecha fija 08:00, sin entregas). La agenda y el .ics
siguen en specs/12; los adjuntos, en specs/14.

## Objetivo
Que el docente publique una tarea para uno o varios salones (o alumnos concretos), que el alumno —o su apoderado si no
tiene cuenta— la entregue con archivos y texto, y que el docente la revise, la devuelva para corrección y, si quiere,
la califique en el MISMO registro de notas (sin un segundo registro y sin NSP).

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Profesor (autor o profesor del curso de origen) | Crear, editar, publicar/programar, cerrar/reabrir, archivar, eliminar (sin entregas), cambiar plazos, elegir destinatarios | Elegir alumnos de salones que no dicta o de otro colegio |
| Profesor del curso de una sección / autor | Revisar entregas de esa sección, devolver, marcar revisada, marcar «en físico», calificar, «Marcar NE», comentar en privado, moderar | Ver entregas de secciones de otros docentes |
| Otro profesor del salón (o tutor) | Ver la tarea y descargar sus materiales | Ver entregas, archivos de entregas ni comentarios privados |
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
3. **Revisar** (`/tareas/[id]/revision`): por sección, filtros (salón, estado, estudiante), contadores (entregaron, tarde,
   pendientes, devueltas, revisadas), intentos y archivos, observación privada, «Devolver», «Marcar revisada»,
   «Entregada en físico», nota y «Marcar NE a quienes no entregaron».

## Reglas de negocio
- **Visibilidad:** una familia/alumno ve una tarea solo con asignación vigente (`retirada_at` null) en una tarea
  `publicada` o `cerrada` con `publicar_en` null o ≤ ahora. Borrador, programada futura y archivada no se ven.
- **Destinatarios:** `tarea_asignaciones` unique(tarea, alumno). «Todos» = `sincronizarAsignaciones` idempotente
  (`createMany skipDuplicates`); los alumnos que llegan después se agregan al abrir la lista de tareas de la familia y la
  revisión. Quitar = `retirada_at` (deja de verla, se conservan entregas); volver a agregar la revive.
- **Anti-manipulación:** cada sección debe ser un curso del docente con el mismo nombre que el de origen; cada alumno
  elegido debe estar activo en el salón de su sección y en el colegio (`ctx.db`). Nunca se lee un tenant del cliente.
- **Plazo:** `fecha_entrega` null = nunca vence. Sin hora se guarda a las 08:00 (compatibilidad con agenda/.ics) pero
  vence a las 23:59:59.999 del día en `tenant.zona_horaria` (`limiteEfectivo`). Cada sección puede tener fecha propia.
- **Tarde / bloqueo:** `puedeEnviar`: tarea cerrada → «El profesor cerró las entregas»; no publicada → bloqueado;
  vencida sin tardías → rechazo. La condición «tarde» se fija al enviar y no se recalcula.
- **Cambio de plazo:** fila inmutable en `tarea_cambios_plazo` (trigger bloquea UPDATE) + `auditar` (antes/después,
  motivo) + aviso; las entregas ya enviadas conservan su hora real y condición.
- **Estados por alumno** (separados del estado de la tarea): asignada (Pendiente) → en_proceso → entregada ↔ devuelta →
  revisada. Anular solo desde `entregada` (no revisada, no en físico) y si aún se puede enviar.
- **Eliminar** solo sin entregas ni notas; si no, archivar.
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
- `/tareas` (profesor/dirección): lista con divisores (sin tarjetas por fila) con estado, secciones, barra de avance y contadores; una barra de filtros por curso y estado; «Nueva tarea» en un diálogo por secciones (Para quién, La tarea, Plazo, Publicación, Opciones). Encabezado de sección «Académico».
- `/tareas` (familia/alumno): por hijo, pendientes agrupadas (Para mañana · Esta semana · Más adelante · Sin fecha) e
  historial, con curso, docente, fecha límite y estado de entrega (ícono + palabra).
- `/tareas/[id]` (familia/alumno): detalle y entrega (`?alumno=` elige hijo). El personal es redirigido a la revisión.
- `/tareas/[id]/revision` (docente/dirección): filtros por salón, estado y estudiante; acciones por fila.
- Componentes: `SeccionFormulario` (secciones de formulario), `CamposNuevaTarea` y `CamposPublicacion` (secciones, destinatarios con búsqueda, contador, vista previa, publicación),
  `insignias.tsx` (`FechaEntrega`, `EstadoEntrega`, `EstadoTarea`: ícono + palabra), `FormularioEnLinea`;
  `CamposAdjuntos` acepta límites propios (`maxArchivos`, `maxMb`, `accept`, `tiposTexto`). Objetivos táctiles de 44 px.
- La agenda enlaza la entrega a `/tareas/<id>` para familias y a `/tareas` para el personal.

## Errores y casos borde
- Programada no visible antes de su hora; sin fecha nunca vence y no aparece en la agenda.
- Dos clics en «Entregar» no crean dos envíos (reclamo `updateMany` por estado).
- Alumno nuevo en el salón: recibe las tareas «Todos» vigentes al abrir sus tareas.

## Pruebas
- unit: `tests/unit/tareas-reglas.test.ts` (zona horaria, tarde/vencida, envío, enlaces, extensiones, límites).
- integración: `tests/integracion/tareas-classroom.test.ts` (multi-sección, anti-manipulación, programada, puntual vs.
  tarde, sin fecha, sin tardías, cerrar, devolver/reentregar, físico, quitar destinatario, privacidad, archivos de
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
