-- CreateEnum
CREATE TYPE "TipoContacto" AS ENUM ('principal', 'direccion_academica', 'administrativo', 'facturacion', 'tecnico', 'otro');

-- CreateEnum
CREATE TYPE "CicloFacturacion" AS ENUM ('mensual', 'anual');

-- CreateEnum
CREATE TYPE "EstadoSuscripcion" AS ENUM ('prueba', 'activa', 'suspendida', 'cancelada');

-- CreateEnum
CREATE TYPE "NivelAnuncio" AS ENUM ('info', 'novedad', 'mantenimiento', 'urgente');

-- CreateEnum
CREATE TYPE "AudienciaAnuncio" AS ENUM ('direccion', 'personal', 'todos');

-- CreateTable
CREATE TABLE "planes_catalogo" (
    "plan" "Plan" NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio_por_alumno" DECIMAL(8,2),
    "precio_minimo_mensual" DECIMAL(10,2),
    "max_alumnos" INTEGER,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "planes_catalogo_pkey" PRIMARY KEY ("plan")
);

-- CreateTable
CREATE TABLE "plan_modulos" (
    "plan" "Plan" NOT NULL,
    "modulo" TEXT NOT NULL,

    CONSTRAINT "plan_modulos_pkey" PRIMARY KEY ("plan","modulo")
);

-- CreateTable
CREATE TABLE "rol_modulos" (
    "rol" "Rol" NOT NULL,
    "modulo" TEXT NOT NULL,
    "habilitado" BOOLEAN NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "rol_modulos_pkey" PRIMARY KEY ("rol","modulo")
);

-- CreateTable
CREATE TABLE "tenant_modulos" (
    "tenant_id" UUID NOT NULL,
    "modulo" TEXT NOT NULL,
    "habilitado" BOOLEAN NOT NULL,
    "motivo" TEXT,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tenant_modulos_pkey" PRIMARY KEY ("tenant_id","modulo")
);

-- CreateTable
CREATE TABLE "contactos_colegio" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tipo" "TipoContacto" NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL DEFAULT '',
    "cargo" TEXT,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "membership_id" UUID,
    "notas" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "contactos_colegio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suscripciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "plan" "Plan" NOT NULL,
    "ciclo" "CicloFacturacion" NOT NULL DEFAULT 'mensual',
    "estado" "EstadoSuscripcion" NOT NULL DEFAULT 'prueba',
    "moneda" TEXT NOT NULL DEFAULT 'PEN',
    "monto_por_ciclo" DECIMAL(10,2) NOT NULL,
    "alumnos_contratados" INTEGER,
    "inicio" DATE NOT NULL,
    "proxima_renovacion" DATE NOT NULL,
    "notas" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "suscripciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos_registro" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'PEN',
    "fecha_pago" DATE NOT NULL,
    "periodo_desde" DATE NOT NULL,
    "periodo_hasta" DATE NOT NULL,
    "metodo" TEXT NOT NULL,
    "comprobante" TEXT,
    "registrado_por" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_registro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anuncios_plataforma" (
    "id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "nivel" "NivelAnuncio" NOT NULL DEFAULT 'info',
    "audiencia" "AudienciaAnuncio" NOT NULL DEFAULT 'direccion',
    "planes" "Plan"[] DEFAULT ARRAY[]::"Plan"[],
    "desde" TIMESTAMPTZ NOT NULL,
    "hasta" TIMESTAMPTZ NOT NULL,
    "creado_por" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anuncios_plataforma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feriados_extra" (
    "id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "nombre" TEXT NOT NULL,
    "tenant_id" UUID,
    "region" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feriados_extra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_plataforma" (
    "clave" TEXT NOT NULL,
    "valor" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "config_plataforma_pkey" PRIMARY KEY ("clave")
);

-- CreateIndex
CREATE INDEX "contactos_colegio_tenant_id_idx" ON "contactos_colegio"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "contactos_colegio_tenant_id_email_key" ON "contactos_colegio"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "suscripciones_tenant_id_key" ON "suscripciones"("tenant_id");

