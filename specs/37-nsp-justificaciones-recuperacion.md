# 37 — NSP, justificaciones, recuperación, incidencias y libretas emitidas

> Estado: implementado · Plan: Khipu Base (incidencias, plazo) y Khipu Pro (notas, libreta) · Última actualización: 2026-11-03 (Claude Code, rama `pre-asistencia`: los permisos de asistencia no generan NSP; antes, rama `dev`)

## Objetivo
Conectar la asistencia con el registro auxiliar:
- quien faltó a la clase de una actividad queda con **NSP** («No se presentó»);
- la familia justifica la falta en **15 días calendario**;
- si no la justifica a tiempo, Khipu aplica la consecuencia que configuró el colegio;
- si la falta se justifica, el profesor decide la recuperación, y la nota va en la **actividad original**.

Además:
- toda corrección queda auditada;
- la libreta emitida no cambia en silencio.

**Tres conceptos independientes:**
- **Asistencia:** si estuvo en el colegio y en cada clase (specs/04, 05).
- **Registro auxiliar:** las actividades y notas del docente (specs/11).
- **Calificaciones oficiales:** el nivel de logro por competencia, que pone el profesor y va a la libreta.

El registro auxiliar **no** calcula la calificación oficial.

## Decisiones confirmadas (product owner, 2026-11-03)

**Plazo**
- 15 días **calendario**. La falta es el día 0 y el día 15 es el último.
- Vence a las 23:59:59.999 del día 15 en la zona del colegio (`America/Lima` por defecto).
- Se cuenta con fechas locales, no restando horas UTC.

**Consecuencia por vencimiento**
- Es automática y la configura cada colegio. Sin configuración, Khipu **no inventa** 0 ni C: muestra una alerta.

**Recuperación**
- Se registra en la **actividad original**, que conserva su fecha. Se guarda además la fecha de la recuperación.

**Respuestas del 2026-11-03**
- **Resumen académico diario:** se construye ya. Publicar resultados deja de avisar al instante y lo publicado sale en el resumen del día.
- **Asistió y no entregó:** la etiqueta es **«No entregó» (NE)**, para no confundirla con NSP.
- **Justificación aprobada y recuperación no autorizada:** el **NSP se mantiene** y no se aplica la consecuencia, porque la falta se justificó a tiempo.
- **Emisión de la libreta:** ocurre al **publicarla**. Las rectificaciones las aprueba dirección y crean una versión nueva.

## Roles y permisos

| Rol | Puede | No puede |
|---|---|---|
| Apoderado | Justificar faltas de sus hijos (una solicitud por fecha); ver estados y notas publicadas | Ver alumnos ajenos; justificar fuera de plazo |
| Tutor del salón (o dirección) | Aprobar o rechazar justificaciones; ver el detalle de las incidencias de su salón | Decidir la recuperación de cursos ajenos |
| Profesor del curso | Ver NSP, autorizar o no la recuperación, registrarla, corregir con motivo; registrar incidencias de sus salones; pedir rectificaciones de sus cursos | Editar notas de otros cursos o colegios; escribir «NSP» a mano |
| Dirección | Configurar la consecuencia, la hora del resumen y el plazo; aprobar o rechazar rectificaciones; registrar y ver incidencias | Editar notas del registro auxiliar |
| Administrativo | Registrar incidencias | Ver diagnósticos de salones ajenos (solo ve el detalle de las que registró) |
| Khipu (sistema) | Poner y quitar NSP según la asistencia, aplicar vencimientos, enviar resúmenes y avisos. Actor `null` en el historial («Khipu») | — |

Todo se valida en `src/lib/server`, con `ctx.db` (tenant inyectado) y RLS cerrado en las tablas nuevas.

## Flujos

### 1. NSP automático (`src/lib/server/nsp.ts`)
Un alumno **faltó a la clase** de un curso en una fecha cuando se cumple, en este orden:
1. Tiene registro de esa clase (`ambito = cursoId`): «No llegó» cuenta como falta; cualquier otro estado, como presente.
2. No tiene registro de la clase: cuenta la **falta del día** (no vino al colegio).
3. Las incidencias crean faltas a clase con `origen = incidencia` (flujo 5).

