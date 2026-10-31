-- Documento (DNI) opcional del alumno para enlazar familias en la carga masiva (specs/36). Solo agrega.
ALTER TABLE "alumnos" ADD COLUMN "numero_documento" TEXT;
CREATE INDEX "alumnos_tenant_id_numero_documento_idx" ON "alumnos"("tenant_id", "numero_documento");
