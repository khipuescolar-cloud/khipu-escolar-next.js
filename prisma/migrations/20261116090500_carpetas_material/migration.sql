CREATE TABLE "carpetas_material" (
  "id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "curso_id" UUID NOT NULL,
  "parent_id" UUID,
  "nombre" TEXT NOT NULL,
  "creado_por" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "carpetas_material_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "materiales_clase" ADD COLUMN "carpeta_id" UUID;
CREATE INDEX "carpetas_material_tenant_id_curso_id_parent_id_idx" ON "carpetas_material"("tenant_id", "curso_id", "parent_id");
CREATE UNIQUE INDEX "carpetas_material_hermanas_nombre_key" ON "carpetas_material"("tenant_id", "curso_id", "parent_id", lower("nombre")) NULLS NOT DISTINCT;
ALTER TABLE "carpetas_material" ADD CONSTRAINT "carpetas_material_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "carpetas_material" ADD CONSTRAINT "carpetas_material_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "carpetas_material" ADD CONSTRAINT "carpetas_material_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "carpetas_material"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "carpetas_material" ADD CONSTRAINT "carpetas_material_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "materiales_clase" ADD CONSTRAINT "materiales_clase_carpeta_id_fkey" FOREIGN KEY ("carpeta_id") REFERENCES "carpetas_material"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE public.carpetas_material ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carpetas_material FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.carpetas_material FROM anon, authenticated;
