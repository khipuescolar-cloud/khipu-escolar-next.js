# Asistencia del alumno en pestañas e historial por curso

| Campo | Valor |
|---|---|
| Fecha | 2026-11-08 |
| Colaborador | Carlos Calderón (producto) |
| Agente y modelo | Claude Code · claude-opus-5-5 (Codex sin créditos hasta el 11 nov.) |
| Rama y commits | `feat/asistencia-tabs-historial-curso` |
| Specs afectadas | `specs/27-reportes-asistencia.md`, `specs/04-asistencia.md` |

## Pedidos del colaborador (textual)
> preferiria que se dividan en 2 vistas, una de asistencia y otra de reporte, pero que se haga por medio de unos tabs, pero en el reporte quiero poder ver el detalle de cada curso, osea poder ver el historial de asistencia que tiene el alumno desde que inicio las clases del curso de arte, si assitio, a que hora asistio, o si llego tarde, eso necesito verlo tambien

## Decisiones
- «Mi asistencia» del alumno: pestañas «Asistencia» (llegada al colegio) y «Reporte» (`?tab=reporte`), que reemplazan la página única del cambio anterior.
- En «Por curso», cada curso enlaza a su historial: cada clase con estado (Llegó, Tarde, No llegó, Aviso), hora de la lista, justificación y nota, más el % y el conteo por estado.
- Sin fechas elegidas, el historial va desde el inicio de clases: inicio del primer periodo del año o, si no hay periodos, el 1.º de enero.
- Vale también para la familia (`/asistencia/reportes?vista=cursos&curso=…`). Dirección y el profesor del curso o el tutor pueden pedir el mismo historial en el servidor.
- La hora que se muestra es la del registro de la lista de esa clase, no una hora de llegada aparte, porque esa es la que guarda la lista de curso.

## Cambios realizados
- `src/lib/server/reportes-asistencia.ts`: nuevo `historialCursoAlumno` con permisos y auditoría.
- `src/app/colegio/[slug]/asistencia/reportes/ReporteFamilia.tsx`: parámetro `curso`, inicio de clases por defecto y componente `HistorialCurso`.
- `src/app/colegio/[slug]/asistencia/reportes/vistas.tsx`: los cursos enlazan al historial en el modo familia.
- `src/app/colegio/[slug]/asistencia/page.tsx`: pestañas del alumno.
- `src/app/colegio/[slug]/asistencia/reportes/page.tsx`: el alumno se redirige a `/asistencia?tab=reporte`.
- Pruebas: `tests/integracion/reportes-asistencia.test.ts` (historial y permisos) y `tests/e2e/asistencia-alumno-reporte.test.ts`.

## Validación
- `pnpm lint`, `pnpm typecheck`: OK. `pnpm test`: 155 archivos, 1243 pruebas OK.
- e2e (puerto 3061, porque el 3060 lo usaba otra sesión): `asistencia-alumno-reporte` y `paginas-basico-por-rol`, 6 OK.
- Captura revisada: historial de Arte y Cultura de Lucas Huamán (48 clases, 93,8 %).

## Pendientes y preguntas abiertas
- Descargas (Excel, PDF y CSV) del reporte por curso y del historial para familia y alumno.
