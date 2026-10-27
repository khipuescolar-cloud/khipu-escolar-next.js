# Avisos pendientes del MVP: reserva atómica de la cola, avisos al profesor, tareas, alerta de rebote y justificaciones

| Campo | Valor |
|---|---|
| Fecha | 2026-10-27 |
| Colaborador | Claude Code (orquestador) |
| Agente y modelo | Claude Code (subagente) · Claude Opus 5.5 |
| Rama y commits | `feat/avisos-pendientes` · ver `git log feat/avisos-pendientes` |
| Specs afectadas | `specs/06-avisos-notificaciones.md`, `specs/07-justificaciones.md`, `specs/08-chat-familia-profesor.md`, `specs/12-tareas-y-agenda.md` (solo avisos) |

## Pedidos del colaborador (textual)
> You are finishing pending items of the Khipu Escolar MVP (multitenant school platform for Peru, Spanish UI). Work ONLY in the git worktree `/home/carlos-calderon/Escritorio/StartUp/Asistente Virtual Academico (AVA)/khipu-wt/avisos-pendientes` (branch `feat/avisos-pendientes`). Two other agents work in parallel in sibling worktrees (`ui-pendientes`, `extras-pendientes`); don't touch them.

> ## Read first (mandatory)
> - `AGENTS.md` and follow its MANDATORY rules: update the affected specs (`specs/06-avisos-notificaciones.md`, `specs/07-justificaciones.md`, `specs/08-chat-familia-profesor.md`, `specs/12-tareas-y-agenda.md` — only the notification parts) in the same commit, and write the session log `conversaciones/2026-10-27_claude-code-orquestador_claude-code-subagente_avisos-pendientes.md` from `conversaciones/_plantilla.md` (colaborador "Claude Code (orquestador)", no secrets).
> - Existing code: `src/lib/server/notificaciones/{cola,encolar,avisos-familia,email,push,limites,ses,preferencias,tipos}.ts`, `src/lib/server/email/plantillas/`, `src/app/api/webhooks/ses/route.ts`, `src/app/api/cron/avisos/route.ts`, `src/lib/server/{mensajes,justificaciones,tareas,auditoria,tenant}.ts`, `prisma/schema.prisma`.
> - The schema was JUST extended for you (already migrated in the shared local DB, client generated): `EstadoAviso.enviando`, `TipoAviso.{justificacion,tarea,alerta_direccion}`, `Aviso.referenciaId`, `Justificacion.comentarioRevision`. Do NOT change the schema or migrations.
> - Next.js 16.4 has breaking changes: check `node_modules/next/dist/docs/` before using APIs.

