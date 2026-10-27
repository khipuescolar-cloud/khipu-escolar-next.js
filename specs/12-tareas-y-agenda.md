# 12 — Tareas y agenda

> Estado: implementado · Plan: Fase 2 (Familia) · Última actualización: 2026-10-26 (Claude Code)

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
1. Profesor → `/tareas`: formulario (curso, fecha de entrega, título, descripción opcional) y lista de sus tareas (próximas y de la última semana) con «Eliminar».
2. Apoderado → `/tareas`: por hijo, tareas pendientes en «Para mañana», «Esta semana» y «Más adelante».
3. `/agenda`: lista de la semana (lunes a domingo) con navegación anterior/siguiente/hoy, mini calendario mensual con puntos en los días con algo, y formulario «Nuevo evento» (dirección y profesor). `?fecha=AAAA-MM-DD` fija semana y mes. Las tareas aparecen como «Entrega de tarea».

## Reglas de negocio
- Todas las fechas se calculan en **America/Lima** (`src/lib/fechas.ts`). La tarea vence a las 8:00 a. m. del día elegido; el evento sin hora se guarda a las 8:00.
- Agrupación: hoy y mañana → «Para mañana»; de 2 a 7 días → «Esta semana»; más → «Más adelante». Las vencidas no aparecen a las familias; el profesor las ve hasta 7 días después.
- No se crean tareas con fecha pasada.
- Alcance de eventos: sin salón = todo el colegio (lo ven todos); con salón = solo ese salón (profesores del salón, familias de sus alumnos, dirección).

## Modelo de datos
`tareas` (curso, título, descripción, `fecha_entrega`, creado por) y `eventos_agenda` (salón opcional, título, descripción, tipo, inicio, creado por). Sin cambios de esquema.

## Contratos de `src/lib/server`
```ts
// tareas.ts — requireFeature(ctx, "tareas")
crearTarea(ctx, { cursoId, titulo, descripcion?, fechaEntrega: "AAAA-MM-DD" }): Resultado   // profesor + requireCursoDelProfesor
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

## Errores y casos borde
- «La fecha de entrega ya pasó.» · «Solo puedes crear eventos de tus salones.» · «Elige el salón del evento.» (profesor sin salón).
- Hijos en varios salones: cada hijo tiene su propia tarjeta de tareas.

## Pruebas
- unit: `tests/unit/fechas.test.ts` (zona Lima, agrupación, semanas y cuadrícula del mes).
- integración: `tests/integracion/notas-libreta-tareas-agenda.test.ts` (tareas por curso y agrupación, alcance de eventos por salón, permisos de creación, plan Básico → 403).
- e2e: `tests/e2e/tareas-agenda.test.ts` (profesora crea tarea que la familia ve en «Para mañana»; agenda; periodos de dirección).

## Pendientes
- Aviso opcional a las familias al crear la tarea (falta el módulo de avisos en esta rama y un `TipoAviso` para tareas).
- Editar tareas y eventos (hoy: borrar y crear de nuevo).
- Exportación .ics.
- Adjuntos en tareas (requiere el módulo de archivos).
