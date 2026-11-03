-- Evaluaciones (specs/11): programar y publicar resultados, historial de notas, comentario del tutor e instrumentos con
-- criterios. Además, la calificación del periodo deja de sugerirse por defecto (las fórmulas no están validadas).
-- No borra datos: las evaluaciones existentes quedan publicadas (la familia ya veía sus notas).

-- Sugerencia del periodo: se agrega «ninguna» y pasa a ser el valor por defecto (el tipo se recrea porque un valor nuevo
-- de un enum no se puede usar en la misma transacción).
ALTER TYPE "CalculoLiteral" RENAME TO "CalculoLiteral_anterior";
CREATE TYPE "CalculoLiteral" AS ENUM ('ninguna', 'promedio', 'frecuente');
ALTER TABLE "tenants" ALTER COLUMN "calculo_literal" DROP DEFAULT;
ALTER TABLE "tenants" ALTER COLUMN "calculo_literal" TYPE "CalculoLiteral" USING ("calculo_literal"::text::"CalculoLiteral");
ALTER TABLE "tenants" ALTER COLUMN "calculo_literal" SET DEFAULT 'ninguna';
DROP TYPE "CalculoLiteral_anterior";
UPDATE "tenants" SET "calculo_literal" = 'ninguna';

CREATE TYPE "EstadoEvaluacion" AS ENUM ('programada', 'publicada');
CREATE TYPE "EscalaCriterio" AS ENUM ('puntaje', 'cumple');

ALTER TABLE "evaluaciones" ADD COLUMN "grupo_id" UUID;
UPDATE "evaluaciones" SET "grupo_id" = "id";
ALTER TABLE "evaluaciones" ALTER COLUMN "grupo_id" SET NOT NULL;
ALTER TABLE "evaluaciones" ALTER COLUMN "grupo_id" SET DEFAULT gen_random_uuid();
ALTER TABLE "evaluaciones" ADD COLUMN "descripcion" TEXT;
-- Por defecto «publicada»: lo que ya existía (y las cargas directas) sigue visible; Khipu crea las nuevas como «programada».
ALTER TABLE "evaluaciones" ADD COLUMN "estado" "EstadoEvaluacion" NOT NULL DEFAULT 'publicada';
ALTER TABLE "evaluaciones" ADD COLUMN "publicada_at" TIMESTAMPTZ;
UPDATE "evaluaciones" SET "publicada_at" = CURRENT_TIMESTAMP;
CREATE INDEX "evaluaciones_grupo_id_idx" ON "evaluaciones"("grupo_id");

CREATE TABLE "historial_notas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "evaluacion_id" UUID NOT NULL,
    "alumno_id" UUID NOT NULL,
    "valor_anterior" TEXT,
    "valor_nuevo" TEXT,
    "cambiado_por" UUID NOT NULL,
    "cambiado_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "historial_notas_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "historial_notas_tenant_id_idx" ON "historial_notas"("tenant_id");
CREATE INDEX "historial_notas_evaluacion_id_cambiado_at_idx" ON "historial_notas"("evaluacion_id", "cambiado_at");

CREATE TABLE "comentarios_tutor" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "alumno_id" UUID NOT NULL,
    "periodo_id" UUID NOT NULL,
    "texto" TEXT NOT NULL,
    "autor_id" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "comentarios_tutor_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "comentarios_tutor_alumno_id_periodo_id_key" ON "comentarios_tutor"("alumno_id", "periodo_id");
CREATE INDEX "comentarios_tutor_tenant_id_idx" ON "comentarios_tutor"("tenant_id");

CREATE TABLE "criterios_evaluacion" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "evaluacion_id" UUID NOT NULL,
    "desempeno_id" UUID,
    "descripcion" TEXT NOT NULL,
    "escala" "EscalaCriterio" NOT NULL DEFAULT 'puntaje',
    "puntaje_maximo" INTEGER,
    "orden" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "criterios_evaluacion_pkey" PRIMARY KEY ("id"),
    -- Puntaje: máximo de 1 a 100. Cumple: sin máximo.
    CONSTRAINT "criterios_evaluacion_escala_check" CHECK (
      ("escala" = 'puntaje' AND "puntaje_maximo" BETWEEN 1 AND 100) OR ("escala" = 'cumple' AND "puntaje_maximo" IS NULL)
    )
);
CREATE INDEX "criterios_evaluacion_tenant_id_idx" ON "criterios_evaluacion"("tenant_id");
CREATE INDEX "criterios_evaluacion_evaluacion_id_idx" ON "criterios_evaluacion"("evaluacion_id");

CREATE TABLE "resultados_criterio" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "criterio_id" UUID NOT NULL,
    "alumno_id" UUID NOT NULL,
    "puntaje" DECIMAL(5,2),
    "cumple" BOOLEAN,
    "registrado_por" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "resultados_criterio_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "resultados_criterio_un_valor_check" CHECK (("puntaje" IS NULL) <> ("cumple" IS NULL))
);
CREATE UNIQUE INDEX "resultados_criterio_criterio_id_alumno_id_key" ON "resultados_criterio"("criterio_id", "alumno_id");
CREATE INDEX "resultados_criterio_tenant_id_idx" ON "resultados_criterio"("tenant_id");
CREATE INDEX "resultados_criterio_alumno_id_idx" ON "resultados_criterio"("alumno_id");

ALTER TABLE "historial_notas" ADD CONSTRAINT "historial_notas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "historial_notas" ADD CONSTRAINT "historial_notas_evaluacion_id_fkey" FOREIGN KEY ("evaluacion_id") REFERENCES "evaluaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "historial_notas" ADD CONSTRAINT "historial_notas_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "historial_notas" ADD CONSTRAINT "historial_notas_cambiado_por_fkey" FOREIGN KEY ("cambiado_por") REFERENCES "memberships"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "comentarios_tutor" ADD CONSTRAINT "comentarios_tutor_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comentarios_tutor" ADD CONSTRAINT "comentarios_tutor_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comentarios_tutor" ADD CONSTRAINT "comentarios_tutor_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "periodos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comentarios_tutor" ADD CONSTRAINT "comentarios_tutor_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "memberships"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "criterios_evaluacion" ADD CONSTRAINT "criterios_evaluacion_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "criterios_evaluacion" ADD CONSTRAINT "criterios_evaluacion_evaluacion_id_fkey" FOREIGN KEY ("evaluacion_id") REFERENCES "evaluaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "criterios_evaluacion" ADD CONSTRAINT "criterios_evaluacion_desempeno_id_fkey" FOREIGN KEY ("desempeno_id") REFERENCES "desempenos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "resultados_criterio" ADD CONSTRAINT "resultados_criterio_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resultados_criterio" ADD CONSTRAINT "resultados_criterio_criterio_id_fkey" FOREIGN KEY ("criterio_id") REFERENCES "criterios_evaluacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resultados_criterio" ADD CONSTRAINT "resultados_criterio_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resultados_criterio" ADD CONSTRAINT "resultados_criterio_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "memberships"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- RLS cerrado para anon/authenticated como el resto de tablas (specs/01).
ALTER TABLE public.historial_notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_notas FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.historial_notas FROM anon, authenticated;
ALTER TABLE public.comentarios_tutor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios_tutor FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.comentarios_tutor FROM anon, authenticated;
ALTER TABLE public.criterios_evaluacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criterios_evaluacion FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.criterios_evaluacion FROM anon, authenticated;
ALTER TABLE public.resultados_criterio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resultados_criterio FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.resultados_criterio FROM anon, authenticated;
