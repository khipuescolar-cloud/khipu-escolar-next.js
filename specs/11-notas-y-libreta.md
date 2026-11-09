# 11 — Notas y libreta (MINEDU)

> El rediseño de la experiencia docente y el contrato curricular se documentan en [specs/47](47-registro-de-notas.md). Esta spec conserva las reglas académicas y de Libreta vigentes hasta su integración.

> Estado: implementado · Plan: Khipu Pro · Última actualización: 2026-11-09 (el alumno ya no ve notas ni libreta; antes: Claude Code, rama `pre-academico`: integridad académica — eliminar solo borradores sin historial, motivo mínimo, libretas emitidas imborrables y emitidas antes de publicar; specs/37)

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
| Profesor | Elegir curso y periodo, poner notas y observaciones, crear/editar/borrar evaluaciones, gestionar competencias de sus cursos (los que dicta o de los salones que tutorea), confirmar la calificación del periodo, **cerrar las notas de su curso**, exportar/importar CSV, ver la tabla de libretas de sus salones (tutoría o cursos que dicta) y abrir el documento de sus alumnos | Editar un periodo o curso cerrado, tocar cursos ajenos, reabrir un curso |
| Dirección | Ver todos los cursos y notas, abrir/cerrar/crear periodos, cerrar y **reabrir** cursos, **publicar la libreta** y reenviar el aviso, exportar CSV, ver la tabla de todos los salones y abrir todas las libretas | Editar notas o importar (solo lectura; las corrige el profesor) |
| Apoderado | Ver las notas (con las observaciones) y la libreta publicada de **sus** hijos; descargar el PDF | Ver otros alumnos, promedios del salón, rankings o comparaciones (no existen en ninguna vista); ver la libreta de un periodo sin publicar |
| Alumno (cuenta propia, specs/29) | — (desde 2026-11-08 no tiene «Registro de notas» ni «Libreta»: conoce su nota en clase y quien la sigue en Khipu es su familia). **Sí** ve la nota de sus tareas en `/tareas` (specs/39) | Ver las notas del registro del profesor o su libreta: `/notas` y `/libreta` dan 403, `notasDeAlumno` y `datosLibreta` rechazan el rol alumno; descargar el PDF |
| Portería / administrativo | — | `/notas` y `/libreta` (403) |
| Cualquiera en un colegio con Khipu Base | — | 403 en `/notas`, `/libreta` y su PDF (`requireFeature`) |

## Flujo de evaluación (consulta a un docente, 2026-10-31)
Lo que contó un profesor con experiencia y cómo lo lleva Khipu. Es la práctica de **un** colegio; por eso lo que no está
confirmado (cálculo, pesos) es configurable o solo sugerido, nunca obligatorio.
- **Se califica por competencia.** Cada curso tiene competencias con capacidades y desempeños (`specs/30`); en clase se
  evalúan desempeños, pero la nota que se reporta es la de la competencia.
- **Una prueba puede medir varias competencias** (p. ej. una prueba de Comunicación con preguntas de sus tres
  competencias): al crearla se marcan varias competencias y Khipu crea **una columna por competencia** con el mismo
  título, así cada alumno tiene una nota por competencia.
- **Instrumento** opcional de cada evaluación: prueba escrita, lista de cotejo, rúbrica, ficha de observación u otro.
- **Registro auxiliar** (la rejilla): evaluaciones agrupadas por competencia con el **promedio** de cada una al momento.
- **Nota del periodo:** la docente mencionó un promedio, pero sin precisar qué se promedia, pesos, redondeo ni conversión
  (segunda entrevista: su plataforma promedia por igual, sin ponderaciones). Por eso Khipu **no sugiere** por defecto: el
  profesor ve sus notas y pone la calificación. Las reglas «promedio» y «más frecuente» quedan como opciones provisionales.
- **Dos momentos de comunicación por periodo:** a mitad, el **informe de progreso** por competencia (qué logró, qué
  necesita mejorar y qué se recomienda reforzar); al final, la calificación con su conclusión descriptiva (libreta).
- **SIAGIE:** en ese colegio la secretaria copia las calificaciones de la libreta. El consolidado del salón (alumnos ×
  competencias, `specs/33`) sirve de base. Falta confirmar con personal de SIAGIE si conviene exportar en su formato.

