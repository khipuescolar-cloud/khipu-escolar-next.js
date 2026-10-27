# Rediseño de gestión (CRM) y configuración

| Campo | Valor |
|---|---|
| Fecha | 2026-10-27 |
| Colaborador | Carlos (desarrollo) |
| Agente y modelo | Claude Code (subagente) · Claude Opus 5.5 |
| Rama y commits | `feat/diseno-gestion` · ver `git log` |
| Specs afectadas | `specs/18-sistema-de-diseno.md`, `specs/17-crm-personal-colegio.md`, `specs/10-panel-direccion-gestion.md` |

## Pedidos del colaborador (textual)
> mejora el diseño de todo el sistema y deja un archivo donde se especifique el diseño, tema, colores, formas, stilos etc

## Decisiones
- Altas e importaciones pasan a `Dialog` (cortas) o `Sheet` (largas) con un wrapper cliente que se cierra al redirigir la server action; no se tocó ninguna action ni nombre de campo.
- Acciones por fila en menú `MoreHorizontal` con confirmación (`AlertDialog`) para desactivar, retirar, quitar vínculo, anular carnet y quitar logo.
- Se mantiene `Flash` inline para `?ok=`/`?error=` (Notificar solo dispara una vez por montaje).
- Los selects de configuración se quedan nativos (no se cambió a Switch/RadioGroup para no alterar el envío del formulario).
- El anverso del carnet impreso se mantiene blanco fijo (tokens neutros) para impresión y QR.

## Cambios realizados
- `src/app/colegio/[slug]/gestion/**`: hub, layout con pestañas, profesores/personal, ficha, salones, alumnos, familias, carnets e impresión; nueva carpeta `_componentes/`.
- `src/app/colegio/[slug]/configuracion/**`: secciones en tarjetas y auditoría con tabla.
- Tests e2e: `crm-personal.test.ts` (abrir «Agregar profesor» / «Agregar personal» antes de llenar el formulario) y `ui-pendientes.test.ts` (confirmar «Quitar logo» en el diálogo).
- Specs 10, 17 y 18 §8.

## Validación
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (275 pruebas): verde.
- E2E (crm-personal, direccion-panel, ui-pendientes, paginas-basico-por-rol): 10/10 verde.
- Capturas 1366 y 390 px, claro y oscuro, en el directorio de scratchpad `diseno-gestion/`.

## Pendientes y preguntas abiertas
- Buscador/filtros en Familias y paginación de tablas largas.
- Evaluar `Notificar` con toasts cuando se ajuste para múltiples redirecciones.
