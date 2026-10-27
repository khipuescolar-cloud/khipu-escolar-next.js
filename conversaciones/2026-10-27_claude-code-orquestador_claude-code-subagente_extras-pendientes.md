# Extras pendientes: editar tareas y eventos, .ics, ZIP y borrado de archivos

| Campo | Valor |
|---|---|
| Fecha | 2026-10-27 |
| Colaborador | Claude Code (orquestador) |
| Agente y modelo | Claude Code (subagente) · Claude Sonnet 5.5 |
| Rama y commits | `feat/extras-pendientes` · ver `git log` de la rama |
| Specs afectadas | `specs/12-tareas-y-agenda.md`, `specs/15-privacidad-auditoria-exportacion.md` |

## Pedidos del colaborador (textual)
> You are finishing pending items of the Khipu Escolar MVP (multitenant school platform for Peru, Spanish UI). Work ONLY in the git worktree `khipu-wt/extras-pendientes` (branch `feat/extras-pendientes`). Tasks: 1. Edit tasks and events: teachers edit their own tasks (title, description, due date) and events of their salones; dirección edits school events. Add `actualizarTarea`/`actualizarEvento` with the same permission rules as create/delete, edit forms in the UI, audited. 2. .ics export: route returning an iCalendar (RFC 5545: CRLF, line folding at 75 octets, escaping, DTSTAMP, stable UIDs) of events + task due dates visible to the user; requires session and `requireFeature(ctx, "agenda")`; a "Descargar calendario (.ics)" link on `/agenda`; pure ICS builder in `src/lib/ics.ts` with unit tests. 3. ZIP export: change the dirección export to a ZIP (one JSON per table + README.txt + uploaded files through FileStorage), with a derived table list and a test that compares it with all Prisma models that have `tenantId`; audited and dirección-only. 4. borrar-colegio: also delete the tenant's files from the storage provider via FileStorage before the cascade delete (keep `--confirmar <slug>`; add `--dry-run`).

## Decisiones
- La lista de tablas exportadas se deriva de `Prisma.ModelName` menos los modelos globales (`MODELOS_GLOBALES`, ahora exportado de `db.ts`) y `TABLAS_OMITIDAS` (`JustificacionToken`, `CarnetQr`: solo hashes de secretos). El test lee `schema.prisma` y exige cobertura.
- `exportarColegio` sigue devolviendo un objeto, ahora con una clave por delegado (`alumno`, `mensaje`…); se ajustó el test existente.
- Editar un evento no cambia su salón; editar una tarea solo valida «fecha ya pasó» si la fecha cambió.
- .ics en UTC (sin VTIMEZONE); entregas de tarea como día completo (día de Lima).
- `borrar-colegio` aborta sin tocar la BD si algún archivo no se puede borrar; corre con `tsx --conditions=react-server` para importar `src/lib/server` (`server-only`).
- Etiquetas de los formularios de edición distintas a las de creación para no romper los selectores de los e2e existentes.

## Cambios realizados
- `src/lib/server/tareas.ts`, `agenda.ts`: `actualizarTarea`, `actualizarEvento` (solo funciones nuevas).
- `src/app/colegio/[slug]/{tareas,agenda}/`: actions y desplegables de edición; enlace .ics en la agenda.
- `src/lib/ics.ts`, `src/app/colegio/[slug]/api/agenda.ics/route.ts`.
- `src/lib/server/exportar.ts`, `api/exportar/route.ts`, `storage/index.ts` (`leerArchivo`, `borrarArchivoDelProveedor`), `db.ts`, dependencia `fflate`.
- `scripts/borrar-colegio.ts`, `package.json`.
- Tests: `tests/unit/ics.test.ts`, `tests/integracion/extras-edicion-ics-zip.test.ts`, e2e de tareas-agenda y direccion-panel.
- Specs 12 y 15.

## Validación
- `pnpm lint && pnpm typecheck && pnpm test` pasan; `pnpm khipu:borrar-colegio nuevohorizonte --confirmar nuevohorizonte --dry-run` solo lista.
- e2e completo con `E2E_PORT=3007`: 23 pasan (en corridas con otros agentes en paralelo hubo timeouts intermitentes que pasaron al repetir).

## Pendientes y preguntas abiertas
- El ZIP se arma en memoria en una petición; para colegios con muchos archivos habrá que moverlo a una cola.
- El .ics es descarga puntual, no suscripción por URL.
