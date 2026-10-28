-- CreateEnum
CREATE TYPE "CategoriaTicket" AS ENUM ('duda', 'problema', 'sugerencia', 'facturacion', 'cuentas_accesos', 'otro');

-- CreateEnum
CREATE TYPE "PrioridadTicket" AS ENUM ('baja', 'normal', 'alta', 'urgente');

-- CreateEnum
CREATE TYPE "EstadoTicket" AS ENUM ('abierto', 'en_progreso', 'esperando_colegio', 'resuelto', 'cerrado');

-- CreateEnum
CREATE TYPE "AutorSoporte" AS ENUM ('colegio', 'khipu', 'sistema');

-- AlterEnum
ALTER TYPE "TipoAviso" ADD VALUE 'soporte';

-- AlterTable
ALTER TABLE "archivos" ADD COLUMN     "mensaje_soporte_id" UUID;

-- CreateTable
CREATE TABLE "tickets_soporte" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "asunto" TEXT NOT NULL,
    "categoria" "CategoriaTicket" NOT NULL DEFAULT 'duda',
    "prioridad" "PrioridadTicket" NOT NULL DEFAULT 'normal',
    "estado" "EstadoTicket" NOT NULL DEFAULT 'abierto',
    "creado_por" UUID NOT NULL,
    "asignado_a" UUID,
    "ultimo_mensaje_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "primera_respuesta_at" TIMESTAMPTZ,
    "resuelto_at" TIMESTAMPTZ,
    "leido_colegio_hasta" TIMESTAMPTZ,
    "leido_khipu_hasta" TIMESTAMPTZ,
    "valoracion" INTEGER,
    "comentario_valoracion" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tickets_soporte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensajes_soporte" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "autor" "AutorSoporte" NOT NULL,
    "autor_id" UUID,
    "cuerpo" TEXT NOT NULL,
    "interno" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensajes_soporte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tickets_soporte_tenant_id_ultimo_mensaje_at_idx" ON "tickets_soporte"("tenant_id", "ultimo_mensaje_at");

-- CreateIndex
CREATE INDEX "tickets_soporte_estado_ultimo_mensaje_at_idx" ON "tickets_soporte"("estado", "ultimo_mensaje_at");

-- CreateIndex
CREATE INDEX "tickets_soporte_asignado_a_idx" ON "tickets_soporte"("asignado_a");

-- CreateIndex
CREATE INDEX "mensajes_soporte_ticket_id_created_at_idx" ON "mensajes_soporte"("ticket_id", "created_at");

-- AddForeignKey
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_mensaje_soporte_id_fkey" FOREIGN KEY ("mensaje_soporte_id") REFERENCES "mensajes_soporte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets_soporte" ADD CONSTRAINT "tickets_soporte_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets_soporte" ADD CONSTRAINT "tickets_soporte_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "memberships"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes_soporte" ADD CONSTRAINT "mensajes_soporte_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes_soporte" ADD CONSTRAINT "mensajes_soporte_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets_soporte"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- El módulo «soporte» (chat con el equipo Khipu) va en todos los planes.
INSERT INTO "plan_modulos" ("plan", "modulo") VALUES ('basico', 'soporte'), ('fase2', 'soporte'), ('promax', 'soporte')
ON CONFLICT DO NOTHING;
-- Por defecto solo la dirección; el personal administrativo se habilita en «Roles y permisos».
INSERT INTO "rol_modulos" ("rol", "modulo", "habilitado", "updated_at") VALUES ('administrativo', 'soporte', false, now())
ON CONFLICT DO NOTHING;

-- RLS cerrado para anon/authenticated también en las tablas nuevas (idempotente).
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t.tablename);
  END LOOP;
END $$;
