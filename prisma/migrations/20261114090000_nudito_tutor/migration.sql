-- Nudito, tutor educativo de Khipu Pro (specs/41–44). Paso 0: contratos. ADITIVA: no borra columnas, tablas ni datos.
-- - Catálogo propio por colegio (nudito_temas_colegio; el global vive en código), configuración institucional,
--   sesiones, ejercicios, intentos, dominio por tema y su historial, consumo de IA por llamada.
-- - cursos.area_cneb (+ area_cneb_manual) con relleno por prefijo de los desempeños CNEB importados (MAT/COM/CYT).
-- - nudito_mensajes.sesion_id, archivos.nudito_sesion_id, consentimientos_ia.asentimiento_alumno_at.
-- - Licencias y pagos de Nudito+ (familia/Yape) quedan intactos (inertes; specs/28 → specs/44).

-- CreateEnum
CREATE TYPE "TipoEjercicioNudito" AS ENUM ('opcion_multiple', 'numerico', 'fraccion', 'texto_corto', 'lectura', 'escritura_rubrica', 'relacionar', 'verdadero_falso');

-- CreateEnum
CREATE TYPE "EstadoSesionNudito" AS ENUM ('activa', 'finalizada', 'abandonada');

-- CreateEnum
CREATE TYPE "FaseSesionNudito" AS ENUM ('bienvenida', 'curso', 'tema', 'repaso', 'practica', 'comprobacion', 'resultados');

-- CreateEnum
CREATE TYPE "ResultadoIntentoNudito" AS ENUM ('correcto', 'parcial', 'incorrecto', 'incierto');

-- CreateEnum
CREATE TYPE "EstadoDominioNudito" AS ENUM ('no_iniciado', 'en_progreso', 'en_comprobacion', 'dominado', 'reforzar');

-- CreateEnum
CREATE TYPE "TipoEventoDominioNudito" AS ENUM ('dificultad_sube', 'dificultad_baja', 'estado', 'desbloqueo_tema', 'bloqueo_tema');

-- CreateEnum
CREATE TYPE "OperacionIaNudito" AS ENUM ('explicar', 'pista', 'retroalimentar_abierta', 'interpretar_imagen', 'preguntar', 'moderar', 'validar_tema');

-- AlterTable
ALTER TABLE "archivos" ADD COLUMN     "nudito_sesion_id" UUID;

-- AlterTable
ALTER TABLE "consentimientos_ia" ADD COLUMN     "asentimiento_alumno_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "cursos" ADD COLUMN     "area_cneb" TEXT,
ADD COLUMN     "area_cneb_manual" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "nudito_mensajes" ADD COLUMN     "sesion_id" UUID;