## Flujos
1. **Profesor** → `/notas`: elige curso y periodo (formulario GET) → pestañas:
   - *Registro auxiliar*: grilla alumnos × evaluaciones **agrupadas por competencia** (fila de encabezado con la
     competencia; las evaluaciones sin competencia van al final en «Sin competencia»). Solo si el colegio activó una regla
     provisional, cada competencia termina en la columna **«Promedio · provisional»** (se recalcula en el navegador). Bajo
     el título de cada evaluación: «Borrador» si está programada, instrumento, fecha y (con regla provisional) peso. Literal: `<select>` que guarda al cambiar; vigesimal: campo numérico que guarda al salir. Cada celda muestra «Guardando / Guardado / error» con ícono + palabra. «Nueva evaluación» («Programar evaluación») pide título, instrumento, fecha, descripción opcional, «Avisar a las familias que está programada» (marcado) y las **competencias que evalúa** (casillas; bajo cada una, sus desempeños del grado); el peso solo aparece con una regla provisional activa. Debajo de la rejilla, **«Evaluaciones del periodo»**: una entrada por evaluación (aunque tenga varias columnas) con estado («Programada · borrador» / «Publicada · fecha»), descripción, **«Publicar resultados»** (si hay notas; con confirmación; lo publicado sale en el resumen académico del día, specs/37), «Historial de cambios (N)» desplegable y, por columna, «Editar» (título, fecha, instrumento y descripción cambian en todas las columnas; competencia, desempeños y peso en la columna), «Criterios» y «Eliminar» (solo si nunca se publicó y no tiene NSP, consecuencia ni recuperación, aunque tenga notas de borrador; si no, «No se puede eliminar» con candado y la explicación).
   - *Criterios* (`/notas/criterios?evaluacion=<columna>`): criterios de la rúbrica (puntaje de 0 a N) o lista de cotejo (cumple / no cumple) de esa columna, con desempeño opcional, y la rejilla alumnos × criterios que guarda cada celda sola, con totales de referencia («X de Y puntos», «Cumple n de m»). Aviso fijo: Khipu guarda los resultados tal cual y no los convierte en AD/A/B/C.
   - *Informe de progreso* (mitad del periodo): por competencia (píldoras), una tarjeta por alumno con sus «Notas del
     periodo (N)» y tres campos de hasta 600 caracteres: «Qué ha logrado», «Qué necesita mejorar» y «Qué recomendamos
     reforzar» (estado Escrito / Sin escribir). Arriba, el estado del envío (Aún no compartido / Compartido con las
     familias · por quién y cuándo · N informes escritos) y «Compartir con las familias» (con confirmación; luego «Reenviar
     aviso»).
   - *Calificación del periodo* (registro nuevo, specs/47): se solicita cuando termina el periodo, en una tabla estilo Excel (una fila por alumno; por competencia, «Evidencias» y «Calificación» con la conclusión en un `Popover`, obligatoria en B y C). **Enviar la calificación del periodo reutiliza el cierre del curso** (`cierres_curso`: quién y cuándo): exige calificación en todas las competencias activas y conclusión en B y C, deja el curso en solo lectura y lo audita; dirección lo reabre. Tras el envío, el tutor del salón y dirección ven el **reporte del periodo del salón** (`/notas/salon/[salonId]/periodo`) con solo los cursos enviados. La libreta sigue leyendo `calificaciones_periodo` sin cambios. La vista anterior por tarjetas (siguiente línea) se retira junto con la vista vieja del profesor.
   - *Calificación del periodo*: por competencia, una tarjeta por alumno con sus **notas del periodo** (valor, evaluación y fecha), el valor a confirmar y la conclusión descriptiva (obligatoria en B y C). Solo con una regla provisional activa se muestra «Sugerencia provisional del colegio» y «Usar la sugerencia»; solo se guarda al confirmar.
   - *Competencias*: lista, alta y baja (no se puede borrar una con calificaciones en libreta).
   - *Capacidades y desempeños* (CNEB, `specs/30`): capacidades de cada competencia y desempeños del grado del salón; dirección los importa del catálogo CNEB y los edita; el profesor los ve.
   - «Nueva evaluación» y «Editar» permiten marcar los **desempeños** que mide la evaluación (de la competencia elegida y del grado del salón). En *Calificación del periodo* cada alumno muestra «Desempeños evaluados (N)».
   - *Importar y exportar*: «Descargar CSV» de la rejilla e importación con vista previa (ver «Importar y exportar»).
   - Encima de las pestañas, tarjeta **Cierre de notas del curso** con estado ícono + palabra (Abierto / Cerrado / Periodo cerrado) y botón «Cerrar notas del curso» (profesor o dirección, con `BotonConfirmar`); dirección ve «Reabrir notas del curso» si está cerrado.
   - Cada celda de la rejilla tiene un botón de **observación** (ícono de mensaje) que abre un `Dialog` con textarea (máx. 500 caracteres).
