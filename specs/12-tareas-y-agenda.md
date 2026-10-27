# 12 — Tareas y agenda

> Estado: implementado · Plan: Fase 2 (Familia) · Última actualización: 2026-10-27 (Claude Code, rama `feat/avisos-pendientes`: aviso de tareas)

## Objetivo
Que los profesores publiquen tareas por curso y eventos por salón, que dirección publique eventos del colegio y que las familias vean todo ordenado por fecha, sin llamadas ni grupos de mensajería.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Profesor | Crear/borrar tareas de sus cursos; crear eventos de sus salones y borrar los que creó; ver tareas y agenda de sus salones | Crear eventos de otros salones o del colegio |
| Dirección | Ver todas las tareas y borrarlas; crear eventos del colegio o de cualquier salón; borrar eventos | Crear tareas (son del profesor) |
| Apoderado | Ver tareas de sus hijos y la agenda de sus salones y del colegio | Crear o borrar |
| Plan Básico | — | 403 en `/tareas` y `/agenda` |

## Flujos
1. Profesor → `/tareas`: formulario (curso, fecha de entrega, título, descripción opcional, casilla **«Avisar a las familias»**, desmarcada por defecto) y lista de sus tareas (próximas y de la última semana) con «Eliminar».
2. Apoderado → `/tareas`: por hijo, tareas pendientes en «Para mañana», «Esta semana» y «Más adelante».
3. `/agenda`: lista de la semana (lunes a domingo) con navegación anterior/siguiente/hoy, mini calendario mensual con puntos en los días con algo, y formulario «Nuevo evento» (dirección y profesor). `?fecha=AAAA-MM-DD` fija semana y mes. Las tareas aparecen como «Entrega de tarea».

## Reglas de negocio
- Todas las fechas se calculan en **America/Lima** (`src/lib/fechas.ts`). La tarea vence a las 8:00 a. m. del día elegido; el evento sin hora se guarda a las 8:00.
- Agrupación: hoy y mañana → «Para mañana»; de 2 a 7 días → «Esta semana»; más → «Más adelante». Las vencidas no aparecen a las familias; el profesor las ve hasta 7 días después.
- No se crean tareas con fecha pasada.
- **Aviso a familias** (solo si se marcó la casilla): `avisarTareaNueva()` (`notificaciones/avisos-tareas.ts`) encola `tarea_nueva` (tipo `tarea`, `referenciaId = tareaId`) a las familias de los alumnos activos del salón del curso, solo con consentimiento vigente y según sus preferencias (`destinatariosDeAlumno`). Una fila por familia y canal aunque tenga varios hijos en el salón (`alumno` = «Mateo» o «Mateo y Ana»). Idempotente: si la tarea ya tiene avisos, no vuelve a encolar. La action procesa la cola con `after()`. Se audita `enviar · tarea`.
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
- Tipos con ícono + palabra: Evento, Reunión, Examen, Feriado, Actividad, Entrega de tarea.
- Familias: «Lo que tus hijos tienen que entregar.» / «No tiene tareas pendientes.»
- Casilla: «Avisar a las familias» · «Las familias reciben un aviso por correo o en el celular con esta tarea.»
- Aviso: asunto «Nueva tarea de Matemática» · «Mateo tiene una tarea nueva de Matemática: «Fichas de fracciones».» · «Se entrega el 30/10/2026.» + **Ver tareas**.

## Exportación .ics
`GET /api/agenda.ics` (sesión + `requireFeature(ctx, "agenda")`, `no-store`): calendario iCalendar (RFC 5545) con los eventos y las fechas de entrega visibles para el usuario (apoderado: salones de sus hijos; profesor: sus salones; dirección: todos), de hace 30 días a 1 año. Constructor puro en `src/lib/ics.ts`: CRLF, plegado a 75 octetos, escape de `\ ; ,` y saltos de línea, `DTSTAMP`, `UID` = `<id>@khipuescolar`. Eventos con hora en UTC (1 h de duración); entregas de tarea como evento de día completo (día de Lima). Enlace «Descargar calendario (.ics)» en `/agenda`. Es una descarga puntual, no una suscripción.

## Errores y casos borde
- Editar: el profesor edita título, descripción y fecha de sus tareas (`actualizarTarea`, mismas reglas que borrar; la fecha solo se valida si cambia) y los eventos que creó (`actualizarEvento`, no cambia el salón); dirección edita cualquier evento y solo consulta tareas. Queda auditado (`editar · tarea` / `editar · evento_agenda`). En la UI, un desplegable «Editar tarea» / «Editar evento».
- «La fecha de entrega ya pasó.» · «Solo puedes crear eventos de tus salones.» · «Elige el salón del evento.» (profesor sin salón).
- Hijos en varios salones: cada hijo tiene su propia tarjeta de tareas.

## Pruebas
- unit: `tests/unit/fechas.test.ts` (zona Lima, agrupación, semanas y cuadrícula del mes).
- unit: `tests/unit/ics.test.ts` (escape, plegado a 75 octetos, CRLF, fechas).
- integración: `tests/integracion/notas-libreta-tareas-agenda.test.ts` (tareas por curso y agrupación, alcance de eventos por salón, permisos de creación, plan Básico → 403); `tests/integracion/avisos-pendientes.test.ts` (aviso de tarea solo con la casilla y solo a familias con consentimiento); `tests/integracion/extras-edicion-ics-zip.test.ts` (editar tarea/evento: permisos, auditoría, aislamiento entre colegios; alcance de la agenda por rol).
- e2e: `tests/e2e/tareas-agenda.test.ts` (profesora crea tarea con «Avisar a las familias», el correo llega a Mailpit y la familia la ve en «Para mañana»; agenda; periodos de dirección; edita su tarea y descarga el .ics).

## Pendientes
- Adjuntos en tareas (requiere el módulo de archivos).
