# 05 — Portería con carnet QR

> Estado: borrador (requisitos) · Última actualización: 2026-10-26 (Claude Code). Quien lo implemente completa las secciones de la plantilla. · Plan: Básico

## Objetivo
Verificar la llegada del alumno en la puerta escaneando su carnet, sin depender solo de la lista del profesor.

## Flujo
1. **Dirección genera carnets** (`/gestion/carnets`): por salón, PDF o página imprimible con nombre, salón, logo y QR. El QR contiene `<APP_BASE_DOMAIN>/q/<token>`. El token es aleatorio (32 bytes base64url) y en `carnets_qr` solo se guarda su hash SHA-256. Se puede revocar o regenerar (carnet perdido).
2. **Portería** (`/porteria`, rol `porteria` o `direccion`): cámara con `@zxing/browser` en pantalla completa. Al leer un QR → server action `registrarLlegadaPorQr(token)`:
   - valida que el hash exista, esté `activo` y sea del **mismo colegio** del contexto;
   - registra la asistencia del día (`ambito = "dia"`, `origen = porteria`, estado `llego` o `tarde` según el horario de ingreso, configurable; por defecto, tarde desde las 08:00);
   - si ya tenía la llegada registrada hoy, no duplica y muestra «Ya registrado 7:52».
   - Responde en menos de 1 s con nombre, foto (si hay) y estado, de forma grande y con ícono + palabra, y con sonido o vibración opcional.
3. Encola el aviso a la familia (spec 06).
4. Respaldo manual: buscar al alumno por nombre o código si no trae el carnet.

## Seguridad
- Un QR de otro colegio → «Carnet no válido para este colegio».
- `/q/<token>` abierto por alguien sin sesión no muestra datos del alumno.

## Pruebas
- unit: generación y verificación del hash.
- integración: QR de otro colegio rechazado, sin duplicados.
