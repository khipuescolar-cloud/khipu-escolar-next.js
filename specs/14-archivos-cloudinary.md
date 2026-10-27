# 14 — Archivos (Cloudinary hoy, S3 después)

> Estado: borrador (requisitos) · Última actualización: 2026-10-26 (Claude Code). Quien lo implemente completa las secciones de la plantilla. · Plan: todos

- Interfaz `FileStorage` (`src/lib/server/storage/`) con `subir(buffer, {tenantId, carpeta, privado, mimeType})`, `urlTemporal(archivo, segundos)` y `borrar(archivo)`.
- Implementaciones: `LocalStorage` (desarrollo, carpeta `.uploads/`, servida por un route handler con sesión), `CloudinaryStorage` y, más adelante, `S3Storage`. Se elige con `STORAGE_PROVIDER`.
- Cloudinary:
  - subida firmada **desde el servidor** (el navegador nunca ve el API secret);
  - carpeta `khipu/<tenantId>/<carpeta>`;
  - archivos de menores y adjuntos con `type: "authenticated"` y URL firmada que expira en 5 minutos;
  - el logo del colegio es público.
- La tabla `archivos` guarda proveedor, `publicId`, mime, bytes y si es privado. Cambiar a S3 = migrar los archivos y cambiar `proveedor`.
- Validación: imágenes (jpg, png, webp) y PDF, máximo 5 MB, con verificación de tipo por *magic bytes*.
