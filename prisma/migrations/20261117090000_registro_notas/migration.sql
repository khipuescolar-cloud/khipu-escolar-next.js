-- Ampliación aditiva del Registro de notas (specs/47). Sin borrar datos históricos.
CREATE TYPE "OrigenCompetencia" AS ENUM ('oficial', 'personalizada');

ALTER TABLE "competencias"
  ADD COLUMN "origen" "OrigenCompetencia" NOT NULL DEFAULT 'oficial',
  ADD COLUMN "codigo_oficial" TEXT,
  ADD COLUMN "desactivada_at" TIMESTAMPTZ,
  ADD COLUMN "desactivada_por_id" UUID,
  ADD COLUMN "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE "evaluaciones"
  ADD COLUMN "creada_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN "actualizada_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN "creada_por_id" UUID;

ALTER TABLE "memberships"
  ADD COLUMN "gestiona_competencias" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "competencias" ADD CONSTRAINT "competencias_desactivada_por_id_fkey"
  FOREIGN KEY ("desactivada_por_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "evaluaciones" ADD CONSTRAINT "evaluaciones_creada_por_id_fkey"
  FOREIGN KEY ("creada_por_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Coincidencia exacta con los nombres y números transcritos en src/lib/cneb/*.json.
-- Las variantes históricas quedan sin código para revisión humana, nunca se adivinan.
UPDATE "competencias" AS c
SET "codigo_oficial" = catalogo.codigo
FROM (VALUES
    ('Construye su identidad', 'CNEB-01'),
    ('Se desenvuelve de manera autónoma a través de su motricidad', 'CNEB-02'),
    ('Asume una vida saludable', 'CNEB-03'),
    ('Interactúa a través de sus habilidades sociomotrices', 'CNEB-04'),
    ('Aprecia de manera crítica manifestaciones artístico-culturales', 'CNEB-05'),
    ('Crea proyectos desde los lenguajes artísticos', 'CNEB-06'),
    ('Se comunica oralmente en su lengua materna', 'CNEB-07'),
    ('Lee diversos tipos de textos escritos en su lengua materna', 'CNEB-08'),
    ('Escribe diversos tipos de textos en su lengua materna', 'CNEB-09'),
    ('Se comunica oralmente en castellano como segunda lengua', 'CNEB-10'),
    ('Lee diversos tipos de textos escritos en castellano como segunda lengua', 'CNEB-11'),
    ('Escribe diversos tipos de textos en castellano como segunda lengua', 'CNEB-12'),
    ('Se comunica oralmente en inglés como lengua extranjera', 'CNEB-13'),
    ('Lee diversos tipos de textos escritos en inglés como lengua extranjera', 'CNEB-14'),
    ('Escribe diversos tipos de textos en inglés como lengua extranjera', 'CNEB-15'),
    ('Convive y participa democráticamente en la búsqueda del bien común', 'CNEB-16'),
    ('Construye interpretaciones históricas', 'CNEB-17'),
    ('Gestiona responsablemente el espacio y el ambiente', 'CNEB-18'),
    ('Gestiona responsablemente los recursos económicos', 'CNEB-19'),
    ('Indaga mediante métodos científicos para construir sus conocimientos', 'CNEB-20'),
    ('Explica el mundo físico basándose en conocimientos sobre los seres vivos, materia y energía, biodiversidad, Tierra y universo', 'CNEB-21'),
    ('Diseña y construye soluciones tecnológicas para resolver problemas de su entorno', 'CNEB-22'),
    ('Resuelve problemas de cantidad', 'CNEB-23'),
    ('Resuelve problemas de regularidad, equivalencia y cambio', 'CNEB-24'),
    ('Resuelve problemas de gestión de datos e incertidumbre', 'CNEB-25'),
    ('Resuelve problemas de forma, movimiento y localización', 'CNEB-26'),
    ('Gestiona proyectos de emprendimiento económico o social', 'CNEB-27'),
    ('Se desenvuelve en entornos virtuales generados por las TIC', 'CNEB-28'),
    ('Gestiona su aprendizaje de manera autónoma', 'CNEB-29'),
    ('Construye su identidad como persona humana, amada por Dios, digna, libre y trascendente, comprendiendo la doctrina de su propia religión, abierto al diálogo con las que le son cercanas', 'CNEB-30'),
    ('Asume la experiencia del encuentro personal y comunitario con Dios en su proyecto de vida en coherencia con su creencia religiosa', 'CNEB-31')
) AS catalogo(nombre, codigo)
WHERE c.nombre = catalogo.nombre AND c."codigo_oficial" IS NULL;

-- Las tablas ya tienen RLS cerrado; se reafirma para las columnas nuevas.
ALTER TABLE public.competencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competencias FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.competencias FROM anon, authenticated;
ALTER TABLE public.evaluaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluaciones FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.evaluaciones FROM anon, authenticated;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.memberships FROM anon, authenticated;
