# El alumno ya no ve notas ni libreta

| Campo | Valor |
|---|---|
| Fecha | 2026-11-08 |
| Colaborador | Carlos (desarrollo) |
| Agente y modelo | Claude Code · claude-opus-5-5 (Codex sin créditos hasta el 2026-11-11) |
| Rama y commits | `fix/alumno-sin-notas` |
| Specs afectadas | `specs/11-notas-y-libreta.md`, `specs/38-notificaciones-academicas.md` |

## Pedidos del colaborador (textual)
> [captura de la vista «Notas» del alumno] el alumno no deberia tener el modulo de registro de notas ya que el no ingresa notas y tampoco deberia tener el modulo de libreta por que no es padre o apoderado

> (respuesta a la pregunta de Claude) yo preferiria que el alumno no pueda ver sus notas ya que a el lo evaluan en clase y el sabe su nota, pero el padre de familia no sabe , asi que a el si le deberian aparecer esos modulos, no crees ?

## Decisiones
- El alumno no ve sus notas ni su libreta en Khipu; la familia sigue viéndolas igual.
- El aviso de «Evaluación programada» al alumno se mantiene (es una fecha, no una nota), pero lleva a `/agenda`.

## Cambios realizados
- `src/lib/navegacion.ts`: «Registro de notas» y «Libreta» sin el rol alumno.
- `notas/page.tsx` y `libreta/page.tsx`: 403 para el alumno.
- `src/lib/server/notas.ts` (`notasDeAlumno`) y `src/lib/server/libreta.ts` (`datosLibreta`): rechazan el rol alumno; aviso de evaluación programada del alumno → `/agenda`.
- `src/lib/server/agenda.ts`: las evaluaciones en la agenda del alumno no enlazan a Notas.
- `src/lib/modulos.ts`: descripción del rol alumno.
- Tests: `tests/integracion/rol-alumno.test.ts` actualizado; nuevo `tests/e2e/alumno-sin-notas.test.ts`.

## Validación
- `tsc --noEmit` y `pnpm lint`: sin errores.
- `pnpm test`: 155 archivos, 1243 pruebas OK.
- Playwright (puerto 3060): `alumno-sin-notas`, `asistencia-alumno-reporte` → 3/3 OK.

## Pendientes y preguntas abiertas
- Las tareas estilo Classroom (specs/39) pueden mostrarle al alumno la calificación de su entrega; no se tocó (otra sesión trabaja en tareas). Decidir si también se oculta.

## Seguimiento (2026-11-08)
> la nota de la tarea no deberias ocultarle, pero las otras notas que pueda tener del registro de notas el profesor, eso si

- Se mantiene: el alumno ve la nota de sus tareas en `/tareas`; el registro de notas y la libreta siguen ocultos.
- Revisado: los avisos de notas publicadas (`calificacion`) solo van a las familias.
- Texto de «Notificaciones» del alumno sin «Notas» (`notificaciones/page.tsx`, `navegacion.ts`); specs/11 aclara la regla.