**Tardanzas y permisos (regla aprobada):** las tardanzas y los permisos autorizados no se convierten en NSP. «Tarde» cuenta como presente. Una falta cubierta por un **permiso de asistencia** vigente (specs/04) no es ausencia para el NSP: el de día completo cubre la falta del día y las faltas a clase; uno por horas, las faltas a clase registradas en esas horas. Las faltas por incidencia **no** las cubre un permiso.

`sincronizarNsp` corre también al **registrar o anular un permiso** (en cada día del permiso con actividades, hasta hoy). Al registrarlo después de la falta, el NSP sin valor se quita con historial «La falta está cubierta por un permiso de asistencia autorizado.» (`cambio_asistencia`, Khipu); al anularlo, vuelve.

`sincronizarNsp` corre en estos momentos:
- al crear una actividad;
- al cambiar su fecha;
- al guardar una lista (`guardarLista`);
- en la falta automática del control de ingreso;
- cuando portería corrige una falta a llegada;
- al registrar una incidencia.

Cómo actúa:
- **Ausente y sin nota:** crea la nota `marca = nsp` (sin valor y sin persona). El historial registra `cambio_asistencia`, «Khipu».
- **Presente y con un NSP sin valor:** quita el NSP, con historial («Se corrigió la asistencia»).
- **Ausente con calificación, o con consecuencia ya aplicada:** **no se pisa**. La rejilla marca «Faltó según la asistencia» para que el profesor revise.
- Es idempotente. Con dos sincronizaciones a la vez, la unicidad por evaluación y alumno descarta la segunda.

### 2. Alumno presente que no entrega
- El profesor escribe **NE** («No entregó»): `marca = no_entrego`, sin valor. Puede agregar una observación.
- También puede poner una calificación de la escala con una observación.
- NE nunca se convierte en NSP.

### 3. Justificación (specs/07)
- Una sola solicitud por **fecha**: la de la falta del día o la de cualquier falta a clase de ese día cubre las demás. Una segunda solicitud responde «Esta fecha ya tiene una justificación.»
- Se conserva la fecha real de presentación (`justificaciones.created_at`).
- Estados:
  - sin solicitud;
  - pendiente de revisión;
  - aprobada (`aceptada`), con autor y fecha;
  - rechazada, con comentario y aviso a la familia.
- Con una rechazada, la familia puede volver a presentar si sigue dentro del plazo.
- Si la rechazan **después** del plazo, se aplica la consecuencia en el acto.

### 4. Aprobación del tutor
- `alAprobarJustificacion` vincula **todos** los NSP de esa fecha (`notas.justificacion_id`), de todas las actividades y cursos.
- Encola **un correo por profesor** afectado (`justificacion_aprobada_docente`), con las actividades de su curso y el texto: «… la justificación no implica la obligación de realizar una nueva evaluación».
- **No cambia ninguna nota** ni autoriza la recuperación.

### 5. Incidencias y retiros (`/incidencias`, `src/lib/server/incidencias.ts`)
Las registran dirección, administrativo o un profesor del salón.

**Pasos**
1. Elige alumno, fecha (hasta hoy) y hora.
2. Indica tipo (accidente, malestar o salud, otra), qué pasó, si hubo retiro y a qué hora, y las clases que se perdió. Vienen marcadas las de su horario desde esa hora.

**Qué hace Khipu**
- Cada clase marcada recibe una **falta a clase** (`origen = incidencia`, `incidencia_id`), solo si aún no tenía registro, y se ponen los NSP.
- La familia puede justificarla como cualquier falta.
- El profesor de cada curso recibe `incidencia_docente`, **sin la descripción** («no estará en Matemática»).
- La descripción solo la ven dirección, el tutor del salón y quien la registró.
- Una incidencia **no** aprueba la recuperación.

