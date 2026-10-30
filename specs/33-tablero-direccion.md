# 33 — Tablero de dirección

> Estado: implementada · Plan: Khipu Pro (módulo `tablero`) · Última actualización: 2026-10-31 (Claude Code)

## Objetivo
Una vista para dirección con los indicadores del colegio (asistencia, notas, tareas, avisos, reuniones) y el consolidado de notas por salón y periodo en Excel y PDF. Solo lectura, sin tablas nuevas.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| dirección | Ver el tablero y descargar el consolidado | — |
| administrativo | — | Todo: decisión de diseño. El tablero muestra alumnos en riesgo y notas, y el administrativo no ve notas (módulo `notas`) |
| profesor, portería, familia, alumno | — | Ver el tablero (403) |

Colegio con plan Base: 403 en páginas y en las rutas de descarga; el inicio muestra el candado «Khipu Pro». En modo soporte (super administrador) el módulo es privado, igual que `notas` y `libreta` (Ley 29733).

## Flujos
1. Dirección entra por «Tablero» (inicio o menú) y elige el periodo con píldoras: **Mes actual** (por defecto), cada periodo académico (`Periodo`) o **Año**. Parámetro `p` = `mes` | `anio` | id del periodo.
2. En «Ausentismo crónico» cambia el umbral (`umbral`, entero 50–99, por defecto 90).
3. Desde un alumno crónico abre su reporte de asistencia (`/asistencia/reportes?alumno=…`).
4. «Consolidado de notas»: elige salón y periodo, ve la tabla y descarga Excel o PDF.

## Reglas de negocio
- Zona horaria y «hoy» son los del colegio. El rango se corta en hoy.
- **Asistencia** igual que los reportes (spec 27): solo la asistencia al colegio (`ambito = dia`, un registro por alumno y día; las listas de curso no cuentan desde el 2026-10-30), solo días hábiles sin feriados, alumnos activos de salones no archivados; % = (llegó + tarde) / días con registro (problema cuenta en el denominador).
- Tendencia por semana (lunes); las semanas sin registros no aparecen.
- Ausentismo crónico: % estrictamente menor al umbral y al menos 3 días con registro. Lista de hasta 30, del más bajo.
- Ranking de salones: % sobre el total de registros del salón.
- **Rendimiento**: se mide sobre el periodo académico elegido, o el vigente si se elige mes/año. Usa `calificaciones_periodo`; si el periodo aún no tiene, usa las `notas` de sus evaluaciones. Niveles: literal AD/A/B/C; vigesimal 18–20 = AD, 14–17 = A, 11–13 = B, 0–10 = C. Logro esperado = AD + A (vigesimal: ≥14).
- **Alumno en riesgo**: C (vigesimal: <11) en 2 o más competencias.
- **Avance de registro**: notas registradas / (evaluaciones del periodo × alumnos activos del salón), tope 100 %; por curso y por profesor; «Cerrado» si hay `cierres_curso`.
- Tareas publicadas por curso (por `createdAt` dentro del rango); justificaciones pendientes (todas); avisos del rango (excluye soporte): enviados, abiertos, con error (error/rebotado/queja), pendientes; reuniones programadas futuras (lectura de `reuniones`, sin depender de su módulo).
- **Consolidado**: columnas = competencias agrupadas por curso; celda = calificación del periodo, o la sugerida por las notas (`sugerirCalificacion`) si el profesor no cerró; columna «Competencias en riesgo», «Promedio» en vigesimal y fila «% logro esperado». Celda vacía = sin nota.
- `requireFeature(ctx, "tablero")` + `requireRol(["direccion"])` en páginas y rutas. Cada vista y descarga se audita (`tablero`, `consolidado_notas`).
- Nunca muestra datos de Nudito+ ni conversaciones.

## Modelo de datos
Sin tablas nuevas. Lee `asistencias`, `alumnos`, `salones`, `cursos`, `competencias`, `periodos`, `evaluaciones`, `notas`, `calificaciones_periodo`, `cierres_curso`, `tareas`, `justificaciones`, `avisos`, `reuniones`.

## Contratos de `src/lib/server` y `src/lib`
```ts
// server/tablero.ts
indicadoresTablero(ctx, { p?, umbral? }): Promise<IndicadoresTablero>   // 403 si no es dirección Pro
// server/tablero-consolidado.ts (+ -excel.ts, -pdf.tsx, -exportar.ts)
consolidadoNotas(ctx, { salonId, periodoId }, como?): Promise<Consolidado>
// lib/tablero.ts, lib/tablero-consolidado.ts: cálculo puro (periodo, tendencia, crónicos, ranking, niveles, avance, tabla)
```
Rutas: `GET /api/tablero/consolidado/excel|pdf?salon=&periodo=` (400 filtros inválidos, 403 sin acceso).

## Rutas y UI
- `/tablero`: KPIs, gráficos de línea semanales (tokens `chart-1`/`chart-2`, tabla `sr-only`), tablas y barras apiladas con letra y cantidad (no solo color).
- `/tablero/consolidado`. En el inicio, el mosaico «Tablero» (grupo Colegio) lleva al tablero; con plan Base muestra el candado.

## Textos y UX
Estados con ícono + palabra; estados vacíos explicados. Hasta 390 px las tablas se desplazan dentro de su tarjeta.

## Errores y casos borde
- Sin periodos, sin notas o sin asistencia: estados vacíos. Periodo de otro colegio o desconocido: cae en «Mes actual».
- Rendimiento: el periodo se identifica por colegio; salón ajeno en el consolidado = 404.

## Rendimiento (1 000 alumnos)
Las sumas se hacen en SQL (asistencia por día/estado y por alumno/estado con `DISTINCT ON`, notas por curso/nivel, riesgo con `HAVING`), devolviendo cientos de filas y no una por registro. Cada consulta SQL lleva `tenant_id` a mano. Alrededor de 15 consultas en paralelo; las listas se limitan a 30 filas. Pendiente medir con un colegio de 1 000 alumnos y un año completo (~200 000 registros).

## Pruebas
- `tests/unit/tablero.test.ts`: periodo, umbral, tendencia, crónicos, ranking, niveles, avance, zona horaria, tabla del consolidado.
- `tests/integracion/tablero-direccion.test.ts`: cálculos en BD, aislamiento por colegio, 403 (plan Base, profesor, portería, familia), Excel, PDF y auditoría.
- `tests/e2e/tablero-direccion.test.ts`: dirección abre, cambia de periodo y umbral, descarga Excel y PDF; profesora 403; Base con candado.
- Datos demo: `prisma/seed-tablero.ts` (asistencia desde marzo, notas, justificaciones, avisos de Nuevo Horizonte).

## Pendientes
- Filtros por nivel y salón; comparar con el periodo anterior.
- Lista definitiva de indicadores con la dirección del piloto.
