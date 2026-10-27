-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('basico', 'fase2', 'promax');

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('direccion', 'profesor', 'apoderado', 'alumno', 'porteria');

-- CreateEnum
CREATE TYPE "EstadoMembresia" AS ENUM ('activa', 'invitada', 'inactiva');

-- CreateEnum
CREATE TYPE "EstadoTenant" AS ENUM ('activo', 'piloto', 'suspendido');

-- CreateEnum
CREATE TYPE "ModoAvisos" AS ENUM ('todos', 'solo_excepciones');

-- CreateEnum
CREATE TYPE "EscalaCalificacion" AS ENUM ('literal', 'vigesimal');

-- CreateEnum
CREATE TYPE "Nivel" AS ENUM ('inicial', 'primaria', 'secundaria', 'academia');

-- CreateEnum
CREATE TYPE "EstadoAlumno" AS ENUM ('activo', 'retirado');

-- CreateEnum
CREATE TYPE "EstadoAsistencia" AS ENUM ('llego', 'tarde', 'falta', 'problema');

-- CreateEnum
CREATE TYPE "OrigenAsistencia" AS ENUM ('lista', 'porteria');

-- CreateEnum
CREATE TYPE "TipoAviso" AS ENUM ('asistencia', 'resumen_llegadas', 'mensaje', 'comunicado', 'invitacion');

-- CreateEnum
CREATE TYPE "CanalAviso" AS ENUM ('correo', 'push');

-- CreateEnum
CREATE TYPE "EstadoAviso" AS ENUM ('pendiente', 'enviado', 'entregado', 'abierto', 'rebotado', 'queja', 'error', 'omitido');

-- CreateEnum
CREATE TYPE "EstadoJustificacion" AS ENUM ('pendiente', 'aceptada', 'rechazada');

-- CreateEnum
CREATE TYPE "ProveedorArchivo" AS ENUM ('local', 'cloudinary', 's3');

-- CreateEnum
CREATE TYPE "TipoPeriodo" AS ENUM ('bimestre', 'trimestre', 'semestre');

-- CreateEnum
CREATE TYPE "CalificacionLiteral" AS ENUM ('AD', 'A', 'B', 'C');

-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('evento', 'reunion', 'examen', 'feriado', 'actividad');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('reglamento', 'horario', 'calendario', 'otro');

