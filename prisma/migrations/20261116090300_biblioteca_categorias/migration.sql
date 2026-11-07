-- W4: metadata institutional and archival state. Existing rows remain active.
CREATE TYPE "CategoriaBiblioteca" AS ENUM ('reglamento', 'convivencia', 'protocolo', 'calendario', 'formato', 'oficial', 'otro');
ALTER TABLE "documentos" ADD COLUMN "categoria" "CategoriaBiblioteca" NOT NULL DEFAULT 'otro', ADD COLUMN "oficial" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "archivado_at" TIMESTAMPTZ;
ALTER TABLE "carpetas_documento" ADD COLUMN "archivado_at" TIMESTAMPTZ;
CREATE INDEX "documentos_tenant_id_categoria_idx" ON "documentos" ("tenant_id", "categoria");
CREATE INDEX "documentos_tenant_id_archivado_at_idx" ON "documentos" ("tenant_id", "archivado_at");
CREATE INDEX "carpetas_documento_tenant_id_archivado_at_idx" ON "carpetas_documento" ("tenant_id", "archivado_at");
