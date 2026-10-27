# 11 — Notas y libreta (MINEDU)

> Estado: implementado · Plan: Fase 2 (Familia) · Última actualización: 2026-10-27 (Claude Code)

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
| Profesor | Elegir curso y periodo, poner notas y observaciones, crear/editar/borrar evaluaciones, gestionar competencias de sus cursos (los que dicta o de los salones que tutorea), confirmar la calificación del periodo, **cerrar las notas de su curso**, exportar/importar CSV, ver la libreta de sus alumnos | Editar un periodo o curso cerrado, tocar cursos ajenos, reabrir un curso |
| Dirección | Ver todos los cursos y notas, abrir/cerrar/crear periodos, cerrar y **reabrir** cursos, **publicar la libreta** y reenviar el aviso, exportar CSV, ver todas las libretas | Editar notas o importar (solo lectura; las corrige el profesor) |
| Apoderado | Ver las notas (con las observaciones) y la libreta publicada de **sus** hijos; descargar el PDF | Ver otros alumnos, promedios del salón, rankings o comparaciones (no existen en ninguna vista); ver la libreta de un periodo sin publicar |
| Portería / alumno | — | Todo (403) |
| Cualquiera en plan Básico | — | 403 en `/notas`, `/libreta` y su PDF (`requireFeature`) |

## Flujos
1. **Profesor** → `/notas`: elige curso y periodo (formulario GET) → pestañas:
   - *Notas por evaluación*: grilla alumnos × evaluaciones. Literal: `<select>` que guarda al cambiar; vigesimal: campo numérico que guarda al salir. Cada celda muestra «Guardando / Guardado / error» con ícono + palabra. Debajo: crear evaluación (título, competencia, fecha, peso) y editar/eliminar.
   - *Calificación del periodo*: por competencia, una tarjeta por alumno con la calificación **sugerida** (y de cuántas notas sale), el valor a confirmar y la conclusión descriptiva (obligatoria en B y C). «Usar la sugerida» copia el valor; solo se guarda al confirmar.
   - *Competencias*: lista, alta y baja (no se puede borrar una con calificaciones en libreta).
   - *Importar y exportar*: «Descargar CSV» de la rejilla e importación con vista previa (ver «Importar y exportar»).
   - Encima de las pestañas, tarjeta **Cierre de notas del curso** con estado ícono + palabra (Abierto / Cerrado / Periodo cerrado) y botón «Cerrar notas del curso» (profesor o dirección, con `BotonConfirmar`); dirección ve «Reabrir notas del curso» si está cerrado.
   - Cada celda de la rejilla tiene un botón de **observación** (ícono de mensaje) que abre un `Dialog` con textarea (máx. 500 caracteres).
2. **Dirección** → `/notas` (solo lectura) y `/notas/periodos`: crear periodos, cerrar y reabrir, y **publicar la libreta** (ver más abajo). Cada periodo muestra «N de M cursos cerrados».
3. **Apoderado** → `/notas`: por hijo y periodo, cursos → competencias (calificación + conclusión) y evaluaciones con su nota y, si existe, la «Observación» del profesor.
4. **Libreta** → `/libreta`: por alumno y periodo publicado; botón «Descargar PDF». La libreta PDF no lista evaluaciones, así que las observaciones por nota solo se ven en `/notas`.

## Reglas de negocio
- Sugerencia: vigesimal = promedio ponderado por `peso` redondeado al entero (`sugerirVigesimal`); literal = el valor más frecuente y, si empatan, el de la nota más reciente (`sugerirLiteral`). Solo cuentan evaluaciones con competencia.
- Periodo cerrado = nada se crea, edita ni borra (notas, evaluaciones, calificaciones). Lo valida el servidor, no solo la UI.
- **Cierre por curso** (`cierres_curso`, único por periodo + curso): con el curso cerrado en un periodo, el servidor rechaza crear/editar/borrar evaluaciones, guardar notas, observaciones, calificaciones del periodo e importaciones de **ese curso en ese periodo** (otros cursos o periodos no se afectan). Cierra el profesor del curso o dirección, solo con el periodo abierto; reabre solo dirección. El cierre general del periodo sigue existiendo y manda sobre el de curso. Ambos se auditan (`cierre_curso`).
- **Publicar libreta**: solo dirección; requiere el **periodo cerrado o todos los cursos** (de salones no archivados) **con cierre** y al menos un curso. Marca `periodos.libreta_publicada_at` (reclamo atómico) y encola el aviso `libreta_publicada` (tipo `libreta`) a los apoderados con consentimiento y avisos activos de alumnos activos (correo y push según sus preferencias; una fila por familia y canal, con los nombres de los hijos juntos; spec 06). **Idempotente**: si ya se publicó, «Publicar» se rechaza; «Reenviar aviso» repite el envío sin cambiar la fecha.
- **Quién ve la libreta**: profesor y dirección, siempre. Las familias, solo un periodo publicado **o** uno antiguo ya cerrado: `libretaVisibleParaFamilia` (`src/lib/libreta-publicacion.ts`) considera entregados los periodos cerrados que terminaron antes de `CORTE_LIBRETA_PUBLICADA` (2026-10-27), para no esconder libretas de antes de esta función. Un periodo abierto o cerrado nuevo sin publicar da 403 a la familia (página, PDF y datos) y no aparece en el selector; en `/notas` el botón «Ver libreta» tampoco se muestra.
- **Observaciones** (`notas.comentario`): máx. 500 caracteres; la nota debe existir (sin nota no hay observación y borrar la nota la elimina); vacío borra el comentario. Las ve la familia en `/notas`.
- La conclusión (máx. 1000 caracteres) es obligatoria si la calificación del periodo es B o C.
- Una nota solo se guarda para alumnos activos del salón del curso.
- Asistencia de la libreta: una fila por día entre `inicio` y `fin` del periodo; si hay asistencia del día (`ambito = "dia"`) manda sobre la del curso.
- Periodo por defecto: en `/notas` el abierto más reciente; en `/libreta` el último cerrado.

