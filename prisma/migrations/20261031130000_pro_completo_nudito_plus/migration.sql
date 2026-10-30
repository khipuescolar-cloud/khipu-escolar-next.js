-- Khipu Pro completo y Nudito+ (decisión del 2026-10-30): CNEB (capacidades y desempeños), biblioteca de
-- documentos, reuniones, licencias y uso de Nudito+ por alumno. Specs 28–33.

BEGIN;

-- Tipos de aviso nuevos (no se usan dentro de esta transacción).
ALTER TYPE "TipoAviso" ADD VALUE IF NOT EXISTS 'reunion';
ALTER TYPE "TipoAviso" ADD VALUE IF NOT EXISTS 'documento';
ALTER TYPE "TipoAviso" ADD VALUE IF NOT EXISTS 'nudito';

-- CreateEnum
CREATE TYPE "AlcanceReunion" AS ENUM ('colegio', 'salon', 'individual');

-- CreateEnum
CREATE TYPE "EstadoReunion" AS ENUM ('programada', 'realizada', 'cancelada');

-- CreateEnum
CREATE TYPE "RespuestaReunion" AS ENUM ('pendiente', 'asistire', 'no_asistire');

-- CreateEnum
CREATE TYPE "ModoNudito" AS ENUM ('alumno', 'hijo');

-- CreateEnum
CREATE TYPE "EstadoLicenciaNudito" AS ENUM ('activa', 'vencida', 'cancelada');

-- CreateEnum
CREATE TYPE "OrigenLicenciaNudito" AS ENUM ('pago', 'cortesia', 'prueba');

-- CreateEnum
CREATE TYPE "MetodoPagoNudito" AS ENUM ('yape', 'transferencia', 'otro');

-- CreateEnum
CREATE TYPE "EstadoPagoNudito" AS ENUM ('pendiente', 'verificado', 'rechazado');

-- CreateEnum
CREATE TYPE "TipoAlertaNudito" AS ENUM ('seguridad', 'animo', 'dificultad', 'uso');

-- AlterTable
ALTER TABLE "archivos" ADD COLUMN     "documento_id" UUID;

-- AlterTable
ALTER TABLE "nudito_conversaciones" ADD COLUMN     "modo" "ModoNudito" NOT NULL DEFAULT 'alumno';

-- AlterTable
ALTER TABLE "nudito_mensajes" ADD COLUMN     "bloqueado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tokens_entrada" INTEGER,
ADD COLUMN     "tokens_salida" INTEGER;