2. **Dirección** → `/notas` (solo lectura) y `/notas/periodos` (selector de año: el anterior, el actual y el siguiente):
   - **Organización del año** (una tarjeta por nivel con salones): «Elegir organización» / «Cambiar» → Bimestres (4),
     Trimestres (3) o Semestres (2). Cada nivel es independiente (p. ej. primaria por trimestres y secundaria por
     bimestres). Si otro nivel ya usa ese tipo, el nivel se suma a sus periodos (mismas fechas); si no, Khipu los crea con
     fechas sugeridas (año escolar del segundo lunes de marzo al tercer viernes de diciembre, partido en partes iguales).
     Al cambiar de tipo, el nivel deja los periodos anteriores (los que quedan sin niveles se borran); no se puede si el
     nivel ya tiene evaluaciones, calificaciones o cierres en ellos.
   - Lista de periodos del año con sus niveles, «Fechas» (nombre, inicio y fin; valen para todos sus niveles), cerrar y
     reabrir, y **publicar la libreta** (ver más abajo). Cada periodo muestra «N de M cursos cerrados» (solo cursos de sus
     niveles). «Nuevo periodo» pide también los niveles que lo usan.
3. **Apoderado** → `/notas`: por hijo y periodo, cursos → competencias (calificación + conclusión y, si el profesor ya lo compartió, el bloque «Informe de progreso»: Ha logrado / Necesita mejorar / Te recomendamos reforzar) y las evaluaciones **publicadas** con su nota y, si existe, la «Observación» del profesor. Las evaluaciones programadas aparecen en la agenda (sin hora), no en Notas.
4. **Tutor** → `/libreta` de un alumno de su salón con el periodo abierto: «Comentario de tutoría» (opcional, máx. 1000 caracteres) que sale en la libreta y su PDF.
5. **Libreta** → `/libreta`: profesor y dirección eligen salón y periodo con filtros GET (`?salon=&periodo=`). La tabla horizontal muestra alumnos en filas y curso → competencia en dos niveles de encabezado, con primera y última columna fijas. En la rejilla, cada calificación muestra ícono y solo letra o número en una píldora de una línea; el nombre completo queda en `title` y `aria-label`, y la escala literal se explica en una leyenda bajo la tabla. Cada fila indica Emitida vN o Borrador en curso y ofrece «Ver documento». El resumen se obtiene en consultas por salón, valida plan, rol y alcance, y toma la última versión emitida cuando existe; listar no audita una vista por alumno. Al abrir el diálogo se llama `datosLibreta(..., "ver")`, se valida de nuevo el acceso y se audita esa vista. `?alumno=` selecciona el salón y abre directamente ese documento. El diálogo permite descargar PDF, navegar entre alumnos y conserva las rectificaciones: solicitud del profesor de su curso o dirección, aprobación o rechazo solo por dirección (specs/37).
   - El documento compartido por diálogo y familia usa cuadros con datos del alumno, calificaciones por curso y competencia (píldora completa en una línea, capacidades, desempeños evaluados, conclusión), asistencia, comentario de tutoría, escala, firmas y sello de emisión. El tutor puede editar su comentario solo en el periodo abierto y antes de la emisión.
   - La familia conserva el selector de sus hijos y periodos publicados, ve el mismo documento en línea y descarga el PDF. El alumno, portería y administrativo reciben 403. La libreta PDF no lista evaluaciones, así que las observaciones por nota solo se ven en `/notas`.

