-- CreateEnum
CREATE TYPE "EstadoEditorialTema" AS ENUM ('borrador', 'revisado', 'publicado');

-- AlterTable
ALTER TABLE "cursos" ADD COLUMN     "curso_colegio_id" UUID;

-- CreateTable
CREATE TABLE "temas_curriculares" (
    "clave" TEXT NOT NULL,
    "area_cneb" TEXT NOT NULL,
    "disciplinas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "nivel" "Nivel" NOT NULL,
    "grado" INTEGER NOT NULL,
    "procedencia" TEXT NOT NULL,
    "fuente_id" TEXT,
    "fuente_locator" TEXT,
    "estado" "EstadoEditorialTema" NOT NULL DEFAULT 'borrador',
    "version" INTEGER NOT NULL DEFAULT 1,
    "revisado_por_id" UUID,
    "revisado_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "temas_curriculares_pkey" PRIMARY KEY ("clave")
);

-- CreateTable
CREATE TABLE "tema_desempenos_oficiales" (
    "id" UUID NOT NULL,
    "tema_clave" TEXT NOT NULL,
    "codigo_competencia" TEXT NOT NULL,
    "codigo_desempeno" TEXT NOT NULL,
    "fuente_id" TEXT NOT NULL,
    "fuente_locator" TEXT NOT NULL,
    "verificado_at" TIMESTAMPTZ,

    CONSTRAINT "tema_desempenos_oficiales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cursos_colegio" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "curso_khipu" TEXT,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "archivado_at" TIMESTAMPTZ,

    CONSTRAINT "cursos_colegio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cursos_colegio_grados" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "curso_colegio_id" UUID NOT NULL,
    "anio" INTEGER NOT NULL,
    "nivel" "Nivel" NOT NULL,
    "grado" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "cursos_colegio_grados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "temas_curriculares_area_cneb_nivel_grado_estado_idx" ON "temas_curriculares"("area_cneb", "nivel", "grado", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "tema_desempenos_oficiales_tema_clave_codigo_desempeno_fuent_key" ON "tema_desempenos_oficiales"("tema_clave", "codigo_desempeno", "fuente_id");

-- CreateIndex
CREATE INDEX "cursos_colegio_tenant_id_archivado_at_idx" ON "cursos_colegio"("tenant_id", "archivado_at");

-- CreateIndex
CREATE UNIQUE INDEX "cursos_colegio_tenant_id_id_key" ON "cursos_colegio"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "cursos_colegio_tenant_id_curso_khipu_key" ON "cursos_colegio"("tenant_id", "curso_khipu");

-- CreateIndex
CREATE INDEX "cursos_colegio_grados_tenant_id_anio_nivel_grado_idx" ON "cursos_colegio_grados"("tenant_id", "anio", "nivel", "grado");

-- CreateIndex
CREATE UNIQUE INDEX "cursos_colegio_grados_curso_colegio_id_anio_nivel_grado_key" ON "cursos_colegio_grados"("curso_colegio_id", "anio", "nivel", "grado");

-- CreateIndex
CREATE INDEX "cursos_tenant_id_curso_colegio_id_idx" ON "cursos"("tenant_id", "curso_colegio_id");

-- AddForeignKey
ALTER TABLE "cursos" ADD CONSTRAINT "cursos_tenant_id_curso_colegio_id_fkey" FOREIGN KEY ("tenant_id", "curso_colegio_id") REFERENCES "cursos_colegio"("tenant_id", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tema_desempenos_oficiales" ADD CONSTRAINT "tema_desempenos_oficiales_tema_clave_fkey" FOREIGN KEY ("tema_clave") REFERENCES "temas_curriculares"("clave") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cursos_colegio" ADD CONSTRAINT "cursos_colegio_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cursos_colegio_grados" ADD CONSTRAINT "cursos_colegio_grados_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cursos_colegio_grados" ADD CONSTRAINT "cursos_colegio_grados_tenant_id_curso_colegio_id_fkey" FOREIGN KEY ("tenant_id", "curso_colegio_id") REFERENCES "cursos_colegio"("tenant_id", "id") ON DELETE NO ACTION ON UPDATE CASCADE;


-- Validez básica del índice y de la malla anual.
ALTER TABLE public.temas_curriculares ADD CONSTRAINT temas_curriculares_version_positiva CHECK (version > 0);
ALTER TABLE public.temas_curriculares ADD CONSTRAINT temas_curriculares_grado_valido CHECK ((nivel = 'primaria' AND grado BETWEEN 1 AND 6) OR (nivel = 'secundaria' AND grado BETWEEN 1 AND 5) OR (nivel = 'inicial' AND grado BETWEEN 3 AND 5) OR (nivel = 'academia' AND grado > 0));
ALTER TABLE public.cursos_colegio_grados ADD CONSTRAINT cursos_colegio_grados_anio_valido CHECK (anio BETWEEN 2000 AND 2100);
ALTER TABLE public.cursos_colegio_grados ADD CONSTRAINT cursos_colegio_grados_grado_valido CHECK ((nivel = 'primaria' AND grado BETWEEN 1 AND 6) OR (nivel = 'secundaria' AND grado BETWEEN 1 AND 5) OR (nivel = 'inicial' AND grado BETWEEN 3 AND 5) OR (nivel = 'academia' AND grado > 0));

-- RLS cerrado: Prisma usa la conexión de servidor; anon/authenticated no leen ni escriben.
ALTER TABLE public.temas_curriculares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temas_curriculares FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.temas_curriculares FROM anon, authenticated;
ALTER TABLE public.tema_desempenos_oficiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tema_desempenos_oficiales FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.tema_desempenos_oficiales FROM anon, authenticated;
ALTER TABLE public.cursos_colegio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cursos_colegio FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.cursos_colegio FROM anon, authenticated;
ALTER TABLE public.cursos_colegio_grados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cursos_colegio_grados FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.cursos_colegio_grados FROM anon, authenticated;
