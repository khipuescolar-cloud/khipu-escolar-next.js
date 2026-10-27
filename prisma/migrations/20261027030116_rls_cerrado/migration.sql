-- Seguridad de respaldo (specs/01-arquitectura-multitenant.md).
-- La app accede SOLO por Prisma desde el servidor (rol postgres). Los roles públicos de Supabase
-- (anon, authenticated) no pueden leer ni escribir ninguna tabla de negocio, ni siquiera por PostgREST.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t.tablename);
  END LOOP;
END $$;

-- Tablas futuras creadas por postgres también quedan cerradas para los roles públicos.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

-- Una sola asistencia por alumno, fecha y curso (curso NULL = asistencia del día).
CREATE UNIQUE INDEX asistencias_alumno_fecha_curso_key
  ON public.asistencias (alumno_id, fecha, curso_id) NULLS NOT DISTINCT;

-- Las notas respetan la escala: literal o numérica (0–20), nunca ambas.
ALTER TABLE public.notas ADD CONSTRAINT notas_un_valor
  CHECK ((valor_literal IS NULL) <> (valor_numerico IS NULL));
ALTER TABLE public.notas ADD CONSTRAINT notas_rango_vigesimal
  CHECK (valor_numerico IS NULL OR (valor_numerico >= 0 AND valor_numerico <= 20));
ALTER TABLE public.calificaciones_periodo ADD CONSTRAINT calificaciones_rango_vigesimal
  CHECK (valor_numerico IS NULL OR (valor_numerico >= 0 AND valor_numerico <= 20));