## Reglas de negocio
- **Sugerencia del periodo** (`tenants.sugerenciaPeriodo`, columna `calculo_literal`; Configuración → «Escala de calificación»): **`ninguna` (por defecto)** = Khipu no calcula nada en ninguna escala. Reglas **provisionales, no validadas** que dirección puede activar: `promedio` = vigesimal: promedio ponderado por `peso` redondeado al entero (`sugerirVigesimal`); literal: AD 4, A 3, B 2, C 1 ponderado y redondeado al más cercano, empates suben (`promedioLiteral`); `frecuente` = literal: el más frecuente y, si empatan, el más reciente (`sugerirLiteral`); vigesimal: promedio. Solo cuentan evaluaciones con competencia. Siempre es solo una sugerencia: el profesor confirma.
- **Estados de una evaluación** (`evaluaciones.estado`): `programada` (al crearla en Khipu; sus notas son borrador) y `publicada`. El valor por defecto de la columna es `publicada` (datos anteriores, seeds y cargas directas siguen visibles); `crearEvaluacion` pone `programada`. **La familia solo ve notas de evaluaciones publicadas** (`notasDeAlumno`). El cierre del curso o del periodo sigue bloqueando la edición.
- **Programar con aviso:** con `avisar`, `crearEvaluacion` encola `evaluacion_programada` (tipo `libreta`) a las familias con avisos activos de los alumnos activos del salón: una fila por familia y canal con los hijos juntos, `referenciaId = grupoId` (una evaluación de varias competencias avisa una sola vez).
- **Publicar resultados** (`publicarEvaluacion(ctx, grupoId)`): solo el profesor del curso; requiere al menos una nota; reclamo atómico (`updateMany` de `programada` a `publicada` con `publicada_at`). **Outbox (specs/38):** en la misma transacción se registra un evento; un worker asíncrono crea la notificación interna y el Web Push de cada apoderado (sin correo; el resumen diario se retiró). Publicar de nuevo se rechaza («Los resultados ya se publicaron.»). Se puede publicar con el curso o el periodo cerrados.
- **NSP, NE y correcciones** (specs/37): NSP («No se presentó») lo pone la asistencia; NE («No entregó») lo marca el profesor; ninguno es un número ni entra en cálculos. Cambiar una nota publicada, un NSP o una consecuencia por vencimiento exige tipo y motivo (mínimo 5 caracteres no vacíos) y avisa a esa familia (`nota_corregida`). La recuperación autorizada se registra en la actividad original.
- **Historial de notas** (`historial_notas`, inmutable): cada cambio real de una nota (rejilla o importación CSV) guarda valor anterior y nuevo como texto («A», «14,5», «NSP», «NE»; null = sin nota), quién (o «Khipu»), cuándo, el tipo (`registro`, `correccion_digitacion`, `recuperacion`, `cambio_asistencia`, `consecuencia_vencimiento`, `otra`, `decision_recuperacion`), el motivo, la justificación y si ya estaba publicada (specs/37). `historialEvaluacion(ctx, grupoId)` (profesor del curso o dirección) devuelve los 200 más recientes. **Eliminar evaluación** (`eliminarEvaluacion`): solo si nunca se publicó y no tiene NSP, consecuencia ni recuperación («Esta actividad ya tiene resultados publicados o historial; no se puede eliminar»); se permite con notas e historial de borrador: en una transacción se audita (título, curso, fecha, n.º de notas y de historial), se borra su historial y luego la evaluación (detalle en specs/37). En la BD, `historial_notas.evaluacion_id` es `RESTRICT` (migración `20261112090300_integridad_academica`) como defensa. `grillaNotas` devuelve `eliminable` por columna.
- **Evaluaciones en la agenda:** `itemsDeAgenda` agrega una entrada tipo `examen` por evaluación (`grupoId`) de los salones visibles, «Evaluación: <título>», a las 00:00 de Lima con `sinHora` (la agenda no muestra hora; «Mi horario» la pone en la fila de todo el día). Solo con el módulo Notas.
- **Comentario del tutor** (`comentarios_tutor`, único por alumno + periodo): lo escribe solo el tutor del salón (`salones.tutor_id`), alumno activo, periodo abierto y de su nivel; vacío lo borra; opcional. Se muestra en `/libreta` y en el PDF («Comentario de tutoría»).
- **Criterios de instrumentos** (`criterios_evaluacion`, `resultados_criterio`): por columna; máx. 30 criterios; escala `puntaje` (máximo entero 1–100, CHECK en BD) o `cumple`; desempeño opcional de la competencia y grado de la columna. Resultado: puntaje de 0 al máximo (2 decimales, punto o coma) o «si»/«no»; vacío borra; un solo valor por fila (CHECK). Solo el profesor del curso con periodo y curso abiertos. **No** se convierten en nota.
- **Varias competencias en una evaluación:** `crearEvaluacion` acepta `competenciaIds` (máx. 12) y crea una evaluación por competencia con el mismo título, instrumento, fecha y peso; cada desempeño marcado va a la evaluación de su competencia. Para que el CSV identifique cada columna, el nombre de columna (`columna`) es el título y, si se repite en el periodo, «título · competencia».
- **Informe de progreso** (`informes_progreso`, único por alumno + competencia + periodo): lo escribe solo el profesor del curso, con el periodo y el curso abiertos y para alumnos activos del salón; las tres partes vacías lo borran. «Compartir» (`envios_informe_progreso`, único por curso + periodo) exige al menos un informe, marca el curso como compartido y encola `informe_progreso` (tipo `libreta`) a las familias con avisos activos **de los alumnos con informe**; compartir otra vez se rechaza y «Reenviar aviso» repite el envío. La familia ve los informes de los cursos compartidos (incluidos los cambios posteriores); los no compartidos no le llegan. Se audita al guardar (`informe_progreso`) y al enviar.
- Periodo cerrado = nada se crea, edita ni borra (notas, evaluaciones, calificaciones). Lo valida el servidor, no solo la UI.
- **Cierre por curso** (`cierres_curso`, único por periodo + curso): con el curso cerrado en un periodo, el servidor rechaza crear/editar/borrar evaluaciones, guardar notas, observaciones, calificaciones del periodo e importaciones de **ese curso en ese periodo** (otros cursos o periodos no se afectan). Cierra el profesor del curso o dirección, solo con el periodo abierto; reabre solo dirección. El cierre general del periodo sigue existiendo y manda sobre el de curso. Ambos se auditan (`cierre_curso`).
- **Periodos por nivel** (`periodos.niveles`): un nivel usa un solo tipo de periodo por año. Profesor, familia y alumno
  solo ven los periodos del nivel del curso o del alumno (`/notas`, `/libreta`, Nudito+). El servidor rechaza evaluaciones,
  notas, calificaciones y cierres de un curso en un periodo de otro nivel («Este periodo no es del nivel de este
  curso.») y la grilla, la libreta y las notas de la familia dan 403. La libreta se publica solo a familias de alumnos de
  sus niveles. Lógica pura en `src/lib/periodos-academicos.ts` (`periodosSugeridos`, `organizacionDelAnio`,
  `nivelesConOtroTipo`).
