# 32 — Reuniones (convocatoria, confirmación y acta)

> Estado: implementado · Plan: Khipu Pro (módulo `reuniones`) · Última actualización: 2026-11-03 (Claude Code, rama `pro-reuniones`: tipos, personal invitado, disponibilidad, reprogramar, cancelar con motivo, solicitudes y acuerdos → **specs/40**) · 2026-10-31 (rama `feat/reuniones`)

> **Ampliado por `specs/40-disponibilidad-y-reuniones.md`.** Donde esta spec y la 40 difieran (convocar, ver, cancelar, avisos de convocatoria y cancelación, permisos del profesor y del administrativo), manda la 40. Lo de recordatorio, asistencia y acta sigue aquí.

## Objetivo
Convocar reuniones (de aula, de colegio o individuales con una familia), saber quién confirma, marcar la asistencia real
y publicar el acta. Complementa la agenda (`specs/12`): las reuniones aparecen allí sin duplicarse como evento.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Dirección | Convocar cualquier reunión (colegio, salón, individual); ver y gestionar **todas** (recordar, asistencia, acta, cancelar) | — |
| Profesor / tutor | Convocar a **sus salones** (tutor o dicta algún curso) y reuniones **individuales** con la familia de un alumno de sus salones; gestionar **solo las que convocó** | Convocar a todo el colegio o a salones/alumnos ajenos; ver o gestionar reuniones de otros |
| Apoderado | Ver **solo** reuniones donde tiene una fila de invitado; responder; leer el acta publicada | Convocar; ver reuniones ajenas; ver la lista de otros invitados |
| Administrativo, portería, alumno | — (403 en `/reuniones`) | Todo |
| Colegio con Khipu Base | — | 403 en `/reuniones` (`requireFeature`) |

Todo el control es de servidor (`src/lib/server/reuniones.ts`). Un id de reunión ajeno, de otro colegio o inexistente se trata igual (404 en la página, 403 en las acciones): no se revela su existencia.

## Flujos
1. **Convocar** (`/reuniones` → «Convocar reunión»): título, descripción, fecha, hora de inicio y fin (opcional), lugar y/o enlace (al menos uno), alcance (todo el colegio / un salón / la familia de un alumno) y el salón o alumno. Se crean los invitados y se encolan los avisos (`TipoAviso.reunion`, correo y push, con enlace a `/reuniones/<id>`). La action procesa la cola con `after()`.
2. **Responder** (familia, en la lista o en el detalle): «Asistiré» / «No asistiré» + comentario opcional (300 caracteres). Se puede cambiar hasta la hora de inicio; después, no.
3. **Confirmaciones** (quien gestiona, en el detalle): resumen «N asistirán · N no asistirán · N sin respuesta» y las tres listas con nombres, hijo por el que se cita y comentario. Botón «Recordar a quienes no respondieron» (solo antes de empezar y si hay pendientes).
4. **Después de empezar**: «Marcar asistencia» (casillas por persona; lo no marcado queda como no asistió), «Escribir acta» (texto; casilla «Publicar a las familias invitadas») y «Marcar como realizada».
5. **Cancelar**: solo una reunión programada; avisa a todos los invitados. Desaparece de la agenda.

## Reglas de negocio
- `alcance = salon` exige `salonId` activo; `individual` guarda además el `salonId` del alumno (para mostrar el salón); `colegio` va sin salón y solo lo convoca dirección.
- **Invitados** (`generarInvitados`, `src/lib/reuniones.ts`): salón e individual → una fila por (apoderado, alumno) con apoderado activo y alumno activo; todo el colegio → **una fila por apoderado** con `alumnoId = null` (una familia con cuatro hijos no recibe cuatro filas). Único `(reunión, membresía, alumno)` con NULLS NOT DISTINCT. Sin familias que invitar, no se crea la reunión.
- Al responder se actualizan **todas** las filas de esa persona en la reunión (una familia con dos hijos en el salón responde una vez). El resumen cuenta personas, no filas.
- La fecha de inicio debe ser futura al convocar; `fin >= inicio` (también CHECK en BD). Fechas en America/Lima.
- **Avisos**: una fila por familia y canal, solo apoderados con consentimiento vigente y según sus preferencias (igual que tareas). Plantillas `reunion_convocada`, `reunion_recordatorio`, `reunion_cancelada`, `reunion_acta` (`email/plantillas/index.ts`, también en `PLANTILLAS_FAMILIA` de `cola.ts`). Los invitados sin consentimiento o sin canal aparecen invitados en la app pero no reciben aviso. Recordatorio: máximo uno cada 6 horas por reunión.
- **Asistencia y acta** solo desde la hora de inicio y si no está cancelada. El acta se puede guardar como borrador (las familias no la ven); al publicarla se fija `actaPublicadaAt` (no se reinicia al editar), la reunión pasa a «Realizada» y se avisa a los invitados la primera vez. Las familias solo reciben el acta si `actaPublicadaAt` tiene valor.
- «Por cerrar» = programada cuyo inicio ya pasó (solo lo ve quien gestiona).
- **Auditoría** (`auditar`): `crear · reunion` (alcance, nº de invitados, familias avisadas), `borrar · reunion` (cancelación), `editar · reunion_acta`, `editar · reunion` (asistencia, realizada) y `enviar · reunion` (recordatorio).

