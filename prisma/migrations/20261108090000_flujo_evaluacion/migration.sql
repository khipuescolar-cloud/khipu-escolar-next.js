-- Flujo de evaluación (specs/11): instrumento de cada evaluación, cálculo de la calificación literal del periodo
-- (promedio o la más frecuente) e informe de progreso a mitad del periodo por competencia.

CREATE TYPE "CalculoLiteral" AS ENUM ('promedio', 'frecuente');
CREATE TYPE "InstrumentoEvaluacion" AS ENUM ('prueba_escrita', 'lista_cotejo', 'rubrica', 'ficha_observacion', 'otro');

-- Todos empiezan con el promedio (así lo trabajan los docentes consultados); dirección puede cambiarlo.
ALTER TABLE "tenants" ADD COLUMN "calculo_literal" "CalculoLiteral" NOT NULL DEFAULT 'promedio';

ALTER TABLE "evaluaciones" ADD COLUMN "instrumento" "InstrumentoEvaluacion";

CREATE TABLE "informes_progreso" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "alumno_id" UUID NOT NULL,
    "competencia_id" UUID NOT NULL,
    "periodo_id" UUID NOT NULL,
    "logros" TEXT,
    "mejorar" TEXT,
    "recomendaciones" TEXT,
    "registrado_por" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "informes_progreso_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "envios_informe_progreso" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "curso_id" UUID NOT NULL,
    "periodo_id" UUID NOT NULL,
    "enviado_por" UUID NOT NULL,
    "enviado_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "envios_informe_progreso_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "informes_progreso_alumno_id_competencia_id_periodo_id_key" ON "informes_progreso"("alumno_id", "competencia_id", "periodo_id");
CREATE INDEX "informes_progreso_tenant_id_idx" ON "informes_progreso"("tenant_id");
CREATE INDEX "informes_progreso_periodo_id_competencia_id_idx" ON "informes_progreso"("periodo_id", "competencia_id");
CREATE UNIQUE INDEX "envios_informe_progreso_periodo_id_curso_id_key" ON "envios_informe_progreso"("periodo_id", "curso_id");
CREATE INDEX "envios_informe_progreso_tenant_id_idx" ON "envios_informe_progreso"("tenant_id");

ALTER TABLE "informes_progreso" ADD CONSTRAINT "informes_progreso_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "informes_progreso" ADD CONSTRAINT "informes_progreso_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "informes_progreso" ADD CONSTRAINT "informes_progreso_competencia_id_fkey" FOREIGN KEY ("competencia_id") REFERENCES "competencias"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "informes_progreso" ADD CONSTRAINT "informes_progreso_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "periodos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "informes_progreso" ADD CONSTRAINT "informes_progreso_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "memberships"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "envios_informe_progreso" ADD CONSTRAINT "envios_informe_progreso_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "envios_informe_progreso" ADD CONSTRAINT "envios_informe_progreso_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "envios_informe_progreso" ADD CONSTRAINT "envios_informe_progreso_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "periodos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "envios_informe_progreso" ADD CONSTRAINT "envios_informe_progreso_enviado_por_fkey" FOREIGN KEY ("enviado_por") REFERENCES "memberships"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- RLS cerrado para anon/authenticated como el resto de tablas (specs/01).
ALTER TABLE public.informes_progreso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.informes_progreso FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.informes_progreso FROM anon, authenticated;
ALTER TABLE public.envios_informe_progreso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.envios_informe_progreso FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.envios_informe_progreso FROM anon, authenticated;