- **Publicar libreta**: solo dirección; requiere el **periodo cerrado o todos los cursos** (de salones no archivados) **con cierre** y al menos un curso. Primero **emite** las libretas que falten y solo después marca `periodos.libreta_publicada_at` (reclamo atómico): un fallo a medias deja el periodo sin publicar y el reintento completa las faltantes. Luego encola el aviso `libreta_publicada` (tipo `libreta`) a los apoderados con consentimiento y avisos activos de alumnos activos (correo y push según sus preferencias; una fila por familia y canal, con los nombres de los hijos juntos; spec 06). **Idempotente**: si ya se publicó, «Publicar» se rechaza; «Reenviar aviso» repite el envío sin cambiar la fecha. **Emite** la versión 1 congelada de la libreta de cada alumno (`libretas_emitidas`); desde ahí la libreta y el PDF muestran esa versión y las calificaciones del periodo solo cambian por **rectificación** aprobada por dirección (versión 2, 3…; specs/37). Las versiones emitidas no se borran (trigger y FK `RESTRICT` a alumno y periodo), salvo con el colegio completo.
- **Quién ve la libreta**: profesor y dirección, siempre. Las familias, solo un periodo publicado **o** uno antiguo ya cerrado: `libretaVisibleParaFamilia` (`src/lib/libreta-publicacion.ts`) considera entregados los periodos cerrados que terminaron antes de `CORTE_LIBRETA_PUBLICADA` (2026-10-27), para no esconder libretas de antes de esta función. Un periodo abierto o cerrado nuevo sin publicar da 403 a la familia (página, PDF y datos) y no aparece en el selector; en `/notas` el botón «Ver libreta» tampoco se muestra.
- **Observaciones** (`notas.comentario`): máx. 500 caracteres; la nota debe existir (sin nota no hay observación y borrar la nota la elimina); vacío borra el comentario. Las ve la familia en `/notas`.
- La conclusión (máx. 1000 caracteres) es obligatoria si la calificación del periodo es B o C.
- Una nota solo se guarda para alumnos activos del salón del curso.
- Asistencia de la libreta: una fila por día entre `inicio` y `fin` del periodo; si hay asistencia del día (`ambito = "dia"`) manda sobre la del curso.
- Periodo por defecto: en `/notas` el abierto más reciente; en `/libreta` el último cerrado.

