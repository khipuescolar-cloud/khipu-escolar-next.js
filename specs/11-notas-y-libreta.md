# 11 — Notas y libreta (MINEDU)

> Estado: implementado · Plan: Fase 2 (Familia) · Última actualización: 2026-10-26 (Claude Code)

## Objetivo
Que el profesor registre evaluaciones y notas por competencia, confirme la calificación de cada periodo con su conclusión descriptiva, y que las familias vean el avance de sus hijos y descarguen la libreta en PDF. El colegio elige la escala (literal CNEB o vigesimal) en `tenant.escalaCalificacion`.

## Escalas
- **Literal (CNEB, inicial, primaria y secundaria):** AD «Logro destacado», A «Logro esperado», B «En proceso», C «En inicio».
- **Vigesimal (0–20, academias o secundaria si el colegio lo configura):** aprobado desde 11 (`APROBADO_VIGESIMAL`). Se aceptan decimales (hasta 2) con punto o coma.
- Hay CHECK en la BD: exactamente un valor (`valor_literal` o `valor_numerico`) y 0–20. Por eso «sin nota» = **no hay fila** (borrar el campo elimina la fila).
- Funciones puras en `src/lib/calificaciones.ts`.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Profesor | Elegir curso y periodo, poner notas, crear/editar/borrar evaluaciones, gestionar competencias de sus cursos (los que dicta o de los salones que tutorea), confirmar la calificación del periodo, ver la libreta de sus alumnos | Editar un periodo cerrado, tocar cursos ajenos |
| Dirección | Ver todos los cursos y notas, abrir/cerrar/crear periodos, ver todas las libretas | Editar notas (solo lectura; las corrige el profesor) |
| Apoderado | Ver las notas y la libreta de **sus** hijos; descargar el PDF | Ver otros alumnos, promedios del salón, rankings o comparaciones (no existen en ninguna vista) |
| Portería / alumno | — | Todo (403) |
| Cualquiera en plan Básico | — | 403 en `/notas`, `/libreta` y su PDF (`requireFeature`) |

## Flujos
1. **Profesor** → `/notas`: elige curso y periodo (formulario GET) → pestañas:
   - *Notas por evaluación*: grilla alumnos × evaluaciones. Literal: `<select>` que guarda al cambiar; vigesimal: campo numérico que guarda al salir. Cada celda muestra «Guardando / Guardado / error» con ícono + palabra. Debajo: crear evaluación (título, competencia, fecha, peso) y editar/eliminar.
   - *Calificación del periodo*: por competencia, una tarjeta por alumno con la calificación **sugerida** (y de cuántas notas sale), el valor a confirmar y la conclusión descriptiva (obligatoria en B y C). «Usar la sugerida» copia el valor; solo se guarda al confirmar.
   - *Competencias*: lista, alta y baja (no se puede borrar una con calificaciones en libreta).
2. **Dirección** → `/notas` (solo lectura) y `/notas/periodos`: crear periodos, cerrar y reabrir.
3. **Apoderado** → `/notas`: por hijo y periodo, cursos → competencias (calificación + conclusión) y evaluaciones con su nota.
4. **Libreta** → `/libreta`: por alumno y periodo; botón «Descargar PDF».

## Reglas de negocio
- Sugerencia: vigesimal = promedio ponderado por `peso` redondeado al entero (`sugerirVigesimal`); literal = el valor más frecuente y, si empatan, el de la nota más reciente (`sugerirLiteral`). Solo cuentan evaluaciones con competencia.
- Periodo cerrado = nada se crea, edita ni borra (notas, evaluaciones, calificaciones). Lo valida el servidor, no solo la UI.
- La conclusión (máx. 1000 caracteres) es obligatoria si la calificación del periodo es B o C.
- Una nota solo se guarda para alumnos activos del salón del curso.
- Asistencia de la libreta: una fila por día entre `inicio` y `fin` del periodo; si hay asistencia del día (`ambito = "dia"`) manda sobre la del curso.
- Periodo por defecto: en `/notas` el abierto más reciente; en `/libreta` el último cerrado.

## Modelo de datos
`periodos`, `competencias` (por curso), `evaluaciones` (curso, periodo, competencia opcional, `peso` Decimal(5,2)), `notas` (única por evaluación+alumno), `calificaciones_periodo` (única por alumno+competencia+periodo, con `conclusion`), `asistencias` (resumen), `tenants.escala_calificacion`. No se cambió el esquema.

