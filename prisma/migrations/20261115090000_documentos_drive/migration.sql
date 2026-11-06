CREATE TYPE "NivelCompartidoDocumento" AS ENUM ('lector', 'editor');
CREATE TYPE "AmbitoDocumento" AS ENUM ('biblioteca', 'unidad');
ALTER TABLE "carpetas_documento" ADD COLUMN "ambito" "AmbitoDocumento" NOT NULL DEFAULT 'biblioteca', ADD COLUMN "eliminado_at" TIMESTAMPTZ, ADD COLUMN "eliminado_por" UUID;
ALTER TABLE "documentos" ADD COLUMN "ambito" "AmbitoDocumento" NOT NULL DEFAULT 'biblioteca', ADD COLUMN "eliminado_at" TIMESTAMPTZ, ADD COLUMN "eliminado_por" UUID;
CREATE INDEX "carpetas_documento_tenant_id_ambito_eliminado_at_idx" ON "carpetas_documento" ("tenant_id", "ambito", "eliminado_at");
CREATE INDEX "documentos_tenant_id_ambito_eliminado_at_idx" ON "documentos" ("tenant_id", "ambito", "eliminado_at");
CREATE TABLE "compartidos_documento" (
 "id" UUID PRIMARY KEY, "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
 "carpeta_id" UUID REFERENCES "carpetas_documento"("id") ON DELETE CASCADE,
 "documento_id" UUID REFERENCES "documentos"("id") ON DELETE CASCADE,
 "membership_id" UUID REFERENCES "memberships"("id") ON DELETE CASCADE,
 "rol" "Rol", "salon_id" UUID REFERENCES "salones"("id") ON DELETE CASCADE,
 "nivel" "NivelCompartidoDocumento" NOT NULL DEFAULT 'lector',
 "creado_por" UUID NOT NULL REFERENCES "memberships"("id"),
 "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
 CONSTRAINT "compartido_recurso_exacto" CHECK (("carpeta_id" IS NOT NULL) <> ("documento_id" IS NOT NULL)),
 CONSTRAINT "compartido_destinatario_exacto" CHECK (("membership_id" IS NOT NULL) <> ("rol" IS NOT NULL))
);
CREATE UNIQUE INDEX "compartido_persona_carpeta_unico" ON "compartidos_documento" ("carpeta_id", "membership_id") WHERE "carpeta_id" IS NOT NULL AND "membership_id" IS NOT NULL;
CREATE UNIQUE INDEX "compartido_persona_documento_unico" ON "compartidos_documento" ("documento_id", "membership_id") WHERE "documento_id" IS NOT NULL AND "membership_id" IS NOT NULL;
CREATE UNIQUE INDEX "compartido_grupo_carpeta_unico" ON "compartidos_documento" ("carpeta_id", "rol", COALESCE("salon_id", '00000000-0000-0000-0000-000000000000'::uuid)) WHERE "carpeta_id" IS NOT NULL AND "rol" IS NOT NULL;
CREATE UNIQUE INDEX "compartido_grupo_documento_unico" ON "compartidos_documento" ("documento_id", "rol", COALESCE("salon_id", '00000000-0000-0000-0000-000000000000'::uuid)) WHERE "documento_id" IS NOT NULL AND "rol" IS NOT NULL;
CREATE INDEX "compartidos_documento_tenant_id_membership_id_idx" ON "compartidos_documento" ("tenant_id", "membership_id");
CREATE INDEX "compartidos_documento_tenant_id_rol_salon_id_idx" ON "compartidos_documento" ("tenant_id", "rol", "salon_id");
CREATE TABLE "destacados_documento" (
 "id" UUID PRIMARY KEY, "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
 "membership_id" UUID NOT NULL REFERENCES "memberships"("id") ON DELETE CASCADE,
 "carpeta_id" UUID REFERENCES "carpetas_documento"("id") ON DELETE CASCADE,
 "documento_id" UUID REFERENCES "documentos"("id") ON DELETE CASCADE,
 CONSTRAINT "destacado_recurso_exacto" CHECK (("carpeta_id" IS NOT NULL) <> ("documento_id" IS NOT NULL))
);
CREATE UNIQUE INDEX "destacado_carpeta_unico" ON "destacados_documento" ("membership_id", "carpeta_id") WHERE "carpeta_id" IS NOT NULL;
CREATE UNIQUE INDEX "destacado_documento_unico" ON "destacados_documento" ("membership_id", "documento_id") WHERE "documento_id" IS NOT NULL;
CREATE INDEX "destacados_documento_tenant_id_membership_id_idx" ON "destacados_documento" ("tenant_id", "membership_id");
CREATE TABLE "accesos_documento" (
 "id" UUID PRIMARY KEY, "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
 "membership_id" UUID NOT NULL REFERENCES "memberships"("id") ON DELETE CASCADE,
 "carpeta_id" UUID REFERENCES "carpetas_documento"("id") ON DELETE CASCADE,
 "documento_id" UUID REFERENCES "documentos"("id") ON DELETE CASCADE,
 "ultimo_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
 CONSTRAINT "acceso_recurso_exacto" CHECK (("carpeta_id" IS NOT NULL) <> ("documento_id" IS NOT NULL))
);
CREATE UNIQUE INDEX "acceso_carpeta_unico" ON "accesos_documento" ("membership_id", "carpeta_id") WHERE "carpeta_id" IS NOT NULL;
CREATE UNIQUE INDEX "acceso_documento_unico" ON "accesos_documento" ("membership_id", "documento_id") WHERE "documento_id" IS NOT NULL;
CREATE INDEX "accesos_documento_tenant_id_membership_id_ultimo_at_idx" ON "accesos_documento" ("tenant_id", "membership_id", "ultimo_at");
ALTER TABLE public.compartidos_documento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compartidos_documento FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.compartidos_documento FROM anon, authenticated;
ALTER TABLE public.destacados_documento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destacados_documento FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.destacados_documento FROM anon, authenticated;
ALTER TABLE public.accesos_documento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accesos_documento FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.accesos_documento FROM anon, authenticated;