## Modelo de datos
`periodos`, `competencias` (por curso), `evaluaciones` (curso, periodo, competencia opcional, `peso` Decimal(5,2)), `notas` (única por evaluación+alumno), `calificaciones_periodo` (única por alumno+competencia+periodo, con `conclusion`), `asistencias` (resumen), `tenants.escala_calificacion`. No se cambió el esquema.

## Importar y exportar (CSV)
- Lógica pura en `src/lib/notas-csv.ts` (`exportarNotasCsv`, `analizarNotasCsv`). Exportar: `GET /api/notas/exportar?curso=&periodo=` (profesor del curso o dirección; auditado «exportar») → UTF-8 **con BOM**, separador **`;`** (Excel en español), una fila por alumno: `Código;Alumno;<título evaluación>…`, «Apellidos, Nombres», decimales con coma, celdas sin nota vacías. Evita inyección de fórmulas (`'` delante de `= + - @`).
- Importar (solo el profesor del curso, periodo y curso abiertos): el archivo (máx. 500 KB y 500 alumnos) acepta `;`, `,` o tabulación. Alumno por **código** o por nombre (sin tildes ni mayúsculas; «Apellidos, Nombres», «Nombres Apellidos»); cada columna por el **título** de la evaluación. Valores según la escala: AD/A/B/C o 0–20 (punto o coma). **Vista previa** (válidas, vacías, errores por fila y columnas ignoradas) antes de guardar; al confirmar se guardan solo las válidas. Las celdas vacías **no borran** notas. El servidor vuelve a validar y bloquea cursos o periodos cerrados.

## Contratos de `src/lib/server`
```ts
// notas.ts — todas llaman requireFeature(ctx, "notas"); escrituras: rol profesor + requireCursoDelProfesor + periodo abierto
listarPeriodos(ctx); periodoEnCurso(periodos); periodoParaLibreta(periodos)
cerrarCursoPeriodo(ctx, cursoId, periodoId); reabrirCursoPeriodo(ctx, cursoId, periodoId)   // profesor del curso o dirección / solo dirección
cierreDeCurso(ctx, cursoId, periodoId)
estadoPublicacionLibreta(ctx, periodoId); publicarLibreta(ctx, periodoId, { reenviar? })     // solo dirección
guardarComentarioNota(ctx, { evaluacionId, alumnoId, comentario }): Resultado
exportarNotasCurso(ctx, cursoId, periodoId); previsualizarImportacionNotas(...); importarNotas(ctx, cursoId, periodoId, texto)
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
- `GET /api/notas/exportar?curso=<id>&periodo=<id>` → CSV de la rejilla.
- `GET /api/libreta/[alumnoId]?periodo=<id>` → PDF (`@react-pdf/renderer`, `src/lib/server/libreta-pdf.tsx`): logo del colegio (PNG/JPG tal cual; WEBP y SVG se convierten a PNG con `sharp`, `src/lib/imagen-png.ts`, caché en memoria), colegio, datos del alumno, tabla por curso con competencia, calificación y conclusión, asistencia del periodo, leyenda de la escala y firma de dirección. 400 si faltan parámetros, 403 sin permiso. Descarga auditada («exportar»).
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
- Título del tutor (página y PDF de la libreta): sigue `Profile.genero` del tutor del salón con `tituloProfesor(genero, "tutor")` → «Tutora:», «Tutor:» o «Tutor(a):» (sin dato o «no especifica»).

## Pruebas
- unit: `tests/unit/calificaciones.test.ts` (escalas, etiquetas, aprobado, sugeridas), `tests/unit/fechas.test.ts`, `tests/unit/notas-csv.test.ts` (exportar/importar, visibilidad y publicación de la libreta), `tests/unit/imagen-png.test.ts` (WEBP/SVG → PNG y caché), `tests/unit/plantillas-avisos.test.ts` (`libreta_publicada`), `tests/unit/titulo-tutor-libreta.test.ts` (Tutora/Tutor/Tutor(a)); integración `tests/integracion/soporte-seguridad.test.ts` (`datosLibreta` devuelve el título según el género).
- integración: `tests/integracion/notas-libreta-tareas-agenda.test.ts` (apoderado no ve a otros alumnos ni sus notas, periodo cerrado no se edita, profesor ajeno y dirección no escriben, conclusión en B/C, libreta con asistencia y auditoría, plan Básico → 403; cierre por curso y reabrir, observaciones, importar/exportar, publicar libreta con avisos, idempotencia y visibilidad familiar).
- e2e: `tests/e2e/notas-libreta.test.ts` (profesor de Euler ingresa nota vigesimal; apoderada descarga el PDF; losolivos 403; observación por nota; cerrar/reabrir curso; exportar CSV; publicar libreta y reenviar aviso, con limpieza de datos). El envío real del correo (Mailpit) no se prueba en e2e: el worker corre por cron, y el aviso queda verificado en la tabla `avisos`.

## Pendientes
- El corte de «libretas antiguas» (`CORTE_LIBRETA_PUBLICADA`) es una constante porque `periodos` no guarda cuándo se cerró; si un colegio necesita otra regla, habría que añadir esa fecha al esquema.