-- CreateEnum
CREATE TYPE "AutorNudito" AS ENUM ('usuario', 'nudito');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ciudad" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'basico',
    "email_domains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "logo_archivo_id" UUID,
    "hora_envio_avisos" TEXT NOT NULL DEFAULT '09:00',
    "zona_horaria" TEXT NOT NULL DEFAULT 'America/Lima',
    "modo_avisos" "ModoAvisos" NOT NULL DEFAULT 'todos',
    "escala_calificacion" "EscalaCalificacion" NOT NULL DEFAULT 'literal',
    "estado" "EstadoTenant" NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL DEFAULT '',
    "telefono" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rol" "Rol" NOT NULL,
    "estado" "EstadoMembresia" NOT NULL DEFAULT 'activa',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "nivel" "Nivel" NOT NULL,
    "grado" INTEGER,
    "seccion" TEXT,
    "anio" INTEGER NOT NULL,
    "tutor_id" UUID,

    CONSTRAINT "salones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cursos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "salon_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "profesor_id" UUID,

    CONSTRAINT "cursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alumnos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "salon_id" UUID NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "codigo" TEXT,
    "estado" "EstadoAlumno" NOT NULL DEFAULT 'activo',
    "foto_archivo_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alumnos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apoderados_alumnos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "apoderado_id" UUID NOT NULL,
    "alumno_id" UUID NOT NULL,
    "parentesco" TEXT NOT NULL DEFAULT 'apoderado',
    "recibe_avisos" BOOLEAN NOT NULL DEFAULT true,
    "consentimiento_id" UUID,

    CONSTRAINT "apoderados_alumnos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consentimientos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "apoderado_id" UUID NOT NULL,
    "version_texto" TEXT NOT NULL,
    "aceptado_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "revocado_at" TIMESTAMPTZ,

    CONSTRAINT "consentimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" UUID NOT NULL,
    "actor_id" UUID,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidad_id" TEXT,
    "detalle" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_intentos" (
    "id" BIGSERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "exito" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_intentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asistencias" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "alumno_id" UUID NOT NULL,
    "curso_id" UUID,
    "fecha" DATE NOT NULL,
    "hora" TEXT NOT NULL,
    "estado" "EstadoAsistencia" NOT NULL,
    "nota" TEXT,
    "origen" "OrigenAsistencia" NOT NULL DEFAULT 'lista',
    "registrado_por" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "asistencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avisos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tipo" "TipoAviso" NOT NULL,
    "canal" "CanalAviso" NOT NULL,
    "asistencia_id" UUID,
    "apoderado_id" UUID,
    "destinatario" TEXT NOT NULL,
    "plantilla" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "provider_message_id" TEXT,
    "estado" "EstadoAviso" NOT NULL DEFAULT 'pendiente',
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "programado_para" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviado_at" TIMESTAMPTZ,
    "entregado_at" TIMESTAMPTZ,
    "abierto_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avisos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "justificacion_tokens" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "asistencia_id" UUID NOT NULL,
    "apoderado_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expira_at" TIMESTAMPTZ NOT NULL,
    "usado_at" TIMESTAMPTZ,

    CONSTRAINT "justificacion_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "justificaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "asistencia_id" UUID NOT NULL,
    "apoderado_id" UUID NOT NULL,
    "motivo" TEXT NOT NULL,
    "adjunto_archivo_id" UUID,
    "estado" "EstadoJustificacion" NOT NULL DEFAULT 'pendiente',
    "revisado_por" UUID,
    "revisado_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "justificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archivos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "proveedor" "ProveedorArchivo" NOT NULL,
    "public_id" TEXT NOT NULL,
    "url" TEXT,
    "mime_type" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "privado" BOOLEAN NOT NULL DEFAULT true,
    "subido_por" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "alumno_id" UUID NOT NULL,
    "profesor_id" UUID NOT NULL,
    "apoderado_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensajes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "conversacion_id" UUID NOT NULL,
    "autor_id" UUID NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "leido_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensajes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comunicados" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "autor_id" UUID NOT NULL,
    "salon_id" UUID,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "publicado_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comunicados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_suscripciones" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_suscripciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preferencias_aviso" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "apoderado_id" UUID NOT NULL,
    "correo" BOOLEAN NOT NULL DEFAULT true,
    "push" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "preferencias_aviso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carnets_qr" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "alumno_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revocado_at" TIMESTAMPTZ,

    CONSTRAINT "carnets_qr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periodos" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "anio" INTEGER NOT NULL,
    "tipo" "TipoPeriodo" NOT NULL,
    "numero" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "inicio" DATE NOT NULL,
    "fin" DATE NOT NULL,
    "cerrado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "periodos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competencias" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "curso_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "competencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "curso_id" UUID NOT NULL,
    "periodo_id" UUID NOT NULL,
    "competencia_id" UUID,
    "titulo" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "peso" DECIMAL(5,2) NOT NULL DEFAULT 1,

    CONSTRAINT "evaluaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "evaluacion_id" UUID NOT NULL,
    "alumno_id" UUID NOT NULL,
    "valor_literal" "CalificacionLiteral",
    "valor_numerico" DECIMAL(4,2),
    "comentario" TEXT,
    "registrado_por" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "notas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calificaciones_periodo" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "alumno_id" UUID NOT NULL,
    "competencia_id" UUID NOT NULL,
    "periodo_id" UUID NOT NULL,
    "valor_literal" "CalificacionLiteral",
    "valor_numerico" DECIMAL(4,2),
    "conclusion" TEXT,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "calificaciones_periodo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tareas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "curso_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "fecha_entrega" TIMESTAMPTZ NOT NULL,
    "creado_por" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tareas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_agenda" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "salon_id" UUID,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" "TipoEvento" NOT NULL DEFAULT 'evento',
    "inicio" TIMESTAMPTZ NOT NULL,
    "fin" TIMESTAMPTZ,
    "creado_por" UUID NOT NULL,

    CONSTRAINT "eventos_agenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_colegio" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "tipo" "TipoDocumento" NOT NULL,
    "titulo" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "documentos_colegio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nudito_conversaciones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "alumno_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nudito_conversaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nudito_mensajes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "conversacion_id" UUID NOT NULL,
    "autor" "AutorNudito" NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "intencion" TEXT,
    "derivado" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nudito_mensajes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "memberships_user_id_idx" ON "memberships"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_tenant_id_user_id_rol_key" ON "memberships"("tenant_id", "user_id", "rol");

-- CreateIndex
CREATE INDEX "salones_tenant_id_idx" ON "salones"("tenant_id");

-- CreateIndex
CREATE INDEX "cursos_tenant_id_idx" ON "cursos"("tenant_id");

-- CreateIndex
CREATE INDEX "cursos_profesor_id_idx" ON "cursos"("profesor_id");

-- CreateIndex
CREATE INDEX "alumnos_tenant_id_salon_id_idx" ON "alumnos"("tenant_id", "salon_id");

-- CreateIndex
CREATE INDEX "apoderados_alumnos_tenant_id_idx" ON "apoderados_alumnos"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "apoderados_alumnos_apoderado_id_alumno_id_key" ON "apoderados_alumnos"("apoderado_id", "alumno_id");

