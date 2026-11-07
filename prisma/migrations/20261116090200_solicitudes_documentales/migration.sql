-- CreateEnum
CREATE TYPE "EstadoSolicitudDocumental" AS ENUM ('borrador', 'publicada', 'cerrada', 'anulada');

-- CreateEnum
CREATE TYPE "EstadoEntregaDocumental" AS ENUM ('pendiente', 'entregado', 'en_revision', 'observado', 'aprobado');

-- CreateEnum
CREATE TYPE "ResultadoVersionDocumental" AS ENUM ('presentada', 'observada', 'aprobada');

-- CreateEnum
CREATE TYPE "TipoEventoSolicitud" AS ENUM ('creada', 'publicada', 'plazo_cambiado', 'destinatario_agregado', 'destinatario_retirado', 'version_presentada', 'revision_iniciada', 'observada', 'aprobada', 'revision_reabierta', 'cerrada', 'reabierta', 'anulada');

-- CreateTable
CREATE TABLE "solicitudes_documentales" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "instrucciones" TEXT,
    "anio_academico" INTEGER NOT NULL,
    "periodo_etiqueta" TEXT,
    "plantilla_documento_id" UUID,
    "fecha_limite" TIMESTAMPTZ,
    "con_hora" BOOLEAN NOT NULL DEFAULT false,
    "permite_tardias" BOOLEAN NOT NULL DEFAULT true,
    "estado" "EstadoSolicitudDocumental" NOT NULL DEFAULT 'borrador',
    "creada_por_id" UUID NOT NULL,
    "publicada_at" TIMESTAMPTZ,
    "cerrada_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "solicitudes_documentales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitud_destinatarios" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "solicitud_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "grupo" TEXT,
    "estado" "EstadoEntregaDocumental" NOT NULL DEFAULT 'pendiente',
    "version_actual" INTEGER NOT NULL DEFAULT 0,
    "entrega_tardia" BOOLEAN NOT NULL DEFAULT false,
    "primera_entrega_at" TIMESTAMPTZ,
    "ultima_entrega_at" TIMESTAMPTZ,
    "plazo_correccion" TIMESTAMPTZ,
    "revisado_por_id" UUID,
    "revisado_at" TIMESTAMPTZ,
    "aprobado_at" TIMESTAMPTZ,
    "retirado_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "solicitud_destinatarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitud_versiones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "destinatario_id" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "comentario" TEXT,
    "presentada_por_id" UUID NOT NULL,
    "presentada_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tardia" BOOLEAN NOT NULL DEFAULT false,
    "resultado" "ResultadoVersionDocumental" NOT NULL DEFAULT 'presentada',
    "observaciones" TEXT,
    "revisada_por_id" UUID,
    "revisada_at" TIMESTAMPTZ,

    CONSTRAINT "solicitud_versiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitud_version_archivos" (
    "tenant_id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "archivo_id" UUID NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "solicitud_version_archivos_pkey" PRIMARY KEY ("version_id","archivo_id")
);

-- CreateTable
CREATE TABLE "solicitud_eventos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "solicitud_id" UUID NOT NULL,
    "destinatario_id" UUID,
    "version_id" UUID,
    "tipo" "TipoEventoSolicitud" NOT NULL,
    "actor_id" UUID,
    "detalle" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solicitud_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "solicitudes_documentales_tenant_id_estado_idx" ON "solicitudes_documentales"("tenant_id", "estado");

-- CreateIndex
CREATE INDEX "solicitudes_documentales_tenant_id_anio_academico_idx" ON "solicitudes_documentales"("tenant_id", "anio_academico");

-- CreateIndex
CREATE INDEX "solicitud_destinatarios_tenant_id_membership_id_idx" ON "solicitud_destinatarios"("tenant_id", "membership_id");

