# 12 — Tareas y agenda

> Estado: implementado · Plan: Khipu Pro · Última actualización: 2026-11-03 (rama `pre-notificaciones`: bandeja general y canales, specs/38; antes: Claude Code: tabla de roles con administrativo y alumno)

## Objetivo
Que los profesores publiquen tareas por curso y eventos por salón, que dirección publique eventos del colegio y que las familias vean todo ordenado por fecha, sin llamadas ni grupos de mensajería.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Profesor | Crear/borrar tareas de sus cursos; crear eventos de sus salones y borrar los que creó; ver tareas y agenda de sus salones | Crear eventos de otros salones o del colegio |
| Dirección | Ver todas las tareas y borrarlas; crear eventos del colegio o de cualquier salón; borrar eventos | Crear tareas (son del profesor) |
| Administrativo | Crear eventos de **todo el colegio** y editar o borrar los que creó; ver la agenda del colegio | Crear eventos de un salón («El personal administrativo crea eventos de todo el colegio.»); ver o crear tareas |
| Apoderado | Ver tareas de sus hijos y la agenda de sus salones y del colegio | Crear o borrar |
| Alumno (cuenta propia) | Ver sus tareas y la agenda de su salón y del colegio (con las entregas de sus tareas) | Crear, editar o borrar |
| Colegio con Khipu Base | — | 403 en `/tareas` y `/agenda` |

## Flujos
1. Profesor → `/tareas`: formulario (curso, fecha de entrega, título, descripción opcional, casilla **«Avisar a las familias»**, desmarcada por defecto) y lista de sus tareas (próximas y de la última semana) con «Eliminar».
2. Apoderado → `/tareas`: por hijo, tareas pendientes en «Para mañana», «Esta semana» y «Más adelante».
3. `/agenda`: lista de la semana (lunes a domingo) con navegación anterior/siguiente/hoy, mini calendario mensual con puntos en los días con algo, y formulario «Nuevo evento» (dirección y profesor). `?fecha=AAAA-MM-DD` fija semana y mes. Las tareas aparecen como «Entrega de tarea».

## Reglas de negocio
- Todas las fechas se calculan en **America/Lima** (`src/lib/fechas.ts`). La tarea vence a las 8:00 a. m. del día elegido; el evento sin hora se guarda a las 8:00.
- Agrupación: hoy y mañana → «Para mañana»; de 2 a 7 días → «Esta semana»; más → «Más adelante». Las vencidas no aparecen a las familias; el profesor las ve hasta 7 días después.
- No se crean tareas con fecha pasada.
- **Aviso a familias** (solo si se marcó la casilla): `avisarTareaNueva()` (`notificaciones/avisos-tareas.ts`) crea una notificación en la **bandeja** (`/notificaciones`, tipo `tarea`, clave `tarea:<id>`) por familia de los alumnos activos del salón del curso y por cada alumno con cuenta propia, y encola el **push** `tarea_nueva` (tipo `tarea`, `referenciaId = tareaId`) a los dispositivos de las familias con consentimiento vigente y push activado. **Sin correo** desde 2026-11-03 (specs/38). Una notificación por familia aunque tenga varios hijos en el salón (`alumno` = «Mateo» o «Mateo y Ana»). En lote: alumnos, vínculos (consentimiento, preferencias y dispositivos) y cuentas en un número fijo de consultas, `createMany`. Idempotente: un reintento no duplica la notificación ni el push. La action procesa la cola con `after()`. Se audita `enviar · tarea`.
- Alcance de eventos: sin salón = todo el colegio (lo ven todos); con salón = solo ese salón (profesores del salón, familias de sus alumnos, dirección).

## Modelo de datos
`tareas` (curso, título, descripción, `fecha_entrega`, creado por) y `eventos_agenda` (salón opcional, título, descripción, tipo, inicio, creado por). Sin cambios de esquema.

## Contratos de `src/lib/server`
```ts
// tareas.ts — requireFeature(ctx, "tareas")
crearTarea(ctx, { cursoId, titulo, descripcion?, fechaEntrega: "AAAA-MM-DD", avisarFamilias? }): Resultado   // profesor + requireCursoDelProfesor
// notificaciones/avisos-tareas.ts
avisarTareaNueva(ctx, tareaId, entrada): number /* familias */   // no hace nada si entrada.avisarFamilias no es true/"on"
eliminarTarea(ctx, tareaId): Resultado
cursosParaTareas(ctx); tareasDelDocente(ctx)
tareasDeFamilia(ctx, ahora?)  // [{ alumno, grupos: { manana, semana, despues } }]
// agenda.ts — requireFeature(ctx, "agenda")
itemsDeAgenda(ctx, desde, hasta): ItemAgenda[]   // eventos + entregas, según alcance (salonIdsVisibles)
salonesParaEventos(ctx)
crearEvento(ctx, { titulo, descripcion?, tipo, fecha, hora?, salonId? }): Resultado
eliminarEvento(ctx, eventoId): Resultado
```

## Rutas y UI
- `/tareas` (profesor, dirección, apoderado) · `/agenda` (los mismos). Acciones en `tareas/actions.ts` y `agenda/actions.ts`.

