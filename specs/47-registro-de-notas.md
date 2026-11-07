# 47 — Registro de notas

> Estado: en desarrollo (registro, tareas, currículo y permisos) · Plan: Khipu Pro · Última actualización: 2026-11-07 (observaciones, cabecera, informe, plantilla, NSP y recuperación en el registro, reapertura)

## Objetivo
Dar al docente un registro por curso semejante a una tabla de calificaciones, con actividades agrupadas por competencia y entrada rápida de notas, usando los servicios académicos existentes.

## Roles y permisos

| Rol | Puede | No puede |
|---|---|---|
| Profesor | Ver y calificar los cursos que dicta; leer (sin registrar ni corregir) los demás cursos del salón que tutorea; gestionar sus competencias solo con `gestionaCompetencias` explícito | Ver o editar cursos ajenos, cambiar periodos cerrados |
| Dirección y rol académico equivalente autorizado por la institución | Ver cursos y gestionar competencias del colegio, periodos y cierre según permisos vigentes | Saltar auditoría, publicación o aislamiento del colegio |
| Apoderado y alumno | Consultar sus notas publicadas y libreta según specs/11 | Editar o ver otros alumnos |
| Otros roles o Khipu Base | Solo acceso permitido por specs/11 y 03 | Acceder al registro docente |

Cada operación valida `requireFeature(ctx, "notas")`, rol, curso y alcance con `ctx.db`. El permiso se comprueba en el servidor y la UI solo muestra las acciones disponibles. No existe un rol académico equivalente a dirección: `administrativo` es personal no docente y no recibe este permiso automáticamente. Dirección concede o retira `Membership.gestionaCompetencias` desde la ficha del profesor; el docente autorizado solo gestiona cursos donde figura en `Curso.profesorId`, no los que únicamente tutorea.

## Flujos

