# 15 — Privacidad, auditoría y exportación (Ley 29733)

> Estado: borrador (requisitos) · Última actualización: 2026-10-26 (Claude Code). Quien lo implemente completa las secciones de la plantilla. · Plan: todos

- **Minimización:** el alumno no necesita cuenta y solo se piden los datos necesarios.
- **Consentimiento** versionado (`consentimientos`) antes de enviar avisos o subir fotos. Revocable desde el perfil del apoderado: al revocar, deja de recibir avisos.
- **Auditoría** (`auditar()`): ver la ficha o las notas de un alumno, cambios de asistencia y notas, exportaciones, lectura de chats por dirección. Vista para dirección en `/configuracion/auditoria`.
- **Exportación** (garantía de salida del piloto): dirección descarga un ZIP o JSON con todos los datos del colegio (`/api/exportar`, auditado).
- **Borrado:** script `pnpm khipu:borrar-colegio <slug>` (solo el equipo de Khipu), que hace cascade por `tenant_id` y borra los archivos del proveedor.
- Nunca se usan datos ni caras de alumnos reales en marketing sin consentimiento firmado. Los datos demo son ficticios.
- **Pendiente con un abogado:** texto del consentimiento, política de privacidad, contrato (titular o encargado) e inscripción del banco de datos.
