-- Cierra para anon/authenticated las tablas nuevas (admins_plataforma, auditoria_plataforma).
-- Idempotente: se puede repetir en futuras migraciones que agreguen tablas.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t.tablename);
  END LOOP;
END $$;
