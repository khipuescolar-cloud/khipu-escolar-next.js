-- CreateEnum
CREATE TYPE "EstadoExportacion" AS ENUM ('pendiente', 'procesando', 'lista', 'error');

-- AlterEnum
ALTER TYPE "TipoAviso" ADD VALUE 'libreta';

-- AlterTable
ALTER TABLE "alumnos" ADD COLUMN     "cuenta_id" UUID;

-- AlterTable
ALTER TABLE "archivos" ADD COLUMN     "comunicado_id" UUID,
ADD COLUMN     "nombre" TEXT,
ADD COLUMN     "tarea_id" UUID;

-- AlterTable
ALTER TABLE "login_intentos" ADD COLUMN     "user_id" UUID;

-- AlterTable
ALTER TABLE "periodos" ADD COLUMN     "libreta_publicada_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "ultimo_ingreso_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "salones" ADD COLUMN     "archivado_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "plazo_justificacion_horas" INTEGER NOT NULL DEFAULT 48;

-- CreateTable
CREATE TABLE "cierres_curso" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "periodo_id" UUID NOT NULL,
    "curso_id" UUID NOT NULL,
    "cerrado_por" UUID NOT NULL,
    "cerrado_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cierres_curso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exportaciones_colegio" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "solicitado_por" UUID NOT NULL,
    "estado" "EstadoExportacion" NOT NULL DEFAULT 'pendiente',
    "archivo_id" UUID,
    "error" TEXT,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminado_at" TIMESTAMPTZ,

    CONSTRAINT "exportaciones_colegio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accesos_soporte" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "motivo" TEXT NOT NULL,
    "inicio_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expira_at" TIMESTAMPTZ NOT NULL,
    "cerrado_at" TIMESTAMPTZ,

    CONSTRAINT "accesos_soporte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cierres_curso_tenant_id_idx" ON "cierres_curso"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "cierres_curso_periodo_id_curso_id_key" ON "cierres_curso"("periodo_id", "curso_id");

-- CreateIndex
CREATE INDEX "exportaciones_colegio_tenant_id_created_at_idx" ON "exportaciones_colegio"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "exportaciones_colegio_estado_created_at_idx" ON "exportaciones_colegio"("estado", "created_at");

-- CreateIndex
CREATE INDEX "accesos_soporte_tenant_id_inicio_at_idx" ON "accesos_soporte"("tenant_id", "inicio_at");

-- CreateIndex
CREATE INDEX "accesos_soporte_admin_id_expira_at_idx" ON "accesos_soporte"("admin_id", "expira_at");

-- CreateIndex
CREATE UNIQUE INDEX "alumnos_cuenta_id_key" ON "alumnos"("cuenta_id");

-- CreateIndex
CREATE INDEX "archivos_comunicado_id_idx" ON "archivos"("comunicado_id");

-- CreateIndex
CREATE INDEX "archivos_tarea_id_idx" ON "archivos"("tarea_id");

-- CreateIndex
CREATE INDEX "auditoria_plataforma_tenant_id_created_at_idx" ON "auditoria_plataforma"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "login_intentos_user_id_created_at_idx" ON "login_intentos"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "alumnos" ADD CONSTRAINT "alumnos_cuenta_id_fkey" FOREIGN KEY ("cuenta_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_comunicado_id_fkey" FOREIGN KEY ("comunicado_id") REFERENCES "comunicados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_tarea_id_fkey" FOREIGN KEY ("tarea_id") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cierres_curso" ADD CONSTRAINT "cierres_curso_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cierres_curso" ADD CONSTRAINT "cierres_curso_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "periodos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cierres_curso" ADD CONSTRAINT "cierres_curso_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cierres_curso" ADD CONSTRAINT "cierres_curso_cerrado_por_fkey" FOREIGN KEY ("cerrado_por") REFERENCES "memberships"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exportaciones_colegio" ADD CONSTRAINT "exportaciones_colegio_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exportaciones_colegio" ADD CONSTRAINT "exportaciones_colegio_archivo_id_fkey" FOREIGN KEY ("archivo_id") REFERENCES "archivos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accesos_soporte" ADD CONSTRAINT "accesos_soporte_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- RLS cerrado para anon/authenticated también en las tablas nuevas (idempotente; ver rls_cerrado_plataforma).
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t.tablename);
  END LOOP;
END $$;