> ## Tasks
> 1. **Queue claim with `enviando`**: replace the current "claim by moving programadoPara" in `cola.ts` with an atomic claim (`updateMany where estado=pendiente AND id IN batch → estado=enviando`, or `UPDATE … FOR UPDATE SKIP LOCKED` via `$queryRaw`), plus recovery of rows stuck in `enviando` longer than N minutes back to `pendiente`. Keep daily limit / rate / retries behaviour and tests green; add a concurrency test (two `procesarCola()` in parallel never send the same row twice).
> 2. **Notify teachers of new family messages**: when an apoderado writes in a conversation, enqueue `mensaje_nuevo` for the teacher (correo + push per their push subscriptions; teachers don't need consent), max 1 per conversation per 15 min, using `referenciaId = conversacionId` (also migrate the existing apoderado-side 15-min limit in `avisos-familia.ts` from payload url matching to `referenciaId`). Keep your edit in `mensajes.ts` minimal (only the notify call site) — another agent edits label code in that file.
> 3. **Task notice to families**: new plantilla `tarea_nueva` (payload `{ colegio, alumno?, curso, titulo, fechaEntrega:"AAAA-MM-DD", url }`, text short, "tú"), tipo `tarea`, `referenciaId = tareaId`, enqueued to consenting families of the course's salón when a teacher creates a task with the "Avisar a las familias" checkbox (add the checkbox to the task creation form). Put the enqueue logic in a function in `src/lib/server/notificaciones/` and call it from task creation with a single line; another agent edits update/delete functions in `tareas.ts`.
> 4. **Bounce/complaint alert to dirección**: when the SES webhook disables an email (permanent bounce/complaint), enqueue `alerta_direccion` (plantilla `alerta_rebote`, payload `{ colegio, apoderado, alumnos, motivo, url }`) to the tenant's dirección members (correo), max 1 per apoderado per day (`referenciaId = apoderadoId`).
> 5. **Justifications**: use tipo `justificacion` for `justificacion_recibida`/`justificacion_revisada`; store the reviewer comment in `Justificacion.comentarioRevision` and show it to the family on `/justificaciones` and in the notice.
> 6. Update the plantilla contract table in spec 06.

> ## Rules
> - `requireTenantContext`, `ctx.db`/`dbTenant`, `requireFeature`, zod, `auditar()`; never trust client tenantId; scalar FKs.
> - Don't edit `src/app/colegio/[slug]/layout.tsx`, `src/lib/navegacion.ts`, `prisma/seed.ts`.
> - Shared local DB: integration tests create their own tenant (`test-avisos2-<random>`) and clean up; never run `pnpm db:seed` or reset.
> - Port 3005 (`.env` has `APP_BASE_DOMAIN=lvh.me:3005`), e2e: `E2E_PORT=3005 pnpm e2e`. Mailpit API http://127.0.0.1:54324/api/v1/messages. Supabase is running; don't stop it.
> - Before finishing: `pnpm lint && pnpm typecheck && pnpm test` pass, and the full e2e passes. Commit on `feat/avisos-pendientes` (imperative subject, end message with `Co-Authored-By: …`). Don't push or merge.

> ## Final message
> Implemented changes (files), test counts, anything left undone.

## Decisiones
- **Reserva de la cola**: un solo `UPDATE avisos SET estado='enviando', programado_para=now() WHERE id = ANY(lote) AND estado='pendiente' RETURNING id` con `$queryRaw`. En READ COMMITTED Postgres bloquea la fila y reevalúa la condición, así que cada fila la obtiene un solo worker y sabemos exactamente cuáles reservó esta llamada. El cupo diario se aplica al elegir el lote (los correos sin cupo siguen `pendiente` como `diferidos`).
- Mientras la fila está `enviando`, `programadoPara` guarda la hora de reserva (sin cambiar el esquema). Recuperación: más de 10 min en `enviando` → `pendiente` con +1 intento (o `error` si ya agotó los reintentos). Se acepta un posible envío repetido antes que perder el aviso.
- **Aviso al profesor**: nueva función `avisarMensajeNuevo()` (`notificaciones/avisos-mensajes.ts`) que decide la dirección del aviso; en `mensajes.ts` solo cambió la llamada (y el import). Filas al profesor sin `apoderadoId`: así no reciben «Ajustar mis avisos», no cuentan para el límite de la familia y un rebote no desactiva vínculos.
- El worker agrega `urlPreferencias` solo a plantillas de familia **con `apoderadoId`**.
- **Tareas**: `avisarTareaNueva(ctx, tareaId, entrada)` lee `avisarFamilias` de la entrada (true / "on"), agrupa por familia (un aviso aunque tenga varios hijos en el salón; `alumno` = «Mateo y Ana») y es idempotente por `referenciaId`. La action procesa la cola con `after()`.
- **Alerta de rebote**: `alertarCorreoDesactivado()` en `notificaciones/alertas-direccion.ts`, llamada desde `procesarEventoSes`; 1 por apoderado por día de Lima; si falla, el webhook igual responde 200. `alumnos` es un arreglo de primeros nombres. Enlace a `/avisos`.
- **Justificaciones**: tipo `justificacion` y `referenciaId = justificacionId`; el comentario se guarda en `comentarioRevision` y se muestra a la familia («Comentario del colegio: …»).
- `/avisos` (filtros) ahora incluye el estado `enviando` y los tipos nuevos.
- Ayudante de pruebas `crearColegioPrueba` acepta `plan` y `prefijo` (para `test-avisos2-…` y plan Fase 2).

## Cambios realizados
- `src/lib/server/notificaciones/cola.ts`: reserva atómica `pendiente → enviando`, recuperación de atascados (`ENVIANDO_MAX_MINUTOS`), `recuperados` en el resumen, `urlPreferencias` solo con `apoderadoId`, `tarea_nueva` como plantilla de familia.
- `src/lib/server/notificaciones/encolar.ts`: `referenciaId` en `encolarAviso` y `encolarParaDestinatario`.
- `src/lib/server/notificaciones/avisos-familia.ts`: `mensaje_nuevo` con `conversacionId`; límite de 15 min por `referenciaId`.
- Nuevos: `src/lib/server/notificaciones/avisos-mensajes.ts`, `avisos-tareas.ts`, `alertas-direccion.ts`.
- `src/lib/server/notificaciones/ses.ts`: encola la alerta a dirección tras desactivar.
- `src/lib/server/email/plantillas/index.ts`: plantillas `tarea_nueva` y `alerta_rebote`.
- `src/lib/server/mensajes.ts`: solo la llamada de aviso (`avisarMensajeNuevo`).
- `src/lib/server/tareas.ts` (una línea + import) · `src/app/colegio/[slug]/tareas/{actions.ts,page.tsx}`: casilla «Avisar a las familias» y `after(procesarCola)`.
- `src/lib/server/justificaciones.ts`, `src/app/colegio/[slug]/justificaciones/page.tsx`: tipo `justificacion`, `comentarioRevision`.
- `src/app/colegio/[slug]/avisos/page.tsx`: filtros con estado y tipos nuevos.
- Pruebas: `tests/integracion/avisos-pendientes.test.ts` (nuevo), `tests/integracion/{justificar-token,gestion-mensajes-privacidad}.test.ts`, `tests/integracion/ayudantes/colegio-prueba.ts`, `tests/unit/plantillas-avisos.test.ts`, `tests/e2e/tareas-agenda.test.ts` (marca la casilla y espera el correo en Mailpit).
- Specs 06, 07, 08 y 12 actualizadas (contrato de plantillas con tipo, destinatario y `referenciaId`).

## Validación
- `pnpm lint` (sin avisos) · `pnpm typecheck` OK · `pnpm test`: 23 archivos, 197 pruebas OK.
- `E2E_PORT=3005 pnpm e2e` (22 pruebas): las corridas completas tuvieron fallos por tiempo de espera con la máquina sobrecargada (load average ~20 por los servidores de los otros worktrees): `notas-libreta`, `chat-familia-profesor`, `direccion-panel` y el envío de `tareas-agenda`. Cada archivo fallido se repitió aislado y pasó (`tareas-agenda` + `notas-libreta`: 7/7; `tareas-agenda` + `chat-familia-profesor` + `direccion-panel`: 6/6). Las otras 19 pasaron en la corrida completa. Se borraron las dos tareas «Tarea e2e …» que dejaron las corridas cortadas.
- La primera corrida mostró que la descripción de la casilla («…fecha de entrega») chocaba con `getByLabel("Fecha de entrega")`; se reescribió el texto.

## Pendientes y preguntas abiertas
- Preferencias de aviso para el personal (hoy el profesor siempre recibe correo y push).
- El chat y la alerta a dirección dependen del cron para enviarse (no hay `after()` en esas acciones).
- Programar el cron en el hosting.