-- CreateTable
CREATE TABLE "capacidades" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "competencia_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "capacidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "desempenos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "competencia_id" UUID NOT NULL,
    "capacidad_id" UUID,
    "nivel" "Nivel" NOT NULL,
    "grado" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "codigo" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "desempenos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluacion_desempenos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "evaluacion_id" UUID NOT NULL,
    "desempeno_id" UUID NOT NULL,

    CONSTRAINT "evaluacion_desempenos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carpetas_documento" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "parent_id" UUID,
    "nombre" TEXT NOT NULL,
    "visible_roles" "Rol"[] DEFAULT ARRAY[]::"Rol"[],
    "orden" INTEGER NOT NULL DEFAULT 0,
    "creado_por" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "carpetas_documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "carpeta_id" UUID,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "visible_roles" "Rol"[] DEFAULT ARRAY[]::"Rol"[],
    "salon_id" UUID,
    "publicado_por" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reuniones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "inicio" TIMESTAMPTZ NOT NULL,
    "fin" TIMESTAMPTZ,
    "lugar" TEXT,
    "enlace" TEXT,
    "alcance" "AlcanceReunion" NOT NULL,
    "salon_id" UUID,
    "convocada_por" UUID NOT NULL,
    "estado" "EstadoReunion" NOT NULL DEFAULT 'programada',
    "acta" TEXT,
    "acta_publicada_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "reuniones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reunion_invitados" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "reunion_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "alumno_id" UUID,
    "respuesta" "RespuestaReunion" NOT NULL DEFAULT 'pendiente',
    "respondida_at" TIMESTAMPTZ,
    "comentario" TEXT,
    "asistio" BOOLEAN,

    CONSTRAINT "reunion_invitados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licencias_nudito" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "alumno_id" UUID NOT NULL,
    "estado" "EstadoLicenciaNudito" NOT NULL DEFAULT 'activa',
    "origen" "OrigenLicenciaNudito" NOT NULL DEFAULT 'pago',
    "desde" DATE NOT NULL,
    "hasta" DATE NOT NULL,
    "registrada_por" UUID NOT NULL,
    "notas" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "licencias_nudito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos_nudito" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "alumno_id" UUID NOT NULL,
    "licencia_id" UUID,
    "apoderado_id" UUID,
    "monto" DECIMAL(10,2) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'PEN',
    "meses" INTEGER NOT NULL DEFAULT 1,
    "metodo" "MetodoPagoNudito" NOT NULL DEFAULT 'yape',
    "referencia" TEXT,
    "fecha_pago" DATE NOT NULL,
    "estado" "EstadoPagoNudito" NOT NULL DEFAULT 'pendiente',
    "registrado_por" UUID,
    "verificado_at" TIMESTAMPTZ,
    "notas" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_nudito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consentimientos_ia" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "apoderado_id" UUID NOT NULL,
    "alumno_id" UUID NOT NULL,
    "version_texto" TEXT NOT NULL,
    "aceptado_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "revocado_at" TIMESTAMPTZ,

    CONSTRAINT "consentimientos_ia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usos_nudito" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "alumno_id" UUID NOT NULL,
    "mes" TEXT NOT NULL,
    "mensajes" INTEGER NOT NULL DEFAULT 0,
    "tokens_entrada" INTEGER NOT NULL DEFAULT 0,
    "tokens_salida" INTEGER NOT NULL DEFAULT 0,
    "costo_estimado_usd" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "usos_nudito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas_nudito" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "alumno_id" UUID NOT NULL,
    "tipo" "TipoAlertaNudito" NOT NULL,
    "detalle" TEXT NOT NULL,
    "conversacion_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vista_at" TIMESTAMPTZ,

    CONSTRAINT "alertas_nudito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resumenes_nudito" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "alumno_id" UUID NOT NULL,
    "desde" DATE NOT NULL,
    "hasta" DATE NOT NULL,
    "texto" TEXT NOT NULL,
    "temas" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resumenes_nudito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sitios_permitidos" (
    "id" UUID NOT NULL,
    "dominio" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_por" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "sitios_permitidos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "capacidades_tenant_id_competencia_id_idx" ON "capacidades"("tenant_id", "competencia_id");

-- CreateIndex
CREATE INDEX "desempenos_tenant_id_competencia_id_nivel_grado_idx" ON "desempenos"("tenant_id", "competencia_id", "nivel", "grado");

-- CreateIndex
CREATE INDEX "desempenos_capacidad_id_idx" ON "desempenos"("capacidad_id");

-- CreateIndex
CREATE INDEX "evaluacion_desempenos_tenant_id_idx" ON "evaluacion_desempenos"("tenant_id");