-- CreateTable
CREATE TABLE "nudito_config_colegio" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "bloqueado_plataforma" BOOLEAN NOT NULL DEFAULT false,
    "areas" TEXT[] DEFAULT ARRAY['matematica', 'comunicacion', 'ciencia-tecnologia']::TEXT[],
    "niveles" "Nivel"[] DEFAULT ARRAY['primaria', 'secundaria']::"Nivel"[],
    "grado_minimo_primaria" INTEGER NOT NULL DEFAULT 1,
    "permitir_modo_hijo" BOOLEAN NOT NULL DEFAULT true,
    "permitir_fotos" BOOLEAN NOT NULL DEFAULT false,
    "minutos_por_dia" INTEGER,
    "sesiones_por_dia" INTEGER NOT NULL DEFAULT 6,
    "tope_costo_usd_mes" DECIMAL(10,2),
    "retencion_dias" INTEGER NOT NULL DEFAULT 180,
    "hora_desde" TEXT,
    "hora_hasta" TEXT,
    "politica_dominio" JSONB,
    "actualizado_por" UUID,
    "activado_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "nudito_config_colegio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nudito_temas_colegio" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "area" TEXT NOT NULL,
    "competencia_cneb" INTEGER NOT NULL,
    "capacidad" TEXT,
    "desempeno_id" UUID,
    "nivel" "Nivel" NOT NULL,
    "grado" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "subtema" TEXT,
    "descripcion" TEXT,
    "palabras_clave" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "prerrequisitos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dificultad_min" INTEGER NOT NULL DEFAULT 1,
    "dificultad_max" INTEGER NOT NULL DEFAULT 5,
    "tipos" "TipoEjercicioNudito"[],
    "fuente" JSONB NOT NULL,
    "recursos" JSONB NOT NULL DEFAULT '[]',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_por" UUID NOT NULL,
    "revisado_por" UUID,
    "revisado_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nudito_temas_colegio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nudito_sesiones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "alumno_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "modo" "ModoNudito" NOT NULL DEFAULT 'alumno',
    "conversacion_id" UUID,
    "curso_id" UUID,
    "area" TEXT,
    "tema_clave" TEXT,
    "grado_tema" INTEGER,
    "fase" "FaseSesionNudito" NOT NULL DEFAULT 'bienvenida',
    "estado" "EstadoSesionNudito" NOT NULL DEFAULT 'activa',
    "dificultad" INTEGER NOT NULL DEFAULT 1,
    "semilla" INTEGER NOT NULL,
    "meta" INTEGER NOT NULL DEFAULT 5,
    "resumen" JSONB,
    "iniciada_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultima_actividad_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizada_at" TIMESTAMPTZ,

    CONSTRAINT "nudito_sesiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nudito_ejercicios" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sesion_id" UUID NOT NULL,
    "alumno_id" UUID NOT NULL,
    "tema_clave" TEXT NOT NULL,
    "tipo" "TipoEjercicioNudito" NOT NULL,
    "dificultad" INTEGER NOT NULL,
    "fuente_id" TEXT NOT NULL,
    "semilla" INTEGER NOT NULL,
    "enunciado" JSONB NOT NULL,
    "solucion" JSONB NOT NULL,
    "es_comprobacion" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL,
    "pistas_usadas" INTEGER NOT NULL DEFAULT 0,
    "presentado_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerrado_at" TIMESTAMPTZ,

    CONSTRAINT "nudito_ejercicios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nudito_intentos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "ejercicio_id" UUID NOT NULL,
    "alumno_id" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "respuesta" JSONB NOT NULL,
    "resultado" "ResultadoIntentoNudito" NOT NULL,
    "puntaje" DECIMAL(4,3) NOT NULL,
    "error_detectado" TEXT,
    "retro" TEXT NOT NULL,
    "evaluado_por" TEXT NOT NULL,
    "pistas_usadas" INTEGER NOT NULL,
    "tiempo_ms" INTEGER,
    "foto_archivo_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nudito_intentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nudito_dominios" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "alumno_id" UUID NOT NULL,
    "tema_clave" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "grado_tema" INTEGER NOT NULL,
    "estado" "EstadoDominioNudito" NOT NULL DEFAULT 'no_iniciado',
    "dificultad" INTEGER NOT NULL DEFAULT 1,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "aciertos" INTEGER NOT NULL DEFAULT 0,
    "aciertos_sin_pista" INTEGER NOT NULL DEFAULT 0,
    "sesiones_distintas" INTEGER NOT NULL DEFAULT 0,
    "racha" INTEGER NOT NULL DEFAULT 0,
    "evidencia" JSONB NOT NULL DEFAULT '[]',
    "motivo" TEXT,
    "politica_version" TEXT NOT NULL,
    "autorizado_por_evento_id" UUID,
    "dominado_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "nudito_dominios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nudito_dominio_eventos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "alumno_id" UUID NOT NULL,
    "tema_clave" TEXT NOT NULL,
    "tipo" "TipoEventoDominioNudito" NOT NULL,
    "de_estado" "EstadoDominioNudito",
    "a_estado" "EstadoDominioNudito",
    "de_dificultad" INTEGER,
    "a_dificultad" INTEGER,
    "motivo" TEXT NOT NULL,
    "evidencia" JSONB NOT NULL,
    "politica" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nudito_dominio_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nudito_consumos_ia" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "alumno_id" UUID NOT NULL,
    "sesion_id" UUID,
    "operacion" "OperacionIaNudito" NOT NULL,
    "proveedor" TEXT NOT NULL,
    "modelo" TEXT,
    "tokens_entrada" INTEGER NOT NULL DEFAULT 0,
    "tokens_salida" INTEGER NOT NULL DEFAULT 0,
    "costo_estimado_usd" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "latencia_ms" INTEGER,
    "cache" BOOLEAN NOT NULL DEFAULT false,
    "simulado" BOOLEAN NOT NULL DEFAULT true,
    "ok" BOOLEAN NOT NULL DEFAULT true,
    "error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nudito_consumos_ia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nudito_config_colegio_tenant_id_key" ON "nudito_config_colegio"("tenant_id");