## Integración con agenda y `.ics`
Decisión: **no** se crea un `EventoAgenda` enlazado (habría que sincronizar edición, cancelación e invitados y quedaría un evento visible para quien no fue invitado). `itemsDeAgenda` (`src/lib/server/agenda.ts`) lee también `reuniones` visibles para el usuario (dirección: todas; profesor: las que convocó; apoderado: donde es invitado; no canceladas) y las devuelve como ítems `tipo: "reunion"` con `href: /reuniones/<id>`. La agenda las muestra con «Ver reunión y responder» y el feed `/api/agenda.ics` las incluye sin cambios (UID `<id>@khipuescolar`). Solo se incluyen si el colegio tiene el módulo `reuniones`. El tipo `reunion` de `EventoAgenda` sigue existiendo para eventos manuales sin invitados.

## Modelo de datos
Migración `20261031130000_pro_completo_nudito_plus` (sin cambios de esquema en esta rama).

- **`Reunion`** (`reuniones`): `titulo`, `descripcion?`, `inicio`, `fin?`, `lugar?`, `enlace?`, `alcance` (`colegio | salon | individual`), `salonId?`, `convocadaPorId` (membresía), `estado` (`programada | realizada | cancelada`), `acta?`, `actaPublicadaAt?`.
- **`ReunionInvitado`** (`reunion_invitados`): `reunionId`, `membershipId`, `alumnoId?`, `respuesta` (`pendiente | asistire | no_asistire`), `respondidaAt?`, `comentario?`, `asistio?`.

## Contratos de `src/lib/server`
```ts
// reuniones.ts — requireFeature(ctx, "reuniones")
convocarReunion(ctx, { titulo, descripcion?, fecha, hora, horaFin?, lugar?, enlace?, alcance, salonId?, alumnoId? }): Resultado & { id? }  // dirección, profesor
opcionesParaConvocar(ctx)            // salones y alumnos elegibles
listarReuniones(ctx): ReunionVista[] // según rol; incluye `mia` (familia) o `resumen` (quien gestiona)
detalleReunion(ctx, id): DetalleReunion | null   // `personas` solo para quien gestiona
responderInvitacion(ctx, id, { respuesta, comentario? }): Resultado   // 403 si no es invitado
recordarPendientes(ctx, id): Resultado
marcarAsistencia(ctx, id, asistentes: membershipId[]): Resultado
marcarRealizada(ctx, id): Resultado
guardarActa(ctx, id, { acta, publicar }): Resultado
cancelarReunion(ctx, id): Resultado
// notificaciones/avisos-reuniones.ts
avisarReunion(ctx, plantilla, reunion, filas): number /* familias */
// src/lib/reuniones.ts (puro)
generarInvitados(alcance, vinculos), puedeResponderReunion(reunion, ahora), resumirRespuestas(invitados)
```

## Rutas y UI
- `/reuniones` (dirección, profesor, apoderado): «Próximas», «Por cerrar» (solo quien gestiona) y «Anteriores»; la familia responde en la propia tarjeta.
- `/reuniones/[id]`: datos, respuesta propia, confirmaciones, acciones de después de la reunión, acta. Acciones en `reuniones/actions.ts`.
- Navegación: grupo «Comunicación» (módulo `reuniones`); agenda: ítems con enlace.

## Textos y UX
- Estados con ícono + palabra: Programada, Realizada, Cancelada, Por cerrar; Asistiré, No asistiré, Sin respuesta. Tú a las familias.
- Vacíos: «Todavía no convocaste reuniones» / «No tienes reuniones por ahora».
- Avisos: asunto «Reunión: <título>», «Recordatorio: <título>», «Reunión cancelada: <título>», «Acta de la reunión: <título>».

## Errores y casos borde
- Reunión empezada, realizada o cancelada: no se puede responder (mensaje claro). Cancelada: alerta en el detalle y fuera de la agenda.
- El profesor que intenta salones, alumnos o alcance fuera de su ámbito recibe un mensaje de error (no se crea nada).

## Pruebas
- Unit: `tests/unit/reuniones.test.ts` (generación de invitados, plazo de respuesta, resumen).
- Integración: `tests/integracion/reuniones.test.ts` (alcances, permisos del profesor, aislamiento entre colegios, 403 en Base, responder solo lo propio, avisos con consentimiento, agenda, recordatorio, asistencia, acta, cancelación, auditoría).
- e2e: `tests/e2e/reuniones.test.ts` (Lucía convoca a 3.° B; Rosa confirma; Lucía ve la confirmación, marca asistencia y publica el acta; Rosa la lee; 403 en Base).
- Seed: `prisma/seed-reuniones.ts` (Nuevo Horizonte: reunión pasada con asistencia y acta, próxima de 3.° B con respuestas mixtas y Rosa sin responder, individual con Rosa y asamblea de todo el colegio).

## Pendientes
- Recordatorio automático el día anterior; exportar acta a PDF. (Reprogramar e invitar personal: hechos en specs/40.)
