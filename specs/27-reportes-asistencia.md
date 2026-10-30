# 27 — Reportes de asistencia

> Estado: implementado (pruebas de integración y e2e escritas; pendientes de correr tras la migración de planes) · Plan: el del módulo `asistencia` (Khipu Base) · Última actualización: 2026-10-30 (Claude Code, rama `feat/reportes-asistencia`)

## Objetivo
Dirección, administrativos y profesores ven el porcentaje de asistencia por **alumno**, por **salón** y por **rango de fechas**, y lo descargan en **Excel (.xlsx)** y **PDF**. Las familias ven el reporte de sus hijos. Complementa la spec 04 (pasar lista).

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Dirección | Resumen del colegio (por salón), cualquier salón y alumno; exportar | — |
| Administrativo | Igual que dirección (solo lectura) | — |
| Profesor | Salones donde es tutor o dicta (`salonIdsVisibles`), sus alumnos y el resumen de sus salones; exportar | Salones o alumnos ajenos (403) |
| Apoderado | Reporte de sus hijos (`alumnoIdsVisibles`); exportar | Reporte de salón, resumen del colegio, alumnos ajenos (403) |
| Alumno | Su propio reporte | Todo lo demás (403) |
| Portería | — | Todo (403) |

Sin el módulo `asistencia` (`requireFeature`) todo responde 403. Cada vista y cada exportación se registra con `auditar()` (entidad `reporte_asistencia`; `ver` o `exportar` con el formato).

## Definición del porcentaje
Todo en la zona horaria del colegio (`tenant.zonaHoraria`).
- **Días hábiles** del rango: lunes a viernes sin feriados nacionales ni `FeriadoExtra` aplicables al colegio (`esDiaHabil` de `src/lib/dias-habiles.ts` + `feriadosAplicables`; los mismos del plazo de justificación, spec 07). Nunca se cuentan días posteriores a **hoy**: el rango se recorta a hoy (`hastaEfectivo`).
- **Registro del día** de un alumno: prevalece el del ingreso (`ambito = "dia"`); si no hay, el primero por hora (misma regla que el resumen de dirección, `elegirRegistroDelDia`). Registros en fines de semana o feriados no cuentan.
- **Días con registro** = días hábiles con al menos un registro. **Sin registro** = días hábiles − días con registro (no cuentan en el porcentaje).
- **% de asistencia = (llegó + tarde) ÷ días con registro × 100**, un decimal. Sin días con registro: «Sin datos».
- Se muestran los conteos: Llegó, Tarde (tardanzas), No llegó (`falta`), Aviso (`problema`, cuenta como día con registro, no como presencia), **faltas justificadas** (justificación más reciente `aceptada`) y **faltas sin justificar** (sin justificación, pendiente o rechazada), y días sin registro.
- Salón y colegio: el % es sobre la suma de días con registro de todos los alumnos (no el promedio de porcentajes). Solo alumnos activos.

## Flujos
1. `/asistencia/reportes` con filtros: salón, alumno, desde, hasta y atajos «Este mes», el periodo del año (bimestre/trimestre, de la tabla `Periodo`) y «Año». Sin fechas: del 1.º del mes a hoy. Rango máximo 366 días y `desde ≤ hasta`.
2. Sin salón ni alumno: resumen por salón (dirección/administrativo/profesor). Con salón: tabla por alumno + total del salón. Con alumno: resumen y detalle día a día (estado con ícono + palabra, hora, justificación). Cada fila enlaza al nivel siguiente.
3. «Descargar Excel» / «Descargar PDF» con los mismos filtros.
4. La familia entra con el reporte de su primer hijo y elige entre sus hijos.

## Contratos de `src/lib/server/reportes-asistencia.ts`
```ts
reporteSalon(ctx, { salonId, desde, hasta }, como?)   // → { salon, filas por alumno, total }
reporteAlumno(ctx, { alumnoId, desde, hasta }, como?) // → { alumno, resumen, detalle por día }
resumenColegio(ctx, { desde, hasta }, como?)          // → { filas por salón, total }
reporteSegunFiltros(ctx, filtros, como?)              // alumno > salón > colegio
opcionesDeReporte(ctx)                                // salones, alumnos y periodos visibles según el rol
// como = { accion: "ver" } | { accion: "exportar", formato: "excel" | "pdf" }
```
Validación zod: ids `uuid`, fechas reales `AAAA-MM-DD`, `desde ≤ hasta`, máximo 366 días (errores de validación → mensaje en pantalla o 400 en la exportación). Funciones puras en `src/lib/reportes-asistencia.ts` (rango, días hábiles, precedencia, resumen, porcentaje) y `src/lib/reportes-asistencia-tabla.ts` (tabla común a Excel y PDF). Excel: `exceljs` (`reportes-asistencia-excel.ts`, porcentaje como número con formato `0.0%`). PDF: `@react-pdf/renderer` (`reportes-asistencia-pdf.tsx`), A4 horizontal con logo del colegio, nota de definición y firma de marca con isotipo (`marca-pdf.ts`).

## Rutas y UI
- `/asistencia/reportes` (todos los roles menos portería) con `loading.tsx`. Entrada en navegación («Reportes de asistencia») y botón «Reportes» en «Pasar lista».
- `GET /api/reportes-asistencia/excel` y `/api/reportes-asistencia/pdf` con `?salon=&alumno=&desde=&hasta=`. Mismos permisos que la página: 403 sin permiso, 400 con filtros inválidos. Archivo: `asistencia-<salon|apellido-nombre-salon|colegio>-<desde>-<hasta>.xlsx|pdf`.
- Tablas con `tabular-nums`; estados con ícono + palabra.

## Errores y casos borde
- Rango en el futuro: se cuenta hasta hoy. Rango sin días hábiles: tabla vacía y «Sin datos».
- Alumno sin registros en el rango: 0 con registro, «Sin datos» (no 0 %).
- Salón o alumno de otro colegio: 404 (`ctx.db` aísla por colegio).
- Colegio grande (≈1 000 alumnos × 2 meses ≈ 80 000 registros): las justificaciones se leen en una consulta aparte filtrada por relación, no con `include` (Prisma pasaba cada id como parámetro y Postgres rechazaba más de 32 767: error P2029). Ver `docs/pruebas-de-estres.md`.

## Pruebas
- unit: `tests/unit/reportes-asistencia.test.ts` (porcentaje, precedencia, días hábiles y feriados, rango), `tests/unit/reportes-asistencia-exportar.test.ts` (.xlsx y PDF válidos).
- integración: `tests/integracion/reportes-asistencia.test.ts` (conteos y %, profesor solo sus salones, apoderado solo sus hijos, portería 403, aislamiento entre colegios, auditoría, archivos .xlsx/PDF, resumen del colegio con más de 32 767 registros).
- e2e: `tests/e2e/reportes-asistencia.test.ts` (dirección filtra salón y descarga Excel y PDF, content-type, 400 en rango inválido).

## Pendientes
- Gráfico de tendencia y comparación entre periodos.
- Alumnos retirados dentro del rango no aparecen (solo activos).
