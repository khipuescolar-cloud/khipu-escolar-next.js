# Diagnóstico del Registro de notas — PASO 0

## Mapa de dependencias

| Pieza | Archivos y relación |
|---|---|
| Pantalla | `src/app/colegio/[slug]/notas/page.tsx`, `VistaDocente.tsx`, `GrillaNotas.tsx`, `actions.ts`, `criterios/`, `periodos/`. La vista actual mezcla seis secciones y selecciona curso y periodo antes de trabajar. `VistaFamilia.tsx` da lectura a apoderados y alumnos. |
| Servicio académico | `src/lib/server/notas.ts` crea evaluaciones, notas, historial, importación CSV, informe y valoración del periodo; `cneb.ts` gestiona capacidades y desempeños; `criterios.ts` gestiona instrumentos. Todo usa `TenantContext` y `ctx.db`. |
| Tareas | `src/lib/server/tareas/gestion.ts` crea `Evaluacion` ligada por `tareaId`; `entregas.ts` califica mediante `guardarNota` de Notas. `Tarea.competenciaId` es opcional para datos anteriores. La misma fila `Nota` ya es la fuente compartida. |
| Libreta | `src/lib/server/libreta.ts`, `libreta-emision.ts`, `libreta-pdf.tsx` leen `CalificacionPeriodo` y emiten una versión inmutable. Las notas del registro son evidencia; no sustituyen la valoración del docente. |
| Asistencia/NSP | `src/lib/server/nsp.ts` cruza la fecha académica de `Evaluacion` con asistencia, marca NSP, justificaciones y recuperaciones, y escribe `HistorialNota`. Las tareas no generan NSP. El plazo actual de justificación es 15 días calendario. |
| Nudito | `src/lib/server/nudito/areas-cursos.ts`, `catalogo.ts` y las relaciones de `NuditoTemaColegio` con `Desempeno` usan el área CNEB. Cambiar o borrar competencias y desempeños puede dejar referencias curriculares incoherentes. |

## Conservación y simplificación

Se conservan internamente el registro auxiliar y su historial, informe de progreso, calificación del periodo, competencias, capacidades y desempeños, importación y exportación CSV, y criterios de evaluación. También siguen las rutas de familias, Libreta, cierre y publicación. La nueva vista principal del docente debe mostrar sus cursos y abrir una tabla por curso. En esa vista se ocultan las pestañas de informe, valoración del periodo, competencias, capacidades/desempeños e importar/exportar; se reubican como acciones secundarias donde correspondan. Los criterios quedan accesibles desde el detalle de una evaluación, sin ocupar una pestaña principal. Dirección conserva gestión de periodos.

## Riesgos de migración

- `Competencia` pertenece a un curso y ya tiene referencias desde evaluaciones, tareas, valoraciones, informes y rectificaciones. Desactivarla debe conservar su ID y el nombre histórico; borrar o renombrar indiscriminadamente alteraría consultas y documentos posteriores.
- `Evaluacion.fecha` es fecha académica y determina NSP. La nueva fecha real de creación no puede reemplazarla. Las filas anteriores reciben un `creada_at` de migración: **no representa su instante histórico real**; no se debe presentar como tal sin distinguirlas.
- Hay evaluaciones con `competenciaId` nulo, y tareas antiguas sin competencia. Requieren asociación posterior revisada por una persona. Una asignación automática por nombre de curso sería insegura.
- La unicidad `Nota(evaluacionId, alumnoId)` y el `HistorialNota` protegen correcciones; la nueva creación masiva necesita transacción y clave de idempotencia, aún sin mecanismo persistido en este PASO 0.
- La spec 11 describe sugerencias de cálculo configurables y permisos docentes antiguos para competencias. La spec 47 define el nuevo flujo; el trabajo posterior debe reconciliar los textos y la UI sin modificar valoraciones históricas.

## Cobertura CNEB

`src/lib/cneb/catalogo.ts` reúne 31 competencias numeradas desde los JSON por área. Los datos declaran Inicial 3–5 años (ciclo II), Primaria 1.º–6.º y Secundaria 1.º–5.º, con capacidades y desempeños por nivel/grado. `src/lib/cneb/PENDIENTES.md` documenta las fuentes oficiales MINEDU, los vacíos que corresponden al programa y lecturas dudosas del escaneo de Secundaria. Declara cero desempeños pendientes sin fuente. No incluye Inicial ciclo I (0–2 años). Los nombres son los transcritos del CNEB; no se agregan denominaciones en esta etapa. La vigencia normativa actual y las lecturas dudosas requieren revisión contra publicaciones oficiales antes de declarar equivalencia para SIAGIE. El repositorio MINEDU pidió verificación de seguridad al consultarlo durante este diagnóstico; no se pudo corroborar de nuevo el PDF desde allí.
