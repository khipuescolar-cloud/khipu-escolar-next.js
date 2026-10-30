# 27 — Reportes de asistencia

> Estado: implementado (pruebas de integración y e2e escritas; pendientes de correr tras la migración de planes) · Plan: el del módulo `asistencia` (Khipu Base) · Última actualización: 2026-10-30 (Claude Code, rama `feat/asistencia-colegio-cursos`: reporte general del colegio para dirección, solo asistencia al colegio en el porcentaje, faltas en revisión, sección «Asistencia por curso» y enlaces «Corregir»)

## Objetivo
Dirección, administrativos y profesores ven el porcentaje de asistencia **al colegio** por **alumno**, por **salón** y por **rango de fechas**, y lo descargan en **Excel (.xlsx)** y **PDF**. Para dirección y administrativo es el **reporte general del colegio**: cuántos asistieron, faltaron (justificadas, en revisión, sin justificar) y sin registro en un día y en un rango, por salón, y aparte las **faltas a clase por curso**. Las familias ven el reporte de sus hijos. Complementa la spec 04 (pasar lista y corregir).

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Dirección | Reporte general (día + rango + por curso), cualquier salón, alumno y curso; exportar; **«Corregir»** abre la lista en modo corrección (spec 04) | — |
| Administrativo | Igual que dirección (solo lectura, sin «Corregir») | Corregir |
| Profesor | Salones donde es tutor o dicta (`salonIdsVisibles`), sus alumnos, el resumen de sus salones y sus cursos; exportar | Salones, alumnos o cursos ajenos (403); corregir |
| Apoderado | Reporte de sus hijos (`alumnoIdsVisibles`); exportar | Reporte de salón, resumen del colegio, alumnos ajenos (403) |
| Alumno | Su propio reporte | Todo lo demás (403) |
| Portería | — | Todo (403) |

Sin el módulo `asistencia` (`requireFeature`) todo responde 403. Cada vista y cada exportación se registra con `auditar()` (entidad `reporte_asistencia`; `ver` o `exportar` con el formato).

## Definición del porcentaje
Todo en la zona horaria del colegio (`tenant.zonaHoraria`).
- **Días hábiles** del rango: lunes a viernes sin feriados nacionales ni `FeriadoExtra` aplicables al colegio (`esDiaHabil` de `src/lib/dias-habiles.ts` + `feriadosAplicables`; los mismos del plazo de justificación, spec 07). Nunca se cuentan días posteriores a **hoy**: el rango se recorta a hoy (`hastaEfectivo`).
- **Solo cuenta la asistencia al colegio** (`ambito = "dia"`: portería o lista del día del tutor). Los registros de curso **no** cuentan en el porcentaje ni en los conteos del colegio, del salón ni del alumno (antes, sin ingreso, contaba el primer registro de curso; cambió el 2026-10-30). Un día con solo registros de curso es «sin registro» para el colegio. Lo mismo en el inicio de dirección (`resumenAsistenciaHoy`) y en el tablero (spec 33). Registros en fines de semana o feriados no cuentan.
- **Días con registro** = días hábiles con al menos un registro. **Sin registro** = días hábiles − días con registro (no cuentan en el porcentaje).
- **% de asistencia = (llegó + tarde) ÷ días con registro × 100**, un decimal. Sin días con registro: «Sin datos».
- Se muestran los conteos: Llegó, Tarde (tardanzas), No llegó (`falta`), Aviso (`problema`, cuenta como día con registro, no como presencia), **faltas justificadas** (justificación más reciente `aceptada`), **faltas en revisión** (justificación `pendiente`) y **faltas sin justificar** (sin justificación o `rechazada`), y días sin registro.
- Salón y colegio: el % es sobre la suma de días con registro de todos los alumnos (no el promedio de porcentajes). Solo alumnos activos.

## Asistencia por curso (sección aparte)
Solo si algún nivel del colegio tiene asistencia por curso activa (`Tenant.asistenciaPorCursoNiveles`, spec 04); si no, `cursos = null` y la sección no aparece. Una fila por curso con registros en el rango (alumnos activos, salones no archivados): **Registros** (alumno-clase), **Faltas a clase**, **Ingresó pero faltó** (falta a clase de un alumno con «Llegó» o «Tarde» en la asistencia del día de esa fecha) y **Tardanzas a clase**. Una sola consulta SQL agregada (`LEFT JOIN` con el registro del día; sin listas de ids, así un colegio de 1 000 alumnos no choca con el tope de 32 767 parámetros). Detalle de un curso (`?curso=<id>`): cada falta o tardanza con el alumno, el estado en clase, el ingreso al colegio de ese día y la justificación, con «Corregir» (dirección) a esa lista y fecha.