## Modelo de datos
`periodos` (con `niveles Nivel[]`, por defecto todos; migración `20261107100000_periodos_por_nivel`), `competencias` (por curso), `evaluaciones` (curso, periodo, competencia opcional, `peso` Decimal(5,2), `instrumento` opcional: `prueba_escrita | lista_cotejo | rubrica | ficha_observacion | otro`), `informes_progreso` (alumno, competencia, periodo, `logros`, `mejorar`, `recomendaciones`, `registrado_por`) y `envios_informe_progreso` (curso, periodo, `enviado_por`, `enviado_at`), `tenants.calculo_literal` (Prisma `sugerenciaPeriodo`: `ninguna | promedio | frecuente`, por defecto `ninguna`; migraciones `20261108090000_flujo_evaluacion` y `20261109090000_evaluaciones_publicacion`), `evaluaciones.grupo_id` (une columnas), `descripcion`, `estado` (`programada | publicada`, por defecto `publicada`), `publicada_at`, `historial_notas`, `comentarios_tutor`, `criterios_evaluacion` y `resultados_criterio`, `notas` (única por evaluación+alumno), `calificaciones_periodo` (única por alumno+competencia+periodo, con `conclusion`), `asistencias` (resumen), `tenants.escala_calificacion`. Capacidades y desempeños del CNEB (`capacidades`, `desempenos`, `evaluacion_desempenos`) y `salones.grado`: ver `specs/30`.

## Importar y exportar (actualizado: specs/47)

La vista docente por pestañas de `/notas` (registro auxiliar, informe, calificación del periodo, competencias, capacidades y desempeños, importar y exportar) **se retiró**. Los enlaces viejos (`/notas?curso=…&seccion=…`, `?vista=`, `?pestana=`) redirigen a `/notas/[cursoId]` o a «Mis cursos». El profesor y dirección trabajan en el registro por curso (`/notas/[cursoId]`):

- **Informe de progreso:** `Sheet` ancho desde el registro. Izquierda, alumnos con estado («Sin informe», «Borrador», «Compartido») y buscador; derecha, selector de competencia, notas del periodo como evidencia (solo lectura) y «Qué logró», «Qué necesita mejorar», «Qué recomendamos reforzar» con «Guardar» y «Compartir con la familia». A 390 px primero la lista y luego el detalle con «Atrás». Reglas sin cambio (`guardarInformeProgreso`, `compartirInformeProgreso` por curso y periodo).
- **Plantilla, importación y exportación:** ver specs/47. Se eliminó el CSV por columnas de evaluación (`exportarNotasCurso`, `importarNotas`, `src/lib/notas-csv.ts`).
- **Cierre del curso:** el registro muestra su estado (Abierto / Enviado-Cerrado / Periodo cerrado) en solo lectura; la acción la da el envío de la calificación del periodo y dirección reabre con `reabrirCursoPeriodo`.
- **Publicar resultados** se hace desde el detalle de la actividad («Publicar resultados»).
- **Observación por alumno:** `Nota.comentario`, privada por defecto (`comentarioPrivado`); la familia solo ve las visibles y publicadas.

