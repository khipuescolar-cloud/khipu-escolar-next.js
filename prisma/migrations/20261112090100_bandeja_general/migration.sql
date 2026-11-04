-- Bandeja de notificaciones general (specs/38): ya no solo calificaciones de los hijos. Aditiva, sin borrar datos.
-- - `notificaciones.alumno_id` y `evento_id` pasan a opcionales (mensajes, comunicados y avisos al profesor no tienen evento).
-- - `notificaciones.tipo` (backfill `calificacion` para las existentes, que salen todas de eventos académicos).
-- - `notificaciones.clave`: idempotencia de los productores nuevos, única por colegio y membresía (los reintentos no duplican).
--   Se mantiene la única (evento_id, membership_id, alumno_id) de las calificaciones.
-- - `comunicados.importante`: solo los importantes van también por correo (specs/09).

-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('calificacion', 'tarea', 'evaluacion_programada', 'mensaje', 'comunicado', 'justificacion', 'incidencia');

-- AlterTable
ALTER TABLE "notificaciones" ALTER COLUMN "alumno_id" DROP NOT NULL;
ALTER TABLE "notificaciones" ALTER COLUMN "evento_id" DROP NOT NULL;
ALTER TABLE "notificaciones" ADD COLUMN "tipo" "TipoNotificacion" NOT NULL DEFAULT 'calificacion';
ALTER TABLE "notificaciones" ALTER COLUMN "tipo" DROP DEFAULT;
ALTER TABLE "notificaciones" ADD COLUMN "clave" TEXT;

-- AlterTable
ALTER TABLE "comunicados" ADD COLUMN "importante" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "notificaciones_tenant_id_membership_id_clave_key" ON "notificaciones"("tenant_id", "membership_id", "clave");