1. **Mis cursos:** al entrar a Registro de notas, el docente ve solo los cursos que dicta (`Curso.profesorId`) del año académico vigente (el del periodo en curso del colegio; sin periodos, el del salón activo más reciente), cada uno con nombre, nivel, grado, sección y cantidad de alumnos y el botón «Abrir registro». Si además es tutor, debajo aparece la sección discreta «Salón que tutoras · solo lectura» con los demás cursos de su salón; esos registros se abren sin «Nueva calificación» ni edición de celdas, y el servidor rechaza crear calificaciones ahí. Dirección ve todos los cursos agrupados por grado.
2. **Registro del curso:** se abre el periodo vigente o elegido; la primera columna fija muestra alumnos y las columnas existentes se agrupan por competencia, con desplazamiento horizontal. Las columnas de actividad tienen ancho compacto fijo (nombre truncado, origen y fecha debajo); el nombre de cada bloque de competencia ocupa como máximo dos líneas, con el texto completo en `title`. El origen sale de `Evaluacion.tareaId`: con valor es «Tarea», sin valor «Manual». Los pendientes se ven con un guion tenue, nunca como C ni NSP. Al pulsar el encabezado de una columna se abre el detalle (descripción, fecha de la actividad, «Registrada el» con fecha y hora, quién la registró, competencia, origen y enlace a la tarea; las tareas viejas sin competencia van en «Sin competencia» con «Asignar competencia»). La corrección de una celda con valor previo, o de una actividad publicada, pide el motivo en un diálogo (valor anterior y nuevo, motivo de al menos 8 caracteres, «Cancelar» y «Guardar corrección»). No se crean columnas por capacidades o desempeños vacíos.
3. **Nueva calificación:** el docente pone nombre, descripción opcional, fecha académica editable y notas para los alumnos precargados. El periodo sale del contexto y admite corrección válida. Antes de confirmar elige una competencia activa aplicable. Los valores nulos quedan pendientes. «Atrás» del paso 2 conserva el formulario; «Cancelar» del paso 1 lo descarta.
3b. **NSP y recuperación en el registro** (specs/37). `crearCalificacion` llama a `sincronizarNsp` (la misma regla de `crearEvaluacion`, sin duplicarla) al terminar la transacción: el alumno que faltó a la clase (o al colegio) en la fecha de la actividad y no tiene nota escrita queda con NSP (historial `cambio_asistencia`, actor Khipu); si el profesor escribió una nota a un ausente, no se pisa. Un pendiente sin falta nunca se vuelve NSP, y una actividad de tarea (`tareaId`) nunca genera NSP. La actividad nace «programada» (borrador, igual que `crearEvaluacion`): el NSP se ve en el registro de inmediato y la familia lo ve al pulsar «Publicar resultados» en el detalle. Un reintento con la misma clave de idempotencia vuelve a sincronizar (idempotente). El mensaje al guardar añade «N alumnos quedaron con NSP por inasistencia.» **Celda NSP:** muestra «NSP» y, con ícono, su estado abreviado con tooltip: «Sin justificar», «En revisión», «Rechazada», «Recup. pendiente» (falta justificada, el profesor aún no decide), «Recup. aprobada» o «Recup. denegada». Al abrirla (también para tutor y dirección, en solo lectura) aparece el diálogo «NSP · No se presentó» (`DialogoNsp`): el profesor del curso ve «Autorizar recuperación» / «No autorizar» (`decidirRecuperacion`, solo con la justificación aprobada y una vez) y, tras autorizar, elige la nota de la escala y la fecha en que la rindió (hoy por defecto, nunca futura) y pulsa «Registrar recuperación» (`guardarNota` con `fechaRecuperacion`, tipo `recuperacion`). La nota queda en la actividad original, que conserva su fecha; no se crea ninguna evaluación nueva. La celda recuperada muestra la nota y un ícono «Recuperado» con tooltip y fecha. `registroDelCurso` devuelve `estadosNsp` (reutiliza `estadosNspDeGrilla` de `notas.ts`).
4. **Tareas:** una tarea calificable elige competencia válida; una entrega no genera nota. Al calificar, se crea o usa la `Evaluacion` con `tareaId` y `creadaPorId` del docente y se guarda la misma `Nota` que lee el registro. Correcciones en cualquiera de las vistas muestran el mismo resultado.
5. **Observación por alumno:** en el paso 1 de «Nueva calificación» cada alumno tiene, además de la nota, un campo «Observación» opcional (500 caracteres; debajo del nombre y la nota a 390 px). Se guarda en `Nota.comentario`. Visibilidad: **un interruptor global** «Observaciones visibles para la familia» en el paso 1 (apagado por defecto): apagado, `comentarioPrivado = true` (solo profesor, tutor y dirección); la vista de familia ya oculta las privadas (specs/38) y solo muestra resultados publicados. Una observación sin nota se rechaza con «Pon una nota para guardar la observación.». En la tabla, la celda con observación muestra el ícono `MessageSquareText` con tooltip («Privada» o «Visible para la familia» + texto) y abre un diálogo; al editar la celda hay «Agregar/Editar observación» con interruptor «Visible para la familia» por celda. Se audita (`evaluacion.crear` con conteos y `nota.editar`). Funciones: `crearCalificacion({ …, observacionVisible, notas: [{ alumnoId, valor, observacion }] })` y `editarObservacionRegistro(ctx, { evaluacionId, alumnoId, observacion, visible })`.
6. **Cabecera:** título, «Nueva calificación» (principal) y una fila de herramientas: selector de periodo, estado de las notas del curso en solo lectura (ícono + «Abierto» / «Enviado / Cerrado» / «Periodo cerrado»), botones con texto «Informe de progreso» e «Importar / Exportar», el botón `BotonCalificacionPeriodo` (rama `notas-periodo`; cierra el curso al enviar y dirección reabre con `reabrirCursoPeriodo`) y «Competencias» si está autorizado. En móvil los tres primeros se agrupan en «Herramientas». Ninguna opción lleva a la vista vieja (retirada). «Publicar resultados» está en el detalle de la actividad.
7. **Plantilla e importación:** «Importar / Exportar» abre un `Sheet`. *Descargar plantilla* (solo el profesor del curso): Excel `.xlsx` (hojas «Datos» con columnas `alumno_id` oculta, `apellidos_nombres`, `nota` con lista de valores de la escala y `observacion`; «Instrucciones»; «Competencias» con los nombres válidos) o CSV con BOM y `;` con el mismo encabezado `alumno_id;apellidos_nombres;nota;observacion` (el proyecto ya usa `exceljs`). **Una plantilla corresponde a una actividad**: nombre, fecha, competencia y visibilidad de observaciones se piden en el formulario, no se leen del archivo. *Importar notas*: archivo `.xlsx` o CSV (máx. 3 MB, 500 alumnos); vista previa con filas válidas, errores por fila (alumno desconocido, nota inválida, observación sin nota, duplicado) y pendientes; el alumno se identifica por `alumno_id` o, si falta, por «Apellidos, Nombres». Con «Importar» se llama a `crearCalificacion` con la clave de idempotencia generada al abrir el formulario (reintentar no duplica); solo se importan las filas válidas. El servidor valida alumnos del curso, escala, competencia activa, fecha dentro del periodo y periodo/curso abiertos. *Exportar registro*: CSV con BOM y `;` (alumnos × actividades agrupadas por competencia, con nota y observación por actividad; las privadas se marcan «[Privada]»). Rutas: `GET /api/notas/plantilla?curso&periodo&formato=xlsx|csv`, `GET /api/notas/exportar?curso&periodo`.
8. **Informe de progreso:** `Sheet` ancho desde el registro (ver specs/11).
9. **Libreta:** el docente valora cada competencia del periodo con su criterio. El registro aporta evidencias; no genera promedios automáticos ni reemplaza `CalificacionPeriodo`.
10. **Calificación del periodo** (`BotonCalificacionPeriodo` en la cabecera del registro). Se solicita solo cuando el periodo termina; al enviarla, el tutor del salón puede ver el reporte.
   - Antes del último día del periodo (`Periodo.fin`, en la zona del colegio) el botón está deshabilitado: «Calificación del periodo · disponible desde el dd/mm». Desde ese día, o si dirección ya cerró el periodo, se habilita y muestra «Pendiente» hasta que se envía (en un periodo cerrado sin envío muestra «Periodo cerrado»). Enviada: «Calificación enviada · ver». El tutor que no dicta el curso ve «Reporte del periodo» (enlace al reporte del salón).
   - Pantalla `/notas/[cursoId]/periodo?periodo=…`: tabla estilo Excel con la columna del alumno fija y, por cada competencia activa, «Evidencias» (chips de solo lectura con las notas del periodo; al pasar o tocar se ve la actividad y la fecha) y «Calificación» (`Select` con AD, A, B, C o 0–20 según el colegio) más un ícono que abre la «Conclusión descriptiva» en un `Popover` (obligatoria en B y C; se abre sola al elegir B o C). Teclado: flechas entre calificaciones, D/A/B/C califican (D = AD), Supr borra, Enter abre la lista. **Sin promedios ni valores precargados.**
   - «Guardar borrador» guarda en bloque solo las celdas modificadas; una celda B o C sin conclusión no se guarda (la regla de `guardarCalificacionPeriodo` se conserva). «Enviar calificación del periodo» revisa en la pantalla que todo alumno tenga calificación en toda competencia activa y conclusión en B y C; si falta algo lista qué falta (se recalcula al completar) y marca las celdas; si está completo pide confirmación.
   - **Enviar = cierre del curso en el periodo:** reutiliza `CierreCurso` (quién y cuándo) vía `cerrarCursoPeriodo`; no hay estado paralelo ni migración. El curso queda en solo lectura para el profesor y dirección lo reabre con `reabrirCursoPeriodo` («Reabrir calificación» en la misma pantalla). El envío exige además ser quien dicta el curso (`Curso.profesorId`), el periodo terminado (o cerrado por dirección sin cierre del curso: no se puede enviar) y competencias activas. Se audita (`enviar` / `calificacion_periodo`, con el salón y el tutor) además del cierre.
   - El envío **no notifica** todavía al tutor: no hay plantilla de aviso interna para personal con este fin (pendiente, specs/38). El tutor entra desde Mis cursos.
