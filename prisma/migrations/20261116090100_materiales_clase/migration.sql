-- Materiales por curso y sección, versiones inmutables y referencias desde Tareas.
CREATE TYPE "EstadoMaterial" AS ENUM ('borrador', 'publicado', 'archivado');

CREATE TABLE "materiales_clase" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "titulo" TEXT NOT NULL,
  "descripcion" TEXT,
  "unidad_tema" TEXT,
  "estado" "EstadoMaterial" NOT NULL DEFAULT 'borrador',
  "version_actual" INTEGER NOT NULL DEFAULT 1,
  "creado_por" UUID NOT NULL REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "publicado_at" TIMESTAMPTZ,
  "archivado_at" TIMESTAMPTZ,
  "eliminado_at" TIMESTAMPTZ,
  "eliminado_por" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "materiales_clase_tenant_id_creado_por_idx" ON "materiales_clase"("tenant_id", "creado_por");
CREATE INDEX "materiales_clase_tenant_id_estado_idx" ON "materiales_clase"("tenant_id", "estado");

CREATE TABLE "material_secciones" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "material_id" UUID NOT NULL REFERENCES "materiales_clase"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "curso_id" UUID NOT NULL REFERENCES "cursos"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "material_secciones_material_id_curso_id_key" ON "material_secciones"("material_id", "curso_id");
CREATE INDEX "material_secciones_tenant_id_curso_id_idx" ON "material_secciones"("tenant_id", "curso_id");

CREATE TABLE "material_versiones" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "material_id" UUID NOT NULL REFERENCES "materiales_clase"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "numero" INTEGER NOT NULL,
  "nota" TEXT,
  "creada_por" UUID NOT NULL REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "material_versiones_material_id_numero_key" ON "material_versiones"("material_id", "numero");

CREATE TABLE "material_version_archivos" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "version_id" UUID NOT NULL REFERENCES "material_versiones"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "archivo_id" UUID NOT NULL REFERENCES "archivos"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "orden" INTEGER NOT NULL
);
CREATE UNIQUE INDEX "material_version_archivos_archivo_id_key" ON "material_version_archivos"("archivo_id");
CREATE UNIQUE INDEX "material_version_archivos_version_id_orden_key" ON "material_version_archivos"("version_id", "orden");

CREATE TABLE "tarea_materiales" (
  "id" UUID NOT NULL PRIMARY KEY,
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "tarea_id" UUID NOT NULL REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "material_id" UUID NOT NULL REFERENCES "materiales_clase"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "version_id" UUID NOT NULL REFERENCES "material_versiones"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "creado_por" UUID NOT NULL REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "tarea_materiales_tarea_id_material_id_key" ON "tarea_materiales"("tarea_id", "material_id");
CREATE INDEX "tarea_materiales_tenant_id_version_id_idx" ON "tarea_materiales"("tenant_id", "version_id");

ALTER TABLE public.materiales_clase ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiales_clase FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.materiales_clase FROM anon, authenticated;
ALTER TABLE public.material_secciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_secciones FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.material_secciones FROM anon, authenticated;
ALTER TABLE public.material_versiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_versiones FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.material_versiones FROM anon, authenticated;
ALTER TABLE public.material_version_archivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_version_archivos FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.material_version_archivos FROM anon, authenticated;
ALTER TABLE public.tarea_materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarea_materiales FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.tarea_materiales FROM anon, authenticated;