-- CreateIndex
CREATE INDEX "nudito_temas_colegio_tenant_id_area_nivel_grado_idx" ON "nudito_temas_colegio"("tenant_id", "area", "nivel", "grado");

-- CreateIndex
CREATE INDEX "nudito_temas_colegio_desempeno_id_idx" ON "nudito_temas_colegio"("desempeno_id");

-- CreateIndex
CREATE INDEX "nudito_sesiones_tenant_id_alumno_id_estado_ultima_actividad_idx" ON "nudito_sesiones"("tenant_id", "alumno_id", "estado", "ultima_actividad_at");

-- CreateIndex
CREATE INDEX "nudito_sesiones_tenant_id_curso_id_iniciada_at_idx" ON "nudito_sesiones"("tenant_id", "curso_id", "iniciada_at");

-- CreateIndex
CREATE INDEX "nudito_ejercicios_tenant_id_alumno_id_tema_clave_presentado_idx" ON "nudito_ejercicios"("tenant_id", "alumno_id", "tema_clave", "presentado_at");

-- CreateIndex
CREATE UNIQUE INDEX "nudito_ejercicios_sesion_id_orden_key" ON "nudito_ejercicios"("sesion_id", "orden");

-- CreateIndex
CREATE INDEX "nudito_intentos_tenant_id_alumno_id_created_at_idx" ON "nudito_intentos"("tenant_id", "alumno_id", "created_at");

-- CreateIndex
CREATE INDEX "nudito_intentos_foto_archivo_id_idx" ON "nudito_intentos"("foto_archivo_id");

-- CreateIndex
CREATE UNIQUE INDEX "nudito_intentos_ejercicio_id_numero_key" ON "nudito_intentos"("ejercicio_id", "numero");

-- CreateIndex
CREATE INDEX "nudito_dominios_tenant_id_alumno_id_area_idx" ON "nudito_dominios"("tenant_id", "alumno_id", "area");

-- CreateIndex
CREATE INDEX "nudito_dominios_autorizado_por_evento_id_idx" ON "nudito_dominios"("autorizado_por_evento_id");

-- CreateIndex
CREATE UNIQUE INDEX "nudito_dominios_alumno_id_tema_clave_key" ON "nudito_dominios"("alumno_id", "tema_clave");

-- CreateIndex
CREATE INDEX "nudito_dominio_eventos_tenant_id_alumno_id_tema_clave_creat_idx" ON "nudito_dominio_eventos"("tenant_id", "alumno_id", "tema_clave", "created_at");

-- CreateIndex
CREATE INDEX "nudito_consumos_ia_tenant_id_created_at_idx" ON "nudito_consumos_ia"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "nudito_consumos_ia_alumno_id_created_at_idx" ON "nudito_consumos_ia"("alumno_id", "created_at");

-- CreateIndex
CREATE INDEX "nudito_consumos_ia_sesion_id_idx" ON "nudito_consumos_ia"("sesion_id");

-- CreateIndex
CREATE INDEX "archivos_nudito_sesion_id_idx" ON "archivos"("nudito_sesion_id");

-- CreateIndex
CREATE INDEX "cursos_tenant_id_area_cneb_idx" ON "cursos"("tenant_id", "area_cneb");

-- CreateIndex
CREATE INDEX "nudito_mensajes_sesion_id_created_at_idx" ON "nudito_mensajes"("sesion_id", "created_at");

