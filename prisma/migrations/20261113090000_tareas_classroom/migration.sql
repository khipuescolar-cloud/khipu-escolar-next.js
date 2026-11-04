-- Tareas estilo Classroom (specs/39). Escrita a mano a partir de `prisma migrate diff`; ADITIVA: no borra ni renombra nada.
-- - `tareas`: estado, publicación programada, fecha límite opcional (con o sin hora), tardías, cierre, calificable…
-- - Secciones destino (`tarea_cursos`), destinatarios con estado de entrega (`tarea_asignaciones`), intentos
--   (`tarea_entregas`, archivos con `archivos.entrega_id`), comentarios, enlaces e historial inmutable de plazos.
-- - Backfill: cada tarea existente queda publicada y avisada, con una sección (su curso, `todos`) y una asignación por
--   alumno activo del salón, para que la sigan viendo las mismas familias.
-- - RLS cerrado en las tablas nuevas, como en el resto (Prisma usa el rol dueño; anon/authenticated no entran).


-- CreateEnum
CREATE TYPE "EstadoTarea" AS ENUM ('borrador', 'publicada', 'cerrada', 'archivada');

-- CreateEnum
CREATE TYPE "EstadoEntregaTarea" AS ENUM ('asignada', 'en_proceso', 'entregada', 'devuelta', 'revisada');

ALTER TABLE "archivos" ADD COLUMN     "entrega_id" UUID;



ALTER TABLE "evaluaciones" ADD COLUMN     "tarea_id" UUID;


ALTER TABLE "tareas" ADD COLUMN     "avisada_at" TIMESTAMPTZ,
ADD COLUMN     "calificable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cerrada_at" TIMESTAMPTZ,
ADD COLUMN     "comentarios_generales" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "competencia_id" UUID,
ADD COLUMN     "con_hora" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "estado" "EstadoTarea" NOT NULL DEFAULT 'publicada',
ADD COLUMN     "indicaciones_entrega" TEXT,
ADD COLUMN     "permite_tardias" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "publicada_at" TIMESTAMPTZ,
ADD COLUMN     "publicar_en" TIMESTAMPTZ,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "fecha_entrega" DROP NOT NULL;

ALTER TABLE "tenants" ADD COLUMN     "tareas_max_archivos" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "tareas_max_mb" INTEGER NOT NULL DEFAULT 10;

-- CreateTable
CREATE TABLE "tarea_cursos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tarea_id" UUID NOT NULL,
    "curso_id" UUID NOT NULL,
    "todos" BOOLEAN NOT NULL DEFAULT true,
    "fecha_entrega" TIMESTAMPTZ,
    "evaluacion_grupo_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tarea_cursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarea_asignaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tarea_id" UUID NOT NULL,
    "tarea_curso_id" UUID NOT NULL,
    "alumno_id" UUID NOT NULL,
    "estado" "EstadoEntregaTarea" NOT NULL DEFAULT 'asignada',
    "tarde" BOOLEAN NOT NULL DEFAULT false,
    "entregada_at" TIMESTAMPTZ,
    "devuelta_at" TIMESTAMPTZ,
    "revisada_at" TIMESTAMPTZ,
    "retirada_at" TIMESTAMPTZ,
    "entregada_por_id" UUID,
    "en_fisico" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tarea_asignaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarea_entregas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "asignacion_id" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "texto" TEXT,
    "borrador" BOOLEAN NOT NULL DEFAULT true,
    "enviada_at" TIMESTAMPTZ,
    "tarde" BOOLEAN NOT NULL DEFAULT false,
    "enviada_por_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tarea_entregas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarea_comentarios" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tarea_id" UUID NOT NULL,
    "asignacion_id" UUID,
    "autor_id" UUID NOT NULL,
    "texto" TEXT NOT NULL,
    "oculto_at" TIMESTAMPTZ,
    "oculto_por" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tarea_comentarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarea_enlaces" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tarea_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "titulo" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tarea_enlaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarea_cambios_plazo" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tarea_id" UUID NOT NULL,
    "tarea_curso_id" UUID,
    "anterior" TIMESTAMPTZ,
    "nuevo" TIMESTAMPTZ,
    "motivo" TEXT,
    "cambiado_por" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tarea_cambios_plazo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tarea_cursos_tenant_id_curso_id_idx" ON "tarea_cursos"("tenant_id", "curso_id");

