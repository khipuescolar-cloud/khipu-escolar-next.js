-- NSP, justificaciones con plazo calendario, recuperación, incidencias, libretas emitidas y resumen académico (specs/37).
-- Aditiva: solo agrega tipos, columnas y tablas; renombra la columna del plazo (de días hábiles a días calendario) sin
-- perder su valor, y vuelve opcionales dos columnas (nota o cambio hechos por Khipu, sin persona).
-- CreateEnum
CREATE TYPE "MarcaNota" AS ENUM ('nsp', 'no_entrego');

-- CreateEnum
CREATE TYPE "EstadoRecuperacion" AS ENUM ('autorizada', 'denegada');

-- CreateEnum
CREATE TYPE "TipoCambioNota" AS ENUM ('registro', 'correccion_digitacion', 'recuperacion', 'cambio_asistencia', 'consecuencia_vencimiento', 'otra', 'decision_recuperacion');

-- CreateEnum
CREATE TYPE "TipoIncidencia" AS ENUM ('accidente', 'salud', 'otro');

-- CreateEnum
CREATE TYPE "EstadoRectificacion" AS ENUM ('pendiente', 'aprobada', 'rechazada');

-- AlterEnum
ALTER TYPE "OrigenAsistencia" ADD VALUE 'incidencia';

-- AlterTable
ALTER TABLE "asistencias" ADD COLUMN     "incidencia_id" UUID;

-- AlterTable
ALTER TABLE "historial_notas" ADD COLUMN     "campo" TEXT NOT NULL DEFAULT 'valor',
ADD COLUMN     "justificacion_id" UUID,
ADD COLUMN     "motivo" TEXT,
ADD COLUMN     "publicada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tipo" "TipoCambioNota" NOT NULL DEFAULT 'registro',
ALTER COLUMN "cambiado_por" DROP NOT NULL;

-- AlterTable
ALTER TABLE "notas" ADD COLUMN     "fecha_recuperacion" DATE,
ADD COLUMN     "justificacion_id" UUID,
ADD COLUMN     "marca" "MarcaNota",
ADD COLUMN     "recuperacion" "EstadoRecuperacion",
ADD COLUMN     "recuperacion_at" TIMESTAMPTZ,
ADD COLUMN     "recuperacion_por" UUID,
ADD COLUMN     "vencida_at" TIMESTAMPTZ,
ALTER COLUMN "registrado_por" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tenants" RENAME COLUMN "plazo_justificacion_dias_habiles" TO "plazo_justificacion_dias";
ALTER TABLE "tenants" ADD COLUMN     "consecuencia_vencimiento_literal" "CalificacionLiteral",
ADD COLUMN     "consecuencia_vencimiento_numerica" DECIMAL(4,2),
ADD COLUMN     "hora_resumen_academico" TEXT NOT NULL DEFAULT '18:00';

-- CreateTable
CREATE TABLE "incidencias" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "alumno_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "hora" TEXT NOT NULL,
    "tipo" "TipoIncidencia" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "retiro" BOOLEAN NOT NULL DEFAULT false,
    "hora_retiro" TEXT,
    "registrado_por" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incidencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidencia_cursos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "incidencia_id" UUID NOT NULL,
    "curso_id" UUID NOT NULL,

    CONSTRAINT "incidencia_cursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "libretas_emitidas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "alumno_id" UUID NOT NULL,
    "periodo_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "datos" JSONB NOT NULL,
    "emitida_por" UUID NOT NULL,
    "emitida_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rectificacion_id" UUID,

    CONSTRAINT "libretas_emitidas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rectificaciones_libreta" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "alumno_id" UUID NOT NULL,
    "periodo_id" UUID NOT NULL,
    "competencia_id" UUID NOT NULL,
    "valor_anterior" TEXT,
    "valor_literal" "CalificacionLiteral",
    "valor_numerico" DECIMAL(4,2),
    "conclusion" TEXT,
    "motivo" TEXT NOT NULL,
    "evidencia" TEXT,
    "estado" "EstadoRectificacion" NOT NULL DEFAULT 'pendiente',
    "solicitada_por" UUID NOT NULL,
    "solicitada_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resuelta_por" UUID,
    "resuelta_at" TIMESTAMPTZ,
    "comentario_resolucion" TEXT,

    CONSTRAINT "rectificaciones_libreta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resumenes_academicos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "desde" TIMESTAMPTZ NOT NULL,
    "hasta" TIMESTAMPTZ NOT NULL,
    "alumnos" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resumenes_academicos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "incidencias_tenant_id_fecha_idx" ON "incidencias"("tenant_id", "fecha");

-- CreateIndex
CREATE INDEX "incidencias_alumno_id_fecha_idx" ON "incidencias"("alumno_id", "fecha");

-- CreateIndex
CREATE INDEX "incidencia_cursos_tenant_id_idx" ON "incidencia_cursos"("tenant_id");

-- CreateIndex
CREATE INDEX "incidencia_cursos_curso_id_idx" ON "incidencia_cursos"("curso_id");

-- CreateIndex
CREATE UNIQUE INDEX "incidencia_cursos_incidencia_id_curso_id_key" ON "incidencia_cursos"("incidencia_id", "curso_id");

-- CreateIndex
CREATE UNIQUE INDEX "libretas_emitidas_rectificacion_id_key" ON "libretas_emitidas"("rectificacion_id");

-- CreateIndex
CREATE INDEX "libretas_emitidas_tenant_id_periodo_id_idx" ON "libretas_emitidas"("tenant_id", "periodo_id");

