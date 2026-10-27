# P3 · Archivos y robustez (oleada «pendientes v2»)

| Campo | Valor |
|---|---|
| Fecha | 2026-10-27 |
| Colaborador | Carlos (desarrollo) |
| Agente y modelo | Claude Code (subagente) · claude-sonnet-5-5 |
| Rama y commits | `feat/p3-archivos-robustez` |
| Specs afectadas | `specs/14-archivos-cloudinary.md`, `15-privacidad-auditoria-exportacion.md`, `12-tareas-y-agenda.md`, `04-asistencia.md`, `05-porteria-qr.md`, `11-notas-y-libreta.md`, `17-crm-personal-colegio.md` |

## Pedidos del colaborador (textual)
> Si borralos , si ya no lo estamos usando y ya no lo necesitamos , no hay problema con borrarlos no? y porfavor ve resolviendo todos los pendientes que tengamos , quiero que por a hora trabajes de manera autonoma resolviendo cada problema que tengas y que lances multiagentes para que solucioones todos, si necesitas lazar 50 miltiagentes no hay problema pr que la finalidad es que termines con todo lo pendiente que tuvimos

## Decisiones
- Orden seguro al borrar: recolectar `Archivo` → borrar el elemento (cascada en BD) → borrar del proveedor; un fallo del proveedor se registra y no rompe la operación.
- Listar objetos sin fila solo es viable en local; Cloudinary/S3 quedan como límite documentado.
- El ZIP de exportación se arma en flujo (`fflate` `Zip`) a un temporal; la subida desde ruta es un método opcional de `FileStorage`.
- Los adjuntos en la agenda respetan `puedeVerTarea` (administrativo no los ve porque no puede descargarlos).
- Cola sin conexión: error de red no cuenta; error del servidor suma intento; tope 5 → «No se pudo enviar» + «Descartar».
- `CORTE_LIBRETA_PUBLICADA` queda como constante (decisión cerrada, sin cambio de esquema).

## Cambios realizados
- `src/lib/server/adjuntos.ts`, `comunicados.ts`, `tareas.ts`, `gestion.ts`: recolección y borrado posterior en el proveedor.
- `scripts/limpiar-archivos.ts` + `mantenimiento-archivos.ts`: modo `--proveedor` (local).
- `src/lib/server/storage/*`: `subirDesdeRuta` opcional (local, S3, Cloudinary) y `subirArchivoDesdeRuta`.
- `src/lib/server/exportar.ts`: ZIP en flujo por lotes.
- `src/lib/server/agenda.ts` y `agenda/page.tsx`: adjuntos de entregas.
- `src/lib/registro-offline.ts`, `cola-offline.ts`, `AvisoColaFallida.tsx`, sincronizadores de asistencia y portería: intentos acotados.
- Plantilla `bienvenida` (`restablecida`), `cuentas.ts`, `personal.ts`: correo de restablecimiento.
- Specs y tests de cada punto.

## Validación
- `pnpm lint`, `pnpm typecheck`, `pnpm test` y e2e relevantes: ver el informe final del subagente.

## Pendientes y preguntas abiertas
- Externo: probar S3/Cloudinary reales (subida en flujo y borrado) con credenciales.
- Cloudinary/S3: listar objetos huérfanos solo desde su consola.
