# Pendientes v2 · frente académico (notas y libreta)

| Campo | Valor |
|---|---|
| Fecha | 2026-10-27 |
| Colaborador | Carlos (desarrollo) |
| Agente y modelo | Claude Code (subagente) · claude-sonnet-5-5 |
| Rama y commits | `feat/p2-academico` · ver `git log` de la rama |
| Specs afectadas | `specs/11-notas-y-libreta.md`, `specs/10-panel-direccion-gestion.md`, `specs/06-avisos-notificaciones.md` |

## Pedidos del colaborador (textual)
> Si borralos , si ya no lo estamos usando y ya no lo necesitamos , no hay problema con borrarlos no? y porfavor ve resolviendo todos los pendientes que tengamos , quiero que por a hora trabajes de manera autonoma resolviendo cada problema que tengas y que lances multiagentes para que solucioones todos, si necesitas lazar 50 miltiagentes no hay problema pr que la finalidad es que termines con todo lo pendiente que tuvimos

## Decisiones
- Cierre por curso con el modelo `CierreCurso`: lo valida el servidor en toda escritura del curso y periodo; reabre solo dirección.
- Publicar libreta: requiere periodo cerrado o todos los cursos cerrados; idempotente, con «Reenviar aviso» explícito.
- Visibilidad para familias: periodo publicado o cerrado antes del 2026-10-27 (constante), porque `periodos` no guarda la fecha de cierre.
- CSV: separador `;`, UTF-8 con BOM; la importación acepta `;`, `,` o tabulación y las celdas vacías no borran notas.
- Las observaciones solo se muestran en `/notas`: la libreta PDF no lista evaluaciones.
- Logo WEBP/SVG: conversión a PNG con `sharp` y caché en memoria.

## Cambios realizados
- `src/lib/server/notas.ts`, `libreta.ts`, `logo.ts`; `src/lib/notas-csv.ts`, `libreta-publicacion.ts`, `imagen-png.ts`.
- UI: `notas/` (cierre de curso, observaciones, importar/exportar), `notas/periodos` (publicar y reenviar), `libreta/`, `api/notas/exportar`.
- Plantilla `libreta_publicada` (registro compartido) y `cola.ts` (enlace de preferencias).
- Tests unitarios, de integración y e2e.

## Validación
- `pnpm lint`, `pnpm typecheck`, `pnpm test` y e2e `notas-libreta` (puerto 3023): ver el reporte final.

## Pendientes y preguntas abiertas
- El envío real del correo de la libreta no se prueba en e2e (lo envía el cron); queda comprobada la fila en `avisos`.
- Si se necesita una regla distinta para libretas antiguas, añadir la fecha de cierre al esquema.
