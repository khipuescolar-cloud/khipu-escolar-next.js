# Tareas del profesor con el estilo de la vista del alumno

| Campo | Valor |
|---|---|
| Fecha | 2026-11-08 |
| Colaborador | Carlos (desarrollo) |
| Agente y modelo | Claude Code · claude-opus-5-5 (Codex sin créditos hasta el 2026-11-11) |
| Rama y commits | `feat/tareas-docente-tarjetas` (antes, en `dev`: `3b202b1` guarda el trabajo de tareas de la sesión del 2026-11-07 que quedó sin commit) |
| Specs afectadas | `specs/39-tareas.md` |

## Pedidos del colaborador (textual)
> [capturas de Tareas del alumno y del profesor] el modulo de tareas del alumno se ve bonito, puedes hacer que sea similar lo que se tiene para el profesor , por que para el profesor se ve horrible

## Decisiones
- Mismo lenguaje que la vista del alumno: banda «Para revisar» (como «Vence pronto»), pestañas con cantidad y tarjetas agrupadas.
- El selector «Estado» pasa a pestañas: Todas · Borradores · Programadas · Cerradas · Archivadas.
- Toda la fila abre la revisión; Editar y Eliminar quedan como íconos (en el celular, debajo de la tarea).
- El trabajo de tareas de la sesión anterior (terminado y validado, sin commit) se guardó primero como su propio commit.

## Cambios realizados
- `src/app/colegio/[slug]/tareas/ListaDocente.tsx`: banda «Para revisar» con tarjetas, filas compactas con nudo de estado y barra de entregas, tarjetas por salón en dos columnas.
- `src/app/colegio/[slug]/tareas/page.tsx`: pestañas con contadores, filtro de curso compacto.

## Validación
- `tsc --noEmit` y `pnpm lint`: sin errores.
- Playwright (puerto 3060): `tareas-agenda`, `tareas-classroom`, `registro-notas`, `materiales-clase` → 8/8 (materiales-clase falló una vez de forma intermitente y pasó en dos corridas siguientes).
- Capturas a 1440 px y 390 px con la profesora Carla Mendoza.

## Pendientes y preguntas abiertas
- Ocultar al alumno la calificación de sus entregas en Tareas (pregunta abierta desde «alumno sin notas»).

## Seguimiento: pestañas y sin borradores
> [captura de las pestañas] aqui deberia ver las tareas : todas, programadas, sin revisar y revisadas ; lo de borradores no deberia existir, no deberian exisitir "tareas borradores" ni tampoco deberia existir "archivadas"

- Pestañas: Todas · Programadas · Sin revisar · Revisadas (`?ver=`), filtradas por salón. Sin «Borradores», «Cerradas» ni «Archivadas».
- «Nueva tarea» ya no ofrece «Guardar borrador»; `crearTarea` rechaza `accion: "borrador"` (test en `tests/integracion/tareas-classroom.test.ts`).
- Los borradores que ya existían no se tocan: aparecen en «Todas» con «Publicar» o se pueden eliminar. En la BD local queda uno de Carla Mendoza («Cuestionario: instituciones del Estado»).
- Validación: tsc y lint limpios; integración de tareas 22/22; e2e `tareas-agenda` y `tareas-classroom` en verde.

## Seguimiento: distinguir lo revisado
> [capturas] pero si estos ya fueron revisados no deberian tener el mismo color o si ? creo yo que algo debe diferenciarlos para que el profesor sepa cual ah revisado y cual no ya que aqui [captura] se ven todos iguales

- Sección revisada: check verde, insignia «Revisada», barra verde y fecha vencida en gris (`ListaDocente.tsx`, `insignias.tsx`: `Revisada`, `FechaEntrega neutra`).
- Por revisar: nudo relleno + «N por revisar» (sin cambios). Validación: tsc y lint limpios; captura con Carla Mendoza.

## Seguimiento: carpetas por curso
> [captura de «Para revisar»] quitamos esto, y en los tabs primero ponemos,los cursos como si fueran carpetas y dentro de los cuales podemos ver las tareas de cada curso, luego tareas vencidas, luego tareas programadas, luego tareas revisadas,

- Se quita la banda «Para revisar».
- Pestañas: Cursos (carpetas; `?curso=` abre una) · Vencidas · Programadas · Revisadas. Sin el filtro «Todos los cursos».
- Decisión: «Vencidas» excluye lo que ya está todo revisado (eso va a «Revisadas»), para no repetir tareas.
- `CarpetasCursos` y `TareasDeCarpeta` en `ListaDocente.tsx`; `seccionesTodas` mantiene «También en …» al filtrar.
- e2e `tareas-agenda` y `tareas-classroom` ahora abren la carpeta del curso. Validación: tsc y lint limpios; e2e de tareas, registro de notas y materiales en verde; capturas a 1440 px.
