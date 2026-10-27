-- Plazo para justificar faltas: de horas a días hábiles (regla del colegio: 15 días hábiles).
ALTER TABLE "tenants" ADD COLUMN "plazo_justificacion_dias_habiles" INTEGER NOT NULL DEFAULT 15;
ALTER TABLE "tenants" DROP COLUMN "plazo_justificacion_horas";

-- Las llegadas se avisan siempre al cerrar la lista: el modo «solo excepciones» deja de usarse.
UPDATE "tenants" SET "modo_avisos" = 'todos' WHERE "modo_avisos" = 'solo_excepciones';