-- CreateIndex
CREATE UNIQUE INDEX "libretas_emitidas_alumno_id_periodo_id_version_key" ON "libretas_emitidas"("alumno_id", "periodo_id", "version");

-- CreateIndex
CREATE INDEX "rectificaciones_libreta_tenant_id_estado_idx" ON "rectificaciones_libreta"("tenant_id", "estado");

-- CreateIndex
CREATE INDEX "rectificaciones_libreta_alumno_id_periodo_id_idx" ON "rectificaciones_libreta"("alumno_id", "periodo_id");

-- CreateIndex
CREATE UNIQUE INDEX "resumenes_academicos_tenant_id_fecha_key" ON "resumenes_academicos"("tenant_id", "fecha");

-- CreateIndex
CREATE INDEX "notas_tenant_id_marca_idx" ON "notas"("tenant_id", "marca");

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_incidencia_id_fkey" FOREIGN KEY ("incidencia_id") REFERENCES "incidencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_justificacion_id_fkey" FOREIGN KEY ("justificacion_id") REFERENCES "justificaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_recuperacion_por_fkey" FOREIGN KEY ("recuperacion_por") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_notas" ADD CONSTRAINT "historial_notas_justificacion_id_fkey" FOREIGN KEY ("justificacion_id") REFERENCES "justificaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencias" ADD CONSTRAINT "incidencias_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencias" ADD CONSTRAINT "incidencias_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencias" ADD CONSTRAINT "incidencias_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "memberships"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencia_cursos" ADD CONSTRAINT "incidencia_cursos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencia_cursos" ADD CONSTRAINT "incidencia_cursos_incidencia_id_fkey" FOREIGN KEY ("incidencia_id") REFERENCES "incidencias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencia_cursos" ADD CONSTRAINT "incidencia_cursos_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "libretas_emitidas" ADD CONSTRAINT "libretas_emitidas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "libretas_emitidas" ADD CONSTRAINT "libretas_emitidas_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "libretas_emitidas" ADD CONSTRAINT "libretas_emitidas_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "periodos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "libretas_emitidas" ADD CONSTRAINT "libretas_emitidas_emitida_por_fkey" FOREIGN KEY ("emitida_por") REFERENCES "memberships"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "libretas_emitidas" ADD CONSTRAINT "libretas_emitidas_rectificacion_id_fkey" FOREIGN KEY ("rectificacion_id") REFERENCES "rectificaciones_libreta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rectificaciones_libreta" ADD CONSTRAINT "rectificaciones_libreta_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rectificaciones_libreta" ADD CONSTRAINT "rectificaciones_libreta_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rectificaciones_libreta" ADD CONSTRAINT "rectificaciones_libreta_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "periodos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rectificaciones_libreta" ADD CONSTRAINT "rectificaciones_libreta_competencia_id_fkey" FOREIGN KEY ("competencia_id") REFERENCES "competencias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rectificaciones_libreta" ADD CONSTRAINT "rectificaciones_libreta_solicitada_por_fkey" FOREIGN KEY ("solicitada_por") REFERENCES "memberships"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rectificaciones_libreta" ADD CONSTRAINT "rectificaciones_libreta_resuelta_por_fkey" FOREIGN KEY ("resuelta_por") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resumenes_academicos" ADD CONSTRAINT "resumenes_academicos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Una nota con marca (NSP / No entregó) puede no tener valor; sin marca debe tener uno.
ALTER TABLE "notas" ADD CONSTRAINT "notas_valor_o_marca" CHECK (marca IS NOT NULL OR valor_literal IS NOT NULL OR valor_numerico IS NOT NULL);
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_consecuencia_numerica_rango" CHECK (consecuencia_vencimiento_numerica IS NULL OR (consecuencia_vencimiento_numerica >= 0 AND consecuencia_vencimiento_numerica <= 20));

-- El historial de notas es inmutable: nadie lo edita (solo se borra en cascada con su evaluación o su colegio).
CREATE OR REPLACE FUNCTION public.historial_notas_inmutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'historial_notas es inmutable';
END;
$$;
CREATE TRIGGER historial_notas_sin_update BEFORE UPDATE ON "historial_notas" FOR EACH ROW EXECUTE FUNCTION public.historial_notas_inmutable();

-- Las versiones emitidas de la libreta tampoco se editan.
CREATE OR REPLACE FUNCTION public.libretas_emitidas_inmutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'libretas_emitidas es inmutable';
END;
$$;
CREATE TRIGGER libretas_emitidas_sin_update BEFORE UPDATE OF datos, version, alumno_id, periodo_id, emitida_at ON "libretas_emitidas" FOR EACH ROW EXECUTE FUNCTION public.libretas_emitidas_inmutable();

-- RLS cerrado (el servidor usa su propio rol; anon y authenticated no leen estas tablas).
ALTER TABLE public.incidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidencias FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.incidencias FROM anon, authenticated;
ALTER TABLE public.incidencia_cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidencia_cursos FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.incidencia_cursos FROM anon, authenticated;
ALTER TABLE public.libretas_emitidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.libretas_emitidas FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.libretas_emitidas FROM anon, authenticated;
ALTER TABLE public.rectificaciones_libreta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rectificaciones_libreta FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.rectificaciones_libreta FROM anon, authenticated;
ALTER TABLE public.resumenes_academicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumenes_academicos FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.resumenes_academicos FROM anon, authenticated;
