-- Notificaciones académicas por eventos (specs/38): outbox `eventos_academicos`, bandeja `notificaciones`, push
-- vinculado a la notificación, preferencia de push académico y observación privada del profesor. Aditiva.
-- CreateEnum
CREATE TYPE "TipoEventoAcademico" AS ENUM ('resultados_publicados', 'nota_corregida');

-- CreateEnum
CREATE TYPE "EstadoEventoAcademico" AS ENUM ('pendiente', 'procesando', 'procesado', 'error');

-- AlterTable
ALTER TABLE "avisos" ADD COLUMN     "notificacion_id" UUID;

-- AlterTable
ALTER TABLE "notas" ADD COLUMN     "comentario_privado" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "preferencias_aviso" ADD COLUMN     "push_academico" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "eventos_academicos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tipo" "TipoEventoAcademico" NOT NULL,
    "grupo_id" UUID NOT NULL,
    "alumno_id" UUID,
    "creado_por" UUID,
    "estado" "EstadoEventoAcademico" NOT NULL DEFAULT 'pendiente',
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "reservado_at" TIMESTAMPTZ,
    "procesado_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alumnos" INTEGER NOT NULL DEFAULT 0,
    "notificaciones" INTEGER NOT NULL DEFAULT 0,
    "push" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "eventos_academicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "alumno_id" UUID NOT NULL,
    "evento_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "leida_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "eventos_academicos_estado_created_at_idx" ON "eventos_academicos"("estado", "created_at");

-- CreateIndex
CREATE INDEX "eventos_academicos_tenant_id_created_at_idx" ON "eventos_academicos"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "notificaciones_membership_id_leida_at_created_at_idx" ON "notificaciones"("membership_id", "leida_at", "created_at");

-- CreateIndex
CREATE INDEX "notificaciones_tenant_id_idx" ON "notificaciones"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "notificaciones_evento_id_membership_id_alumno_id_key" ON "notificaciones"("evento_id", "membership_id", "alumno_id");

-- CreateIndex
CREATE UNIQUE INDEX "avisos_notificacion_id_destinatario_key" ON "avisos"("notificacion_id", "destinatario");

-- AddForeignKey
ALTER TABLE "avisos" ADD CONSTRAINT "avisos_notificacion_id_fkey" FOREIGN KEY ("notificacion_id") REFERENCES "notificaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_academicos" ADD CONSTRAINT "eventos_academicos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "eventos_academicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Una publicación = un evento: si dos procesos publican a la vez, el segundo no crea otro (outbox idempotente).
CREATE UNIQUE INDEX "eventos_academicos_publicacion_unica" ON "eventos_academicos"("tenant_id", "grupo_id") WHERE tipo = 'resultados_publicados';

ALTER TABLE public.eventos_academicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_academicos FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.eventos_academicos FROM anon, authenticated;
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.notificaciones FROM anon, authenticated;
