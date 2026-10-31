-- Descripciones del catálogo al día con lo que trae cada plan (specs/03, specs/25). Solo datos.
-- Solo se reemplaza el texto original de la migración 20261031100000: si el equipo ya lo editó en /planes, se respeta.
UPDATE "planes_catalogo" SET "updated_at" = now(),
  "descripcion" = 'Asistencia al colegio con portería QR y por curso, justificaciones, avisos, mensajes, comunicados, horario, reportes de asistencia y gestión del colegio.'
WHERE "plan" = 'base'
  AND "descripcion" = 'Asistencia con aviso a la familia, portería con QR, justificaciones, mensajes, comunicados y gestión del colegio.';
UPDATE "planes_catalogo" SET "updated_at" = now(),
  "descripcion" = 'Todo Khipu Base más notas por competencias y desempeños del CNEB, libreta, tareas y agenda, documentos, reuniones y tablero de dirección.'
WHERE "plan" = 'pro'
  AND "descripcion" = 'Todo Khipu Base más notas por competencias, libreta, tareas y agenda.';
