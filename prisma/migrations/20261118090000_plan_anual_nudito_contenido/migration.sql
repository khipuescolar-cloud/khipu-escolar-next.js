-- CreateEnum
CREATE TYPE "EstadoPlanAnual" AS ENUM ('borrador', 'en_revision', 'con_observaciones', 'aprobado', 'publicado', 'archivado');

-- CreateEnum
CREATE TYPE "RolParticipantePlan" AS ENUM ('coordinador', 'docente');

-- CreateEnum
CREATE TYPE "EstadoObservacionPlan" AS ENUM ('abierta', 'resuelta');

-- CreateEnum
CREATE TYPE "DecisionConformidadPlan" AS ENUM ('conforme', 'observaciones');

-- CreateEnum
CREATE TYPE "EstadoLeccionNudito" AS ENUM ('borrador', 'en_revision', 'cambios_solicitados', 'aprobada', 'publicada', 'retirada');

-- CreateEnum
CREATE TYPE "OrigenLeccionNudito" AS ENUM ('catalogo', 'ia', 'ia_simulada', 'docente');

-- CreateEnum
CREATE TYPE "EstadoTrabajoContenido" AS ENUM ('pendiente', 'en_proceso', 'completado', 'fallido', 'cancelado');

-- CreateEnum
CREATE TYPE "EstadoItemTrabajo" AS ENUM ('pendiente', 'en_proceso', 'reutilizada', 'generada', 'fallida', 'omitida');

-- AlterEnum
ALTER TYPE "OperacionIaNudito" ADD VALUE 'generar_leccion';

-- DropForeignKey
ALTER TABLE "nudito_consumos_ia" DROP CONSTRAINT "nudito_consumos_ia_alumno_id_fkey";

-- AlterTable
ALTER TABLE "reuniones" ADD COLUMN     "plan_anual_id" UUID;

-- AlterTable
ALTER TABLE "nudito_consumos_ia" ADD COLUMN     "leccion_id" UUID,
ALTER COLUMN "alumno_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "planes_anuales" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "anio" INTEGER NOT NULL,
    "nivel" "Nivel" NOT NULL,
    "grado" INTEGER NOT NULL,
    "area" TEXT NOT NULL,
    "nombre_curso" TEXT NOT NULL,
    "estado" "EstadoPlanAnual" NOT NULL DEFAULT 'borrador',
    "coordinador_id" UUID,
    "ronda_revision" INTEGER NOT NULL DEFAULT 0,
    "version_publicada" INTEGER NOT NULL DEFAULT 0,
    "copiado_de_id" UUID,
    "creado_por_id" UUID NOT NULL,
    "aprobado_por_id" UUID,
    "aprobado_at" TIMESTAMPTZ,
    "publicado_por_id" UUID,
    "publicado_at" TIMESTAMPTZ,
    "archivado_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "planes_anuales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_anual_unidades" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "plan_anual_unidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_anual_temas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "tema_clave" TEXT NOT NULL,
    "unidad_id" UUID,
    "orden" INTEGER NOT NULL,
    "nota" TEXT,
    "propuesto_por_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_anual_temas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_anual_participantes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "rol" "RolParticipantePlan" NOT NULL DEFAULT 'docente',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fuera_de_asignacion" BOOLEAN NOT NULL DEFAULT false,
    "agregado_por_id" UUID,
    "motivo" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retirado_at" TIMESTAMPTZ,

    CONSTRAINT "plan_anual_participantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_anual_comentarios" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "tema_clave" TEXT,
    "autor_id" UUID NOT NULL,
    "contenido" TEXT NOT NULL,
    "es_observacion" BOOLEAN NOT NULL DEFAULT false,
    "estado" "EstadoObservacionPlan",
    "resuelto_por_id" UUID,
    "resolucion" TEXT,
    "resuelto_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_anual_comentarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_anual_conformidades" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "ronda" INTEGER NOT NULL,
    "membership_id" UUID NOT NULL,
    "decision" "DecisionConformidadPlan" NOT NULL,
    "comentario" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_anual_conformidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_anual_versiones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "temas" JSONB NOT NULL,
    "unidades" JSONB NOT NULL,
    "conformidades" JSONB NOT NULL,
    "motivo" TEXT,
    "publicado_por_id" UUID NOT NULL,
    "publicado_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_anual_versiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_anual_eventos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "actor_id" UUID,
    "tipo" TEXT NOT NULL,
    "detalle" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_anual_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nudito_lecciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tema_clave" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "estado" "EstadoLeccionNudito" NOT NULL DEFAULT 'borrador',
    "origen" "OrigenLeccionNudito" NOT NULL,
    "contenido" JSONB NOT NULL,
    "validacion" JSONB,
    "contenido_hash" TEXT NOT NULL,
    "creado_por_id" UUID,
    "aprobado_por_id" UUID,
    "aprobado_at" TIMESTAMPTZ,
    "publicado_por_id" UUID,
    "publicada_at" TIMESTAMPTZ,
    "comentario_revision" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "nudito_lecciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nudito_leccion_revisiones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "leccion_id" UUID NOT NULL,
    "actor_id" UUID,
    "accion" TEXT NOT NULL,
    "comentario" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nudito_leccion_revisiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nudito_trabajos_contenido" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "version_plan" INTEGER NOT NULL,
    "estado" "EstadoTrabajoContenido" NOT NULL DEFAULT 'pendiente',
    "total" INTEGER NOT NULL DEFAULT 0,
    "procesados" INTEGER NOT NULL DEFAULT 0,
    "reutilizados" INTEGER NOT NULL DEFAULT 0,
    "generados" INTEGER NOT NULL DEFAULT 0,
    "fallidos" INTEGER NOT NULL DEFAULT 0,
    "presupuesto_usd" DECIMAL(10,2),
    "costo_usd" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "creado_por_id" UUID,
    "error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "iniciado_at" TIMESTAMPTZ,
    "terminado_at" TIMESTAMPTZ,

    CONSTRAINT "nudito_trabajos_contenido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nudito_trabajo_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "trabajo_id" UUID NOT NULL,
    "tema_clave" TEXT NOT NULL,
    "estado" "EstadoItemTrabajo" NOT NULL DEFAULT 'pendiente',
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "leccion_id" UUID,
    "error" TEXT,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "nudito_trabajo_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "planes_anuales_tenant_id_estado_idx" ON "planes_anuales"("tenant_id", "estado");