-- CreateIndex
CREATE INDEX "evaluacion_desempenos_desempeno_id_idx" ON "evaluacion_desempenos"("desempeno_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluacion_desempenos_evaluacion_id_desempeno_id_key" ON "evaluacion_desempenos"("evaluacion_id", "desempeno_id");

-- CreateIndex
CREATE INDEX "carpetas_documento_tenant_id_parent_id_idx" ON "carpetas_documento"("tenant_id", "parent_id");

-- CreateIndex
CREATE INDEX "documentos_tenant_id_carpeta_id_idx" ON "documentos"("tenant_id", "carpeta_id");

-- CreateIndex
CREATE INDEX "documentos_tenant_id_salon_id_idx" ON "documentos"("tenant_id", "salon_id");

-- CreateIndex
CREATE INDEX "reuniones_tenant_id_inicio_idx" ON "reuniones"("tenant_id", "inicio");

-- CreateIndex
CREATE INDEX "reuniones_tenant_id_salon_id_idx" ON "reuniones"("tenant_id", "salon_id");

-- CreateIndex
CREATE INDEX "reunion_invitados_tenant_id_membership_id_idx" ON "reunion_invitados"("tenant_id", "membership_id");

-- CreateIndex
CREATE UNIQUE INDEX "reunion_invitados_reunion_id_membership_id_alumno_id_key" ON "reunion_invitados"("reunion_id", "membership_id", "alumno_id") NULLS NOT DISTINCT;

-- CreateIndex
CREATE INDEX "licencias_nudito_alumno_id_estado_hasta_idx" ON "licencias_nudito"("alumno_id", "estado", "hasta");

-- CreateIndex
CREATE INDEX "licencias_nudito_tenant_id_estado_idx" ON "licencias_nudito"("tenant_id", "estado");

-- CreateIndex
CREATE INDEX "licencias_nudito_estado_hasta_idx" ON "licencias_nudito"("estado", "hasta");

-- CreateIndex
CREATE INDEX "pagos_nudito_tenant_id_alumno_id_idx" ON "pagos_nudito"("tenant_id", "alumno_id");

-- CreateIndex
CREATE INDEX "pagos_nudito_estado_fecha_pago_idx" ON "pagos_nudito"("estado", "fecha_pago");

-- CreateIndex
CREATE INDEX "consentimientos_ia_tenant_id_alumno_id_idx" ON "consentimientos_ia"("tenant_id", "alumno_id");

-- CreateIndex
CREATE INDEX "consentimientos_ia_apoderado_id_idx" ON "consentimientos_ia"("apoderado_id");

-- CreateIndex
CREATE INDEX "usos_nudito_tenant_id_mes_idx" ON "usos_nudito"("tenant_id", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "usos_nudito_alumno_id_mes_key" ON "usos_nudito"("alumno_id", "mes");

-- CreateIndex
CREATE INDEX "alertas_nudito_tenant_id_alumno_id_created_at_idx" ON "alertas_nudito"("tenant_id", "alumno_id", "created_at");

-- CreateIndex
CREATE INDEX "resumenes_nudito_tenant_id_alumno_id_hasta_idx" ON "resumenes_nudito"("tenant_id", "alumno_id", "hasta");

-- CreateIndex
CREATE UNIQUE INDEX "sitios_permitidos_dominio_key" ON "sitios_permitidos"("dominio");

-- CreateIndex
CREATE INDEX "archivos_documento_id_idx" ON "archivos"("documento_id");

-- CreateIndex
CREATE INDEX "nudito_conversaciones_tenant_id_alumno_id_created_at_idx" ON "nudito_conversaciones"("tenant_id", "alumno_id", "created_at");

-- AddForeignKey
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacidades" ADD CONSTRAINT "capacidades_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacidades" ADD CONSTRAINT "capacidades_competencia_id_fkey" FOREIGN KEY ("competencia_id") REFERENCES "competencias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desempenos" ADD CONSTRAINT "desempenos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desempenos" ADD CONSTRAINT "desempenos_competencia_id_fkey" FOREIGN KEY ("competencia_id") REFERENCES "competencias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desempenos" ADD CONSTRAINT "desempenos_capacidad_id_fkey" FOREIGN KEY ("capacidad_id") REFERENCES "capacidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion_desempenos" ADD CONSTRAINT "evaluacion_desempenos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion_desempenos" ADD CONSTRAINT "evaluacion_desempenos_evaluacion_id_fkey" FOREIGN KEY ("evaluacion_id") REFERENCES "evaluaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluacion_desempenos" ADD CONSTRAINT "evaluacion_desempenos_desempeno_id_fkey" FOREIGN KEY ("desempeno_id") REFERENCES "desempenos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carpetas_documento" ADD CONSTRAINT "carpetas_documento_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carpetas_documento" ADD CONSTRAINT "carpetas_documento_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "carpetas_documento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carpetas_documento" ADD CONSTRAINT "carpetas_documento_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "memberships"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_carpeta_id_fkey" FOREIGN KEY ("carpeta_id") REFERENCES "carpetas_documento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_salon_id_fkey" FOREIGN KEY ("salon_id") REFERENCES "salones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_publicado_por_fkey" FOREIGN KEY ("publicado_por") REFERENCES "memberships"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reuniones" ADD CONSTRAINT "reuniones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reuniones" ADD CONSTRAINT "reuniones_salon_id_fkey" FOREIGN KEY ("salon_id") REFERENCES "salones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reuniones" ADD CONSTRAINT "reuniones_convocada_por_fkey" FOREIGN KEY ("convocada_por") REFERENCES "memberships"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reunion_invitados" ADD CONSTRAINT "reunion_invitados_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reunion_invitados" ADD CONSTRAINT "reunion_invitados_reunion_id_fkey" FOREIGN KEY ("reunion_id") REFERENCES "reuniones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reunion_invitados" ADD CONSTRAINT "reunion_invitados_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reunion_invitados" ADD CONSTRAINT "reunion_invitados_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licencias_nudito" ADD CONSTRAINT "licencias_nudito_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licencias_nudito" ADD CONSTRAINT "licencias_nudito_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_nudito" ADD CONSTRAINT "pagos_nudito_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_nudito" ADD CONSTRAINT "pagos_nudito_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_nudito" ADD CONSTRAINT "pagos_nudito_licencia_id_fkey" FOREIGN KEY ("licencia_id") REFERENCES "licencias_nudito"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_nudito" ADD CONSTRAINT "pagos_nudito_apoderado_id_fkey" FOREIGN KEY ("apoderado_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consentimientos_ia" ADD CONSTRAINT "consentimientos_ia_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consentimientos_ia" ADD CONSTRAINT "consentimientos_ia_apoderado_id_fkey" FOREIGN KEY ("apoderado_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consentimientos_ia" ADD CONSTRAINT "consentimientos_ia_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usos_nudito" ADD CONSTRAINT "usos_nudito_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usos_nudito" ADD CONSTRAINT "usos_nudito_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_nudito" ADD CONSTRAINT "alertas_nudito_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_nudito" ADD CONSTRAINT "alertas_nudito_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_nudito" ADD CONSTRAINT "alertas_nudito_conversacion_id_fkey" FOREIGN KEY ("conversacion_id") REFERENCES "nudito_conversaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resumenes_nudito" ADD CONSTRAINT "resumenes_nudito_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resumenes_nudito" ADD CONSTRAINT "resumenes_nudito_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Reglas que Prisma no expresa ───
-- Un apoderado sin alumno (alumno_id NULL) tampoco se repite en la misma reunión: índice único con NULLS NOT DISTINCT (arriba).
ALTER TABLE "usos_nudito" ADD CONSTRAINT "usos_nudito_mes_formato" CHECK ("mes" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
ALTER TABLE "licencias_nudito" ADD CONSTRAINT "licencias_nudito_rango" CHECK ("hasta" >= "desde");
ALTER TABLE "resumenes_nudito" ADD CONSTRAINT "resumenes_nudito_rango" CHECK ("hasta" >= "desde");
ALTER TABLE "reuniones" ADD CONSTRAINT "reuniones_rango" CHECK ("fin" IS NULL OR "fin" >= "inicio");
ALTER TABLE "pagos_nudito" ADD CONSTRAINT "pagos_nudito_monto_positivo" CHECK ("monto" > 0 AND "meses" > 0);
ALTER TABLE "desempenos" ADD CONSTRAINT "desempenos_grado_valido" CHECK ("grado" BETWEEN 1 AND 6);
ALTER TABLE "carpetas_documento" ADD CONSTRAINT "carpetas_documento_no_ciclo_directo" CHECK ("parent_id" IS NULL OR "parent_id" <> "id");

-- ─── Módulos nuevos de Khipu Pro (claves de FEATURES que agregará el código: specs/31, 32, 33) ───
-- Las claves desconocidas para el código se ignoran (esModulo), así que insertarlas antes es inocuo.
INSERT INTO "plan_modulos" ("plan", "modulo")
SELECT 'pro', m FROM unnest(ARRAY['documentos', 'reuniones', 'tablero']) AS m
WHERE EXISTS (SELECT 1 FROM "planes_catalogo" WHERE "plan" = 'pro')
ON CONFLICT DO NOTHING;

-- ─── RLS cerrado para anon/authenticated también en las tablas nuevas (idempotente) ───
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t.tablename);
  END LOOP;
END $$;

COMMIT;