## Flujos
0. **Dirección y administrativo, sin filtros** (vista general): primero **«Asistencia al colegio» de un día** (`?dia=AAAA-MM-DD`, hoy por defecto, no después de hoy): cifras **Asistieron** (llegó + tarde, de N alumnos), **Faltaron** (justificadas · en revisión · sin justificar), **Con aviso** y **Sin registro** (sin escaneo ni lista del día); un día no hábil lo avisa. Debajo, la tabla por salón de ese día (Asistieron, Faltaron, Justificadas, Sin registro) con **«Corregir»** (dirección) → `/asistencia?salon&ambito=dia&fecha`. Después, el **rango** (totales + tabla por salón, con drill-down) y la sección **«Asistencia por curso»**.
1. `/asistencia/reportes` con filtros: salón, alumno, desde, hasta y atajos «Este mes», el periodo del año (bimestre/trimestre, de la tabla `Periodo`) y «Año». Sin fechas: del 1.º del mes a hoy. Rango máximo 366 días y `desde ≤ hasta`.
2. Sin salón ni alumno: resumen por salón (dirección/administrativo/profesor). Con salón: tabla por alumno + total del salón. Con alumno: resumen y detalle día a día (estado con ícono + palabra, hora, justificación). Cada fila enlaza al nivel siguiente.
3. «Descargar Excel» / «Descargar PDF» con los mismos filtros.
4. La familia entra con el reporte de su primer hijo y elige entre sus hijos.

## Contratos de `src/lib/server/reportes-asistencia.ts`
```ts
reporteSalon(ctx, { salonId, desde, hasta }, como?)   // → { salon, filas por alumno, total }
reporteAlumno(ctx, { alumnoId, desde, hasta }, como?) // → { alumno, resumen, detalle por día }
resumenColegio(ctx, { desde, hasta }, como?)          // → { filas por salón, total, cursos: FilaCursoReporte[] | null }
detalleCurso(ctx, { cursoId, desde, hasta })          // → { salon, curso, filas: [{ alumno, fecha, hora, estado: falta|tarde, ingreso, justificacion }] }
reporteSegunFiltros(ctx, filtros, como?)              // alumno > salón > colegio
opcionesDeReporte(ctx)                                // salones, alumnos y periodos visibles según el rol
// como = { accion: "ver" } | { accion: "exportar", formato: "excel" | "pdf" }
```
Validación zod: ids `uuid`, fechas reales `AAAA-MM-DD`, `desde ≤ hasta`, máximo 366 días (errores de validación → mensaje en pantalla o 400 en la exportación). Funciones puras en `src/lib/reportes-asistencia.ts` (rango, días hábiles, precedencia, resumen, porcentaje) y `src/lib/reportes-asistencia-tabla.ts` (tabla común a Excel y PDF). El resumen del colegio exporta dos secciones: «Asistencia al colegio por salón» y, si aplica, «Asistencia por curso» (Salón, Curso, Registros, Faltas a clase, Ingresó pero faltó a clase, Tardanzas a clase). Las columnas del resumen incluyen «Faltas en revisión». Excel: `exceljs` (`reportes-asistencia-excel.ts`, porcentaje como número con formato `0.0%`). PDF: `@react-pdf/renderer` (`reportes-asistencia-pdf.tsx`), A4 horizontal con logo del colegio, nota de definición y firma de marca con isotipo (`marca-pdf.ts`).

## Rutas y UI
- `/asistencia/reportes` (todos los roles menos portería) con `loading.tsx`. Entrada en navegación («Reportes de asistencia»; para dirección es la entrada a la asistencia, porque ya no tiene «Pasar lista») y botón «Reportes» en «Pasar lista» (profesor). Parámetros: `salon`, `alumno`, `curso`, `desde`, `hasta`, `dia`.
- `GET /api/reportes-asistencia/excel` y `/api/reportes-asistencia/pdf` con `?salon=&alumno=&desde=&hasta=`. Mismos permisos que la página: 403 sin permiso, 400 con filtros inválidos. Archivo: `asistencia-<salon|apellido-nombre-salon|colegio>-<desde>-<hasta>.xlsx|pdf`.
- Tablas con `tabular-nums`; estados con ícono + palabra.

## Errores y casos borde
- Rango en el futuro: se cuenta hasta hoy. Rango sin días hábiles: tabla vacía y «Sin datos».
- Alumno sin registros en el rango: 0 con registro, «Sin datos» (no 0 %).
- Salón o alumno de otro colegio: 404 (`ctx.db` aísla por colegio).
- Colegio grande (≈1 000 alumnos × 2 meses ≈ 80 000 registros): las justificaciones se leen en una consulta aparte filtrada por relación, no con `include` (Prisma pasaba cada id como parámetro y Postgres rechazaba más de 32 767: error P2029). Ver `docs/pruebas-de-estres.md`.

## Pruebas
- unit: `tests/unit/reportes-asistencia.test.ts` (porcentaje, solo asistencia al colegio, justificadas/en revisión/sin justificar, días hábiles y feriados, rango), `tests/unit/reportes-asistencia-exportar.test.ts` (.xlsx y PDF válidos, sección «Asistencia por curso»).
- integración: `tests/integracion/reportes-asistencia.test.ts` (conteos y %, profesor solo sus salones, apoderado solo sus hijos, portería 403, aislamiento entre colegios, auditoría, archivos .xlsx/PDF, resumen del colegio con más de 32 767 registros; **reporte general**: el día cuenta solo la asistencia al colegio, justificada vs en revisión, «ingresó pero faltó» por curso, detalle del curso con el ingreso, profesor solo sus cursos, sin niveles activos no hay sección de cursos).
- e2e: `tests/e2e/reportes-asistencia.test.ts` (dirección ve la asistencia al colegio del día, filtra salón y descarga Excel y PDF, content-type, 400 en rango inválido), `tests/e2e/asistencia-colegio-cursos.test.ts`.

## Pendientes
- Gráfico de tendencia y comparación entre periodos.
- Alumnos retirados dentro del rango no aparecen (solo activos).