-- CreateIndex
CREATE INDEX "suscripciones_proxima_renovacion_idx" ON "suscripciones"("proxima_renovacion");

-- CreateIndex
CREATE INDEX "pagos_registro_tenant_id_fecha_pago_idx" ON "pagos_registro"("tenant_id", "fecha_pago");

-- CreateIndex
CREATE INDEX "anuncios_plataforma_desde_hasta_idx" ON "anuncios_plataforma"("desde", "hasta");

-- CreateIndex
CREATE INDEX "feriados_extra_fecha_idx" ON "feriados_extra"("fecha");

-- AddForeignKey
ALTER TABLE "plan_modulos" ADD CONSTRAINT "plan_modulos_plan_fkey" FOREIGN KEY ("plan") REFERENCES "planes_catalogo"("plan") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_modulos" ADD CONSTRAINT "tenant_modulos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contactos_colegio" ADD CONSTRAINT "contactos_colegio_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suscripciones" ADD CONSTRAINT "suscripciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos_registro" ADD CONSTRAINT "pagos_registro_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feriados_extra" ADD CONSTRAINT "feriados_extra_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Catálogo inicial = el mapa FEATURES de src/lib/planes.ts (el código lo usa de respaldo si la tabla está vacía).
INSERT INTO "planes_catalogo" ("plan", "nombre", "descripcion", "orden", "activo", "updated_at") VALUES
  ('basico', 'Básico', 'Asistencia con aviso a la familia, portería con QR, justificaciones, mensajes, comunicados y gestión del colegio.', 1, true, now()),
  ('fase2', 'Familia', 'Todo el plan Básico más notas por competencias, libreta, tareas y agenda.', 2, true, now()),
  ('promax', 'Pro Max', 'Todo el plan Familia más Nudito, el asistente para las familias.', 3, true, now());

INSERT INTO "plan_modulos" ("plan", "modulo")
SELECT p.plan::"Plan", m.modulo
FROM (VALUES ('basico'), ('fase2'), ('promax')) AS p(plan)
CROSS JOIN (VALUES ('asistencia'), ('avisos'), ('porteria'), ('justificaciones'), ('mensajes'), ('comunicados'), ('gestion')) AS m(modulo);
INSERT INTO "plan_modulos" ("plan", "modulo")
SELECT p.plan::"Plan", m.modulo
FROM (VALUES ('fase2'), ('promax')) AS p(plan)
CROSS JOIN (VALUES ('notas'), ('libreta'), ('tareas'), ('agenda')) AS m(modulo);
INSERT INTO "plan_modulos" ("plan", "modulo") VALUES ('promax', 'nudito');

-- Responsables: cada dirección activa de cada colegio pasa a ser contacto (la más antigua, principal).
INSERT INTO "contactos_colegio" ("id", "tenant_id", "tipo", "nombres", "apellidos", "cargo", "email", "telefono", "principal", "membership_id", "updated_at")
SELECT gen_random_uuid(), m.tenant_id,
       CASE WHEN ROW_NUMBER() OVER (PARTITION BY m.tenant_id ORDER BY m.created_at) = 1 THEN 'principal'::"TipoContacto" ELSE 'direccion_academica'::"TipoContacto" END,
       p.nombres, p.apellidos, m.cargo, p.email, p.telefono,
       ROW_NUMBER() OVER (PARTITION BY m.tenant_id ORDER BY m.created_at) = 1,
       m.id, now()
FROM "memberships" m JOIN "profiles" p ON p.id = m.user_id
WHERE m.rol = 'direccion' AND m.estado = 'activa'
ON CONFLICT ("tenant_id", "email") DO NOTHING;

-- RLS cerrado para anon/authenticated también en las tablas nuevas (idempotente).
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t.tablename);
  END LOOP;
END $$;
