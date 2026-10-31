-- Envíos de avisos (specs/06): agrupa las filas de `avisos` que salieron de una misma acción (masivos vs individuales).
CREATE TABLE "envios_aviso" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "tipo" "TipoAviso" NOT NULL,
    "titulo" TEXT NOT NULL,
    "creado_por" UUID,
    "familias" INTEGER NOT NULL DEFAULT 0,
    "masivo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "envios_aviso_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "envios_aviso_tenant_id_masivo_created_at_idx" ON "envios_aviso"("tenant_id", "masivo", "created_at");
ALTER TABLE "envios_aviso" ADD CONSTRAINT "envios_aviso_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "envios_aviso" ADD CONSTRAINT "envios_aviso_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "avisos" ADD COLUMN "envio_id" UUID;
CREATE INDEX "avisos_envio_id_idx" ON "avisos"("envio_id");
ALTER TABLE "avisos" ADD CONSTRAINT "avisos_envio_id_fkey" FOREIGN KEY ("envio_id") REFERENCES "envios_aviso"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS cerrado para anon/authenticated como el resto de tablas (specs/01).
ALTER TABLE public.envios_aviso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.envios_aviso FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.envios_aviso FROM anon, authenticated;