### 6. Vencimiento automático (cron)
`procesarVencimientosNsp` corre en `/api/cron/avisos`, antes de procesar la cola.

Para cada NSP que cumple todo lo siguiente:
- sin valor;
- sin consecuencia;
- sin justificación vinculada;
- con el plazo ya vencido.

Khipu actúa según el estado de la justificación de esa fecha:
- **Pendiente:** espera, aunque el tutor revise después del plazo (caso 5).
- **Aprobada:** la vincula, sin consecuencia. Pasa cuando la actividad se registró tarde.
- **Sin solicitud o rechazada:** aplica la consecuencia del colegio (`tenants.consecuencia_vencimiento_literal` o `_numerica`, según su escala).

Cómo aplica la consecuencia:
- `updateMany` condicionado y su historial en **una transacción**: la aplica una sola ejecución aunque corran dos a la vez.
- El historial guarda `consecuencia_vencimiento`, valor anterior «NSP», valor nuevo, política, plazo y actor Khipu.
- Se audita y, si la actividad está publicada, se envía `nota_corregida` (motivo vencimiento) a esa familia.

Si el colegio no configuró la consecuencia, el NSP queda igual y se cuenta como alerta:
- en Configuración → «Reglas académicas»: «Hay N NSP con el plazo vencido esperando…»;
- con `nspVencidosSinConsecuencia`.

La misma regla vale para una **actividad registrada tarde**: `sincronizarNsp` llama a `aplicarVencimientos` con los NSP recién creados.

Un fallo en un colegio se registra y no detiene a los demás. Todo es idempotente, así que el próximo cron reintenta.

### 7. Recuperación en la actividad original
1. En la rejilla, el NSP muestra su estado: «Sin justificar · hasta 20/11», «Justificación en revisión», «Justificación rechazada» o «Falta justificada».
2. Con la falta justificada, el profesor del curso ve **«Autorizar recuperación»** y **«No autorizar»** (`decidirRecuperacion`, una sola vez; historial `decision_recuperacion`).
3. **Autorizada:** el profesor elige la nota y un diálogo pide la **fecha en que la rindió** (hoy por defecto, nunca futura).
   - Se guarda en la misma nota: valor nuevo, `marca = null`, `fecha_recuperacion` y `recuperacion = autorizada`.
   - El historial registra `recuperacion` NSP → 18, con motivo «Recuperación autorizada tras justificación aprobada.», la justificación y quién lo hizo.
   - La actividad conserva su fecha original. Si está publicada, la familia recibe `recuperacion_registrada`.
4. **No autorizada:** queda NSP, sin nota y sin consecuencia. Para cambiarlo hace falta un motivo.

### 8. Correcciones auditadas (`guardarNota`)
Qué exige cada caso:
- **En borrador:** el profesor corrige libremente. El historial registra `registro`.
- **Evaluación publicada, un NSP o una consecuencia por vencimiento:** exige **tipo y motivo**. La rejilla abre «Motivo del cambio». Los tipos:
  - corrección por error de digitación;
  - cambio asociado a asistencia;
  - otra modificación autorizada.
- **Recuperación:** es su propio tipo, como describe el flujo 7.

Reglas comunes:
- La nota y su historial se guardan en una sola transacción.
- El historial es **inmutable**: un trigger impide `UPDATE` y no hay endpoint para editarlo ni borrarlo.
- Si la evaluación está publicada, se envía `nota_corregida` solo a la familia de ese alumno, sin valores en el correo.
- Intercambiar notas de dos alumnos son dos cambios con su motivo y dos avisos específicos.
- La importación CSV no toca notas publicadas, NSP ni consecuencias: las cuenta y pide corregirlas una por una.

### 9. Resumen académico diario — RETIRADO (2026-11-03, specs/38)
> Reemplazado por notificaciones por evento (bandeja interna y Web Push al publicar). El texto siguiente queda como historial; el código se eliminó y la tabla `resumenes_academicos` se conserva sin uso.

