-- Control de ingreso automático (specs/05): «aún no llega» a la hora de tardanza y falta del día a la hora límite.
ALTER TYPE "OrigenAsistencia" ADD VALUE 'automatico';

ALTER TABLE "tenants"
  ADD COLUMN "control_ingreso_automatico" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "hora_limite_falta" TEXT NOT NULL DEFAULT '09:00';

-- La falta automática no la registra ninguna persona.
ALTER TABLE "asistencias" ALTER COLUMN "registrado_por" DROP NOT NULL;

CREATE TABLE "control_ingreso_dia" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "aviso_no_llega_at" TIMESTAMPTZ,
    "faltas_at" TIMESTAMPTZ,
    "avisados_no_llega" INTEGER NOT NULL DEFAULT 0,
    "faltas" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "control_ingreso_dia_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "control_ingreso_dia_tenant_id_fecha_key" ON "control_ingreso_dia"("tenant_id", "fecha");
ALTER TABLE "control_ingreso_dia" ADD CONSTRAINT "control_ingreso_dia_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS cerrado para anon/authenticated como el resto de tablas (specs/01).
ALTER TABLE public.control_ingreso_dia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.control_ingreso_dia FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.control_ingreso_dia FROM anon, authenticated;
