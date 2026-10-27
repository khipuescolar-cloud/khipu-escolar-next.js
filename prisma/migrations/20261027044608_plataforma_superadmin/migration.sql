-- CreateEnum
CREATE TYPE "TipoIdentificacion" AS ENUM ('dni', 'ce', 'pasaporte');

-- AlterEnum
ALTER TYPE "Rol" ADD VALUE 'administrativo';

-- AlterTable
ALTER TABLE "memberships" ADD COLUMN     "cargo" TEXT;

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "debe_cambiar_password" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "direccion" TEXT,
ADD COLUMN     "fecha_nacimiento" DATE,
ADD COLUMN     "numero_documento" TEXT,
ADD COLUMN     "tipo_documento" "TipoIdentificacion";

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "eslogan" TEXT;

-- CreateTable
CREATE TABLE "admins_plataforma" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admins_plataforma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria_plataforma" (
    "id" BIGSERIAL NOT NULL,
    "actor_id" UUID NOT NULL,
    "accion" TEXT NOT NULL,
    "tenant_id" UUID,
    "detalle" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_plataforma_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_plataforma_user_id_key" ON "admins_plataforma"("user_id");

-- CreateIndex
CREATE INDEX "auditoria_plataforma_created_at_idx" ON "auditoria_plataforma"("created_at");

-- CreateIndex
CREATE INDEX "profiles_numero_documento_idx" ON "profiles"("numero_documento");

-- AddForeignKey
ALTER TABLE "admins_plataforma" ADD CONSTRAINT "admins_plataforma_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
