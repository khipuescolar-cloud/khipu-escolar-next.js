-- Reuniones con disponibilidad del personal (specs/40). Aditiva: no borra datos.
-- - reuniones: tipo, motivo, modalidad, organizador, reprogramación, cancelación con motivo, observaciones; fin obligatorio.
-- - reunion_invitados: rol, invitado_at, propuesta de otra hora.
-- - reunion_cambios (historial), reunion_acuerdos (acta), reservas_agenda (sin solapes por persona), bloqueos_agenda,
--   horarios_atencion; tenants: horas laborales y ajuste «las familias pueden solicitar reuniones»; archivos.reunion_id.
-- - La restricción de exclusión `reservas_agenda_sin_solape` no se declara en schema.prisma (como otros índices parciales).

-- btree_gist: en Supabase las extensiones viven en el esquema `extensions`; en una BD sin ese esquema, en el por defecto.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'extensions') THEN
    CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;
  ELSE
    CREATE EXTENSION IF NOT EXISTS btree_gist;
  END IF;
END $$;
-- CreateEnum
CREATE TYPE "TipoReunion" AS ENUM ('docente_apoderado', 'tutoria', 'coordinacion', 'direccion', 'administrativa', 'institucional');

-- CreateEnum
CREATE TYPE "ModalidadReunion" AS ENUM ('presencial', 'virtual', 'mixta');

-- CreateEnum
CREATE TYPE "RolInvitadoReunion" AS ENUM ('organizador', 'requerido', 'opcional');

-- CreateEnum
CREATE TYPE "TipoCambioReunion" AS ENUM ('creada', 'reprogramada', 'cancelada', 'participantes', 'respuesta', 'realizada', 'acta');

-- CreateEnum
CREATE TYPE "EstadoAcuerdo" AS ENUM ('pendiente', 'cumplido');

-- CreateEnum
CREATE TYPE "TipoBloqueoAgenda" AS ENUM ('bloqueo', 'ausencia');

-- AlterEnum
ALTER TYPE "EstadoReunion" ADD VALUE 'por_confirmar';

-- AlterEnum
ALTER TYPE "RespuestaReunion" ADD VALUE 'propone_otra';

-- AlterEnum
ALTER TYPE "TipoNotificacion" ADD VALUE 'reunion';

-- AlterTable
ALTER TABLE "archivos" ADD COLUMN     "reunion_id" UUID;

-- AlterTable
ALTER TABLE "reunion_invitados" ADD COLUMN     "invitado_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "propuesta_fin" TIMESTAMPTZ,
ADD COLUMN     "propuesta_inicio" TIMESTAMPTZ,
ADD COLUMN     "rol" "RolInvitadoReunion" NOT NULL DEFAULT 'requerido';

-- AlterTable
ALTER TABLE "reuniones" ADD COLUMN     "cancelada_at" TIMESTAMPTZ,
ADD COLUMN     "cancelada_por" UUID,
ADD COLUMN     "modalidad" "ModalidadReunion" NOT NULL DEFAULT 'presencial',
ADD COLUMN     "motivo" TEXT,
ADD COLUMN     "motivo_cancelacion" TEXT,
ADD COLUMN     "observaciones" TEXT,
ADD COLUMN     "organizador_id" UUID,
ADD COLUMN     "reprogramada_at" TIMESTAMPTZ,
ADD COLUMN     "tipo" "TipoReunion" NOT NULL DEFAULT 'institucional';

-- Backfill (sin borrar datos): organizador = quien convocó; fin = inicio + 60 min donde faltaba; tipo según el alcance.
UPDATE "reuniones" SET "organizador_id" = "convocada_por" WHERE "organizador_id" IS NULL;
UPDATE "reuniones" SET "fin" = "inicio" + interval '60 minutes' WHERE "fin" IS NULL;
UPDATE "reuniones" SET "tipo" = (CASE "alcance" WHEN 'colegio' THEN 'institucional' WHEN 'salon' THEN 'tutoria' ELSE 'docente_apoderado' END)::"TipoReunion";
UPDATE "reuniones" SET "cancelada_at" = "updated_at" WHERE "estado" = 'cancelada' AND "cancelada_at" IS NULL;
ALTER TABLE "reuniones" ALTER COLUMN "organizador_id" SET NOT NULL;
ALTER TABLE "reuniones" ALTER COLUMN "fin" SET NOT NULL;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "familias_solicitan_reuniones" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "hora_fin_laboral" TEXT NOT NULL DEFAULT '16:30',
ADD COLUMN     "hora_inicio_laboral" TEXT NOT NULL DEFAULT '07:30';

