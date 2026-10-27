# 15 — Privacidad, auditoría y exportación (Ley 29733)

> Estado: implementado (el texto legal sigue pendiente) · Plan: todos · Última actualización: 2026-10-27 (Claude Code, rama `feat/p2-exportacion`)

## Objetivo
Cumplir lo mínimo de la Ley 29733 en el MVP: consentimiento, trazabilidad, garantía de salida y borrado.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Apoderado | Aceptar y retirar su consentimiento desde `/perfil` | Ver auditoría ni exportar |
| Dirección | Ver la auditoría (`/configuracion/auditoria`) y exportar los datos (`/configuracion/exportar`) | — |
| Equipo Khipu | Borrar un colegio con el script | — |

## Flujos
1. **Consentimiento:** ver spec 10. Versionado (`CONSENTIMIENTO_VERSION = "v1-2026-10"`). Revocar: `consentimientos.revocadoAt`; desde entonces `encolarAviso` no encola correos para esa familia.
2. **Auditoría:** `auditar()` registra ver conversación (dirección), cambios de gestión, publicación de comunicados, exportación, aceptación/retiro de consentimiento y consulta de avisos. La vista muestra los últimos 200 y filtra por acción.
3. **Exportación (asíncrona):** dirección entra a `/configuracion/exportar` y pulsa «Preparar exportación» (`solicitarExportacion`): se crea una fila `pendiente` en `exportaciones_colegio` (si ya hay una `pendiente` o `procesando` del colegio, se reutiliza esa, sin duplicar). El cron `/api/cron/exportaciones` (mismo secreto y cabecera que `/api/cron/avisos`) ejecuta `procesarExportaciones()`: recupera las `procesando` colgadas (> 15 min; `terminadoAt` guarda la hora de reserva mientras está en `procesando`), reserva hasta 3 pendientes con `updateMany` atómico (`pendiente`→`procesando`, +1 intento), arma el ZIP, lo guarda con `FileStorage` como `Archivo` privado (`application/zip`, carpeta `exportaciones`) y marca `lista` con `archivoId` y `terminadoAt`. Si falla guarda `error`; vuelve a `pendiente` hasta 3 intentos y luego queda en `error`. **Vence a los 7 días:** el mismo cron borra el archivo del proveedor y de `archivos` (la FK deja `archivoId` en null); la fila queda `lista` sin archivo y la UI la muestra como «Vencida». La descarga es `GET /api/exportar/<id>` (solo dirección, auditada; local se sirve desde el servidor, S3/Cloudinary redirigen a una URL firmada de 5 min). `GET /api/exportar` queda como redirección a la página. El ZIP (`armarZip`, igual que `exportarColegioZip`, que se mantiene para pruebas y scripts) no incluye los ZIP de exportaciones anteriores y contiene: `colegio.json`, un `tablas/<tabla>.json` por tabla (más `perfiles`, los datos de contacto de los miembros), `archivos/<id>.<ext>` con los archivos subidos que el proveedor entregue (vía `FileStorage`; los que fallen se listan en el README) y un `README.txt` que explica el contenido. La lista de tablas se **deriva** de `Prisma.ModelName` (todo modelo que no sea global ni esté en `TABLAS_OMITIDAS`), de modo que una tabla nueva entra sola; un test compara esa lista con todos los modelos de `schema.prisma` que tienen `tenantId`. Se omiten `JustificacionToken` y `CarnetQr` (solo hashes de secretos). Queda auditada al terminar (`exportar · colegio`, con conteos; actor = quien la pidió) y cada descarga (`exportar · exportacion`). `exportarColegio` devuelve lo mismo como objeto (una clave por delegado: `alumno`, `mensaje`…).
4. **Borrado:** `pnpm khipu:borrar-colegio <slug> --confirmar <slug> [--dry-run]` (`scripts/borrar-colegio.ts`): sin la confirmación idéntica no hace nada. Primero borra los archivos del colegio en el proveedor con `FileStorage` (si alguno falla o es de otro proveedor, aborta sin tocar la BD y se puede reintentar); luego borra el `tenant` y el cascade por `tenant_id` elimina sus datos. `--dry-run` solo cuenta y lista lo que se borraría. El script corre con `tsx --conditions=react-server` para poder importar `src/lib/server`.

## Reglas de negocio
- Minimización: el alumno no tiene cuenta; el chat nunca expone teléfono ni correo de la otra parte.
- Los datos demo son ficticios.

## Modelo de datos
`consentimientos`, `apoderados_alumnos.consentimientoId`, `auditoria`.

## Contratos de `src/lib/server`
`consentimiento.ts` (`estadoConsentimiento`, `requireConsentimiento`, `aceptarConsentimiento`, `revocarConsentimiento`), `exportar.ts` (`solicitarExportacion`, `solicitarExportacionDireccion`, `procesarExportaciones`, `caducarExportaciones`, `listarExportaciones`, `exportacionDescargable`, `respuestaDescarga`, `exportarColegio`, `exportarColegioZip`, `tablasExportadas`, `TABLAS_OMITIDAS`, `aJson`, `listarAuditoria`), `storage/index.ts` (`leerArchivo`, `borrarArchivoDelProveedor`).

## Rutas y UI
`/consentimiento`, `/perfil`, `/configuracion/auditoria`, `/configuracion/exportar`, `/api/exportar` (redirige), `/api/exportar/[id]` (descarga), `/api/cron/exportaciones`.
- Diseño: `/perfil` con `EncabezadoPagina`, tarjeta de identidad (avatar, rol en `Badge`) y tarjeta de Privacidad; `/consentimiento` en tarjeta centrada con ícono, `Alerta` legal y botón «Acepto» grande. Resultados por toast.

## Errores y casos borde
Exportar o ver auditoría sin ser dirección → 403. Una tabla nueva de colegio se exporta sola; si guarda secretos hay que añadirla a `TABLAS_OMITIDAS` (el test falla si un modelo con `tenantId` no queda cubierto ni omitido a propósito).

## Pruebas
- integración: exportación solo dirección y auditada, visor de auditoría, revocación; `extras-edicion-ics-zip.test.ts` (cobertura de tablas vs. esquema Prisma, ZIP con JSON por tabla, README y archivo subido) · `exportacion-asincrona-archivos.test.ts` (solicitud solo dirección y sin duplicados, worker, reserva atómica, recuperación de colgadas, reintentos/error, vencimiento a 7 días, descarga acotada al colegio) · e2e: `direccion-panel.test.ts` (página de exportación y botón, 403 para profesor).

## Pendientes
- **Con un abogado:** texto del consentimiento, política de privacidad, contrato e inscripción del banco de datos.
- Programar el cron `/api/cron/exportaciones` en el hosting (cada 5 minutos).
- **Externo:** consentimiento para fotos (no hay subida de fotos todavía).
- El ZIP se sigue armando en memoria dentro del worker (ya no bloquea la petición); si un colegio supera cientos de MB habría que pasarlo a flujo.
