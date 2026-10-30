-- Planes Khipu Base y Khipu Pro (specs/03, decisión del 2026-10-30).
-- basico → base, fase2 → pro, promax → pro. Se retiran WhatsApp/SMS (specs/06) y el módulo Nudito (specs/13).

BEGIN;

-- ─── Módulo nudito retirado ───
DELETE FROM "plan_modulos" WHERE "modulo" = 'nudito';
DELETE FROM "tenant_modulos" WHERE "modulo" = 'nudito';
DELETE FROM "rol_modulos" WHERE "modulo" = 'nudito';

-- ─── Enum Plan: (basico, fase2, promax) → (base, pro) ───
DELETE FROM "plan_modulos" WHERE "plan" = 'promax';
DELETE FROM "planes_catalogo" WHERE "plan" = 'promax';

ALTER TABLE "plan_modulos" DROP CONSTRAINT "plan_modulos_plan_fkey";
ALTER TABLE "tenants" ALTER COLUMN "plan" DROP DEFAULT;
ALTER TABLE "anuncios_plataforma" ALTER COLUMN "planes" DROP DEFAULT;

CREATE TYPE "Plan_new" AS ENUM ('base', 'pro');

CREATE FUNCTION "pg_temp"."plan_nuevo"(p text) RETURNS "Plan_new" LANGUAGE sql IMMUTABLE AS $$
  SELECT (CASE p WHEN 'basico' THEN 'base' WHEN 'fase2' THEN 'pro' WHEN 'promax' THEN 'pro' ELSE p END)::"Plan_new"
$$;

ALTER TABLE "tenants" ALTER COLUMN "plan" TYPE "Plan_new" USING "pg_temp"."plan_nuevo"("plan"::text);
ALTER TABLE "planes_catalogo" ALTER COLUMN "plan" TYPE "Plan_new" USING "pg_temp"."plan_nuevo"("plan"::text);
ALTER TABLE "plan_modulos" ALTER COLUMN "plan" TYPE "Plan_new" USING "pg_temp"."plan_nuevo"("plan"::text);
ALTER TABLE "suscripciones" ALTER COLUMN "plan" TYPE "Plan_new" USING "pg_temp"."plan_nuevo"("plan"::text);
ALTER TABLE "solicitudes_demo" ALTER COLUMN "plan_interes" TYPE "Plan_new" USING "pg_temp"."plan_nuevo"("plan_interes"::text);
-- Arreglos: se mapea cada valor y se quitan duplicados (fase2 + promax → un solo pro).
CREATE FUNCTION "pg_temp"."planes_nuevos"(a "Plan"[]) RETURNS "Plan_new"[] LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(array_agg(DISTINCT "pg_temp"."plan_nuevo"(x::text)), ARRAY[]::"Plan_new"[]) FROM unnest(a) AS x
$$;
ALTER TABLE "anuncios_plataforma" ALTER COLUMN "planes" TYPE "Plan_new"[] USING "pg_temp"."planes_nuevos"("planes");

DROP FUNCTION "pg_temp"."planes_nuevos"("Plan"[]);
DROP FUNCTION "pg_temp"."plan_nuevo"(text);
DROP TYPE "Plan";
ALTER TYPE "Plan_new" RENAME TO "Plan";

ALTER TABLE "tenants" ALTER COLUMN "plan" SET DEFAULT 'base';
ALTER TABLE "anuncios_plataforma" ALTER COLUMN "planes" SET DEFAULT ARRAY[]::"Plan"[];
ALTER TABLE "plan_modulos" ADD CONSTRAINT "plan_modulos_plan_fkey" FOREIGN KEY ("plan") REFERENCES "planes_catalogo"("plan") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "planes_catalogo" SET "nombre" = 'Khipu Base', "orden" = 1, "updated_at" = now(),
  "descripcion" = 'Asistencia con aviso a la familia, portería con QR, justificaciones, mensajes, comunicados y gestión del colegio.'
WHERE "plan" = 'base';
UPDATE "planes_catalogo" SET "nombre" = 'Khipu Pro', "orden" = 2, "updated_at" = now(),
  "descripcion" = 'Todo Khipu Base más notas por competencias, libreta, tareas y agenda.'
WHERE "plan" = 'pro';

-- ─── WhatsApp y SMS retirados: solo correo y push ───
DELETE FROM "avisos" WHERE "canal"::text IN ('whatsapp', 'sms');
CREATE TYPE "CanalAviso_new" AS ENUM ('correo', 'push');
ALTER TABLE "avisos" ALTER COLUMN "canal" TYPE "CanalAviso_new" USING ("canal"::text::"CanalAviso_new");
DROP TYPE "CanalAviso";
ALTER TYPE "CanalAviso_new" RENAME TO "CanalAviso";

ALTER TABLE "tenants" DROP COLUMN "whatsapp_activo", DROP COLUMN "sms_activo";
ALTER TABLE "preferencias_aviso" DROP COLUMN "whatsapp", DROP COLUMN "sms";
DELETE FROM "config_plataforma" WHERE "clave" ILIKE '%whatsapp%' OR "clave" ILIKE '%sms%' OR "clave" = 'nudito:horario';

-- ─── Grado mínimo de primaria para la cuenta propia del alumno (1–6) ───
ALTER TABLE "tenants" ADD COLUMN "grado_minimo_cuenta_alumno" INTEGER NOT NULL DEFAULT 5;

COMMIT;