## Contratos de `src/lib/server`
```ts
// notas.ts — todas llaman requireFeature(ctx, "notas"); escrituras: rol profesor + requireCursoDelProfesor + periodo abierto
listarPeriodos(ctx); periodoEnCurso(periodos); periodoParaLibreta(periodos)
crearPeriodo(ctx, entrada): Resultado            // solo dirección
cambiarEstadoPeriodo(ctx, periodoId, cerrado): Resultado   // solo dirección
listarCompetencias(ctx, cursoId); crearCompetencia(ctx, entrada); eliminarCompetencia(ctx, id)
crearEvaluacion(ctx, entrada); editarEvaluacion(ctx, id, entrada); eliminarEvaluacion(ctx, id)
grillaNotas(ctx, cursoId, periodoId)             // profesor/dirección; incluye `editable`
guardarNota(ctx, { evaluacionId, alumnoId, valor }): Resultado   // valor "" borra
calificacionesPeriodo(ctx, cursoId, periodoId)   // con sugerido por alumno y competencia
guardarCalificacionPeriodo(ctx, { alumnoId, competenciaId, periodoId, valor, conclusion }): Resultado
notasDeAlumno(ctx, alumnoId, periodoId)          // requireAlumnoVisible; sin promedios ni comparaciones
alumnosVisibles(ctx)
// libreta.ts — requireFeature "libreta" + requireAlumnoVisible; audita «ver» o «exportar»
datosLibreta(ctx, alumnoId, periodoId, accion = "ver")
// cursos.ts
cursosDelDocente(ctx)
```
`Resultado = { ok: true; mensaje? } | { ok: false; error }` (`src/lib/resultado.ts`). Los accesos no permitidos lanzan `forbidden()` (403).

## Rutas y UI
- `/notas` (profesor, dirección, apoderado) · `/notas/periodos` (dirección) · `/libreta` (apoderado, profesor, dirección).
- `GET /api/libreta/[alumnoId]?periodo=<id>` → PDF (`@react-pdf/renderer`, `src/lib/server/libreta-pdf.tsx`): colegio, datos del alumno, tabla por curso con competencia, calificación y conclusión, asistencia del periodo, leyenda de la escala y firma de dirección. 400 si faltan parámetros, 403 sin permiso. Descarga auditada («exportar»).
- Acciones: `src/app/colegio/[slug]/notas/actions.ts`; formularios con `FormAccion` y píldoras con `Calificacion` (`src/components/`).

## Textos y UX

- **Diseño (spec 18):** barra de filtros (curso/periodo) en tarjeta; secciones como `NavegacionPildoras`; rejilla de notas con primera columna fija y celdas de 40 px; «Nueva evaluación», «Editar», «Nueva competencia» y «Nuevo periodo» abren un `Dialog`; eliminar evaluación/competencia y cerrar/abrir periodo piden confirmación (`BotonConfirmar`); calificación confirmada con toast; libreta en tarjeta centrada con «Descargar PDF» en el encabezado.
- Familias: «Así va el avance de tu hijo o hija en cada competencia.» Calificaciones siempre con ícono + valor + palabra («B · En proceso»). Periodo abierto en libreta: aviso «puede cambiar hasta que el colegio lo cierre».
- Periodo cerrado (profesor): «Periodo cerrado. Solo puedes mirar las notas; ya no se pueden cambiar.»

## Errores y casos borde
- Valor fuera de escala: «Usa AD, A, B o C.» / «Escribe una nota entre 0 y 20.»
- B o C sin conclusión: «Escribe la conclusión descriptiva: es obligatoria para B y C.»
- Curso sin competencias: la pestaña de calificación pide crearlas primero.
- Borrar el valor de una calificación del periodo elimina también su conclusión.

## Pruebas
- unit: `tests/unit/calificaciones.test.ts` (escalas, etiquetas, aprobado, sugeridas), `tests/unit/fechas.test.ts`.
- integración: `tests/integracion/notas-libreta-tareas-agenda.test.ts` (apoderado no ve a otros alumnos ni sus notas, periodo cerrado no se edita, profesor ajeno y dirección no escriben, conclusión en B/C, libreta con asistencia y auditoría, plan Básico → 403).
- e2e: `tests/e2e/notas-libreta.test.ts` (profesor de Euler ingresa nota vigesimal; apoderada descarga el PDF; losolivos 403).

## Pendientes
- El logo del colegio aparece en el PDF si es PNG o JPG (WEBP no lo admite el generador; ver spec 10). El título del tutor sigue su género («Tutora:», «Tutor:», «Tutor(a):»).
- Importar/exportar notas desde Excel; observaciones por nota (`comentario` existe en la BD pero no se edita aún).
- Cierre por curso (hoy el cierre es por periodo para todo el colegio).
- Avisar a la familia cuando se publique la libreta.
