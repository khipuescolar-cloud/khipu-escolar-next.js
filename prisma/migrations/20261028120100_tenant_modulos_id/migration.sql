-- AlterTable
ALTER TABLE "tenant_modulos" DROP CONSTRAINT "tenant_modulos_pkey",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "tenant_modulos_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_modulos_tenant_id_modulo_key" ON "tenant_modulos"("tenant_id", "modulo");

