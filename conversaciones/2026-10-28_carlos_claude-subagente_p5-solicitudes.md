# P5 · Solicitudes de demo (panel de plataforma)

| Campo | Valor |
|---|---|
| Fecha | 2026-10-28 |
| Colaborador | Carlos (responsable del producto) |
| Agente y modelo | Claude Code (subagente) · Sonnet 5.5 |
| Rama y commits | `feat/p5-solicitudes` · ver `git log` de la rama |
| Specs afectadas | `specs/26-solicitudes-de-demo.md`, `specs/00-indice.md` |

## Pedidos del colaborador (textual)
> okey necesito que vayas avanzando con algo mas , no se si sepas pero necesito que este sistema tambien sea descargable como si fuera un app, entonces vamos creando eso mismo y tambien quiero que crees la primera landing del proyecto, ahi mostraras todas las funcionalidades, si necesitas capturas tu mismo puedes hacerlo , si quieres ejemplo tu mismo puedes trabajarlo; despliega multiagentes para que todo esto se trabaje y lo dejo todo en tus manos, ire a descansar

Encargo al subagente (frente `solicitudes`): aviso por correo al equipo al llegar un pedido de demo, módulo «Solicitudes de demo» en la plataforma (lista, detalle, estado, notas, asignación, crear colegio prellenado, CSV, eliminar) y pruebas.

## Decisiones
- El aviso va directo por `EmailChannel` (la cola `avisos` exige colegio), en `after()` dentro de un request y directo fuera de uno; un fallo no rompe el guardado.
- El correo al equipo no incluye correo ni teléfono de la persona; la auditoría no guarda datos personales.
- `specs/25-landing-publica.md` no existía en la rama: se documentó en `specs/26-solicitudes-de-demo.md`.
- Prellenado de `/colegios/nuevo` por query; `solicitudId` oculto; si el enlace falla tras crear el colegio, no se revierte.

## Cambios realizados
- `src/lib/server/solicitudes.ts`, `plataforma-solicitudes.ts`, `email/plantillas/solicitud-demo.ts`, `src/lib/solicitudes.ts`.
- `src/app/plataforma/solicitudes/**`, prellenado en `colegios/nuevo/**`, `CamposAdministrador.tsx`, `actions.ts`.
- Menú (`layout.tsx`, `iconos.ts`) y mapa de auditoría.
- Pruebas: `tests/integracion/solicitudes-demo.test.ts`, `tests/e2e/solicitudes-demo.test.ts`.

## Validación
- Ver resultado final en el informe del subagente (lint, typecheck, test, e2e en puerto 3083).

## Pendientes y preguntas abiertas
- Mover la sección a `specs/25-landing-publica.md` al integrar con el frente de la landing.