## Textos y UX

- **Diseño (spec 18):** «Nueva tarea» y «Nuevo evento» están en el encabezado y abren un `Dialog`; editar tarea/evento también es un `Dialog`; eliminar pide confirmación (`BotonConfirmar`, botón «Eliminar tarea»/«Eliminar evento»). Tareas como tarjetas con insignia de fecha (ícono + palabra); agenda por día con insignia de tipo y mini calendario con celdas de 40 px.
- Tipos con ícono + palabra: Evento, Reunión, Examen, Feriado, Actividad, Entrega de tarea.
- Familias: «Lo que tus hijos tienen que entregar.» / «No tiene tareas pendientes.»
- Casilla: «Avisar a las familias» · «Las familias la ven en sus notificaciones de Khipu y en el celular (sin correo).»
- Aviso: asunto «Nueva tarea de Matemática» · «Mateo tiene una tarea nueva de Matemática: «Fichas de fracciones».» · «Se entrega el 30/10/2026.» + **Ver tareas**.

## Reuniones en la agenda
`itemsDeAgenda` también devuelve las reuniones de padres visibles para el usuario (módulo `reuniones`, `specs/32`) como ítems `tipo: "reunion"` con enlace a `/reuniones/<id>`; no son `EventoAgenda`. El `.ics` las incluye.

## Exportación .ics
`GET /api/agenda.ics` (sesión + `requireFeature(ctx, "agenda")`, `no-store`): calendario iCalendar (RFC 5545) con los eventos y las fechas de entrega visibles para el usuario (apoderado: salones de sus hijos; profesor: sus salones; dirección: todos), de hace 30 días a 1 año. Constructor puro en `src/lib/ics.ts`: CRLF, plegado a 75 octetos, escape de `\ ; ,` y saltos de línea, `DTSTAMP`, `UID` = `<id>@khipuescolar`. Eventos con hora en UTC (1 h de duración); entregas de tarea como evento de día completo (día de Lima). Enlace «Descargar calendario (.ics)» en `/agenda`. Es una descarga puntual, no una suscripción.

## Adjuntos
- Hasta 5 por tarea, 10 MB cada uno (PDF, JPG, PNG, WEBP, DOCX, XLSX), privados en `FileStorage` con `archivos.tarea_id` (módulo `adjuntos.ts`, spec 14). El formulario de crear y de editar tienen el selector de archivos (`CamposAdjuntos`); al editar se pueden quitar y agregar. Un adjunto inválido devuelve el error de formulario y no crea la tarea.
- `/tareas` los lista con `ListaAdjuntos` (ícono por tipo, nombre, tamaño, descarga) para el profesor, dirección y las familias. Descarga por `/archivos/<id>`: dirección, quien creó la tarea, profesores del salón y apoderados de ese salón; otros salones, 403. Al eliminar la tarea se borran los archivos (de la BD en cascada y luego del proveedor).
- `/agenda` muestra, bajo cada «Entrega de tarea», sus adjuntos con el mismo `ListaAdjuntos`. `itemsDeAgenda` solo los incluye si `puedeVerTarea` (la misma regla que `/archivos/<id>`): el personal administrativo ve la entrega pero no sus adjuntos, porque no podría descargarlos.

## Errores y casos borde
- Editar: el profesor edita título, descripción y fecha de sus tareas (`actualizarTarea`, mismas reglas que borrar; la fecha solo se valida si cambia) y los eventos que creó (`actualizarEvento`, no cambia el salón); dirección edita cualquier evento y solo consulta tareas. Queda auditado (`editar · tarea` / `editar · evento_agenda`). En la UI, un desplegable «Editar tarea» / «Editar evento».
- «La fecha de entrega ya pasó.» · «Solo puedes crear eventos de tus salones.» · «Elige el salón del evento.» (profesor sin salón).
- Hijos en varios salones: cada hijo tiene su propia tarjeta de tareas.

## Pruebas
- unit: `tests/unit/fechas.test.ts` (zona Lima, agrupación, semanas y cuadrícula del mes).
- unit: `tests/unit/ics.test.ts` (escape, plegado a 75 octetos, CRLF, fechas).
- integración: `tests/integracion/notas-libreta-tareas-agenda.test.ts` (tareas por curso y agrupación, alcance de eventos por salón, permisos de creación, Khipu Base → 403); `tests/integracion/avisos-pendientes.test.ts` (aviso de tarea solo con la casilla y solo a familias con consentimiento); `tests/integracion/extras-edicion-ics-zip.test.ts` (editar tarea/evento: permisos, auditoría, aislamiento entre colegios; alcance de la agenda por rol).
- integración: `tests/integracion/adjuntos-comunicados-tareas.test.ts` (adjuntos de tareas: acceso y borrado).
- e2e: `tests/e2e/tareas-agenda.test.ts` (profesora crea tarea con «Avisar a las familias», la familia la recibe en su bandeja (el e2e anterior buscaba el correo en Mailpit: revisar, pendiente) y la ve en «Para mañana»; agenda; periodos de dirección; edita su tarea y descarga el .ics).

## Pendientes
- (Resuelto) Adjuntos en la agenda: ver «Adjuntos».
