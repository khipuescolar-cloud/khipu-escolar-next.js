# Planificación académica anual

| Campo | Valor |
|---|---|
| Fecha | 2026-11-08 |
| Colaborador | dueño de Khipu Escolar |
| Agente y modelo | Codex · GPT-6 |
| Rama y commits | `feat/plan-anual-planificacion` · commit local de esta sesión |
| Specs afectadas | `specs/48-planificacion-academica-anual.md` |

## Pedidos del colaborador (textual)

> Eres el Agente 3 (Planificación Académica) + parte del Agente 5 (UI de planificación) de KHIPU. Worktree propio, rama
> feat/plan-anual-planificacion (sale del commit del paso 0). Lee AGENTS.md, specs/18 (diseño), specs/32 y specs/40 (reuniones y
> disponibilidad), specs/42 y los contratos specs/48 y specs/49. El esquema, la migración, src/lib/plan-anual/*,
> src/lib/nudito/leccion.ts y src/lib/server/plan-anual/acceso.ts YA EXISTEN (paso 0): úsalos; NO edites prisma/schema.prisma ni
> migraciones (si te falta algo del esquema, detente y repórtalo).
>
> PROPIEDAD DE ARCHIVOS (otro agente trabaja en paralelo en Nudito; no toques lo suyo):
> - TUYO: src/lib/server/plan-anual/{planes,temas,revision,reuniones-plan,index}.ts, src/app/colegio/[slug]/planificacion/**
>   EXCEPTO las carpetas `materiales/` y `progreso/` dentro de [planId] (son del otro agente; tú solo pones las pestañas que
>   enlazan a ellas), src/components/planificacion/**, src/lib/navegacion.ts (solo agregar la entrada «Planificación anual»),
>   tests/unit/plan-anual-*.test.ts nuevos, tests/integracion/plan-anual.test.ts, specs/48.
> - PROHIBIDO tocar: src/lib/server/nudito/**, src/components/nudito/**, src/app/colegio/[slug]/nudito/**, src/lib/nudito/**,
>   prisma/**.
> - Cambio mínimo permitido en src/lib/server/reuniones.ts: aceptar un `planAnualId` opcional en la convocatoria y guardarlo
>   (validando que el plan sea del colegio y que el actor tenga acceso). Nada más ahí.
>
> IMPLEMENTA todos los contratos de specs/48 (planes, temas, revisión, versiones, eventos, copia de año, reuniones del plan):
> - Reglas: máquina de estados de src/lib/plan-anual/estados.ts; transacciones con revalidación de estado para enviar, aprobar,
>   publicar, abrir revisión, copiar, designar coordinador; auditar() + PlanAnualEvento en cada acción; ErrorDeNegocio en español.
> - buscarCatalogo: catálogo efectivo (globales del área/nivel/grado + temas activos del colegio, ver src/lib/server/nudito/catalogo.ts
>   y src/lib/nudito/catalogo; solo lectura, impórtalos sin modificarlos), con búsqueda y paginación; marca los ya seleccionados.
> - proponerTemaColegio: reutiliza la validación de temas del colegio existente (puedes llamar a funciones exportadas de
>   src/lib/server/nudito/catalogo.ts; si exigen rol dirección, crea en plan-anual una variante que permita al participante del
>   plan crear el tema para el área/nivel/grado de SU plan, con la misma validación zod y auditoría). Nunca modifica el catálogo global.
> - sincronizarParticipantes al crear y al abrir el plan; un docente con varias secciones participa una sola vez.
> - copiarPlan: nuevo plan borrador del año destino con temas y unidades, copiadoDeId; error si ya existe plan de ese grupo y año.
> - convocarReunionPlan: usa convocarReunion de reuniones.ts con requeridos = participantes activos, tipo «coordinacion»,
>   planAnualId. Usa consultarDisponibilidad (disponibilidad.ts) para sugerir horarios en la UI. Sin videollamadas propias.
> - Acuerdos: reutiliza actas/acuerdos de reuniones existentes; en la pestaña Reuniones lista las reuniones con planAnualId.
> UI (Next.js 16 App Router; LEE node_modules/next/dist/docs antes; server actions con requireTenantContext y ctx.db; componentes
> cliente nunca tocan la BD): rutas de specs/48. Navegación ARRIBA con pestañas (preferencia del dueño), estados con ícono +
> palabra, responsive (móvil 360px sin scroll horizontal), shadcn existente, lucide-react, textos en español de Perú.
> Pestaña Temas: catálogo filtrable/buscable y paginado a la izquierda (o arriba en móvil), plan seleccionado con unidades y
> subir/bajar; comentarios por tema. Revisión: participantes, conformidades de la ronda, observaciones con «Resolver», botones
> según estado (solo los permitidos). Versiones: historial y «Copiar a otro año». Dirección: designar/sustituir coordinador,
> agregar/retirar participantes con motivo, archivar.
> PRUEBAS (obligatorias) tests/integracion/plan-anual.test.ts con colegios ficticios (mira tests/integracion/ayudantes):
> 1 dos docentes del mismo grado y curso comparten un plan; 2 docente de otro curso no modifica; 3 docente propone tema;
> 4 otro deja observación; 5 coordinador resuelve; 6 no publica con objeciones pendientes; 7 queda quién aprobó;
> 8 publicar guarda versión; 9 plan 2028 copia 2027; 10 docente nuevo asignado se sincroniza y continúa; 11 colegio B no ve
> el catálogo privado (temas col:) de A; 12 el catálogo global no cambia al personalizar; además: no aprueba sin conformidad de
> todos, dirección no puede aprobar en nombre del coordinador, abrir revisión no borra la versión publicada.
> Verifica con: pnpm lint; pnpm typecheck; pnpm exec vitest run tests/unit tests/integracion/plan-anual.test.ts tests/integracion/plan-anual-acceso.test.ts tests/integracion/reuniones.test.ts tests/integracion/reuniones-disponibilidad.test.ts
> Si levantas la app para mirar, usa otro puerto (p. ej. `NEXT_DIST_DIR=.next-plan PORT=3071 pnpm exec next dev -p 3071`) y al
> final `git checkout tsconfig.json` si Next lo cambió. BD solo local; datos ficticios; nada de push ni remoto.
> Actualiza specs/48 (estado, rutas reales, pendientes). Commit local (git add solo tus archivos, nunca -A), asunto imperativo en
> inglés, última línea: Co-Authored-By: Codex <noreply@openai.com>
> Responde al final con archivos, comandos y resultados reales copiados, y dudas.

## Decisiones

- Se usó la máquina de estados existente para las transiciones y la capa de acceso del paso 0.
- Las reuniones del plan reutilizan la convocatoria, disponibilidad, actas y acuerdos existentes.
- El catálogo de Nudito cubre por ahora tres áreas; se documentó esa limitación en specs/48.

## Cambios realizados

- Servicios de planes, temas, revisión, versiones, eventos y reuniones en `src/lib/server/plan-anual/`.
- Rutas y formularios de planificación en `src/app/colegio/[slug]/planificacion/`, componentes de estado y pestañas en `src/components/planificacion/`.
- Enlace de navegación en `src/lib/navegacion.ts` y vínculo opcional de reunión en `src/lib/server/reuniones.ts`.
- Pruebas de integración en `tests/integracion/plan-anual.test.ts` y actualización de `specs/48-planificacion-academica-anual.md`.

## Validación

- `pnpm lint` — `LINT_EXIT:0`.
- `pnpm typecheck` — `TYPECHECK_EXIT:0`.
- `pnpm exec vitest run tests/unit tests/integracion/plan-anual.test.ts tests/integracion/plan-anual-acceso.test.ts tests/integracion/reuniones.test.ts tests/integracion/reuniones-disponibilidad.test.ts` — `VITEST_EXIT:0`; 93 archivos y 676 pruebas aprobadas.

## Pendientes y preguntas abiertas

- Integrar las pestañas Materiales y Progreso entregadas por el agente de Nudito.
- Revisar con el equipo pedagógico el catálogo global antes de uso productivo, como indica specs/42.
