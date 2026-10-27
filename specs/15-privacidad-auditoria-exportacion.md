# 15 — Privacidad, auditoría y exportación (Ley 29733)

> Estado: implementado (el texto legal sigue pendiente) · Plan: todos · Última actualización: 2026-10-26 (Claude Code, rama `feat/gestion`)

## Objetivo
Cumplir lo mínimo de la Ley 29733 en el MVP: consentimiento, trazabilidad, garantía de salida y borrado.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Apoderado | Aceptar y retirar su consentimiento desde `/perfil` | Ver auditoría ni exportar |
| Dirección | Ver la auditoría (`/configuracion/auditoria`) y exportar los datos (`/api/exportar`) | — |
| Equipo Khipu | Borrar un colegio con el script | — |

## Flujos
1. **Consentimiento:** ver spec 10. Versionado (`CONSENTIMIENTO_VERSION = "v1-2026-10"`). Revocar: `consentimientos.revocadoAt`; desde entonces `encolarAviso` no encola correos para esa familia.
2. **Auditoría:** `auditar()` registra ver conversación (dirección), cambios de gestión, publicación de comunicados, exportación, aceptación/retiro de consentimiento y consulta de avisos. La vista muestra los últimos 200 y filtra por acción.
3. **Exportación:** `GET /api/exportar` (solo dirección, `no-store`) descarga `<slug>-datos-<fecha>.json` con todas las tablas del colegio y los perfiles de sus miembros. Omite los hashes de tokens de justificación y de carnets QR. Queda auditada (`exportar · colegio`). No hay ZIP todavía.
4. **Borrado:** `pnpm khipu:borrar-colegio <slug> --confirmar <slug>` (`scripts/borrar-colegio.ts`): sin la confirmación idéntica no hace nada; borra el `tenant` y el cascade por `tenant_id` elimina sus datos. Los archivos del proveedor se listan como pendientes hasta que exista FileStorage.

## Reglas de negocio
- Minimización: el alumno no tiene cuenta; el chat nunca expone teléfono ni correo de la otra parte.
- Los datos demo son ficticios.

## Modelo de datos
`consentimientos`, `apoderados_alumnos.consentimientoId`, `auditoria`.

## Contratos de `src/lib/server`
`consentimiento.ts` (`estadoConsentimiento`, `requireConsentimiento`, `aceptarConsentimiento`, `revocarConsentimiento`), `exportar.ts` (`exportarColegio`, `aJson`, `listarAuditoria`).

## Rutas y UI
`/consentimiento`, `/perfil`, `/configuracion/auditoria`, `/api/exportar`.

## Errores y casos borde
Exportar o ver auditoría sin ser dirección → 403. Un colegio con tablas nuevas debe agregarlas a `exportarColegio`.

## Pruebas
- integración: exportación solo dirección y auditada, visor de auditoría, revocación · e2e: `direccion-panel.test.ts` (descarga 200 para dirección, 403 para profesor).

## Pendientes
- **Con un abogado:** texto del consentimiento, política de privacidad, contrato e inscripción del banco de datos.
- Exportación en ZIP con archivos adjuntos; borrado de archivos en Cloudinary/S3 (spec 14).
- Consentimiento para fotos (cuando exista subida de fotos).
