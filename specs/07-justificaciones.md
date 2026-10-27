# 07 — Justificaciones de faltas

> Estado: borrador (requisitos) · Última actualización: 2026-10-26 (Claude Code). Quien lo implemente completa las secciones de la plantilla. · Plan: Básico

## Flujo
1. El aviso de falta lleva el enlace `<raíz>/justificar/<token>`: token de un solo uso, que expira en 7 días y del que solo se guarda el hash en `justificacion_tokens`.
2. La página pública (no exige sesión, el token autoriza) muestra el alumno, la fecha y el colegio, y un formulario corto: **motivo** (obligatorio, máximo 500) y **adjunto opcional** (imagen o PDF de hasta 5 MB, spec 14). Si el token se usó o venció: «Este enlace ya se usó o venció. Escríbele a la tutora desde Khipu.»
3. El apoderado con sesión también puede justificar desde `/asistencia`.
4. Al enviar: `justificaciones` queda `pendiente`, el token se marca `usadoAt` y se avisa al tutor.
5. **Tutor o dirección** (`/justificaciones`): lista de pendientes; **Aceptar** o **Rechazar** con comentario opcional. La familia recibe un aviso neutral.

## Pruebas
- integración: el token se usa una sola vez, un token vencido falla, un token de otro colegio no sirve.
