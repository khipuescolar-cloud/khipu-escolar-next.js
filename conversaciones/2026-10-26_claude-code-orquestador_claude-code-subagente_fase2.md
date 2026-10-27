# Fase 2: notas, libreta, tareas y agenda

| Campo | Valor |
|---|---|
| Fecha | 2026-10-26 |
| Colaborador | Claude Code (orquestador) |
| Agente y modelo | Claude Code (subagente) · Claude Sonnet 5.5 |
| Rama y commits | `feat/fase2` · ver `git log feat/fase2` |
| Specs afectadas | `specs/11-notas-y-libreta.md`, `specs/12-tareas-y-agenda.md`, `specs/00-indice.md` |

## Pedidos del colaborador (textual)
> You are implementing part of the Khipu Escolar MVP (multitenant school platform for Peru, Spanish UI). Work ONLY in this git worktree: `…/khipu-wt/fase2` (branch `feat/fase2`). Other agents work in parallel in sibling worktrees; do not touch them.

> Your scope (plan Fase 2 — every page, action and route handler must call `requireFeature(ctx, "notas"|"libreta"|"tareas"|"agenda")`): 1. Notas (spec 11) … 2. Libreta (spec 11) … 3. Tareas y agenda (spec 12) … 4. Pure helpers for scales in `src/lib/calificaciones.ts` (conversion, labels: AD "Logro destacado", A "Logro esperado", B "En proceso", C "En inicio"; vigesimal pass ≥ 11) with unit tests.

> Rules: `requireTenantContext(slug)`, `ctx.db`, role/alcance helpers, zod, `auditar()`. Do NOT change `prisma/schema.prisma` or migrations; do NOT edit `src/app/colegio/[slug]/layout.tsx` or `src/lib/navegacion.ts`; don't edit `prisma/seed.ts`. Tests: unit, integration (padre no ve notas de otro alumno; periodo cerrado no editable; plan básico 403) y e2e (jorge.ramos ingresa nota vigesimal; rosa.quispe descarga libreta PDF; direccion@losolivos 403 en /notas).

## Decisiones
- Dirección ve todas las notas pero no las edita; solo profesores con el curso asignado. Dirección gestiona periodos.
- «Sin nota» = sin fila, por los CHECK de la BD; borrar el campo elimina la fila.
- Los formularios usan un componente cliente común (`FormAccion`) con `useActionState` y mensajes con ícono + palabra; la grilla de notas guarda por celda sin recargar.
- El PDF se genera en un route handler con `@react-pdf/renderer`; vista y descarga se auditan con `auditar()`.
- Las pruebas de integración llaman a las funciones de `src/lib/server` con un contexto armado a mano y activan `__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS` para comprobar el 403 de `forbidden()`.

## Cambios realizados
- `src/lib/calificaciones.ts`, `fechas.ts`, `resultado.ts`: funciones puras (escalas, sugerencias, fechas de Lima).
- `src/lib/server/{notas,libreta,libreta-pdf,tareas,agenda,cursos}.ts`: lógica de negocio.
- `src/app/colegio/[slug]/{notas,libreta,tareas,agenda}/` y `api/libreta/[alumnoId]/route.ts`: páginas, acciones y PDF.
- `src/components/{FormAccion,Calificacion}.tsx`.
- Specs 11 y 12 completadas (estado implementado) y actualizado el índice.
- Pruebas: `tests/unit/{calificaciones,fechas}.test.ts`, `tests/integracion/notas-libreta-tareas-agenda.test.ts`, `tests/e2e/{notas-libreta,tareas-agenda}.test.ts`.

## Validación
- `pnpm lint && pnpm typecheck && pnpm test` y `E2E_PORT=3002 pnpm e2e` (resultados en el mensaje final del subagente).

## Pendientes y preguntas abiertas
- Aviso a las familias al crear una tarea (falta módulo de avisos en esta rama y un tipo de aviso para tareas).
- Logo en el PDF (depende del módulo de archivos).
- Editar tareas y eventos; exportación .ics; importación de notas desde Excel.