11. **Reporte del periodo del salón** (`/notas/salon/[salonId]/periodo?periodo=…`; entrada «Reporte del periodo · 3.° B» en Mis cursos): una fila por alumno y, por curso y competencia activa, la calificación del periodo (con su conclusión en un `Popover`). Encima, el estado por curso con ícono y palabra: «Enviado por <profesor> el dd/mm» o «Pendiente · <profesor>». Solo se leen las calificaciones de los cursos ya enviados; los demás aparecen como «Pendiente» sin valores. Solo el tutor del salón (`Salon.tutorId`) y dirección; un profesor que no es tutor del salón y otro colegio reciben 403. El periodo por defecto es el último terminado.

## Reglas de negocio

- `Evaluacion.fecha` es la fecha académica; `creadaAt` y `actualizadaAt` registran el tiempo real del sistema y `creadaPorId` identifica al responsable. Cambiar `fecha` recalcula las reglas NSP vigentes sin alterar marcas de auditoría.
- Una evaluación manual nueva exige competencia principal activa del mismo curso. Las evaluaciones históricas sin competencia y tareas previas sin asociación siguen legibles hasta que se regularicen explícitamente.
- `Nota` es única por evaluación y alumno. Un pendiente es ausencia de valor; nunca equivale a C o NSP. Se validan escala literal/vigesimal, matriculados y periodo abierto. Crear por lote es transaccional e idempotente.
- NSP, 15 días de justificación, recuperación, restricciones de publicación/cierre y corrección con motivo e `HistorialNota` siguen specs/11 y 37. Las tareas no generan NSP.
- Las competencias oficiales provienen del catálogo CNEB; las personalizadas viven en el colegio. Se conserva `codigoOficial` solo si hay correspondencia verificable. Desactivar no borra notas ni relaciones; restaurar plantilla no sobreescribe personalizaciones.
- Solo `origen = oficial` **y** `codigoOficial` válido identifica una competencia exportable a SIAGIE; las personalizadas muestran «No oficial» y quedan excluidas de reportes oficiales. La integración efectiva con SIAGIE requiere revisión normativa.
- Un curso nuevo con área y grado CNEB reconocidos recibe competencias oficiales y capacidades automáticamente. La restauración es idempotente por `(cursoId, codigoOficial)`, reactiva las oficiales desactivadas y conserva las personalizadas. Los grados de una misma área reutilizan la definición del catálogo, aunque la BD conserva instancias por curso para aislamiento e historial.
- La competencia usada en evaluaciones, valoraciones, tareas, informes o rectificaciones conserva su nombre histórico y solo puede desactivarse; una sin referencias puede eliminarse. La edición de una oficial sin uso que cambia su nombre la convierte en personalizada. Cada cambio registra antes, después y actor en auditoría.
- No se modifica el catálogo compartido al editar una competencia del colegio. Cada escritura se audita. Una competencia desactivada se muestra en historial y se excluye del selector de actividades nuevas.

