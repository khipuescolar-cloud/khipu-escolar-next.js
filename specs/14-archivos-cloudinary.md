# 14 — Archivos (Cloudinary hoy, S3 después)

> Estado: implementado · Plan: todos · Última actualización: 2026-10-26 (Claude Code, rama `feat/basico`)

## Objetivo
Guardar adjuntos y fotos de menores de forma privada, con un proveedor intercambiable.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Quien sube (familia, colegio) | Subir imágenes o PDF ≤ 5 MB | Subir otros tipos |
| Dirección / tutor del salón / apoderado autor | Ver el adjunto de una justificación | Ver adjuntos fuera de su alcance (403) |
| Quien ve al alumno | Ver su foto | — |

## Flujos
1. `guardarArchivo(tdb, buffer, { tenantId, carpeta, privado = true, subidoPorId })` valida, sube con el proveedor de `STORAGE_PROVIDER` y crea la fila `archivos`.
2. `urlArchivo(archivo)` devuelve una URL que vence en 5 minutos.
3. Local: `/archivos/<id>?exp&sig` (route handler del colegio) exige sesión, firma HMAC vigente y alcance (`requireArchivoVisible`).

## Reglas de negocio
- Validación por *magic bytes*: JPG (`FF D8 FF`), PNG, WEBP (`RIFF…WEBP`), PDF (`%PDF-`); máx. 5 MB; vacío rechazado. El mime guardado es el detectado, no el del navegador.
- `LocalStorage`: `.uploads/<tenantId>/<carpeta>/<uuid>.<ext>` (ignorado por git), con control de ruta.
- `CloudinaryStorage`: subida firmada desde el servidor (`upload_stream`), carpeta `khipu/<tenantId>/<carpeta>`, `type: "authenticated"` si es privado; URL temporal con `private_download_url(…, { expires_at: ahora + 5 min })`; públicos (logo) con `secure_url`.
- Server actions aceptan hasta 6 MB (`experimental.serverActions.bodySizeLimit` en `next.config.ts`).

## Modelo de datos
- `archivos`: `proveedor`, `publicId`, `url` (solo públicos), `mimeType`, `bytes`, `privado`, `subidoPorId`.

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
- integración: el adjunto de una justificación se guarda como `local`, privado y PDF; la URL temporal lleva `exp` y `sig`.

## Pendientes
- `S3Storage` y migración de archivos.
- Borrado de archivos huérfanos y al cerrar la cuenta (spec 15).
- Probar `CloudinaryStorage` contra una cuenta real en el piloto.
