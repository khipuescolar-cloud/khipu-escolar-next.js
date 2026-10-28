# Panel de plataforma v2: responsables y suscripciones (frente colegio-comercial)

| Campo | Valor |
|---|---|
| Fecha | 2026-10-28 |
| Colaborador | Carlos (desarrollo) |
| Agente y modelo | Claude Code subagente · Claude Sonnet |
| Rama y commits | `feat/p4-colegio-comercial` |
| Specs afectadas | `specs/20-responsables-y-suscripciones.md`, `specs/16-plataforma-superadmin.md`, `specs/00-indice.md` |

## Pedidos del colaborador (textual)
> aqui en esta panel faltan bastantes cosas , como el tema de los planes, los roles por defectos que dispondremos a cada colegio, los modulos que podran ver cada plan , configurar cada colegio para agregar mas de 1 responsable , etc . ponte creativo y agrega modulos necesarios para este sistema

## Decisiones
- Responsables: varios contactos por colegio, un principal (transacción); dar acceso reutiliza `agregarAdministrador`, que ahora enlaza o crea el contacto.
- Auditoría de este frente con acciones propias escritas directo en `auditoria_plataforma` (sin tocar la unión `AccionPlataforma`).
- Ingreso mensual recurrente: solo suscripciones activas, anual/12. Registrar pago puede mover la renovación.
- Anular pago = borrar el registro; el detalle queda en la auditoría.

## Cambios realizados
- `src/lib/comercial.ts`, `src/lib/server/plataforma-responsables.ts`, `plataforma-suscripciones.ts`.
- Ficha del colegio: secciones Responsables y Suscripción (`_responsables/`, `_suscripcion/`, `_comun/`, `_acciones.ts`); `/suscripciones` + CSV.
- `crearColegio` registra el contacto principal y un segundo responsable opcional; formulario de nuevo colegio.
- Tarjeta «Responsables ante Khipu» en `/configuracion` del colegio; datos demo en `prisma/seed.ts`.
- Tests: unit, integración y e2e nuevos; e2e de superadmin con selectores por nombre.

## Validación
- `pnpm lint && pnpm typecheck && pnpm test`, e2e `plataforma-comercial` y `plataforma-superadmin` con `E2E_PORT=3062`.

## Pendientes y preguntas abiertas
- Recordatorios de renovación por correo; comprobantes adjuntos; otras monedas.