-- AddForeignKey
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_nudito_sesion_id_fkey" FOREIGN KEY ("nudito_sesion_id") REFERENCES "nudito_sesiones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_mensajes" ADD CONSTRAINT "nudito_mensajes_sesion_id_fkey" FOREIGN KEY ("sesion_id") REFERENCES "nudito_sesiones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_config_colegio" ADD CONSTRAINT "nudito_config_colegio_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_temas_colegio" ADD CONSTRAINT "nudito_temas_colegio_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_temas_colegio" ADD CONSTRAINT "nudito_temas_colegio_desempeno_id_fkey" FOREIGN KEY ("desempeno_id") REFERENCES "desempenos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_sesiones" ADD CONSTRAINT "nudito_sesiones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_sesiones" ADD CONSTRAINT "nudito_sesiones_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_sesiones" ADD CONSTRAINT "nudito_sesiones_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_sesiones" ADD CONSTRAINT "nudito_sesiones_conversacion_id_fkey" FOREIGN KEY ("conversacion_id") REFERENCES "nudito_conversaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_sesiones" ADD CONSTRAINT "nudito_sesiones_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_ejercicios" ADD CONSTRAINT "nudito_ejercicios_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_ejercicios" ADD CONSTRAINT "nudito_ejercicios_sesion_id_fkey" FOREIGN KEY ("sesion_id") REFERENCES "nudito_sesiones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_ejercicios" ADD CONSTRAINT "nudito_ejercicios_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_intentos" ADD CONSTRAINT "nudito_intentos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_intentos" ADD CONSTRAINT "nudito_intentos_ejercicio_id_fkey" FOREIGN KEY ("ejercicio_id") REFERENCES "nudito_ejercicios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_intentos" ADD CONSTRAINT "nudito_intentos_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_intentos" ADD CONSTRAINT "nudito_intentos_foto_archivo_id_fkey" FOREIGN KEY ("foto_archivo_id") REFERENCES "archivos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_dominios" ADD CONSTRAINT "nudito_dominios_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_dominios" ADD CONSTRAINT "nudito_dominios_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_dominios" ADD CONSTRAINT "nudito_dominios_autorizado_por_evento_id_fkey" FOREIGN KEY ("autorizado_por_evento_id") REFERENCES "nudito_dominio_eventos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_dominio_eventos" ADD CONSTRAINT "nudito_dominio_eventos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_dominio_eventos" ADD CONSTRAINT "nudito_dominio_eventos_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_consumos_ia" ADD CONSTRAINT "nudito_consumos_ia_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_consumos_ia" ADD CONSTRAINT "nudito_consumos_ia_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_consumos_ia" ADD CONSTRAINT "nudito_consumos_ia_sesion_id_fkey" FOREIGN KEY ("sesion_id") REFERENCES "nudito_sesiones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Reglas que Prisma no declara ───
ALTER TABLE "cursos" ADD CONSTRAINT "cursos_area_cneb_formato" CHECK ("area_cneb" IS NULL OR "area_cneb" ~ '^[a-z]+(-[a-z]+)*$');
ALTER TABLE "nudito_config_colegio" ADD CONSTRAINT "nudito_config_retencion" CHECK ("retencion_dias" BETWEEN 30 AND 730);
ALTER TABLE "nudito_config_colegio" ADD CONSTRAINT "nudito_config_valores" CHECK (
  "grado_minimo_primaria" BETWEEN 1 AND 6 AND "sesiones_por_dia" BETWEEN 1 AND 50
  AND ("minutos_por_dia" IS NULL OR "minutos_por_dia" BETWEEN 5 AND 600)
  AND ("tope_costo_usd_mes" IS NULL OR "tope_costo_usd_mes" >= 0)
  AND ("hora_desde" IS NULL OR "hora_desde" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
  AND ("hora_hasta" IS NULL OR "hora_hasta" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'));
ALTER TABLE "nudito_temas_colegio" ADD CONSTRAINT "nudito_temas_valores" CHECK (
  "grado" BETWEEN 1 AND 6 AND "competencia_cneb" BETWEEN 1 AND 31
  AND "dificultad_min" BETWEEN 1 AND 5 AND "dificultad_max" BETWEEN "dificultad_min" AND 5);
ALTER TABLE "nudito_sesiones" ADD CONSTRAINT "nudito_sesiones_valores" CHECK (
  "dificultad" BETWEEN 1 AND 5 AND "meta" BETWEEN 1 AND 30 AND ("grado_tema" IS NULL OR "grado_tema" BETWEEN 1 AND 6));
ALTER TABLE "nudito_ejercicios" ADD CONSTRAINT "nudito_ejercicios_valores" CHECK (
  "dificultad" BETWEEN 1 AND 5 AND "orden" >= 1 AND "pistas_usadas" BETWEEN 0 AND 3);
ALTER TABLE "nudito_intentos" ADD CONSTRAINT "nudito_intentos_valores" CHECK (
  "puntaje" BETWEEN 0 AND 1 AND "numero" BETWEEN 1 AND 5 AND "pistas_usadas" BETWEEN 0 AND 3
  AND ("tiempo_ms" IS NULL OR "tiempo_ms" >= 0));
ALTER TABLE "nudito_dominios" ADD CONSTRAINT "nudito_dominios_valores" CHECK (
  "dificultad" BETWEEN 1 AND 5 AND "grado_tema" BETWEEN 1 AND 6
  AND "intentos" >= 0 AND "aciertos" BETWEEN 0 AND "intentos" AND "aciertos_sin_pista" BETWEEN 0 AND "aciertos"
  AND "sesiones_distintas" >= 0 AND "racha" >= 0);
ALTER TABLE "nudito_dominio_eventos" ADD CONSTRAINT "nudito_dominio_eventos_dificultad" CHECK (
  ("de_dificultad" IS NULL OR "de_dificultad" BETWEEN 1 AND 5) AND ("a_dificultad" IS NULL OR "a_dificultad" BETWEEN 1 AND 5));
ALTER TABLE "nudito_consumos_ia" ADD CONSTRAINT "nudito_consumos_ia_valores" CHECK (
  "tokens_entrada" >= 0 AND "tokens_salida" >= 0 AND "costo_estimado_usd" >= 0 AND ("latencia_ms" IS NULL OR "latencia_ms" >= 0));

-- ─── Relleno de cursos.area_cneb por el prefijo de los desempeños CNEB importados (specs/30: «MAT-C23-P3-01») ───
-- Gana el prefijo más frecuente del curso. Solo cursos sin área y no fijados a mano. El resto (por nombre del curso,
-- con `detectarArea`) lo completa `src/lib/server/nudito/areas-cursos.ts` (specs/42).
UPDATE "cursos" c SET "area_cneb" = x."area"
FROM (
  SELECT DISTINCT ON (y."curso_id") y."curso_id", y."area"
  FROM (
    SELECT comp."curso_id",
      CASE split_part(d."codigo", '-', 1) WHEN 'MAT' THEN 'matematica' WHEN 'COM' THEN 'comunicacion' WHEN 'CYT' THEN 'ciencia-tecnologia' END AS "area",
      count(*) AS "n"
    FROM "desempenos" d
    JOIN "competencias" comp ON comp."id" = d."competencia_id"
    WHERE d."codigo" ~ '^(MAT|COM|CYT)-C[0-9]+-'
    GROUP BY comp."curso_id", 2
  ) y
  ORDER BY y."curso_id", y."n" DESC, y."area"
) x
WHERE c."id" = x."curso_id" AND c."area_cneb" IS NULL AND NOT c."area_cneb_manual";

-- ─── RLS cerrado para anon/authenticated (Prisma usa el rol del servidor) ───
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['nudito_config_colegio', 'nudito_temas_colegio', 'nudito_sesiones', 'nudito_ejercicios',
    'nudito_intentos', 'nudito_dominios', 'nudito_dominio_eventos', 'nudito_consumos_ia'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    END IF;
  END LOOP;
END $$;
