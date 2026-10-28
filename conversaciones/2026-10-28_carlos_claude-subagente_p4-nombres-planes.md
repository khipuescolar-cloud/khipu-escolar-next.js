# Panel de plataforma v2: nombres comerciales de planes

| Campo | Valor |
|---|---|
| Fecha | 2026-10-28 |
| Colaborador | Carlos (desarrollo) |
| Agente y modelo | Claude Code · subagente (frente nombres-planes) |
| Rama y commits | `feat/p4-nombres-planes` |
| Specs afectadas | `specs/19-planes-modulos-y-roles.md` |

## Pedidos del colaborador (textual)
> aqui en esta panel faltan bastantes cosas , como el tema de los planes, los roles por defectos que dispondremos a cada colegio, los modulos que podran ver cada plan , configurar cada colegio para agregar mas de 1 responsable , etc . ponte creativo y agrega modulos necesarios para este sistema

(Frente asignado: usar el nombre comercial del catálogo en las pantallas de plataforma.)

## Decisiones
- Helpers `nombresDePlanes` y `planesOfrecidos` en `src/lib/server/modulos.ts`, con versiones puras testeables.
- Crear colegio, selector de plan de la ficha y de la suscripción: solo planes activos; el plan actual inactivo se muestra «(no se ofrece)». Filtros y reportes: todos.
- Quitar el módulo `avisos` no detiene los avisos automáticos de asistencia; el módulo es la pantalla «Avisos enviados». Sin cambio de comportamiento.

## Cambios realizados
- Pantallas y CSV de `src/app/plataforma/**` pasan al nombre comercial; `PlanColegio` recibe `nombre`; `FormularioAnuncio`/`HojaSuscripcion` reciben nombres/planes por props.
- Descripción del módulo `avisos` en `src/lib/modulos.ts`; spec 19 actualizada.
- Test: `tests/unit/nombres-planes.test.ts`.

## Pendientes
- Ninguno propio.
