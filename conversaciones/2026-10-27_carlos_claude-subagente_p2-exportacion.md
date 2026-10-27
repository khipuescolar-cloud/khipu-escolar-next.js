# Pendientes v2: exportación asíncrona, S3 y archivos huérfanos

| Campo | Valor |
|---|---|
| Fecha | 2026-10-27 |
| Colaborador | Carlos (desarrollo) |
| Agente y modelo | Claude Code (subagente) · claude-sonnet-5-5 |
| Rama y commits | `feat/p2-exportacion` |
| Specs afectadas | `specs/14-archivos-cloudinary.md`, `specs/15-privacidad-auditoria-exportacion.md`, `specs/16-plataforma-superadmin.md` |

## Pedidos del colaborador (textual)
> Si borralos , si ya no lo estamos usando y ya no lo necesitamos , no hay problema con borrarlos no? y porfavor ve resolviendo todos los pendientes que tengamos , quiero que por a hora trabajes de manera autonoma resolviendo cada problema que tengas y que lances multiagentes para que solucioones todos, si necesitas lazar 50 miltiagentes no hay problema pr que la finalidad es que termines con todo lo pendiente que tuvimos

## Decisiones
- La exportación pasa a una cola (`exportaciones_colegio`) con reserva atómica, recuperación de colgadas (15 min), 3 intentos y vencimiento a los 7 días. Sin campo de «inicio» en el esquema, `terminadoAt` guarda la hora de reserva mientras la fila está `procesando`.
- Vencida = fila `lista` sin `archivoId` (el cron borra el archivo y la FK lo deja en null); la UI la muestra como «Vencida».
- La descarga usa una ruta propia (`/api/exportar/[id]`, solo dirección) y no `/archivos/<id>`, porque esa valida otros tipos de archivo. `GET /api/exportar` redirige a la página nueva.
- La ficha de plataforma sigue enlazando a `/colegios/[id]/exportar`, que ahora es una página (antes un route handler). `exportarColegioDesdePlataforma` y `exportarColegioZip` (síncronos) se conservan para pruebas.
- Scripts de mantenimiento con la lógica en `src/lib/server/mantenimiento-archivos.ts` para poder probarla.
- `leerArchivo`/`borrarArchivoDelProveedor` usan el proveedor de cada archivo (`storageDe`), y `khipu:borrar-colegio` ya no exige que coincida con el activo.

## Cambios realizados
- `src/lib/server/exportar.ts`, `src/app/api/cron/exportaciones/`, `src/app/colegio/[slug]/configuracion/exportar/`, `src/app/colegio/[slug]/api/exportar/**`, `src/app/plataforma/colegios/[id]/exportar/**`, `src/components/exportacion/EstadoExportacion.tsx`.
- `src/lib/server/storage/s3.ts` e `index.ts` (S3 y `storageDe`), `.env.example` (variables `S3_*`).
- `scripts/migrar-archivos.ts`, `scripts/limpiar-archivos.ts`, `scripts/borrar-colegio.ts`, `src/lib/server/mantenimiento-archivos.ts`.
- Tests: `tests/unit/s3-storage.test.ts`, `tests/integracion/exportacion-asincrona-archivos.test.ts`, `tests/e2e/direccion-panel.test.ts` (actualizado).

## Validación
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (288 pruebas) en verde; e2e `direccion-panel` en verde (puerto 3022).

## Pendientes y preguntas abiertas
- Externos: probar Cloudinary y S3 con cuentas reales; consentimiento para fotos (no hay subida de fotos).
- Programar el cron `/api/cron/exportaciones` en el hosting.
