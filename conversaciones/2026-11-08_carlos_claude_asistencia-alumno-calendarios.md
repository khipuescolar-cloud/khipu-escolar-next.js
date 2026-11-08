# «Mi asistencia»: calendarios, botones y llegadas en dos columnas

| Campo | Valor |
|---|---|
| Fecha | 2026-11-08 |
| Colaborador | Carlos Calderón (producto) |
| Agente y modelo | Claude Code · claude-opus-5-5 (Codex sin créditos hasta el 11 nov.) |
| Rama y commits | `feat/asistencia-alumno-calendarios` |
| Specs afectadas | `specs/27-reportes-asistencia.md` |

## Pedidos del colaborador (textual)
> [Image #5] esto lo puedes hacer en forma de calendario porfavor , [Image #6] aqui poder tener 2 columnas de las llegas por que veo que a veces es demasiado largo las filas y es tedioso hacer el scroll , asi que si lo organizamos en 2 columnas seria mucho mejor; [Image #7] aqui tambien podriamos mejorar mucho mas esta vista y el descargar periodo que este en la parte superior ; que capaz no usemos tabs sino que usemos botones asi como en otros modulos

## Decisiones
- Se crea un componente de calendario por mes (`CalendarioMeses`, de lunes a viernes, el más reciente primero) y se usa en dos lugares: el historial de un curso, en vez de la lista, y el Resumen, en vez de la cuerda.
- Las vistas pasan a botones con ícono (`PestanasSegmento`, como «Tabla | Calendario» de los reportes), con «Descargar PDF del periodo» arriba a la derecha.
- El periodo va en botones compactos con el rótulo «Periodo:».
- Resumen: cifras en una superficie (asistencia, llegó, tarde, no llegó) y debajo los calendarios con «Para revisar» y «Cursos con menos asistencia» al lado.
- Llegadas: lista en dos columnas junto al calendario.
- En el historial del curso no se dibujan los meses sin ninguna clase con lista.

## Cambios realizados
- Nuevo `src/app/colegio/[slug]/asistencia/_alumno/CalendarioMeses.tsx`; se elimina `CuerdaPeriodo.tsx`.
- `ResumenAsistencia.tsx`, `AsistenciaAlumno.tsx` y `SelectorPeriodo.tsx` rehechos.
- `curso/[cursoId]/page.tsx`: historial en calendarios.
- `asistencia/page.tsx`: llegadas en dos columnas.
- `tests/e2e/asistencia-alumno-reporte.test.ts`: ajustado (cifras, «Día a día», PDF, «Clase por clase»).

## Validación
- `pnpm lint`, `pnpm typecheck`: OK. `pnpm test`: 1247 OK.
- e2e (puerto 3063): `asistencia-alumno-reporte` y `paginas-basico-por-rol`, 6 OK.
- Detector de `impeccable`: sin hallazgos.
- Capturas revisadas: Resumen, Llegadas y el historial de Arte y Cultura en escritorio, y el Resumen en celular.

## Pendientes y preguntas abiertas
- Descargas por curso (Excel, PDF y CSV).
