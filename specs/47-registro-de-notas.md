# 47 — Registro de notas

> Estado: en desarrollo (registro, tareas, currículo y permisos) · Plan: Khipu Pro · Última actualización: 2026-11-07

## Objetivo
Dar al docente un registro por curso semejante a una tabla de calificaciones, con actividades agrupadas por competencia y entrada rápida de notas, usando los servicios académicos existentes.

## Roles y permisos

| Rol | Puede | No puede |
|---|---|---|
| Profesor | Ver y calificar cursos que dicta o salones que tutorea; gestionar sus competencias solo con `gestionaCompetencias` explícito | Ver o editar cursos ajenos, cambiar periodos cerrados |
| Dirección y rol académico equivalente autorizado por la institución | Ver cursos y gestionar competencias del colegio, periodos y cierre según permisos vigentes | Saltar auditoría, publicación o aislamiento del colegio |
| Apoderado y alumno | Consultar sus notas publicadas y libreta según specs/11 | Editar o ver otros alumnos |
| Otros roles o Khipu Base | Solo acceso permitido por specs/11 y 03 | Acceder al registro docente |

Cada operación valida `requireFeature(ctx, "notas")`, rol, curso y alcance con `ctx.db`. El permiso se comprueba en el servidor y la UI solo muestra las acciones disponibles. No existe un rol académico equivalente a dirección: `administrativo` es personal no docente y no recibe este permiso automáticamente. Dirección concede o retira `Membership.gestionaCompetencias` desde la ficha del profesor; el docente autorizado solo gestiona cursos donde figura en `Curso.profesorId`, no los que únicamente tutorea.

## Flujos

1. **Mis cursos:** al entrar a Registro de notas, el docente ve cursos asignados del año académico, cada uno con nombre, nivel, grado, sección y cantidad de alumnos. Cada sección tiene registro propio.
2. **Registro del curso:** se abre el periodo vigente o elegido; la primera columna fija muestra alumnos y las columnas existentes se agrupan por competencia, con desplazamiento horizontal. Cada columna señala origen manual o tarea, fecha, pendientes, NSP y detalles. No se crean columnas por capacidades o desempeños vacíos.
3. **Nueva calificación:** el docente pone nombre, descripción opcional, fecha académica editable y notas para los alumnos precargados. El periodo sale del contexto y admite corrección válida. Antes de confirmar elige una competencia activa aplicable. Los valores nulos quedan pendientes. Cancelar la confirmación conserva el formulario.
4. **Tareas:** una tarea calificable elige competencia válida; una entrega no genera nota. Al calificar, se crea o usa la `Evaluacion` con `tareaId` y se guarda la misma `Nota` que lee el registro. Correcciones en cualquiera de las vistas muestran el mismo resultado.
5. **Libreta:** el docente valora cada competencia del periodo con su criterio. El registro aporta evidencias; no genera promedios automáticos ni reemplaza `CalificacionPeriodo`.

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
cursosDelDocente(ctx, anio?)
registroDelCurso(ctx, cursoId, periodoId?)
crearCalificacion(ctx, { cursoId, periodoId?, nombre, descripcion?, fecha, competenciaId, notas, claveIdempotencia })
editarNotaRegistro(ctx, { evaluacionId, alumnoId, valor, motivo })
```

Las firmas de PASO 0 son contratos; su implementación pertenece a pasos posteriores. `src/lib/server/notas.ts` y `tareas/*` siguen siendo la fuente de reglas ya aplicadas.

## Rutas y UI

- `/notas`: Mis cursos para el docente; vista existente de lectura para familia y alumno.
- `/notas/competencias`: acción secundaria de configuración, con selector de curso, insignias de origen y estado, capacidades plegadas y acciones de crear, editar, desactivar, reactivar y restaurar.
- Registro de un curso en `/notas/[cursoId]` y «Nueva calificación» en dos pasos dentro de un Sheet. La configuración curricular es acción secundaria autorizada. `/notas/periodos` y `/notas/criterios` mantienen sus funciones internas.

## Textos y UX

El botón principal dice «Nueva calificación». Los estados combinan ícono y palabra. Las familias ven textos directos, con «tú» y sin tecnicismos. NSP se explica «No se presentó».

## Errores y casos borde

- Curso, competencia, alumno o periodo de otro colegio o fuera del alcance: denegar. Periodo cerrado: denegar escritura.
- Tarea antigua sin competencia: no asignar arbitrariamente; pedir asociación autorizada antes de nueva calificación.
- Reintentos: la clave de idempotencia debe impedir columnas duplicadas. La clave UUID se genera en el cliente y `Evaluacion.claveIdempotencia` tiene índice único; los reintentos devuelven la evaluación original.
- Evaluación histórica sin competencia: mantener visible sin falsear asociación. Competencia desactivada: mantener la etiqueta histórica.

## Pruebas

- Unit: agrupación por competencias, origen, pendientes y validación de escala.
- Integración: permisos por tenant/rol/curso; competencia desactivada; transacción e idempotencia; tarea y registro comparten `Nota`; NSP, historial, cierre y libreta.
- E2E: Mis cursos → Registro → Nueva calificación; tarea calificada visible en registro; valoración de libreta independiente.
- PASO 1 E2E: dirección activa `gestionaCompetencias` en la ficha de Lucía; ella crea y desactiva una competencia desde `/notas/competencias`, con capturas a 1440×900 y 390×844.

## Pendientes

- Completar pruebas e2e y reconciliar los textos anteriores de specs/11 y 39.
- Las evaluaciones previas a la migración tienen `creadaAt` de migración, no fecha histórica verificable.
- Revisar vigencia y equivalencia SIAGIE del catálogo oficial; Inicial ciclo I queda fuera del alcance actual.
