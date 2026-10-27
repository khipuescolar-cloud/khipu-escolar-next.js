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

## S3, migración y limpieza
- `S3Storage` (`storage/s3.ts`, `@aws-sdk/client-s3` + presigner): clave `khipu/<tenantId>/<carpeta>/<uuid>.<ext>`; privados con URL firmada que vence (5 min); públicos con `S3_PUBLIC_BASE_URL` o la URL estándar del bucket (o `S3_ENDPOINT/<bucket>/…` con endpoint propio, p. ej. MinIO). Se activa con `STORAGE_PROVIDER=s3` y `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (opcionales `S3_ENDPOINT`, `S3_PUBLIC_BASE_URL`; ver `.env.example`). `storageDe(proveedor)` entrega el proveedor de cada archivo, así leer o borrar funciona aunque el activo sea otro.
- Migrar: `pnpm tsx --conditions=react-server scripts/migrar-archivos.ts --de cloudinary|local --a s3 [--dry-run]` copia cada archivo, actualiza `Archivo.proveedor/publicId/url` y borra el original (`migrarArchivos` en `mantenimiento-archivos.ts`).
- Huérfanos: `pnpm tsx --conditions=react-server scripts/limpiar-archivos.ts` lista (simulacro por defecto); con `--confirmar` borra del almacenamiento y de la BD los `Archivo` de más de 24 h que no son logo, foto de alumno, adjunto de justificación, comunicado o tarea, ni ZIP de exportación. (`--conditions=react-server` es necesario para importar `src/lib/server`, igual que `khipu:borrar-colegio`.)
- Al borrar un colegio (`khipu:borrar-colegio`) se borran antes sus archivos del almacenamiento, cada uno con su proveedor; si alguno falla se aborta sin tocar la BD.
- Tests: `tests/unit/s3-storage.test.ts` (cliente S3 simulado) y `tests/integracion/exportacion-asincrona-archivos.test.ts` (huérfanos y migración).

## Borrado sin huérfanos
- Al borrar un comunicado (`borrarComunicado`), una tarea (`eliminarTarea`), un salón (`eliminarSalon`: comunicados dirigidos al salón y tareas de sus cursos) o un curso (`eliminarCurso`: tareas), primero se **recolectan** sus `Archivo` (`adjuntosDe`, `adjuntosDeSalon`, `adjuntosDeCurso` en `adjuntos.ts`), luego se borra el elemento (la BD borra las filas en cascada) y **después** se borran los objetos del proveedor (`borrarDelProveedor`). Si el proveedor falla se registra el error (`console.error`) y la operación sigue. Borrar un colegio entero lo hace `khipu:borrar-colegio` (y `deshacerColegio` en plataforma) borrando antes todos sus archivos.
- `scripts/limpiar-archivos.ts --proveedor` lista (y con `--confirmar` borra) los objetos de `.uploads/` (proveedor **local**) sin fila en `archivos` y con más de 24 h: son los sobrantes de un borrado en el proveedor que falló. Cloudinary/S3: ver Pendientes.
- Subida desde disco: `FileStorage.subirDesdeRuta?` (opcional) la implementan local (copia), S3 (`PutObject` con stream y `ContentLength`) y Cloudinary (`upload_stream`); `subirArchivoDesdeRuta` cae a `subir(buffer)` si un proveedor no la tiene. La usa la exportación.

## Pendientes
- **Externo:** probar `CloudinaryStorage` y `S3Storage` contra cuentas reales en el piloto (requiere credenciales).
- **Externo:** consentimiento para fotos (spec 15), cuando exista subida de fotos.
- (Resuelto) Borrado en cascada sin archivos huérfanos: ver «Borrado sin huérfanos».
- Listar objetos sin fila en **Cloudinary y S3** no es posible desde `limpiar-archivos.ts` (haría falta recorrer el bucket/la cuenta con sus credenciales); se revisan en su consola bajo `khipu/<tenantId>/…`.