## Modelo de datos

`Competencia`: `origen`, `codigoOficial`, `desactivadaAt`, `desactivadaPorId`, `createdAt`, `updatedAt`, además de `tenantId` y `cursoId`. `Membership.gestionaCompetencias` concede permiso explícito al profesor. `Evaluacion`: `fecha`, `creadaAt`, `actualizadaAt`, `creadaPorId`, `competenciaId`, `tareaId`, `periodoId`, `estado`, `grupoId`, `claveIdempotencia` única opcional. `Nota`: un registro por evaluación y alumno, con marca NSP/NE, recuperación y responsable. `HistorialNota` guarda cambios. `CalificacionPeriodo` y `LibretaEmitida` mantienen el resultado y documento del periodo. `Tarea.competenciaId` y `TareaCurso.competenciaId` vinculan cada sección con el currículo. `Evaluacion(tareaId, cursoId)` es única para impedir duplicados al reprocesar.

## Contratos de `src/lib/server`

```ts
competenciasDelCurso(ctx, cursoId, { incluirDesactivadas? })
puedeGestionarCompetencias(ctx)
crearCompetencia(ctx, datos); editarCompetencia(ctx, id, cambios)
desactivarCompetencia(ctx, id); reactivarCompetencia(ctx, id)
restaurarPlantillaOficial(ctx, cursoId)
cursosDelRegistro(ctx)  // { anio, propios, tutoria }
anioAcademicoVigente(ctx)
registroDelCurso(ctx, cursoId, periodoId?)
crearCalificacion(ctx, { cursoId, periodoId?, nombre, descripcion?, fecha, competenciaId, notas, claveIdempotencia })
editarNotaRegistro(ctx, { evaluacionId, alumnoId, valor, motivo }) // vía guardarNota
editarObservacionRegistro(ctx, { evaluacionId, alumnoId, observacion, visible })
plantillaNotas / previsualizarImportacionRegistro / importarRegistro / exportarRegistro  // registro-notas-archivos.ts
// src/lib/server/calificacion-periodo.ts (ahora = inyectable para pruebas)
estadoCalificacionPeriodo(ctx, cursoId, periodoId, ahora?)  // no_disponible | pendiente | enviada
datosCalificacionPeriodo(ctx, cursoId, periodoId, ahora?)   // alumnos, competencias activas, evidencias, guardadas
guardarBorradorPeriodo(ctx, { cursoId, periodoId, celdas }, ahora?)
enviarCalificacionPeriodo(ctx, { cursoId, periodoId }, ahora?) // { ok, faltantes? }; cierra el curso (CierreCurso)
reabrirCalificacionPeriodo(ctx, cursoId, periodoId)            // solo dirección
salonesParaReporte(ctx); reporteSalonPeriodo(ctx, salonId, periodoId?, ahora?)
```

