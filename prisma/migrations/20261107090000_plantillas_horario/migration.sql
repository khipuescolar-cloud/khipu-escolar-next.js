-- Plantillas de horario (specs/34): las «horas del día» dejan de ser por nivel y pasan a una plantilla con nombre que
-- usa cada salón; su entrada y su hora límite de falta rigen la asistencia del salón (specs/05).
CREATE TABLE "plantillas_horario" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "hora_entrada" TEXT NOT NULL,
    "hora_salida" TEXT NOT NULL,
    "duracion_clase" INTEGER NOT NULL,
    "hora_limite_falta" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "plantillas_horario_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "plantillas_horario_tenant_id_nombre_key" ON "plantillas_horario"("tenant_id", "nombre");
ALTER TABLE "plantillas_horario" ADD CONSTRAINT "plantillas_horario_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Una plantilla por cada nivel que ya tenía horas: entrada = primera hora, salida = última, duración = la de la primera
-- clase. La hora de falta conserva la distancia que el colegio tenía entre tardanza y falta.
INSERT INTO "plantillas_horario" ("tenant_id", "nombre", "hora_entrada", "hora_salida", "duracion_clase", "hora_limite_falta", "updated_at")
SELECT p.tenant_id,
       CASE p.nivel WHEN 'inicial' THEN 'Inicial' WHEN 'primaria' THEN 'Primaria' WHEN 'secundaria' THEN 'Secundaria' ELSE 'Academia' END,
       MIN(p.hora_inicio),
       MAX(p.hora_fin),
       COALESCE((
         SELECT (EXTRACT(EPOCH FROM (c.hora_fin::time - c.hora_inicio::time)) / 60)::int
         FROM "horario_periodos" c
         WHERE c.tenant_id = p.tenant_id AND c.nivel = p.nivel AND c.tipo = 'clase'
         ORDER BY c.hora_inicio LIMIT 1
       ), 45),
       to_char((MIN(p.hora_inicio)::time + (t.hora_limite_falta::time - t.hora_limite_tardanza::time))::interval, 'HH24:MI'),
       CURRENT_TIMESTAMP
FROM "horario_periodos" p
JOIN "tenants" t ON t.id = p.tenant_id
GROUP BY p.tenant_id, p.nivel, t.hora_limite_falta, t.hora_limite_tardanza;

ALTER TABLE "horario_periodos" ADD COLUMN "plantilla_id" UUID;
UPDATE "horario_periodos" p SET "plantilla_id" = pl.id
FROM "plantillas_horario" pl
WHERE pl.tenant_id = p.tenant_id
  AND pl.nombre = CASE p.nivel WHEN 'inicial' THEN 'Inicial' WHEN 'primaria' THEN 'Primaria' WHEN 'secundaria' THEN 'Secundaria' ELSE 'Academia' END;
ALTER TABLE "horario_periodos" ALTER COLUMN "plantilla_id" SET NOT NULL;
DROP INDEX IF EXISTS "horario_periodos_tenant_id_nivel_idx";
ALTER TABLE "horario_periodos" DROP COLUMN "nivel";
CREATE INDEX "horario_periodos_tenant_id_plantilla_id_idx" ON "horario_periodos"("tenant_id", "plantilla_id");
ALTER TABLE "horario_periodos" ADD CONSTRAINT "horario_periodos_plantilla_id_fkey" FOREIGN KEY ("plantilla_id") REFERENCES "plantillas_horario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Cada salón usa la plantilla de su nivel.
ALTER TABLE "salones" ADD COLUMN "plantilla_id" UUID;
UPDATE "salones" s SET "plantilla_id" = pl.id
FROM "plantillas_horario" pl
WHERE pl.tenant_id = s.tenant_id
  AND pl.nombre = CASE s.nivel WHEN 'inicial' THEN 'Inicial' WHEN 'primaria' THEN 'Primaria' WHEN 'secundaria' THEN 'Secundaria' ELSE 'Academia' END;
ALTER TABLE "salones" ADD CONSTRAINT "salones_plantilla_id_fkey" FOREIGN KEY ("plantilla_id") REFERENCES "plantillas_horario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Control de ingreso por grupo de horas: «colegio» (salones sin plantilla) o el id de cada plantilla.
ALTER TABLE "control_ingreso_dia" ADD COLUMN "clave" TEXT NOT NULL DEFAULT 'colegio';
DROP INDEX IF EXISTS "control_ingreso_dia_tenant_id_fecha_key";
CREATE UNIQUE INDEX "control_ingreso_dia_tenant_id_fecha_clave_key" ON "control_ingreso_dia"("tenant_id", "fecha", "clave");

-- RLS cerrado para anon/authenticated como el resto de tablas (specs/01).
ALTER TABLE public.plantillas_horario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plantillas_horario FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.plantillas_horario FROM anon, authenticated;