-- CreateIndex
CREATE INDEX "consentimientos_tenant_id_apoderado_id_idx" ON "consentimientos"("tenant_id", "apoderado_id");

-- CreateIndex
CREATE INDEX "auditoria_tenant_id_created_at_idx" ON "auditoria"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "login_intentos_email_created_at_idx" ON "login_intentos"("email", "created_at");

-- CreateIndex
CREATE INDEX "login_intentos_ip_created_at_idx" ON "login_intentos"("ip", "created_at");

-- CreateIndex
CREATE INDEX "asistencias_tenant_id_fecha_idx" ON "asistencias"("tenant_id", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "avisos_provider_message_id_key" ON "avisos"("provider_message_id");

-- CreateIndex
CREATE INDEX "avisos_estado_programado_para_idx" ON "avisos"("estado", "programado_para");

-- CreateIndex
CREATE INDEX "avisos_tenant_id_created_at_idx" ON "avisos"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "justificacion_tokens_token_hash_key" ON "justificacion_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "justificaciones_tenant_id_estado_idx" ON "justificaciones"("tenant_id", "estado");

-- CreateIndex
CREATE INDEX "archivos_tenant_id_idx" ON "archivos"("tenant_id");

-- CreateIndex
CREATE INDEX "conversaciones_tenant_id_idx" ON "conversaciones"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversaciones_alumno_id_profesor_id_apoderado_id_key" ON "conversaciones"("alumno_id", "profesor_id", "apoderado_id");

-- CreateIndex
CREATE INDEX "mensajes_conversacion_id_created_at_idx" ON "mensajes"("conversacion_id", "created_at");

-- CreateIndex
CREATE INDEX "comunicados_tenant_id_publicado_at_idx" ON "comunicados"("tenant_id", "publicado_at");

-- CreateIndex
CREATE UNIQUE INDEX "push_suscripciones_endpoint_key" ON "push_suscripciones"("endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "preferencias_aviso_apoderado_id_key" ON "preferencias_aviso"("apoderado_id");

-- CreateIndex
CREATE UNIQUE INDEX "carnets_qr_token_hash_key" ON "carnets_qr"("token_hash");

-- CreateIndex
CREATE INDEX "carnets_qr_tenant_id_alumno_id_idx" ON "carnets_qr"("tenant_id", "alumno_id");

-- CreateIndex
CREATE UNIQUE INDEX "periodos_tenant_id_anio_tipo_numero_key" ON "periodos"("tenant_id", "anio", "tipo", "numero");

-- CreateIndex
CREATE INDEX "competencias_tenant_id_curso_id_idx" ON "competencias"("tenant_id", "curso_id");

-- CreateIndex
CREATE INDEX "evaluaciones_tenant_id_curso_id_periodo_id_idx" ON "evaluaciones"("tenant_id", "curso_id", "periodo_id");

-- CreateIndex
CREATE UNIQUE INDEX "notas_evaluacion_id_alumno_id_key" ON "notas"("evaluacion_id", "alumno_id");

-- CreateIndex
CREATE UNIQUE INDEX "calificaciones_periodo_alumno_id_competencia_id_periodo_id_key" ON "calificaciones_periodo"("alumno_id", "competencia_id", "periodo_id");

-- CreateIndex
CREATE INDEX "tareas_tenant_id_fecha_entrega_idx" ON "tareas"("tenant_id", "fecha_entrega");

-- CreateIndex
CREATE INDEX "eventos_agenda_tenant_id_inicio_idx" ON "eventos_agenda"("tenant_id", "inicio");

-- CreateIndex
CREATE INDEX "documentos_colegio_tenant_id_tipo_idx" ON "documentos_colegio"("tenant_id", "tipo");

-- CreateIndex
CREATE INDEX "nudito_conversaciones_tenant_id_membership_id_idx" ON "nudito_conversaciones"("tenant_id", "membership_id");

-- CreateIndex
CREATE INDEX "nudito_mensajes_conversacion_id_created_at_idx" ON "nudito_mensajes"("conversacion_id", "created_at");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salones" ADD CONSTRAINT "salones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salones" ADD CONSTRAINT "salones_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cursos" ADD CONSTRAINT "cursos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cursos" ADD CONSTRAINT "cursos_salon_id_fkey" FOREIGN KEY ("salon_id") REFERENCES "salones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cursos" ADD CONSTRAINT "cursos_profesor_id_fkey" FOREIGN KEY ("profesor_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alumnos" ADD CONSTRAINT "alumnos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alumnos" ADD CONSTRAINT "alumnos_salon_id_fkey" FOREIGN KEY ("salon_id") REFERENCES "salones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apoderados_alumnos" ADD CONSTRAINT "apoderados_alumnos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apoderados_alumnos" ADD CONSTRAINT "apoderados_alumnos_apoderado_id_fkey" FOREIGN KEY ("apoderado_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apoderados_alumnos" ADD CONSTRAINT "apoderados_alumnos_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apoderados_alumnos" ADD CONSTRAINT "apoderados_alumnos_consentimiento_id_fkey" FOREIGN KEY ("consentimiento_id") REFERENCES "consentimientos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consentimientos" ADD CONSTRAINT "consentimientos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consentimientos" ADD CONSTRAINT "consentimientos_apoderado_id_fkey" FOREIGN KEY ("apoderado_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avisos" ADD CONSTRAINT "avisos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avisos" ADD CONSTRAINT "avisos_asistencia_id_fkey" FOREIGN KEY ("asistencia_id") REFERENCES "asistencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avisos" ADD CONSTRAINT "avisos_apoderado_id_fkey" FOREIGN KEY ("apoderado_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "justificacion_tokens" ADD CONSTRAINT "justificacion_tokens_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "justificacion_tokens" ADD CONSTRAINT "justificacion_tokens_asistencia_id_fkey" FOREIGN KEY ("asistencia_id") REFERENCES "asistencias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "justificacion_tokens" ADD CONSTRAINT "justificacion_tokens_apoderado_id_fkey" FOREIGN KEY ("apoderado_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "justificaciones" ADD CONSTRAINT "justificaciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "justificaciones" ADD CONSTRAINT "justificaciones_asistencia_id_fkey" FOREIGN KEY ("asistencia_id") REFERENCES "asistencias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "justificaciones" ADD CONSTRAINT "justificaciones_apoderado_id_fkey" FOREIGN KEY ("apoderado_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "justificaciones" ADD CONSTRAINT "justificaciones_revisado_por_fkey" FOREIGN KEY ("revisado_por") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "justificaciones" ADD CONSTRAINT "justificaciones_adjunto_archivo_id_fkey" FOREIGN KEY ("adjunto_archivo_id") REFERENCES "archivos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_profesor_id_fkey" FOREIGN KEY ("profesor_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_apoderado_id_fkey" FOREIGN KEY ("apoderado_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_conversacion_id_fkey" FOREIGN KEY ("conversacion_id") REFERENCES "conversaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comunicados" ADD CONSTRAINT "comunicados_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comunicados" ADD CONSTRAINT "comunicados_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comunicados" ADD CONSTRAINT "comunicados_salon_id_fkey" FOREIGN KEY ("salon_id") REFERENCES "salones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_suscripciones" ADD CONSTRAINT "push_suscripciones_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preferencias_aviso" ADD CONSTRAINT "preferencias_aviso_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preferencias_aviso" ADD CONSTRAINT "preferencias_aviso_apoderado_id_fkey" FOREIGN KEY ("apoderado_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carnets_qr" ADD CONSTRAINT "carnets_qr_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carnets_qr" ADD CONSTRAINT "carnets_qr_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodos" ADD CONSTRAINT "periodos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competencias" ADD CONSTRAINT "competencias_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competencias" ADD CONSTRAINT "competencias_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluaciones" ADD CONSTRAINT "evaluaciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluaciones" ADD CONSTRAINT "evaluaciones_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluaciones" ADD CONSTRAINT "evaluaciones_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "periodos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluaciones" ADD CONSTRAINT "evaluaciones_competencia_id_fkey" FOREIGN KEY ("competencia_id") REFERENCES "competencias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_evaluacion_id_fkey" FOREIGN KEY ("evaluacion_id") REFERENCES "evaluaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas" ADD CONSTRAINT "notas_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calificaciones_periodo" ADD CONSTRAINT "calificaciones_periodo_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calificaciones_periodo" ADD CONSTRAINT "calificaciones_periodo_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calificaciones_periodo" ADD CONSTRAINT "calificaciones_periodo_competencia_id_fkey" FOREIGN KEY ("competencia_id") REFERENCES "competencias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calificaciones_periodo" ADD CONSTRAINT "calificaciones_periodo_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "periodos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_agenda" ADD CONSTRAINT "eventos_agenda_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_agenda" ADD CONSTRAINT "eventos_agenda_salon_id_fkey" FOREIGN KEY ("salon_id") REFERENCES "salones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_agenda" ADD CONSTRAINT "eventos_agenda_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_colegio" ADD CONSTRAINT "documentos_colegio_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_conversaciones" ADD CONSTRAINT "nudito_conversaciones_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_conversaciones" ADD CONSTRAINT "nudito_conversaciones_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_conversaciones" ADD CONSTRAINT "nudito_conversaciones_alumno_id_fkey" FOREIGN KEY ("alumno_id") REFERENCES "alumnos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_mensajes" ADD CONSTRAINT "nudito_mensajes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nudito_mensajes" ADD CONSTRAINT "nudito_mensajes_conversacion_id_fkey" FOREIGN KEY ("conversacion_id") REFERENCES "nudito_conversaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