-- CreateTable
CREATE TABLE "reunion_cambios" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "reunion_id" UUID NOT NULL,
    "tipo" "TipoCambioReunion" NOT NULL,
    "antes" JSONB,
    "despues" JSONB,
    "actor_id" UUID,
    "motivo" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reunion_cambios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reunion_acuerdos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "reunion_id" UUID NOT NULL,
    "texto" TEXT NOT NULL,
    "responsable_id" UUID,
    "fecha_compromiso" DATE,
    "estado" "EstadoAcuerdo" NOT NULL DEFAULT 'pendiente',
    "cumplido_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reunion_acuerdos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservas_agenda" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "reunion_id" UUID,
    "inicio" TIMESTAMPTZ NOT NULL,
    "fin" TIMESTAMPTZ NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservas_agenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bloqueos_agenda" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "inicio" TIMESTAMPTZ NOT NULL,
    "fin" TIMESTAMPTZ NOT NULL,
    "tipo" "TipoBloqueoAgenda" NOT NULL DEFAULT 'bloqueo',
    "motivo" TEXT,
    "registrado_por" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bloqueos_agenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "horarios_atencion" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "dia" INTEGER NOT NULL,
    "hora_desde" TEXT NOT NULL,
    "hora_hasta" TEXT NOT NULL,

    CONSTRAINT "horarios_atencion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reunion_cambios_tenant_id_reunion_id_idx" ON "reunion_cambios"("tenant_id", "reunion_id");

-- CreateIndex
CREATE INDEX "reunion_acuerdos_tenant_id_reunion_id_idx" ON "reunion_acuerdos"("tenant_id", "reunion_id");

-- CreateIndex
CREATE INDEX "reunion_acuerdos_tenant_id_responsable_id_estado_idx" ON "reunion_acuerdos"("tenant_id", "responsable_id", "estado");

-- CreateIndex
CREATE INDEX "reservas_agenda_tenant_id_membership_id_inicio_idx" ON "reservas_agenda"("tenant_id", "membership_id", "inicio");

-- CreateIndex
CREATE INDEX "reservas_agenda_reunion_id_idx" ON "reservas_agenda"("reunion_id");

-- CreateIndex
CREATE INDEX "bloqueos_agenda_tenant_id_membership_id_inicio_idx" ON "bloqueos_agenda"("tenant_id", "membership_id", "inicio");

-- CreateIndex
CREATE INDEX "horarios_atencion_tenant_id_membership_id_idx" ON "horarios_atencion"("tenant_id", "membership_id");

-- CreateIndex
CREATE INDEX "archivos_reunion_id_idx" ON "archivos"("reunion_id");

-- AddForeignKey
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_reunion_id_fkey" FOREIGN KEY ("reunion_id") REFERENCES "reuniones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reuniones" ADD CONSTRAINT "reuniones_organizador_id_fkey" FOREIGN KEY ("organizador_id") REFERENCES "memberships"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reunion_cambios" ADD CONSTRAINT "reunion_cambios_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reunion_cambios" ADD CONSTRAINT "reunion_cambios_reunion_id_fkey" FOREIGN KEY ("reunion_id") REFERENCES "reuniones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reunion_cambios" ADD CONSTRAINT "reunion_cambios_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reunion_acuerdos" ADD CONSTRAINT "reunion_acuerdos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reunion_acuerdos" ADD CONSTRAINT "reunion_acuerdos_reunion_id_fkey" FOREIGN KEY ("reunion_id") REFERENCES "reuniones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reunion_acuerdos" ADD CONSTRAINT "reunion_acuerdos_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas_agenda" ADD CONSTRAINT "reservas_agenda_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas_agenda" ADD CONSTRAINT "reservas_agenda_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas_agenda" ADD CONSTRAINT "reservas_agenda_reunion_id_fkey" FOREIGN KEY ("reunion_id") REFERENCES "reuniones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloqueos_agenda" ADD CONSTRAINT "bloqueos_agenda_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloqueos_agenda" ADD CONSTRAINT "bloqueos_agenda_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloqueos_agenda" ADD CONSTRAINT "bloqueos_agenda_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "memberships"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horarios_atencion" ADD CONSTRAINT "horarios_atencion_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horarios_atencion" ADD CONSTRAINT "horarios_atencion_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Integridad de horarios.
ALTER TABLE "reservas_agenda" ADD CONSTRAINT "reservas_agenda_fin_despues" CHECK ("fin" > "inicio");
ALTER TABLE "bloqueos_agenda" ADD CONSTRAINT "bloqueos_agenda_fin_despues" CHECK ("fin" > "inicio");
ALTER TABLE "horarios_atencion" ADD CONSTRAINT "horarios_atencion_dia" CHECK ("dia" BETWEEN 1 AND 7);
ALTER TABLE "horarios_atencion" ADD CONSTRAINT "horarios_atencion_horas" CHECK ("hora_desde" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "hora_hasta" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "hora_desde" < "hora_hasta");

-- Una persona no puede tener dos reservas activas que se crucen ([inicio, fin): tocarse en el borde no es cruce).
ALTER TABLE "reservas_agenda" ADD CONSTRAINT "reservas_agenda_sin_solape"
  EXCLUDE USING gist ("tenant_id" WITH =, "membership_id" WITH =, tstzrange("inicio", "fin", '[)') WITH &&) WHERE ("activa");

-- RLS cerrado para anon/authenticated (Prisma usa el rol del servidor).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['reunion_cambios', 'reunion_acuerdos', 'reservas_agenda', 'bloqueos_agenda', 'horarios_atencion'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    END IF;
  END LOOP;
END $$;
