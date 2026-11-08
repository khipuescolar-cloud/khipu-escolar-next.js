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
