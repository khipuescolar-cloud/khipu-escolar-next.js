-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('nueva', 'contactada', 'demo_agendada', 'convertida', 'descartada');

-- CreateTable
CREATE TABLE "solicitudes_demo" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "cargo" TEXT,
    "colegio" TEXT NOT NULL,
    "ciudad" TEXT,
    "correo" TEXT NOT NULL,
    "telefono" TEXT,
    "alumnos" INTEGER,
    "mensaje" TEXT,
    "plan_interes" "Plan",
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'nueva',
    "notas" TEXT,
    "ip_hash" TEXT NOT NULL,
    "tenant_id" UUID,
    "atendida_por" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "solicitudes_demo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "solicitudes_demo_estado_created_at_idx" ON "solicitudes_demo"("estado", "created_at");

-- CreateIndex
CREATE INDEX "solicitudes_demo_ip_hash_created_at_idx" ON "solicitudes_demo"("ip_hash", "created_at");


-- RLS cerrado para anon/authenticated también en la tabla nueva (idempotente).
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t.tablename);
  END LOOP;
END $$;