-- CreateIndex
CREATE INDEX "planes_anuales_tenant_id_anio_idx" ON "planes_anuales"("tenant_id", "anio");

-- CreateIndex
CREATE UNIQUE INDEX "planes_anuales_tenant_id_anio_nivel_grado_area_key" ON "planes_anuales"("tenant_id", "anio", "nivel", "grado", "area");

-- CreateIndex
CREATE INDEX "plan_anual_unidades_plan_id_orden_idx" ON "plan_anual_unidades"("plan_id", "orden");

-- CreateIndex
CREATE INDEX "plan_anual_temas_plan_id_orden_idx" ON "plan_anual_temas"("plan_id", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "plan_anual_temas_plan_id_tema_clave_key" ON "plan_anual_temas"("plan_id", "tema_clave");

-- CreateIndex
CREATE INDEX "plan_anual_participantes_tenant_id_membership_id_idx" ON "plan_anual_participantes"("tenant_id", "membership_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_anual_participantes_plan_id_membership_id_key" ON "plan_anual_participantes"("plan_id", "membership_id");

-- CreateIndex
CREATE INDEX "plan_anual_comentarios_plan_id_created_at_idx" ON "plan_anual_comentarios"("plan_id", "created_at");

-- CreateIndex
CREATE INDEX "plan_anual_comentarios_plan_id_estado_idx" ON "plan_anual_comentarios"("plan_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "plan_anual_conformidades_plan_id_ronda_membership_id_key" ON "plan_anual_conformidades"("plan_id", "ronda", "membership_id");

-- CreateIndex
CREATE INDEX "plan_anual_versiones_tenant_id_plan_id_idx" ON "plan_anual_versiones"("tenant_id", "plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_anual_versiones_plan_id_numero_key" ON "plan_anual_versiones"("plan_id", "numero");

-- CreateIndex
CREATE INDEX "plan_anual_eventos_plan_id_created_at_idx" ON "plan_anual_eventos"("plan_id", "created_at");

-- CreateIndex
CREATE INDEX "nudito_lecciones_tenant_id_tema_clave_estado_idx" ON "nudito_lecciones"("tenant_id", "tema_clave", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "nudito_lecciones_tenant_id_tema_clave_version_key" ON "nudito_lecciones"("tenant_id", "tema_clave", "version");

-- CreateIndex
CREATE INDEX "nudito_leccion_revisiones_leccion_id_created_at_idx" ON "nudito_leccion_revisiones"("leccion_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "nudito_trabajos_contenido_tenant_id_plan_id_version_plan_key" ON "nudito_trabajos_contenido"("tenant_id", "plan_id", "version_plan");

-- CreateIndex
CREATE INDEX "nudito_trabajo_items_trabajo_id_estado_idx" ON "nudito_trabajo_items"("trabajo_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "nudito_trabajo_items_trabajo_id_tema_clave_key" ON "nudito_trabajo_items"("trabajo_id", "tema_clave");

-- CreateIndex
CREATE INDEX "reuniones_plan_anual_id_idx" ON "reuniones"("plan_anual_id");

-- CreateIndex
CREATE INDEX "nudito_consumos_ia_leccion_id_idx" ON "nudito_consumos_ia"("leccion_id");

-- AddForeignKey
ALTER TABLE "reuniones" ADD CONSTRAINT "reuniones_plan_anual_id_fkey" FOREIGN KEY ("plan_anual_id") REFERENCES "planes_anuales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_consumos_ia" ADD CONSTRAINT "nudito_consumos_ia_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_consumos_ia" ADD CONSTRAINT "nudito_consumos_ia_leccion_id_fkey" FOREIGN KEY ("leccion_id") REFERENCES "nudito_lecciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planes_anuales" ADD CONSTRAINT "planes_anuales_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planes_anuales" ADD CONSTRAINT "planes_anuales_coordinador_id_fkey" FOREIGN KEY ("coordinador_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planes_anuales" ADD CONSTRAINT "planes_anuales_copiado_de_id_fkey" FOREIGN KEY ("copiado_de_id") REFERENCES "planes_anuales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planes_anuales" ADD CONSTRAINT "planes_anuales_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "memberships"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planes_anuales" ADD CONSTRAINT "planes_anuales_aprobado_por_id_fkey" FOREIGN KEY ("aprobado_por_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planes_anuales" ADD CONSTRAINT "planes_anuales_publicado_por_id_fkey" FOREIGN KEY ("publicado_por_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_anual_unidades" ADD CONSTRAINT "plan_anual_unidades_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_anual_unidades" ADD CONSTRAINT "plan_anual_unidades_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "planes_anuales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_anual_temas" ADD CONSTRAINT "plan_anual_temas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_anual_temas" ADD CONSTRAINT "plan_anual_temas_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "planes_anuales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_anual_temas" ADD CONSTRAINT "plan_anual_temas_unidad_id_fkey" FOREIGN KEY ("unidad_id") REFERENCES "plan_anual_unidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_anual_temas" ADD CONSTRAINT "plan_anual_temas_propuesto_por_id_fkey" FOREIGN KEY ("propuesto_por_id") REFERENCES "memberships"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_anual_participantes" ADD CONSTRAINT "plan_anual_participantes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_anual_participantes" ADD CONSTRAINT "plan_anual_participantes_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "planes_anuales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_anual_participantes" ADD CONSTRAINT "plan_anual_participantes_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_anual_participantes" ADD CONSTRAINT "plan_anual_participantes_agregado_por_id_fkey" FOREIGN KEY ("agregado_por_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_anual_comentarios" ADD CONSTRAINT "plan_anual_comentarios_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_anual_comentarios" ADD CONSTRAINT "plan_anual_comentarios_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "planes_anuales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_anual_comentarios" ADD CONSTRAINT "plan_anual_comentarios_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "memberships"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_anual_comentarios" ADD CONSTRAINT "plan_anual_comentarios_resuelto_por_id_fkey" FOREIGN KEY ("resuelto_por_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_anual_conformidades" ADD CONSTRAINT "plan_anual_conformidades_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_anual_conformidades" ADD CONSTRAINT "plan_anual_conformidades_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "planes_anuales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_anual_conformidades" ADD CONSTRAINT "plan_anual_conformidades_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_anual_versiones" ADD CONSTRAINT "plan_anual_versiones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_anual_versiones" ADD CONSTRAINT "plan_anual_versiones_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "planes_anuales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_anual_versiones" ADD CONSTRAINT "plan_anual_versiones_publicado_por_id_fkey" FOREIGN KEY ("publicado_por_id") REFERENCES "memberships"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_anual_eventos" ADD CONSTRAINT "plan_anual_eventos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_anual_eventos" ADD CONSTRAINT "plan_anual_eventos_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "planes_anuales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_anual_eventos" ADD CONSTRAINT "plan_anual_eventos_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_lecciones" ADD CONSTRAINT "nudito_lecciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_lecciones" ADD CONSTRAINT "nudito_lecciones_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_lecciones" ADD CONSTRAINT "nudito_lecciones_aprobado_por_id_fkey" FOREIGN KEY ("aprobado_por_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_lecciones" ADD CONSTRAINT "nudito_lecciones_publicado_por_id_fkey" FOREIGN KEY ("publicado_por_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_leccion_revisiones" ADD CONSTRAINT "nudito_leccion_revisiones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_leccion_revisiones" ADD CONSTRAINT "nudito_leccion_revisiones_leccion_id_fkey" FOREIGN KEY ("leccion_id") REFERENCES "nudito_lecciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_leccion_revisiones" ADD CONSTRAINT "nudito_leccion_revisiones_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_trabajos_contenido" ADD CONSTRAINT "nudito_trabajos_contenido_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_trabajos_contenido" ADD CONSTRAINT "nudito_trabajos_contenido_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "planes_anuales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_trabajos_contenido" ADD CONSTRAINT "nudito_trabajos_contenido_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_trabajo_items" ADD CONSTRAINT "nudito_trabajo_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_trabajo_items" ADD CONSTRAINT "nudito_trabajo_items_trabajo_id_fkey" FOREIGN KEY ("trabajo_id") REFERENCES "nudito_trabajos_contenido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_trabajo_items" ADD CONSTRAINT "nudito_trabajo_items_leccion_id_fkey" FOREIGN KEY ("leccion_id") REFERENCES "nudito_lecciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Aislamiento RLS cerrado para clientes públicos.
ALTER TABLE public.planes_anuales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planes_anuales FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.planes_anuales FROM anon, authenticated;
ALTER TABLE public.plan_anual_unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_anual_unidades FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.plan_anual_unidades FROM anon, authenticated;
ALTER TABLE public.plan_anual_temas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_anual_temas FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.plan_anual_temas FROM anon, authenticated;
ALTER TABLE public.plan_anual_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_anual_participantes FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.plan_anual_participantes FROM anon, authenticated;
ALTER TABLE public.plan_anual_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_anual_comentarios FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.plan_anual_comentarios FROM anon, authenticated;
ALTER TABLE public.plan_anual_conformidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_anual_conformidades FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.plan_anual_conformidades FROM anon, authenticated;
ALTER TABLE public.plan_anual_versiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_anual_versiones FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.plan_anual_versiones FROM anon, authenticated;
ALTER TABLE public.plan_anual_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_anual_eventos FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.plan_anual_eventos FROM anon, authenticated;
ALTER TABLE public.nudito_lecciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nudito_lecciones FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.nudito_lecciones FROM anon, authenticated;
ALTER TABLE public.nudito_leccion_revisiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nudito_leccion_revisiones FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.nudito_leccion_revisiones FROM anon, authenticated;
ALTER TABLE public.nudito_trabajos_contenido ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nudito_trabajos_contenido FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.nudito_trabajos_contenido FROM anon, authenticated;
ALTER TABLE public.nudito_trabajo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nudito_trabajo_items FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.nudito_trabajo_items FROM anon, authenticated;

-- Invariantes locales de la planificación y preparación.
ALTER TABLE planes_anuales ADD CONSTRAINT planes_anuales_grado_check CHECK (grado BETWEEN 1 AND 6);
ALTER TABLE planes_anuales ADD CONSTRAINT planes_anuales_rondas_check CHECK (ronda_revision >= 0 AND version_publicada >= 0);
ALTER TABLE plan_anual_unidades ADD CONSTRAINT plan_anual_unidades_orden_check CHECK (orden >= 0);
ALTER TABLE plan_anual_temas ADD CONSTRAINT plan_anual_temas_orden_check CHECK (orden >= 0);
ALTER TABLE plan_anual_conformidades ADD CONSTRAINT plan_anual_conformidades_ronda_check CHECK (ronda >= 1);
ALTER TABLE plan_anual_versiones ADD CONSTRAINT plan_anual_versiones_numero_check CHECK (numero >= 1);
ALTER TABLE plan_anual_comentarios ADD CONSTRAINT plan_anual_comentarios_observacion_check CHECK (NOT es_observacion OR estado IS NOT NULL);
ALTER TABLE nudito_lecciones ADD CONSTRAINT nudito_lecciones_version_check CHECK (version >= 1);
ALTER TABLE nudito_trabajos_contenido ADD CONSTRAINT nudito_trabajos_contadores_check CHECK (version_plan >= 1 AND total >= 0 AND procesados >= 0 AND reutilizados >= 0 AND generados >= 0 AND fallidos >= 0 AND presupuesto_usd >= 0 AND costo_usd >= 0);
ALTER TABLE nudito_trabajo_items ADD CONSTRAINT nudito_trabajo_items_intentos_check CHECK (intentos >= 0);
