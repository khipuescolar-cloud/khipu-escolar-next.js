# 04 — Asistencia (pasar lista)

> Estado: borrador (requisitos) · Última actualización: 2026-10-26 (Claude Code). Quien lo implemente completa las secciones de la plantilla. · Plan: Básico

## Objetivo
El profesor pasa lista en menos de un minuto y las familias se enteran al instante.

## Roles
- **Profesor:** pasa lista en sus cursos y, si es tutor, la asistencia del día de su salón.
- **Dirección:** lo mismo en todo el colegio, más el resumen del día.
- **Apoderado:** ve el historial de sus hijos (solo lectura).

## Flujo del profesor (`/asistencia`)
1. Elige el salón y el curso (o «Asistencia del día» si es tutor; `ambito = "dia"`).
2. Lista de alumnos con 4 botones grandes: **Llegó / Tarde / Falta / Problema** (ícono + palabra). Por defecto todos «Llegó», con la hora actual (Lima).
3. Campo opcional de nota por alumno (para «Problema»).
4. **«Guardar y avisar a los padres»**: upsert por `(alumnoId, fecha, ambito)`, `origen = lista`. Luego encola los avisos (spec 06) y muestra un resumen («Se avisó a 18 familias»).
5. Vista previa del correo antes de guardar (componente compartido con la spec 06).

## Reglas
- Fecha y hora en `tenant.zonaHoraria` (America/Lima).
- Si se corrige un estado ya avisado, se envía un nuevo aviso solo si cambia el estado.
- Validar con zod. `requireFeature(ctx, "asistencia")` y `requireCursoDelProfesor`.
- `auditar()` cada registro y cada cambio.

## Vista del apoderado
Calendario o lista de los últimos 30 días por hijo, con `EstadoAsistencia`. Si es una falta sin justificar, botón «Justificar falta» (spec 07).

## Pruebas
- integración: upsert idempotente, el profesor no puede pasar lista en un curso ajeno.
- e2e: Lucía pasa lista en 3.° B → el correo aparece en Mailpit.
