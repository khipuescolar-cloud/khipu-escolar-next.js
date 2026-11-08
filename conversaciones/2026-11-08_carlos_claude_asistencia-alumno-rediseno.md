# Rediseño de «Mi asistencia» del alumno

| Campo | Valor |
|---|---|
| Fecha | 2026-11-08 |
| Colaborador | Carlos Calderón (producto) |
| Agente y modelo | Claude Code · claude-opus-5-5, skills `ui-ux-pro-max` e `impeccable` (Codex sin créditos hasta el 11 nov.) |
| Rama y commits | `feat/asistencia-alumno-rediseno` |
| Specs afectadas | `specs/27-reportes-asistencia.md`, `specs/04-asistencia.md` |

## Pedidos del colaborador (textual)
> /ui-ux-pro-max /impeccable sigue sin gustarme como se ve este modulo, lo dejo en tus manos para que puedas mejorarlo y reorganizarlo, tienes libertad para crear nuevos modulos o nuevas vistas solo por esta vez

## Decisiones
- Se rediseña dentro del sistema actual (`DESIGN.md`, modo Operate). Se conservan la marca, los colores de sección y los estados con ícono + palabra. Carlos dejó la decisión a Claude, así que no hubo preguntas.
- Tres pestañas: **Resumen · Llegadas · Cursos**, más una vista nueva para el **historial de un curso** (`/asistencia/curso/[id]`).
- El periodo se elige por **bimestre o «Año»**, en vez de campos de fecha. «Año» va desde el inicio de clases.
- Resumen: una frase en vez de una cifra gigante, y el periodo dibujado **como khipu** (cuerda por mes, cuerda por semana, nudo por día con su ícono). Al lado, «Para revisar» y «Cursos con menos asistencia».
- La familia usa las mismas vistas (Resumen y Cursos) en su «Reporte de asistencia», con un selector de hijo. Su calendario y sus justificaciones no cambian.
- Se retira `ReporteFamilia.tsx`, y `VistaCursos` vuelve a ser solo del personal.

## Cambios realizados
- Nuevos: `src/lib/periodos-asistencia.ts`, `src/app/colegio/[slug]/asistencia/_alumno/` (`AsistenciaAlumno`, `ResumenAsistencia`, `CuerdaPeriodo`, `ListaCursos`, `SelectorPeriodo`) y `src/app/colegio/[slug]/asistencia/curso/[cursoId]/page.tsx`.
- `src/lib/server/reportes-asistencia.ts`: `periodosDelAlumno`.
- `src/app/colegio/[slug]/asistencia/page.tsx`: `VistaAlumno` nueva; `VistaFamilia` solo para la familia.
- `CalendarioAsistencia.tsx`: modo `compacto` y `hrefMes`.
- `reportes/page.tsx`: la familia usa `AsistenciaAlumno` y se redirigen los enlaces viejos del alumno.
- `navegacion.ts`: nueva descripción de «Mi asistencia».
- Pruebas: `tests/unit/periodos-asistencia.test.ts` (nueva) y `tests/e2e/asistencia-alumno-reporte.test.ts` (reescrita).

## Validación
- `pnpm lint`, `pnpm typecheck`: OK. `pnpm test`: 156 archivos, 1247 pruebas OK.
- e2e (puerto 3062): `asistencia-alumno-reporte` y `paginas-basico-por-rol` OK.
- Detector de `impeccable`: sin hallazgos.
- Capturas revisadas: alumno en escritorio (Resumen, «Año», Llegadas, Cursos y el historial de Arte y Cultura), alumno en celular (390 px) y la familia con dos hijos.

## Pendientes y preguntas abiertas
- Descargas por curso (Excel, PDF y CSV).
- En pantallas anchas, el rótulo de días (L M M J V) de la cuerda solo aparece en el primer mes de la fila.
