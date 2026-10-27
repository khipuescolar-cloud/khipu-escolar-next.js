# Pendientes v2 — frente comunicación (adjuntos, push de comunicados, avisos sin cron, preferencias del personal)

| Campo | Valor |
|---|---|
| Fecha | 2026-10-27 |
| Colaborador | Carlos (desarrollo) |
| Agente y modelo | Claude Code · subagente (frente `comunicacion`) |
| Rama y commits | `feat/p2-comunicacion` · ver `git log` de la rama |
| Specs afectadas | `specs/06-avisos-notificaciones.md`, `specs/08-chat-familia-profesor.md`, `specs/09-comunicados.md`, `specs/12-tareas-y-agenda.md`, `specs/14-archivos-cloudinary.md` |

## Pedidos del colaborador (textual)
> Si borralos , si ya no lo estamos usando y ya no lo necesitamos , no hay problema con borrarlos no? y porfavor ve resolviendo todos los pendientes que tengamos , quiero que por a hora trabajes de manera autonoma resolviendo cada problema que tengas y que lances multiagentes para que solucioones todos, si necesitas lazar 50 miltiagentes no hay problema pr que la finalidad es que termines con todo lo pendiente que tuvimos

## Decisiones
- Adjuntos en un módulo propio (`src/lib/server/adjuntos.ts`) con sus propios límites (10 MB, 5 por elemento, + DOCX/XLSX); los 5 MB de `validacion.ts` siguen para justificaciones, fotos y logo. DOCX/XLSX se reconocen por firma ZIP + entrada interna (`fflate`, sin descomprimir).
- Descarga con enlace estable `/archivos/<id>` (sin firma) que siempre pasa por `requireArchivoVisible`; Cloudinary redirige a una URL temporal tras el control.
- Enlace directo del comunicado: ancla `/comunicados#comunicado-<id>` (la lista ya muestra todo), no una ruta nueva.
- `PreferenciaAviso.apoderadoId` es un id de membresía: se reutiliza para cualquier rol y se documenta (sin alias ni migración).
- La alerta a dirección ahora también puede ir por push (según preferencias de cada miembro de dirección).
- `next.config.ts`: `serverActions.bodySizeLimit` y `proxyClientMaxBodySize` a 55 mb (el proxy bufferiza el cuerpo, 10 MB por defecto).

## Cambios realizados
- `src/lib/adjuntos.ts`, `src/lib/server/adjuntos.ts`, `src/lib/server/archivos.ts`, ruta `archivos/[id]/route.ts`: validación, subida privada, borrado y control de acceso de adjuntos.
- `src/components/adjuntos/*`: selector con lista de elegidos, lista de adjuntos con ícono por tipo.
- `comunicados.ts`, `tareas.ts` y sus actions/páginas: adjuntos al crear, editar y borrar.
- `notificaciones/avisos-familia.ts` (push + `referenciaId`), `preferencias.ts` (`destinoPersonal`), `avisos-mensajes.ts`, `alertas-direccion.ts`, `ses.ts` y `api/webhooks/ses/route.ts`, `mensajes.ts` y `mensajes/actions.ts` (`after()`).
- `perfil/page.tsx`, `perfil/actions.ts`, `perfil/PreferenciasPersonal.tsx`: preferencias del personal.
- Plantilla `comunicado` (`adjuntos?`) y su test.
- Tests: `tests/integracion/adjuntos-comunicados-tareas.test.ts`, `tests/integracion/preferencias-personal-y-comunicados-push.test.ts`, `tests/e2e/comunicados-adjuntos.test.ts`, `tests/unit/plantillas-avisos.test.ts`.

## Validación
- `pnpm lint && pnpm typecheck && pnpm test` y e2e relevantes con `E2E_PORT=3024` (resultado en el reporte final).

## Pendientes y preguntas abiertas
- Probar el envío de adjuntos con Cloudinary real en el piloto (redirección a URL temporal).
- Borrar archivos huérfanos cuando un salón o curso se borra en cascada (spec 14).
- Adjuntos visibles también en `/agenda` (hoy solo en `/tareas`).