## Contratos de `src/lib/server`
```ts
// notas.ts — todas llaman requireFeature(ctx, "notas"); escrituras: rol profesor + requireCursoDelProfesor + periodo abierto
listarPeriodos(ctx, nivel?); periodoEnCurso(periodos); periodoParaLibreta(periodos)
organizarNivel(ctx, { anio, nivel, tipo }); actualizarPeriodo(ctx, periodoId, { nombre, inicio, fin })   // solo dirección
cerrarCursoPeriodo(ctx, cursoId, periodoId); reabrirCursoPeriodo(ctx, cursoId, periodoId)   // profesor del curso o dirección / solo dirección
cierreDeCurso(ctx, cursoId, periodoId)
estadoPublicacionLibreta(ctx, periodoId); publicarLibreta(ctx, periodoId, { reenviar? })     // solo dirección
guardarComentarioNota(ctx, { evaluacionId, alumnoId, comentario }): Resultado
exportarNotasCurso(ctx, cursoId, periodoId); previsualizarImportacionNotas(...); importarNotas(ctx, cursoId, periodoId, texto)
crearPeriodo(ctx, entrada): Resultado            // solo dirección
cambiarEstadoPeriodo(ctx, periodoId, cerrado): Resultado   // solo dirección
listarCompetencias(ctx, cursoId); crearCompetencia(ctx, entrada); eliminarCompetencia(ctx, id)
crearEvaluacion(ctx, entrada); editarEvaluacion(ctx, id, entrada); eliminarEvaluacion(ctx, id)   // entrada.desempenoIds? (specs/30), instrumento?; al crear, competenciaIds? (una evaluación por competencia)
publicarEvaluacion(ctx, grupoId): Resultado      // profesor del curso; outbox → bandeja + push (specs/38)
historialEvaluacion(ctx, grupoId)                // profesor del curso o dirección
// criterios.ts: criteriosDeEvaluacion(ctx, evaluacionId); crearCriterio(ctx, entrada); eliminarCriterio(ctx, id); guardarResultadoCriterio(ctx, { criterioId, alumnoId, valor })
// libreta.ts: guardarComentarioTutor(ctx, { alumnoId, periodoId, texto })   // solo el tutor del salón
informesProgreso(ctx, cursoId, periodoId)        // profesor/dirección; filas por competencia y alumno con notas, informe y envío
guardarInformeProgreso(ctx, { alumnoId, competenciaId, periodoId, logros, mejorar, recomendaciones }): Resultado   // profesor del curso
compartirInformeProgreso(ctx, cursoId, periodoId, { reenviar? }): Resultado   // profesor del curso; aviso informe_progreso
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
- `/notas` (profesor, dirección, apoderado, alumno) · `/notas/periodos` (dirección) · `/libreta` (apoderado, alumno, profesor, dirección). El rol `alumno` (cuenta propia) usa la vista de familia con un solo alumno, ve la libreta solo de periodos publicados (misma regla que la familia, también en `datosLibreta`) y no tiene «Descargar PDF» (`/api/libreta` le da 403). `/libreta?alumno=<id>` abre la libreta de ese alumno y se valida con `requireAlumnoVisible` (403 si no está en su alcance); (enlaces de notas y avisos).
- `GET /api/notas/exportar?curso=<id>&periodo=<id>` → CSV de la rejilla.
- `GET /api/libreta/[alumnoId]?periodo=<id>` → PDF (`@react-pdf/renderer`, `src/lib/server/libreta-pdf.tsx`): logo del colegio (PNG/JPG tal cual; WEBP y SVG se convierten a PNG con `sharp`, `src/lib/imagen-png.ts`, caché en memoria), colegio, datos del alumno, tabla por curso con competencia (y debajo, en letra pequeña, sus capacidades), calificación y conclusión, asistencia del periodo, leyenda de la escala y firma de dirección. 400 si faltan parámetros, 403 sin permiso. Descarga auditada («exportar»).
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
- Programar y publicar, historial, agenda, comentario del tutor y criterios: integración `tests/integracion/evaluaciones-publicacion.test.ts` (aviso de programada una vez por familia aunque haya dos columnas, borrador invisible para la familia, publicar solo el profesor del curso, rechazo al repetir y reenvío, sin notas no se publica, sin `avisar` no avisa, historial con valor anterior y sin cambios repetidos, agenda sin hora, comentario solo del tutor y bloqueado con periodo cerrado, criterios con rangos y sin tocar la nota); e2e `tests/e2e/flujo-evaluacion.test.ts` (programar, borrador sin columna de promedio, publicar, historial).
- Flujo de evaluación: unit `tests/unit/calificaciones.test.ts` (sin sugerencia por defecto, promedio literal provisional con pesos y empates, promedio vs. más frecuente), `tests/unit/plantillas-avisos.test.ts` (`informe_progreso`); integración `tests/integracion/flujo-evaluacion.test.ts` (prueba de dos competencias = dos columnas con instrumento y nombres únicos en el CSV, sugerida por promedio y por la más frecuente, informe solo del profesor del curso, la familia no lo ve hasta compartirlo, aviso solo a familias con informe, reenviar, borrar con campos vacíos); e2e `tests/e2e/flujo-evaluacion.test.ts` (crear la prueba de dos competencias, encabezados por competencia, promedio en vivo; escribir y compartir el informe).
- integración: `tests/integracion/notas-libreta-tareas-agenda.test.ts` (apoderado no ve a otros alumnos ni sus notas, periodo cerrado no se edita, profesor ajeno y dirección no escriben, conclusión en B/C, libreta con asistencia y auditoría, Khipu Base → 403; cierre por curso y reabrir, observaciones, importar/exportar, publicar libreta con avisos, idempotencia y visibilidad familiar).
- Periodos por nivel: unit `tests/unit/periodos-academicos.test.ts` (nombres, año escolar sugerido, periodos seguidos, un tipo por nivel); integración `tests/integracion/periodos-por-nivel.test.ts` (primaria por trimestres y secundaria por bimestres aislados, niveles que comparten tipo, notas y cierre rechazados en periodo de otro nivel, no se cambia con notas, sí sin notas, periodo manual sin mezclar tipos, solo dirección).
- e2e: `tests/e2e/notas-libreta.test.ts` (profesor de una academia vigesimal temporal ingresa nota de 0 a 20; apoderada descarga el PDF; colegio Khipu Base temporal 403; observación por nota; cerrar/reabrir curso; exportar CSV; publicar libreta y reenviar aviso, con limpieza de datos). Capacidades y desempeños: `tests/unit/cneb-catalogo.test.ts`, `tests/integracion/cneb-desempenos.test.ts`, `tests/e2e/cneb-desempenos.test.ts` (specs/30). El envío real del correo (Mailpit) no se prueba en e2e: el worker corre por cron, y el aviso queda verificado en la tabla `avisos`.

## Pendientes
- Validar con docentes (ver `docs/modulo-evaluaciones.md` §9): qué se promedia, redondeo, conversión de puntajes de rúbrica a AD/A/B/C, nota única por curso, obligatoriedad del informe de progreso y del comentario del tutor, plantillas de rúbricas reutilizables.
- Confirmar con quien registra en el SIAGIE si conviene exportar el consolidado en su formato.
- (Decisión cerrada) `CORTE_LIBRETA_PUBLICADA` se queda como constante: `periodos` no guarda la fecha de cierre y no se cambia el esquema. Los periodos cerrados antes del corte siguen visibles para las familias; los nuevos requieren publicar la libreta.

## PDF de la libreta y marca
- El PDF usa solo colores del manual: índigo en encabezados, tinta y pizarra en texto, arena en líneas. Pie con la firma «Khipu Escolar» y el isotipo oficial (`public/marca/isotipo.svg` convertido a PNG con `sharp`, 24 pt; helper `src/lib/server/marca-pdf.ts`).
- Asistencia del periodo con las palabras fijas: «Llegó», «Tarde», «No llegó», «Aviso» (también en `/libreta`).
- Fuente: Helvetica del PDF (Sora e Inter aún no se incrustan en `@react-pdf/renderer`).

## Registro docente por curso (2026-11-07)

`/notas` muestra los cursos del año académico accesibles al docente; `/notas/[cursoId]` muestra actividades existentes agrupadas por competencia y permite crear una calificación manual en dos pasos. Las valoraciones de periodo, informes e importación/exportación siguen accesibles desde «Más». La libreta continúa basada en la decisión docente `CalificacionPeriodo`, sin promedio automático desde el registro. La corrección de una celda usa `guardarNota`, incluido el motivo y el historial cuando corresponde.
