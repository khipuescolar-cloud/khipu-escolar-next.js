# Filtro «Curso» del profesor en «Filtrar reporte»

| Campo | Valor |
|---|---|
| Fecha | 2026-11-07 |
| Colaborador | Carlos Calderón (desarrollo) |
| Agente y modelo | Claude Code · claude-opus-5-5 (Codex sin créditos hasta 2026-11-11) |
| Rama y commits | `fix/reporte-filtro-cursos` |
| Specs afectadas | `specs/27-reportes-asistencia.md` |

## Pedidos del colaborador (textual)
> [captura del panel «Filtrar reporte»] aqui estoy viendo una inconsistencia, ya que el profesor solo deberia ver los grados que enseña y por ejemplo si enseña a 1º de secundaria pero enseña 2 cursos , entonces deberia aparecer en el otro filtro el curso que quiere ver, eso es si el salon que selecciono no es esta bajo su tutoria, pero si esta puede ver el reporte de todos los cursos que le corresponde; me deje entender? o no comprendiste algo

> en la pregunta a me gusta tu propuesta y es justamente lo que queria , en la pregunta b si deja una opcion que diga MIS CURSOS; c si me gusta tu propuesta

## Decisiones
- (a) Grado sin salón: los cursos que dicta en ese grado y todos los de su tutoría si está en ese grado.
- (b) Salón que no tutorea: opción «Mis cursos» (por defecto) o un curso suyo.
- (c) Alumno de un salón que no tutorea: solo sus faltas y tardanzas a clase en los cursos del profesor, sin la asistencia al colegio.
- En su tutoría: «Asistencia al colegio» (por defecto), «Todos los cursos» o un curso del salón.
- La asistencia al colegio (salón, alumno, grado, resumen) del profesor queda limitada a su tutoría (antes, todos los salones donde dictaba).
- Un curso sin alumno abre el historial ya existente (`/asistencia/reportes/curso/[id]`).

## Cambios realizados
- `src/lib/server/reportes-asistencia.ts`: `tutoriasDe`, alcance del profesor = tutoría; `cursosDelReporte`; `opcionesDeReporte` con `cursos` y `tutorias`; nuevo `reporteCursos` y `esReporteDeCursos`; `detalleCurso` con la regla del historial; `asistenciaPorCurso` filtra por cursos y alumno.
- `src/lib/reportes-asistencia.ts`: `FiltrosReporte.cursoId` (`?curso=mis|uuid`), `MIS_CURSOS`.
- `FiltroReporte.tsx`: selector «Curso»; `ver/page.tsx`: vista por cursos; `vistas.tsx`: `VistaCursos`.
- Pruebas: integración, unit y e2e (ver spec 27, «Pruebas»).

## Validación
- `pnpm lint`, `pnpm typecheck`: OK. `pnpm test`: 155 archivos, 1241 pruebas OK (incluye las nuevas).
- e2e `tests/e2e/reportes-profesor.test.ts`: 3/3 OK. `tests/e2e/reportes-asistencia.test.ts` «dirección filtra un salón…» falla hoy porque es sábado (la vista del día no es hábil); no está relacionado con este cambio.

## Pendientes y preguntas abiertas
- Descargas (Excel/PDF/CSV) y vista calendario del reporte por cursos («Mis cursos»).
- El e2e de dirección depende de que hoy sea día hábil.
