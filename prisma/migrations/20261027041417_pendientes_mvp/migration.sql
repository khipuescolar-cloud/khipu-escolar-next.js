-- CreateEnum
CREATE TYPE "Genero" AS ENUM ('femenino', 'masculino', 'no_especifica');

-- AlterEnum
ALTER TYPE "EstadoAviso" ADD VALUE 'enviando';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TipoAviso" ADD VALUE 'justificacion';
ALTER TYPE "TipoAviso" ADD VALUE 'tarea';
ALTER TYPE "TipoAviso" ADD VALUE 'alerta_direccion';

-- AlterTable
ALTER TABLE "avisos" ADD COLUMN     "referencia_id" TEXT;

-- AlterTable
ALTER TABLE "justificaciones" ADD COLUMN     "comentario_revision" TEXT;

-- AlterTable
ALTER TABLE "nudito_mensajes" ADD COLUMN     "acciones" JSONB;

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "genero" "Genero";
