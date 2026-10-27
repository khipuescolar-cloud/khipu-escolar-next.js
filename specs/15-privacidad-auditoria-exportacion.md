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
3. **Exportación:** `GET /api/exportar` (solo dirección, `no-store`) descarga `<slug>-datos-<fecha>.zip` (`exportarColegioZip`): `colegio.json`, un `tablas/<tabla>.json` por tabla (más `perfiles`, los datos de contacto de los miembros), `archivos/<id>.<ext>` con los archivos subidos que el proveedor entregue (vía `FileStorage`; los que fallen se listan en el README) y un `README.txt` que explica el contenido. La lista de tablas se **deriva** de `Prisma.ModelName` (todo modelo que no sea global ni esté en `TABLAS_OMITIDAS`), de modo que una tabla nueva entra sola; un test compara esa lista con todos los modelos de `schema.prisma` que tienen `tenantId`. Se omiten `JustificacionToken` y `CarnetQr` (solo hashes de secretos). Queda auditada una vez (`exportar · colegio`, con conteos). `exportarColegio` devuelve lo mismo como objeto (una clave por delegado: `alumno`, `mensaje`…).
4. **Borrado:** `pnpm khipu:borrar-colegio <slug> --confirmar <slug> [--dry-run]` (`scripts/borrar-colegio.ts`): sin la confirmación idéntica no hace nada. Primero borra los archivos del colegio en el proveedor con `FileStorage` (si alguno falla o es de otro proveedor, aborta sin tocar la BD y se puede reintentar); luego borra el `tenant` y el cascade por `tenant_id` elimina sus datos. `--dry-run` solo cuenta y lista lo que se borraría. El script corre con `tsx --conditions=react-server` para poder importar `src/lib/server`.

## Reglas de negocio
- Minimización: el alumno no tiene cuenta; el chat nunca expone teléfono ni correo de la otra parte.
- Los datos demo son ficticios.

## Modelo de datos
`consentimientos`, `apoderados_alumnos.consentimientoId`, `auditoria`.

## Contratos de `src/lib/server`
`consentimiento.ts` (`estadoConsentimiento`, `requireConsentimiento`, `aceptarConsentimiento`, `revocarConsentimiento`), `exportar.ts` (`exportarColegio`, `exportarColegioZip`, `tablasExportadas`, `TABLAS_OMITIDAS`, `aJson`, `listarAuditoria`), `storage/index.ts` (`leerArchivo`, `borrarArchivoDelProveedor`).

## Rutas y UI
`/consentimiento`, `/perfil`, `/configuracion/auditoria`, `/api/exportar`.
- Diseño: `/perfil` con `EncabezadoPagina`, tarjeta de identidad (avatar, rol en `Badge`) y tarjeta de Privacidad; `/consentimiento` en tarjeta centrada con ícono, `Alerta` legal y botón «Acepto» grande. Resultados por toast.

## Errores y casos borde
Exportar o ver auditoría sin ser dirección → 403. Una tabla nueva de colegio se exporta sola; si guarda secretos hay que añadirla a `TABLAS_OMITIDAS` (el test falla si un modelo con `tenantId` no queda cubierto ni omitido a propósito).

## Pruebas
- integración: exportación solo dirección y auditada, visor de auditoría, revocación; `extras-edicion-ics-zip.test.ts` (cobertura de tablas vs. esquema Prisma, ZIP con JSON por tabla, README y archivo subido) · e2e: `direccion-panel.test.ts` (ZIP 200 para dirección con README y tablas, 403 para profesor).

## Pendientes
- **Con un abogado:** texto del consentimiento, política de privacidad, contrato e inscripción del banco de datos.
- Exportación asíncrona (cola) si algún colegio tiene muchos archivos: hoy el ZIP se arma en memoria en una sola petición.
- Consentimiento para fotos (cuando exista subida de fotos).