-- CreateIndex
CREATE UNIQUE INDEX "tarea_cursos_tarea_id_curso_id_key" ON "tarea_cursos"("tarea_id", "curso_id");

-- CreateIndex
CREATE INDEX "tarea_asignaciones_tenant_id_alumno_id_idx" ON "tarea_asignaciones"("tenant_id", "alumno_id");

-- CreateIndex
CREATE INDEX "tarea_asignaciones_tarea_curso_id_idx" ON "tarea_asignaciones"("tarea_curso_id");

-- CreateIndex
CREATE UNIQUE INDEX "tarea_asignaciones_tarea_id_alumno_id_key" ON "tarea_asignaciones"("tarea_id", "alumno_id");

-- CreateIndex
CREATE UNIQUE INDEX "tarea_entregas_asignacion_id_numero_key" ON "tarea_entregas"("asignacion_id", "numero");

-- CreateIndex
CREATE INDEX "tarea_comentarios_tarea_id_asignacion_id_idx" ON "tarea_comentarios"("tarea_id", "asignacion_id");

-- CreateIndex
CREATE INDEX "tarea_enlaces_tarea_id_idx" ON "tarea_enlaces"("tarea_id");

-- CreateIndex
CREATE INDEX "tarea_cambios_plazo_tarea_id_idx" ON "tarea_cambios_plazo"("tarea_id");

-- CreateIndex
CREATE INDEX "archivos_entrega_id_idx" ON "archivos"("entrega_id");

-- CreateIndex
CREATE INDEX "evaluaciones_tarea_id_idx" ON "evaluaciones"("tarea_id");

-- CreateIndex
CREATE INDEX "tareas_tenant_id_estado_idx" ON "tareas"("tenant_id", "estado");

-- AddForeignKey
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_entrega_id_fkey" FOREIGN KEY ("entrega_id") REFERENCES "tarea_entregas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluaciones" ADD CONSTRAINT "evaluaciones_tarea_id_fkey" FOREIGN KEY ("tarea_id") REFERENCES "tareas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_competencia_id_fkey" FOREIGN KEY ("competencia_id") REFERENCES "competencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarea_cursos" ADD CONSTRAINT "tarea_cursos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarea_cursos" ADD CONSTRAINT "tarea_cursos_tarea_id_fkey" FOREIGN KEY ("tarea_id") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarea_cursos" ADD CONSTRAINT "tarea_cursos_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarea_asignaciones" ADD CONSTRAINT "tarea_asignaciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarea_asignaciones" ADD CONSTRAINT "tarea_asignaciones_tarea_id_fkey" FOREIGN KEY ("tarea_id") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarea_asignaciones" ADD CONSTRAINT "tarea_asignaciones_tarea_curso_id_fkey" FOREIGN KEY ("tarea_curso_id") REFERENCES "tarea_cursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarea_asignaciones" ADD CONSTRAINT "tarea_asignaciones_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarea_asignaciones" ADD CONSTRAINT "tarea_asignaciones_entregada_por_id_fkey" FOREIGN KEY ("entregada_por_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarea_entregas" ADD CONSTRAINT "tarea_entregas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarea_entregas" ADD CONSTRAINT "tarea_entregas_asignacion_id_fkey" FOREIGN KEY ("asignacion_id") REFERENCES "tarea_asignaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarea_entregas" ADD CONSTRAINT "tarea_entregas_enviada_por_id_fkey" FOREIGN KEY ("enviada_por_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarea_comentarios" ADD CONSTRAINT "tarea_comentarios_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarea_comentarios" ADD CONSTRAINT "tarea_comentarios_tarea_id_fkey" FOREIGN KEY ("tarea_id") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarea_comentarios" ADD CONSTRAINT "tarea_comentarios_asignacion_id_fkey" FOREIGN KEY ("asignacion_id") REFERENCES "tarea_asignaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarea_comentarios" ADD CONSTRAINT "tarea_comentarios_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "memberships"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarea_comentarios" ADD CONSTRAINT "tarea_comentarios_oculto_por_fkey" FOREIGN KEY ("oculto_por") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarea_enlaces" ADD CONSTRAINT "tarea_enlaces_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarea_enlaces" ADD CONSTRAINT "tarea_enlaces_tarea_id_fkey" FOREIGN KEY ("tarea_id") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarea_cambios_plazo" ADD CONSTRAINT "tarea_cambios_plazo_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarea_cambios_plazo" ADD CONSTRAINT "tarea_cambios_plazo_tarea_id_fkey" FOREIGN KEY ("tarea_id") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarea_cambios_plazo" ADD CONSTRAINT "tarea_cambios_plazo_tarea_curso_id_fkey" FOREIGN KEY ("tarea_curso_id") REFERENCES "tarea_cursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarea_cambios_plazo" ADD CONSTRAINT "tarea_cambios_plazo_cambiado_por_fkey" FOREIGN KEY ("cambiado_por") REFERENCES "memberships"("id") ON DELETE NO ACTION ON UPDATE CASCADE;


