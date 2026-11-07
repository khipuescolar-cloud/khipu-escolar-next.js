-- CreateEnum
CREATE TYPE "CategoriaArchivo" AS ENUM ('documento', 'material_clase', 'material_tarea', 'entrega', 'solicitud', 'borrador', 'comunicado', 'soporte', 'justificacion', 'reunion', 'foto', 'logo', 'nudito', 'exportacion', 'otro');

-- CreateEnum
CREATE TYPE "EstadoSubida" AS ENUM ('pendiente', 'confirmada', 'fallida', 'expirada', 'cancelada');

-- AlterTable
ALTER TABLE "archivos" ADD COLUMN     "categoria" "CategoriaArchivo" NOT NULL DEFAULT 'otro',
ADD COLUMN     "sha256" TEXT;

-- CreateTable
CREATE TABLE "almacenamiento_colegio" (
    "tenant_id" UUID NOT NULL,
    "limite_bytes" BIGINT,
    "usado_bytes" BIGINT NOT NULL DEFAULT 0,
    "reservado_bytes" BIGINT NOT NULL DEFAULT 0,
    "reserva_critica_pct" INTEGER NOT NULL DEFAULT 5,
    "max_bytes_documento" INTEGER NOT NULL DEFAULT 26214400,
    "max_bytes_entrega" INTEGER NOT NULL DEFAULT 10485760,
    "max_archivos_entrega" INTEGER NOT NULL DEFAULT 3,
    "cuota_borrador_bytes" BIGINT NOT NULL DEFAULT 2147483648,
    "purga_automatica_activa" BOOLEAN NOT NULL DEFAULT false,
    "umbral_notificado" INTEGER NOT NULL DEFAULT 0,
    "actualizado_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "almacenamiento_colegio_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateTable
CREATE TABLE "uso_almacenamiento_categoria" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "categoria" "CategoriaArchivo" NOT NULL,
    "bytes" BIGINT NOT NULL DEFAULT 0,
    "archivos" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "uso_almacenamiento_categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subidas_archivo" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "categoria" "CategoriaArchivo" NOT NULL,
    "critica" BOOLEAN NOT NULL DEFAULT false,
    "nombre" TEXT NOT NULL,
    "mime_declarado" TEXT NOT NULL,
    "bytes_declarados" INTEGER NOT NULL,
    "proveedor" "ProveedorArchivo" NOT NULL,
    "public_id" TEXT NOT NULL,
    "estado" "EstadoSubida" NOT NULL DEFAULT 'pendiente',
    "reserva_bytes" BIGINT NOT NULL,
    "contexto" JSONB,
    "archivo_id" UUID,
    "error" TEXT,
    "expira_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmada_at" TIMESTAMPTZ,
    CONSTRAINT "subidas_archivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metricas_almacenamiento_dia" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "dia" DATE NOT NULL,
    "categoria" "CategoriaArchivo" NOT NULL,
    "subidas" INTEGER NOT NULL DEFAULT 0,
    "bytes_subidos" BIGINT NOT NULL DEFAULT 0,
    "borrados" INTEGER NOT NULL DEFAULT 0,
    "bytes_borrados" BIGINT NOT NULL DEFAULT 0,
    "descargas" INTEGER NOT NULL DEFAULT 0,
    "bytes_descarga_estimados" BIGINT NOT NULL DEFAULT 0,
    "rechazos_cuota" INTEGER NOT NULL DEFAULT 0,
    "subidas_fallidas" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "metricas_almacenamiento_dia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uso_almacenamiento_categoria_tenant_id_categoria_key" ON "uso_almacenamiento_categoria"("tenant_id", "categoria");

-- CreateIndex
CREATE INDEX "subidas_archivo_tenant_id_estado_expira_at_idx" ON "subidas_archivo"("tenant_id", "estado", "expira_at");

-- CreateIndex
CREATE UNIQUE INDEX "metricas_almacenamiento_dia_tenant_id_dia_categoria_key" ON "metricas_almacenamiento_dia"("tenant_id", "dia", "categoria");

-- CreateIndex
CREATE INDEX "archivos_tenant_id_categoria_idx" ON "archivos"("tenant_id", "categoria");

-- CreateIndex
CREATE INDEX "archivos_tenant_id_subido_por_categoria_idx" ON "archivos"("tenant_id", "subido_por", "categoria");

-- AddForeignKey
ALTER TABLE "almacenamiento_colegio" ADD CONSTRAINT "almacenamiento_colegio_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uso_almacenamiento_categoria" ADD CONSTRAINT "uso_almacenamiento_categoria_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subidas_archivo" ADD CONSTRAINT "subidas_archivo_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subidas_archivo" ADD CONSTRAINT "subidas_archivo_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subidas_archivo" ADD CONSTRAINT "subidas_archivo_archivo_id_fkey" FOREIGN KEY ("archivo_id") REFERENCES "archivos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metricas_almacenamiento_dia" ADD CONSTRAINT "metricas_almacenamiento_dia_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Categorías de las referencias heredadas. Los archivos sin enlace conservan «otro».
UPDATE archivos SET categoria = CASE
  WHEN documento_id IS NOT NULL THEN 'documento'::"CategoriaArchivo"
  WHEN entrega_id IS NOT NULL THEN 'entrega'::"CategoriaArchivo"
  WHEN tarea_id IS NOT NULL THEN 'material_tarea'::"CategoriaArchivo"
  WHEN comunicado_id IS NOT NULL THEN 'comunicado'::"CategoriaArchivo"
  WHEN mensaje_soporte_id IS NOT NULL THEN 'soporte'::"CategoriaArchivo"
  WHEN reunion_id IS NOT NULL THEN 'reunion'::"CategoriaArchivo"
  WHEN nudito_sesion_id IS NOT NULL THEN 'nudito'::"CategoriaArchivo"
  ELSE categoria END;
UPDATE archivos a SET categoria = 'justificacion' WHERE EXISTS (SELECT 1 FROM justificaciones j WHERE j.adjunto_archivo_id = a.id);
UPDATE archivos a SET categoria = 'foto' WHERE EXISTS (SELECT 1 FROM alumnos n WHERE n.foto_archivo_id = a.id);
UPDATE archivos a SET categoria = 'logo' WHERE EXISTS (SELECT 1 FROM tenants t WHERE t.logo_archivo_id = a.id);
UPDATE archivos a SET categoria = 'exportacion' WHERE EXISTS (SELECT 1 FROM exportaciones_colegio e WHERE e.archivo_id = a.id);

INSERT INTO almacenamiento_colegio (tenant_id, limite_bytes, usado_bytes, actualizado_at)
SELECT t.id,
  CASE WHEN t.plan = 'pro' THEN CASE
    WHEN count(a.id) FILTER (WHERE a.estado = 'activo') <= 100 THEN 20::bigint * 1024 * 1024 * 1024
    WHEN count(a.id) FILTER (WHERE a.estado = 'activo') <= 300 THEN 60::bigint * 1024 * 1024 * 1024
    WHEN count(a.id) FILTER (WHERE a.estado = 'activo') <= 600 THEN 120::bigint * 1024 * 1024 * 1024
    WHEN count(a.id) FILTER (WHERE a.estado = 'activo') <= 1000 THEN 250::bigint * 1024 * 1024 * 1024
    ELSE NULL END ELSE NULL END,
  COALESCE((SELECT sum(f.bytes)::bigint FROM archivos f WHERE f.tenant_id = t.id AND f.categoria <> 'exportacion'), 0), now()
FROM tenants t LEFT JOIN alumnos a ON a.tenant_id = t.id GROUP BY t.id;

INSERT INTO uso_almacenamiento_categoria (id, tenant_id, categoria, bytes, archivos)
SELECT gen_random_uuid(), tenant_id, categoria, sum(bytes)::bigint, count(*)::integer
FROM archivos GROUP BY tenant_id, categoria;

ALTER TABLE public.almacenamiento_colegio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.almacenamiento_colegio FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.almacenamiento_colegio FROM anon, authenticated;
ALTER TABLE public.uso_almacenamiento_categoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uso_almacenamiento_categoria FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.uso_almacenamiento_categoria FROM anon, authenticated;
ALTER TABLE public.subidas_archivo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subidas_archivo FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.subidas_archivo FROM anon, authenticated;
ALTER TABLE public.metricas_almacenamiento_dia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metricas_almacenamiento_dia FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.metricas_almacenamiento_dia FROM anon, authenticated;
