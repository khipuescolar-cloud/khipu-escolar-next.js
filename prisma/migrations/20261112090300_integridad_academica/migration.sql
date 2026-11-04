-- Integridad y auditoría académica (specs/11, specs/37). Escrita a mano.
--
-- 1. El historial de notas ya no se borra en cascada con su evaluación: una evaluación con historial no se puede
--    borrar (RESTRICT). `eliminarEvaluacion` ya lo impide con un mensaje claro; esto es la defensa en la BD.
--    El historial apunta a `evaluaciones` (no a `notas`), así que borrar una evaluación en borrador SIN historial
--    sigue funcionando (sus notas, si las hubiera, se borran en cascada como antes).
-- 2. Las libretas emitidas no se borran: ni a mano (trigger) ni en cascada al borrar un alumno o un periodo (RESTRICT).
--    Única excepción: borrar el colegio completo (tenants → cascada), que usan `scripts/borrar-colegio.ts`, la
--    compensación de `crearColegio`, `pnpm db:reconstruir` y los tests. El trigger lo detecta porque la fila del
--    colegio ya no existe cuando la cascada llega a `libretas_emitidas`.
--
-- Postgres resuelve bien RESTRICT dentro de una cascada múltiple (tenants → alumnos y tenants → libretas_emitidas en
-- la misma sentencia): el borrado del colegio completo no falla.

-- 1. historial_notas → evaluaciones: CASCADE → RESTRICT
ALTER TABLE "historial_notas" DROP CONSTRAINT "historial_notas_evaluacion_id_fkey";
ALTER TABLE "historial_notas" ADD CONSTRAINT "historial_notas_evaluacion_id_fkey"
  FOREIGN KEY ("evaluacion_id") REFERENCES "evaluaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2a. libretas_emitidas → alumnos / periodos: CASCADE → RESTRICT
ALTER TABLE "libretas_emitidas" DROP CONSTRAINT "libretas_emitidas_alumno_id_fkey";
ALTER TABLE "libretas_emitidas" ADD CONSTRAINT "libretas_emitidas_alumno_id_fkey"
  FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "libretas_emitidas" DROP CONSTRAINT "libretas_emitidas_periodo_id_fkey";
ALTER TABLE "libretas_emitidas" ADD CONSTRAINT "libretas_emitidas_periodo_id_fkey"
  FOREIGN KEY ("periodo_id") REFERENCES "periodos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2b. Sin DELETE en libretas_emitidas, salvo la cascada del borrado del colegio completo.
CREATE OR REPLACE FUNCTION public.libretas_emitidas_sin_borrado() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.tenants WHERE id = OLD.tenant_id) THEN
    RAISE EXCEPTION 'libretas_emitidas no se borra (versión emitida de la libreta)';
  END IF;
  RETURN OLD;
END;
$$;
CREATE TRIGGER libretas_emitidas_sin_delete BEFORE DELETE ON "libretas_emitidas" FOR EACH ROW EXECUTE FUNCTION public.libretas_emitidas_sin_borrado();
