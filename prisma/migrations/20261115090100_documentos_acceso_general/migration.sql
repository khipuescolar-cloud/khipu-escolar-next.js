ALTER TABLE "carpetas_documento" ADD COLUMN "salon_id" UUID REFERENCES "salones"("id") ON DELETE SET NULL;
CREATE INDEX "carpetas_documento_tenant_id_salon_id_idx" ON "carpetas_documento" ("tenant_id", "salon_id");