- «Publicar resultados» ya no avisa al instante.
- Cada día, a `tenants.hora_resumen_academico` (18:00 por defecto, en Configuración), cada familia recibe **un resumen por alumno** (`resumen_academico`). Incluye:
  - las actividades publicadas en la ventana [hora de ayer, hora de hoy);
  - el valor visible (A, 14, NSP, NE);
  - si tiene observación (el texto se lee en Khipu).
- Una fila por colegio y día en `resumenes_academicos` lo reclama de forma atómica, así que sale una sola vez.
- Si el cron no corrió a la hora, el resumen del día anterior sale en la siguiente ejecución.
- Siguen siendo avisos aparte e inmediatos:
  - justificación (`justificacion_revisada`);
  - recuperación (`recuperacion_registrada`);
  - corrección (`nota_corregida`).

### 10. Libreta emitida y rectificación (`src/lib/server/libreta-emision.ts`)

**Emisión**
- `publicarLibreta` emite la **versión 1** de cada alumno: una copia congelada en `libretas_emitidas.datos`, con quién y cuándo. Es idempotente.
- Desde ahí, `datosLibreta` y el PDF muestran la versión vigente, no los datos en vivo. Un cambio en el registro auxiliar o en `calificaciones_periodo` no la toca.
- `guardarCalificacionPeriodo` se rechaza: «La libreta de este periodo ya se emitió. Para corregirla, pide una rectificación…».

**Rectificación**
1. La pide el profesor del curso o dirección, desde la libreta del alumno, con competencia, valor correcto, conclusión, motivo (mínimo 10 caracteres) y evidencia. Solo se admite una pendiente por competencia.
2. Dirección la **aprueba** o la **rechaza**.
3. Al aprobar, en una transacción:
   - se crea la versión N+1: copia de la anterior con **solo** esa competencia corregida y `rectificacion_id`;
   - se actualiza `calificaciones_periodo`;
   - se avisa a esa familia (`libreta_publicada`, «versión 2, rectificada»).

**Garantías**
- La versión anterior queda intacta; un trigger impide editar `datos` y `version`.
- Nada se traslada al periodo siguiente.

## Modelo de datos

**Migraciones**

`20261110090000_nsp_justificaciones_libretas` es aditiva:
- **Renombra** `tenants.plazo_justificacion_dias_habiles` → `plazo_justificacion_dias`. Conserva el valor; ahora son días calendario.
- **Agrega:**
  - `tenants.consecuencia_vencimiento_literal` y `consecuencia_vencimiento_numerica` (0–20, CHECK);
  - `tenants.hora_resumen_academico`;
  - `asistencias.incidencia_id` y `origen = incidencia`.
- **En `notas`:** agrega `marca` (`nsp | no_entrego`), `vencida_at`, `justificacion_id`, `recuperacion` (`autorizada | denegada`), `recuperacion_por`, `recuperacion_at` y `fecha_recuperacion`. `registrado_por` pasa a ser opcional.
- **En `historial_notas`:** agrega `tipo` (`TipoCambioNota`), `campo`, `motivo`, `justificacion_id` y `publicada`. `cambiado_por` pasa a ser opcional (Khipu). Un trigger lo hace inmutable.
- **Tablas nuevas:**
  - `incidencias` e `incidencia_cursos`;
  - `libretas_emitidas` (única por alumno + periodo + versión; trigger de inmutabilidad);
  - `rectificaciones_libreta`;
  - `resumenes_academicos` (única por colegio + día).

`20261110090100_nota_sin_valor_con_marca` reemplaza `notas_un_valor`: como máximo un valor, y sin valor solo con marca.

