ALTER TABLE "evaluaciones" ADD COLUMN "clave_idempotencia" UUID;
CREATE UNIQUE INDEX "evaluaciones_clave_idempotencia_key" ON "evaluaciones"("clave_idempotencia");
