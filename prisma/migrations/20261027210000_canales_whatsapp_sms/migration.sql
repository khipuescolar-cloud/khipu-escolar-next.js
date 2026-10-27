-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CanalAviso" ADD VALUE 'whatsapp';
ALTER TYPE "CanalAviso" ADD VALUE 'sms';

-- AlterTable
ALTER TABLE "preferencias_aviso" ADD COLUMN     "sms" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsapp" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "sms_activo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsapp_activo" BOOLEAN NOT NULL DEFAULT false;

