# P2 · Gestión: archivar salones, rol administrativo, familias, datos globales y reinicio de contraseña

| Campo | Valor |
|---|---|
| Fecha | 2026-10-27 |
| Colaborador | Carlos (desarrollo) |
| Agente y modelo | Claude Code (subagente de la oleada «pendientes v2») · Sonnet 5.5 |
| Rama y commits | `feat/p2-gestion` |
| Specs afectadas | `specs/17-crm-personal-colegio.md`, `specs/10-panel-direccion-gestion.md`, `specs/03-planes-y-permisos.md` |

## Pedidos del colaborador (textual)
> Si borralos , si ya no lo estamos usando y ya no lo necesitamos , no hay problema con borrarlos no? y porfavor ve resolviendo todos los pendientes que tengamos , quiero que por a hora trabajes de manera autonoma resolviendo cada problema que tengas y que lances multiagentes para que solucioones todos, si necesitas lazar 50 miltiagentes no hay problema pr que la finalidad es que termines con todo lo pendiente que tuvimos

## Decisiones
- Archivar salón con `Salon.archivadoAt` y helper `whereSalonActivo` aplicado solo en la cláusula `where` de las consultas de selectores y lista de pasar lista; las vistas históricas no se filtran.
- `administrativo`: nueva barrera `exigirAlumnosFamilias` (dirección + administrativo) para alumnos y familias; el resto de `/gestion` sigue solo para dirección. En agenda solo crea eventos de todo el colegio y edita/borra los suyos. El administrativo no busca por documento.
- Contraseña: reinicio al documento solo dirección; la cuenta es única, así que vale en todos los colegios (se advierte). Auditoría de cambios globales también en los otros colegios (solo nombres de campos).

## Cambios realizados
- `src/lib/server/salones-activos.ts` (nuevo), `gestion.ts`, `personal.ts`, `comunicados.ts`, `agenda.ts`, `asistencia.ts`, `cursos.ts`, `porteria.ts`, `resumen-direccion.ts`, `avisos-panel.ts`, `navegacion.ts`.
- `src/app/colegio/[slug]/gestion/**` (salones, alumnos, apoderados, ficha, layout, hub, acciones), `comunicados/`, `agenda/`, `avisos/`, `api/agenda.ics`.
- Tests: `tests/integracion/gestion-p2.test.ts` (nuevo), `tests/e2e/crm-personal.test.ts` (permisos del administrativo, archivar/reactivar).

## Validación
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (285 tests) en verde; e2e `crm-personal`, `direccion-panel`, `ui-pendientes`, `paginas-basico-por-rol`, `tareas-agenda` en verde (puerto 3026).

## Pendientes y preguntas abiertas
- Ninguno propio. Nota: el texto del correo de bienvenida reenviado tras el reinicio usa la plantilla existente (archivo compartido, no modificado).