## Contratos de `src/lib/server`
```ts
// nsp.ts
ausenciasEnCurso(tdb, cursoId, fecha, alumnoIds): Map<alumnoId, "falta_clase" | "falta_dia" | "incidencia">
sincronizarNsp(tdb, tenant, { evaluacionIds } | { fecha, alumnoIds }, ahora?): { creados, quitados, notaIds, alumnosConNsp }
aplicarVencimientos(tdb, tenant, { notaIds?, alumnoId? }?, ahora?): { aplicadas, sinConfigurar, vinculadas }
procesarVencimientosNsp(ahora?)                 // cron, todos los colegios
nspVencidosSinConsecuencia(tdb, tenant, ahora?) // alerta de dirección
alAprobarJustificacion(tdb, tenant, justificacionId): { actividades, docentes }
avisarCambioNota(tdb, tenant, { alumnoId, alumno, curso, titulo, evaluacionId, motivo })
// notas.ts
guardarNota(ctx, { evaluacionId, alumnoId, valor, motivo?, tipo?, fechaRecuperacion? })  // valor: escala | "NE" | ""
decidirRecuperacion(ctx, { evaluacionId, alumnoId, decision: "autorizada" | "denegada", motivo? })
publicarEvaluacion(ctx, grupoId)                // sin aviso inmediato
grillaNotas(...).estadosNsp: { nsp: Record<"evaluacionId:alumnoId", EstadoNspCelda>, conflictos: string[] }
// incidencias.ts
registrarIncidencia(ctx, { alumnoId, fecha, hora, tipo, descripcion, retiro, horaRetiro?, cursoIds }, ahora?)
cursosParaIncidencia(ctx, alumnoId, fecha, desde) · listarIncidencias(ctx) · alumnosParaIncidencia(ctx)
// resumen-academico.ts
ventanaResumen(fecha, hora, zona) · resumenDelDia(tdb, tenant, fecha): number | null · procesarResumenAcademico(ahora?)
// libreta-emision.ts
emitirLibretas(ctx, periodoId) · solicitarRectificacion(ctx, …) · resolverRectificacion(ctx, { id, decision, comentario? })
listarRectificaciones(ctx, { alumnoId?, periodoId?, soloPendientes? })
// configuracion.ts
actualizarReglasAcademicas(ctx, { consecuenciaVencimiento: "" | literal | "0–20", horaResumenAcademico })  // solo dirección
// lib/plazo-justificacion.ts (puro)
ultimoDiaJustificacion · expiracionJustificacion · dentroDelPlazo · textoPlazoJustificacion · mensajePlazoVencido
```

## Rutas y UI

**Rejilla (`/notas`)**
- Leyenda «NSP: No se presentó · NE: No entregó».
- La opción «NE · No entregó». En vigesimal se escribe «NE».
- El estado de cada NSP y los botones de recuperación.
- «Inasistencia por incidencia», «Plazo vencido: regla del colegio», «Recuperación del 26/11» y «Faltó según la asistencia».
- El diálogo «Motivo del cambio» o «Registrar recuperación».

**Evaluaciones del periodo**
- «Publicar resultados» explica que van en el resumen de hoy. No hay «Reenviar aviso».
- El historial muestra el tipo, el motivo y «Khipu».

**Otras pantallas**
- `/incidencias` (dirección, profesor, administrativo): formulario en dos pasos y lista de recientes; el detalle es reservado.
- `/configuracion` → **«Reglas académicas»** (dirección, con el módulo Notas): consecuencia por vencimiento, hora del resumen y alerta de NSP vencidos sin configuración. El plazo pasa a decir «(días calendario)».
- `/libreta`:
  - «Versión N emitida el … por …»;
  - tarjeta «Rectificaciones» (profesor y dirección) con estados (ícono + palabra), «Pedir una rectificación» y, para dirección, «Aprobar» y «Rechazar» con confirmación.
- `/notas` (familia): píldora «NSP · No se presentó» o «NE · No entregó» y la leyenda; «Recuperación rendida el …»; «Venció el plazo para justificar la falta: se aplicó la regla del colegio.»

## Textos y UX
- **Docente:** «La inasistencia de Juan Pérez del 05/11/2026 fue justificada por su apoderado y aprobada por el tutor. … considera una recuperación académica … La justificación no implica la obligación de realizar una nueva evaluación.»
- **Correos a familias:**
  - Sin valores en `nota_corregida` ni en `recuperacion_registrada`: enlazan al portal.
  - El resumen sí lista los valores visibles. Las observaciones se indican, no se copian.

