-- Índices de rendimiento de la prueba de estrés local (docs/pruebas-de-estres.md). Solo CREATE INDEX: no toca datos.

-- FK sin índice: al borrar asistencias o membresías (borrar un colegio, corregir datos) Postgres recorría la tabla
-- entera por cada fila borrada (EXPLAIN: Seq Scan on avisos ≈ 5,6 ms por asistencia con 66 000 avisos).
CREATE INDEX "avisos_asistencia_id_idx" ON "avisos"("asistencia_id");
CREATE INDEX "avisos_apoderado_id_idx" ON "avisos"("apoderado_id");
CREATE INDEX "justificaciones_asistencia_id_idx" ON "justificaciones"("asistencia_id");
CREATE INDEX "justificacion_tokens_asistencia_id_idx" ON "justificacion_tokens"("asistencia_id");
CREATE INDEX "asistencias_curso_id_idx" ON "asistencias"("curso_id");
CREATE INDEX "asistencias_registrado_por_idx" ON "asistencias"("registrado_por");
CREATE INDEX "notas_registrado_por_idx" ON "notas"("registrado_por");

-- Tope diario global de la cola (cada lote de procesarCola): count(*) WHERE canal = 'correo' AND enviado_at >= now() - 24 h
-- era un Seq Scan sobre todos los avisos de todos los colegios.
CREATE INDEX "avisos_canal_enviado_at_idx" ON "avisos"("canal", "enviado_at");

-- Lecturas por alumno: familias a avisar al pasar lista y consentimiento vigente (destinatariosPorAlumno),
-- y notas del consolidado/libreta (Seq Scan on notas con 48 000 filas para un salón de 35 alumnos).
CREATE INDEX "apoderados_alumnos_alumno_id_idx" ON "apoderados_alumnos"("alumno_id");
CREATE INDEX "consentimientos_apoderado_id_idx" ON "consentimientos"("apoderado_id");
CREATE INDEX "notas_alumno_id_idx" ON "notas"("alumno_id");
