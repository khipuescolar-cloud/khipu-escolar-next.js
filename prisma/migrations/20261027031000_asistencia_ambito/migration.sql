-- Reemplaza el índice NULLS NOT DISTINCT (Prisma no lo representa) por la columna ambito.
DROP INDEX IF EXISTS "asistencias_alumno_fecha_curso_key";

-- ambito = curso_id o 'dia' para la asistencia del día. La tabla está vacía en este punto.
ALTER TABLE "asistencias" ADD COLUMN "ambito" TEXT NOT NULL;

CREATE UNIQUE INDEX "asistencias_alumno_id_fecha_ambito_key" ON "asistencias"("alumno_id", "fecha", "ambito");