## Errores y casos borde
- «El NSP lo pone Khipu según la asistencia. Si el alumno faltó, corrige la asistencia.»
- «Este alumno tiene NSP porque faltó. Para poner una nota, el tutor debe aprobar su justificación y tú autorizar la recuperación…»
- «Estos resultados ya se publicaron: indica el tipo y el motivo del cambio.»
- «La recuperación se decide cuando el tutor aprueba la justificación de la falta.» · «Ya registraste tu decisión sobre esta recuperación.»
- **Datos anteriores:** no se recalculan los NSP de actividades y faltas que ya existían, para no alterar notas ya publicadas. Se aplican desde que cambia la asistencia o se crea o mueve una actividad.

## Pruebas
- **integración:** `tests/integracion/nsp-justificaciones-recuperacion.test.ts` cubre los casos 1–17:
  - NSP, NE y corrección de asistencia sin pisar notas;
  - incidencia (12) con el detalle reservado;
  - sin configuración (16);
  - vencimiento único con dos procesos a la vez (9, 10);
  - días 15 y 16 (3, 4);
  - pendiente revisada tarde (5);
  - aprobación sin cambiar la nota (6);
  - recuperación autorizada con historial (8);
  - tres cursos y una solicitud (17) y recuperación denegada (7);
  - actividad tardía (15);
  - notas intercambiadas (11) e historial inmutable;
  - otro colegio (13);
  - libreta emitida y rectificación (14);
  - resumen diario único.
- **Permisos:** `tests/integracion/permisos-salida-reportes.test.ts` (falta con permiso sin NSP, permiso posterior retira el NSP, anular lo devuelve, tardanza nunca NSP, permiso por horas).
- **Actualizadas:** `evaluaciones-publicacion` (sin aviso inmediato; corrección con motivo), `notas-libreta-tareas-agenda`, `justificar-token`, `dia-a-dia-offline-plazo` y `plataforma-equipo-anuncios-configuracion` (los feriados no mueven el plazo).
- **unit:** `plazo-justificacion` (días calendario, día 15 dentro y 16 fuera, zona horaria) y `plantillas-avisos` (plantillas nuevas, sin notas ni diagnósticos).
- **e2e:**
  - `flujo-evaluacion`: NSP visible al crear, motivo al cambiar una nota publicada, incidencia con retiro;
  - `notas-libreta`: el cambio vigesimal en una evaluación publicada pide motivo.

## Pendientes y asuntos por validar
- **Cron:** en Vercel Hobby corre una vez al día (07:00 de Lima). El resumen de las 18:00 sale entonces a la mañana siguiente, y los vencimientos se aplican una vez al día. Para la hora exacta hace falta un cron horario (plan Pro o `pnpm cron:local`).
- **Consecuencia:**
  - ¿una sola por colegio o distinta por nivel o escala?
  - ¿aplica también a actividades en borrador? Hoy sí.
- **Recuperación no autorizada:** ¿el colegio aplica otra política? Hoy el NSP se mantiene sin nota.
- **Notificación a docentes:** solo a los profesores con actividades ese día. ¿Avisar también a los de clases sin actividad?
- **Incidencias:** no hay edición ni anulación; un error se corrige en la asistencia de la clase.
- **Retiro anticipado vs. permiso (por decidir, product owner):** hoy un retiro registrado como incidencia sigue creando faltas a clase y NSP (`Incidencia.retiro`), aunque el alumno tenga un permiso por horas que cubra esas clases (las faltas por incidencia no las cubre un permiso). ¿Un retiro autorizado por la familia debe tratarse como permiso (sin NSP) o mantener el NSP para que el profesor decida la recuperación? No se cambió el comportamiento.
- **Plazo:** sigue configurable de 1 a 30 días (15 por defecto). ¿Se fija en 15?
- **Rectificación:** no tiene adjuntos (la evidencia es texto) y la aprueba cualquier usuario de dirección.