-- CreateIndex
CREATE INDEX "solicitud_destinatarios_solicitud_id_estado_idx" ON "solicitud_destinatarios"("solicitud_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "solicitud_destinatarios_solicitud_id_membership_id_key" ON "solicitud_destinatarios"("solicitud_id", "membership_id");

-- CreateIndex
CREATE UNIQUE INDEX "solicitud_versiones_destinatario_id_numero_key" ON "solicitud_versiones"("destinatario_id", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "solicitud_version_archivos_archivo_id_key" ON "solicitud_version_archivos"("archivo_id");

-- CreateIndex
CREATE INDEX "solicitud_eventos_tenant_id_solicitud_id_created_at_idx" ON "solicitud_eventos"("tenant_id", "solicitud_id", "created_at");

-- AddForeignKey
ALTER TABLE "solicitudes_documentales" ADD CONSTRAINT "solicitudes_documentales_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_documentales" ADD CONSTRAINT "solicitudes_documentales_creada_por_id_fkey" FOREIGN KEY ("creada_por_id") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_documentales" ADD CONSTRAINT "solicitudes_documentales_plantilla_documento_id_fkey" FOREIGN KEY ("plantilla_documento_id") REFERENCES "documentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_destinatarios" ADD CONSTRAINT "solicitud_destinatarios_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_destinatarios" ADD CONSTRAINT "solicitud_destinatarios_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes_documentales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_destinatarios" ADD CONSTRAINT "solicitud_destinatarios_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_versiones" ADD CONSTRAINT "solicitud_versiones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_versiones" ADD CONSTRAINT "solicitud_versiones_destinatario_id_fkey" FOREIGN KEY ("destinatario_id") REFERENCES "solicitud_destinatarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_versiones" ADD CONSTRAINT "solicitud_versiones_presentada_por_id_fkey" FOREIGN KEY ("presentada_por_id") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_versiones" ADD CONSTRAINT "solicitud_versiones_revisada_por_id_fkey" FOREIGN KEY ("revisada_por_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_version_archivos" ADD CONSTRAINT "solicitud_version_archivos_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "solicitud_versiones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_version_archivos" ADD CONSTRAINT "solicitud_version_archivos_archivo_id_fkey" FOREIGN KEY ("archivo_id") REFERENCES "archivos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_eventos" ADD CONSTRAINT "solicitud_eventos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_eventos" ADD CONSTRAINT "solicitud_eventos_solicitud_id_fkey" FOREIGN KEY ("solicitud_id") REFERENCES "solicitudes_documentales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_eventos" ADD CONSTRAINT "solicitud_eventos_destinatario_id_fkey" FOREIGN KEY ("destinatario_id") REFERENCES "solicitud_destinatarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_eventos" ADD CONSTRAINT "solicitud_eventos_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "solicitud_versiones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_eventos" ADD CONSTRAINT "solicitud_eventos_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "solicitud_version_archivos" ADD CONSTRAINT "solicitud_version_archivos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE FUNCTION solicitud_version_inmutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF pg_trigger_depth() > 1 THEN RETURN OLD; END IF;
    RAISE EXCEPTION 'Una versión documental no se elimina';
  END IF;
  IF (OLD.id, OLD.tenant_id, OLD.destinatario_id, OLD.numero, OLD.comentario, OLD.presentada_por_id, OLD.presentada_at, OLD.tardia)
     IS DISTINCT FROM
     (NEW.id, NEW.tenant_id, NEW.destinatario_id, NEW.numero, NEW.comentario, NEW.presentada_por_id, NEW.presentada_at, NEW.tardia)
     OR OLD.resultado <> 'presentada' OR NEW.resultado = 'presentada'
     OR (NEW.resultado = 'observada' AND (NEW.observaciones IS NULL OR btrim(NEW.observaciones) = ''))
     OR (NEW.resultado = 'aprobada' AND NEW.observaciones IS NOT NULL)
     OR NEW.revisada_por_id IS NULL OR NEW.revisada_at IS NULL
  THEN RAISE EXCEPTION 'La versión documental es inmutable'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER solicitud_version_inmutable_trigger BEFORE UPDATE OR DELETE ON solicitud_versiones
FOR EACH ROW EXECUTE FUNCTION solicitud_version_inmutable();

CREATE FUNCTION solicitud_apendice_inmutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'El historial documental es inmutable';
END $$;
CREATE TRIGGER solicitud_archivos_inmutables BEFORE UPDATE OR DELETE ON solicitud_version_archivos
FOR EACH ROW EXECUTE FUNCTION solicitud_apendice_inmutable();
CREATE TRIGGER solicitud_eventos_inmutables BEFORE UPDATE OR DELETE ON solicitud_eventos
FOR EACH ROW EXECUTE FUNCTION solicitud_apendice_inmutable();

ALTER TABLE public.solicitudes_documentales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitudes_documentales FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.solicitudes_documentales FROM anon, authenticated;
ALTER TABLE public.solicitud_destinatarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitud_destinatarios FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.solicitud_destinatarios FROM anon, authenticated;
ALTER TABLE public.solicitud_versiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitud_versiones FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.solicitud_versiones FROM anon, authenticated;
ALTER TABLE public.solicitud_version_archivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitud_version_archivos FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.solicitud_version_archivos FROM anon, authenticated;
ALTER TABLE public.solicitud_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitud_eventos FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.solicitud_eventos FROM anon, authenticated;
