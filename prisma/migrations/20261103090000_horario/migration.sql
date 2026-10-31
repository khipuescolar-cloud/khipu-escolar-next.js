-- Horario semanal por salón (specs/34). Solo agrega un enum y dos tablas, y el módulo «horario» a los planes del catálogo: no toca datos existentes.

-- CreateEnum
CREATE TYPE "TipoHoraHorario" AS ENUM ('clase', 'recreo');

-- CreateTable
CREATE TABLE "horario_periodos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nivel" "Nivel" NOT NULL,
    "nombre" TEXT NOT NULL,
    "hora_inicio" TEXT NOT NULL,
    "hora_fin" TEXT NOT NULL,
    "tipo" "TipoHoraHorario" NOT NULL DEFAULT 'clase',

    CONSTRAINT "horario_periodos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bloques_horario" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "salon_id" UUID NOT NULL,
    "dia" INTEGER NOT NULL,
    "periodo_id" UUID NOT NULL,
    "curso_id" UUID,
    "titulo" TEXT,
    "profesor_id" UUID,
    "aula" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "bloques_horario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "horario_periodos_tenant_id_nivel_idx" ON "horario_periodos"("tenant_id", "nivel");

-- CreateIndex
CREATE INDEX "bloques_horario_tenant_id_salon_id_idx" ON "bloques_horario"("tenant_id", "salon_id");

-- CreateIndex
CREATE INDEX "bloques_horario_tenant_id_curso_id_idx" ON "bloques_horario"("tenant_id", "curso_id");

-- CreateIndex
CREATE INDEX "bloques_horario_tenant_id_profesor_id_idx" ON "bloques_horario"("tenant_id", "profesor_id");

-- CreateIndex
CREATE INDEX "bloques_horario_periodo_id_idx" ON "bloques_horario"("periodo_id");

-- CreateIndex
CREATE UNIQUE INDEX "bloques_horario_salon_id_dia_periodo_id_key" ON "bloques_horario"("salon_id", "dia", "periodo_id");

-- AddForeignKey
ALTER TABLE "horario_periodos" ADD CONSTRAINT "horario_periodos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloques_horario" ADD CONSTRAINT "bloques_horario_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloques_horario" ADD CONSTRAINT "bloques_horario_salon_id_fkey" FOREIGN KEY ("salon_id") REFERENCES "salones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloques_horario" ADD CONSTRAINT "bloques_horario_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "horario_periodos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloques_horario" ADD CONSTRAINT "bloques_horario_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloques_horario" ADD CONSTRAINT "bloques_horario_profesor_id_fkey" FOREIGN KEY ("profesor_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Reglas que Prisma no expresa: día de lunes (1) a viernes (5); un bloque es un curso o lleva título.
ALTER TABLE "bloques_horario" ADD CONSTRAINT "bloques_horario_dia_check" CHECK ("dia" BETWEEN 1 AND 5);
ALTER TABLE "bloques_horario" ADD CONSTRAINT "bloques_horario_curso_o_titulo_check" CHECK ("curso_id" IS NOT NULL OR "titulo" IS NOT NULL);

-- Módulo «horario» en Khipu Base y Khipu Pro (las claves desconocidas para el código se ignoran: es inocuo).
INSERT INTO "plan_modulos" ("plan", "modulo")
SELECT p, 'horario' FROM unnest(ARRAY['base', 'pro']::"Plan"[]) AS p
WHERE EXISTS (SELECT 1 FROM "planes_catalogo" c WHERE c."plan" = p)
ON CONFLICT DO NOTHING;

-- RLS cerrado para anon/authenticated también en las tablas nuevas (idempotente).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['horario_periodos', 'bloques_horario'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
  END LOOP;
END $$;
