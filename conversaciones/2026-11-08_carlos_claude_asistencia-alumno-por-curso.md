# Asistencia del alumno: llegada al colegio + reporte, y reporte por curso

| Campo | Valor |
|---|---|
| Fecha | 2026-11-08 |
| Colaborador | Carlos Calderón (producto) |
| Agente y modelo | Claude Code · claude-opus-5-5 (Codex sin créditos hasta el 11 nov.) |
| Rama y commits | `feat/asistencia-alumno-por-curso` |
| Specs afectadas | `specs/27-reportes-asistencia.md`, `specs/04-asistencia.md` |

## Pedidos del colaborador (textual)
> [Image #3] para el alumno el modulo de asistencia deberia mostrar el registro de la llegada al colegio y el reporte de asistencia [Image #4] deberia poder mostrar por curso tambien

Respuestas a las preguntas de Claude:
> ¿Cómo organizar el módulo? → «Una sola página (Recomendado)»
> ¿Para quién aplica la vista por curso? → «Todos los roles (Recomendado)»

## Decisiones
- Alumno: una sola página «Mi asistencia». Arriba, «Llegada al colegio» (calendario y lista solo con el ingreso al colegio). Debajo, «Reporte de asistencia» con pestañas «Al colegio» | «Por curso». Se quita «Reporte de asistencia» de su menú y `/asistencia/reportes` lo redirige a `/asistencia#reporte`.
- Apoderado: su «Reporte de asistencia» suma la pestaña «Por curso». Su calendario no cambia: ahí sigue justificando también las faltas a clase.
- Dirección, administrativo y profesor ya tenían el reporte por curso (filtro «Curso», `VistaCursos`), así que con eso queda cubierto «todos los roles».
- `reporteCursos` acepta familia y alumno solo con un `alumnoId` visible. Muestra los cursos del salón de ese alumno.
- En la vista familiar por curso: columnas «Clases» y «% asistencia» (clases sin falta ÷ clases con lista), y sin enlace al historial del curso, que es de uso interno.

## Cambios realizados
- `src/lib/server/reportes-asistencia.ts`: `reporteCursos` para familia y alumno.
- `src/app/colegio/[slug]/asistencia/reportes/ReporteFamilia.tsx` (nuevo): fechas, atajos, selector de hijo y pestañas.
- `src/app/colegio/[slug]/asistencia/reportes/vistas.tsx`: `VistaCursos` con modo `familia` y columna «% asistencia».
- `src/app/colegio/[slug]/asistencia/page.tsx`: vista del alumno (solo ingreso al colegio + reporte).
- `src/app/colegio/[slug]/asistencia/reportes/page.tsx`: redirección del alumno, familia con `ReporteFamilia` y limpieza de los filtros familiares antiguos.
- `src/lib/navegacion.ts`: «Reporte de asistencia» solo para el apoderado.
- Pruebas: integración en `tests/integracion/reportes-asistencia.test.ts` y e2e nuevo `tests/e2e/asistencia-alumno-reporte.test.ts`.

## Validación
- `pnpm lint`, `pnpm typecheck`: OK. `pnpm test`: 1250 OK.
- e2e (puerto 3060): `asistencia-alumno-reporte` (2), `reportes-profesor` (3), `paginas-basico-por-rol` (4) y 2 de `reportes-asistencia` pasan. Falla «dirección filtra un salón…»: espera la asistencia de hoy y es domingo (día no hábil). No viene de este cambio.
- Capturas revisadas con Lucas Huamán (alumno de 5.° A).

## Pendientes y preguntas abiertas
- Descargas (Excel, PDF y CSV) del reporte por curso para familia y alumno.
- Los e2e del reporte de dirección fallan en fin de semana o feriado.