`competenciasActivasDelCurso` (registro) lee con `ctx.db` y no usa `competenciasDelCurso`, que exige que el profesor dicte el curso: el tutor también lee el registro. `src/lib/server/notas.ts` y `tareas/*` siguen siendo la fuente de reglas ya aplicadas.

## Rutas y UI

- `/notas`: Mis cursos para el docente; vista existente de lectura para familia y alumno.
- `/notas/competencias`: acción secundaria de configuración, con selector de curso, insignias de origen y estado, capacidades plegadas y acciones de crear, editar, desactivar, reactivar y restaurar.
- `/notas/[cursoId]/periodo` (calificación del periodo) y `/notas/salon/[salonId]/periodo` (reporte para el tutor y dirección).
- Registro de un curso en `/notas/[cursoId]` y «Nueva calificación» en dos pasos dentro de un Sheet. La configuración curricular es acción secundaria autorizada. `/notas/periodos` y `/notas/criterios` mantienen sus funciones internas.

## Textos y UX

El botón principal dice «Nueva calificación». Los estados combinan ícono y palabra. Las familias ven textos directos, con «tú» y sin tecnicismos. NSP se explica «No se presentó».

## Errores y casos borde

- Curso, competencia, alumno o periodo de otro colegio o fuera del alcance: denegar. Periodo cerrado: denegar escritura.
- Tarea antigua sin competencia: no asignar arbitrariamente; pedir asociación autorizada antes de nueva calificación.
- Reintentos: la clave de idempotencia debe impedir columnas duplicadas. La clave UUID se genera en el cliente y `Evaluacion.claveIdempotencia` tiene índice único; los reintentos devuelven la evaluación original.
- Evaluación histórica sin competencia: mantener visible sin falsear asociación. Competencia desactivada: mantener la etiqueta histórica.

## Pruebas

- Integración `registro-notas-archivos`: observación privada/visible (la familia ve solo las visibles), plantilla Excel/CSV, vista previa con errores, importación idempotente, exportación e informe de progreso. Unit `notas-plantilla`.
- E2E `registro-notas`: observación al crear, plantilla, importación con vista previa e informe.
- Integración (registro): origen tarea/manual por `tareaId`; Mis cursos solo con los cursos que dicta y tutoría aparte, de solo lectura.
- Unit: agrupación por competencias, origen, pendientes y validación de escala; disponibilidad por fecha en la zona del colegio y faltantes del periodo (`tests/unit/calificacion-periodo.test.ts`).
- Integración `registro-notas-nsp` (`tests/integracion/registro-notas-nsp.test.ts`): `crearCalificacion` marca NSP al ausente sin justificar y no al pendiente que asistió, nace en borrador, no pisa la nota escrita; una tarea nunca genera NSP; decidir y registrar la recuperación desde el registro con su fecha, en la actividad original.
- e2e `registro-notas-nsp`: NSP al crear, estado en la celda, decisión de recuperación y nota con fecha; `notas-libreta`: dirección reabre desde la UI.
- Integración (`tests/integracion/calificacion-periodo.test.ts`): botón no disponible antes del fin del periodo; sin envío con faltantes ni B/C sin conclusión; envío auditado y solo lectura; dirección reabre; el tutor ve solo su salón y solo los cursos enviados; profesor no tutor y otro colegio reciben 403; la libreta sigue leyendo `CalificacionPeriodo`.
- e2e (`tests/e2e/calificacion-periodo.test.ts`): botón deshabilitado; el profesor califica con teclado, ve los faltantes y envía; la tutora lo ve en el reporte y un profesor sin tutoría recibe 403.
- Integración: permisos por tenant/rol/curso; competencia desactivada; transacción e idempotencia; tarea y registro comparten `Nota`; NSP, historial, cierre y libreta.
- E2E: Mis cursos → Registro → Nueva calificación; tarea calificada visible en registro; valoración de libreta independiente.
- PASO 1 E2E: dirección activa `gestionaCompetencias` en la ficha de Lucía; ella crea y desactiva una competencia desde `/notas/competencias`, con capturas a 1440×900 y 390×844.

## Pendientes

- Completar pruebas e2e y reconciliar los textos anteriores de specs/11 y 39.
- Las evaluaciones previas a la migración tienen `creadaAt` de migración, no fecha histórica verificable.
- Revisar vigencia y equivalencia SIAGIE del catálogo oficial; Inicial ciclo I queda fuera del alcance actual.