-- Cron de avisos (specs/39 · avisos): solo las publicadas sin aviso; consulta acotada.
CREATE INDEX "tareas_pendientes_aviso_idx" ON "tareas"("publicar_en") WHERE "avisada_at" IS NULL AND "estado" = 'publicada';

-- Backfill de las tareas existentes.
UPDATE "tareas" SET "publicada_at" = "created_at", "avisada_at" = "created_at" WHERE "publicada_at" IS NULL;

INSERT INTO "tarea_cursos" ("id", "tenant_id", "tarea_id", "curso_id", "todos")
SELECT gen_random_uuid(), t."tenant_id", t."id", t."curso_id", true FROM "tareas" t
ON CONFLICT ("tarea_id", "curso_id") DO NOTHING;

INSERT INTO "tarea_asignaciones" ("id", "tenant_id", "tarea_id", "tarea_curso_id", "alumno_id")
SELECT gen_random_uuid(), tc."tenant_id", tc."tarea_id", tc."id", a."id"
FROM "tarea_cursos" tc
JOIN "cursos" c ON c."id" = tc."curso_id"
JOIN "alumnos" a ON a."salon_id" = c."salon_id" AND a."tenant_id" = tc."tenant_id" AND a."estado" = 'activo'
ON CONFLICT ("tarea_id", "alumno_id") DO NOTHING;

-- Historial de plazos inmutable: no se edita (sí se borra en cascada con la tarea, que solo se elimina sin entregas).
CREATE OR REPLACE FUNCTION public.tarea_cambios_plazo_inmutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'tarea_cambios_plazo es inmutable';
END;
$$;
CREATE TRIGGER tarea_cambios_plazo_sin_update BEFORE UPDATE ON "tarea_cambios_plazo" FOR EACH ROW EXECUTE FUNCTION public.tarea_cambios_plazo_inmutable();

-- RLS cerrado en las tablas nuevas.
ALTER TABLE public.tarea_cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarea_cursos FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.tarea_cursos FROM anon, authenticated;
ALTER TABLE public.tarea_asignaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarea_asignaciones FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.tarea_asignaciones FROM anon, authenticated;
ALTER TABLE public.tarea_entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarea_entregas FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.tarea_entregas FROM anon, authenticated;
ALTER TABLE public.tarea_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarea_comentarios FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.tarea_comentarios FROM anon, authenticated;
ALTER TABLE public.tarea_enlaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarea_enlaces FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.tarea_enlaces FROM anon, authenticated;
ALTER TABLE public.tarea_cambios_plazo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarea_cambios_plazo FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.tarea_cambios_plazo FROM anon, authenticated;
