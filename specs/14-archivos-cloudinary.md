# 14 — Archivos (Cloudinary hoy, S3 después)

> Estado: implementado · Plan: todos · Última actualización: 2026-10-27 (Claude Code, rama `feat/p2-comunicacion`)

## Objetivo
Guardar adjuntos y fotos de menores de forma privada, con un proveedor intercambiable.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Quien sube (familia, colegio) | Subir imágenes o PDF ≤ 5 MB | Subir otros tipos |
| Dirección / tutor del salón / apoderado autor | Ver el adjunto de una justificación | Ver adjuntos fuera de su alcance (403) |
| Quien ve al alumno | Ver su foto | — |
| Dirección, profesor y personal que publican | Adjuntar hasta 5 archivos de 10 MB a comunicados y tareas | Adjuntar otros tipos |
| Autor, dirección y quien ve el comunicado o la tarea | Descargar sus adjuntos | Descargar adjuntos de otro salón o sin rol que los vea (403) |

## Flujos
1. `guardarArchivo(tdb, buffer, { tenantId, carpeta, privado = true, subidoPorId })` valida, sube con el proveedor de `STORAGE_PROVIDER` y crea la fila `archivos`.
2. `urlArchivo(archivo)` devuelve una URL que vence en 5 minutos.
3. Local: `/archivos/<id>?exp&sig` (route handler del colegio) exige sesión, firma HMAC vigente y alcance (`requireArchivoVisible`).

## Reglas de negocio
- Validación por *magic bytes*: JPG (`FF D8 FF`), PNG, WEBP (`RIFF…WEBP`), PDF (`%PDF-`); máx. 5 MB; vacío rechazado. El mime guardado es el detectado, no el del navegador.
- `LocalStorage`: `.uploads/<tenantId>/<carpeta>/<uuid>.<ext>` (ignorado por git), con control de ruta.
- `CloudinaryStorage`: subida firmada desde el servidor (`upload_stream`), carpeta `khipu/<tenantId>/<carpeta>`, `type: "authenticated"` si es privado; URL temporal con `private_download_url(…, { expires_at: ahora + 5 min })`; públicos (logo) con `secure_url`.
- Server actions aceptan hasta 55 MB (`experimental.serverActions.bodySizeLimit` y `proxyClientMaxBodySize` en `next.config.ts`): 5 adjuntos de 10 MB + margen del multipart (el proxy bufferiza el cuerpo y su tope por defecto es 10 MB).
- **Adjuntos de comunicados y tareas** (`src/lib/server/adjuntos.ts`): PDF, JPG, PNG, WEBP, DOCX y XLSX; máx. 10 MB por archivo y 5 por elemento (los límites de 5 MB de `validacion.ts` siguen para justificaciones, fotos y logo). DOCX/XLSX se detectan por firma ZIP + entrada interna. Suben con `storage().subir(…, privado: true)` y se registran con `comunicadoId`/`tareaId` y `nombre` (limpio, sin rutas). Si falla algo se deshace lo subido. `borrarAdjuntosDe`/`quitarAdjuntos` borran del proveedor y de la BD.
- **Descarga de adjuntos** (`/archivos/<id>` sin firma): exige sesión y `requireArchivoVisible`, que ahora cubre `comunicadoId` (`puedeVerComunicado`) y `tareaId` (`puedeVerTarea`). Local: se sirve con `Content-Disposition: attachment`; Cloudinary: redirección 307 a una URL temporal (5 min) generada solo tras pasar el control. Los demás archivos locales siguen exigiendo firma.

## Modelo de datos
- `archivos`: `proveedor`, `publicId`, `url` (solo públicos), `mimeType`, `bytes`, `privado`, `subidoPorId`, `comunicadoId`, `tareaId`, `nombre` (los dos últimos, con borrado en cascada, para adjuntos).

## Contratos de `src/lib/server`
```ts
// storage/tipos.ts
interface FileStorage {
  proveedor: ProveedorArchivo
  subir(buffer, { tenantId, carpeta, privado, mimeType }): Promise<{ proveedor, publicId, url }>
  urlTemporal(archivo, segundos): Promise<string>
  borrar(archivo): Promise<void>
}
// storage/index.ts: storage(), guardarArchivo(), urlArchivo(), SEGUNDOS_URL_TEMPORAL = 300
// storage/validacion.ts (pura): detectarMime, validarArchivo, MAX_BYTES_ARCHIVO
// storage/local.ts: LocalStorage, firmaArchivoLocal, verificarFirmaArchivoLocal, leerArchivoLocal
// storage/cloudinary.ts: CloudinaryStorage (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)
// archivos.ts: requireArchivoVisible(ctx, archivoId)
```

## Rutas y UI
- `/archivos/[id]` (subdominio del colegio, con sesión): sirve archivos locales con `Cache-Control: private, no-store` y `nosniff`.

## Errores y casos borde
- `STORAGE_PROVIDER=s3` todavía lanza «no soportado».
- Faltan variables `CLOUDINARY_*` con `STORAGE_PROVIDER=cloudinary` → error al iniciar el proveedor.

## Pruebas
- unit (`tests/unit/validacion-archivos.test.ts`): firmas válidas, archivos disfrazados, vacío y > 5 MB.
- integración: `tests/integracion/adjuntos-comunicados-tareas.test.ts` (tipos, límites, acceso por rol y salón, borrado) · e2e `tests/e2e/comunicados-adjuntos.test.ts`.
- integración: el adjunto de una justificación se guarda como `local`, privado y PDF; la URL temporal lleva `exp` y `sig`.

## Pendientes
- `S3Storage` y migración de archivos.
- Borrado de archivos huérfanos (p. ej. adjuntos de tareas/comunicados cuando se borra el salón o el curso en cascada) y al cerrar la cuenta (spec 15).
- Probar `CloudinaryStorage` contra una cuenta real en el piloto.
