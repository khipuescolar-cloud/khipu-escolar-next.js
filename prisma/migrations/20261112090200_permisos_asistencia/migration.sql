-- Permisos de asistencia y salida en portería (specs/04, 05, 37). Aditiva.
-- AlterTable: salida del colegio en la fila de la asistencia del día.
ALTER TABLE "asistencias" ADD COLUMN     "hora_salida" TEXT,
ADD COLUMN     "salida_registrada_por" UUID;

-- CreateTable
CREATE TABLE "permisos_asistencia" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "alumno_id" UUID NOT NULL,
    "desde" DATE NOT NULL,
    "hasta" DATE NOT NULL,
    "todo_el_dia" BOOLEAN NOT NULL DEFAULT true,
    "hora_desde" TEXT,
    "hora_hasta" TEXT,
    "motivo" TEXT NOT NULL,
    "registrado_por" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anulado_at" TIMESTAMPTZ,
    "anulado_por" UUID,
    "motivo_anulacion" TEXT,

    CONSTRAINT "permisos_asistencia_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "permisos_asistencia_rango" CHECK ("desde" <= "hasta"),
    CONSTRAINT "permisos_asistencia_horas" CHECK ("todo_el_dia" OR ("hora_desde" IS NOT NULL AND "hora_hasta" IS NOT NULL AND "hora_desde" < "hora_hasta"))
);

-- CreateIndex
CREATE INDEX "permisos_asistencia_tenant_id_desde_idx" ON "permisos_asistencia"("tenant_id", "desde");

-- CreateIndex
CREATE INDEX "permisos_asistencia_alumno_id_desde_hasta_idx" ON "permisos_asistencia"("alumno_id", "desde", "hasta");

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_salida_registrada_por_fkey" FOREIGN KEY ("salida_registrada_por") REFERENCES "memberships"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permisos_asistencia" ADD CONSTRAINT "permisos_asistencia_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permisos_asistencia" ADD CONSTRAINT "permisos_asistencia_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permisos_asistencia" ADD CONSTRAINT "permisos_asistencia_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "memberships"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permisos_asistencia" ADD CONSTRAINT "permisos_asistencia_anulado_por_fkey" FOREIGN KEY ("anulado_por") REFERENCES "memberships"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- RLS cerrado (el servidor usa su propio rol; anon y authenticated no leen esta tabla).
ALTER TABLE public.permisos_asistencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permisos_asistencia FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.permisos_asistencia FROM anon, authenticated;
