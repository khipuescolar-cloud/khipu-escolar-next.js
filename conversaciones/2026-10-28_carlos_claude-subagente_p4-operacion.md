# Panel de plataforma v2: operación (usuarios, monitoreo, auditoría)

| Campo | Valor |
|---|---|
| Fecha | 2026-10-28 |
| Colaborador | Carlos (desarrollo) |
| Agente y modelo | Claude Code · subagente (frente operacion) |
| Rama y commits | `feat/p4-operacion` |
| Specs afectadas | `specs/21-operacion-de-plataforma.md`, `specs/00-indice.md`, `specs/16-plataforma-superadmin.md` |

## Pedidos del colaborador (textual)
> aqui en esta panel faltan bastantes cosas , como el tema de los planes, los roles por defectos que dispondremos a cada colegio, los modulos que podran ver cada plan , configurar cada colegio para agregar mas de 1 responsable , etc . ponte creativo y agrega modulos necesarios para este sistema

(Frente asignado: módulos `/usuarios`, `/monitoreo` y `/auditoria`.)

## Decisiones
- Acciones de operación con nombre libre vía `registrarAuditoriaPlataforma` (no se toca el tipo `AccionPlataforma` de `plataforma.ts`, para no chocar con otros frentes).
- Tope diario medido en ventana móvil de 24 h, igual que la cola.
- Cron registrado en `ConfigPlataforma` (`cron:avisos`, `cron:exportaciones`).

## Cambios realizados
- `src/lib/server/plataforma-{usuarios,monitoreo,auditoria}.ts`; rutas `src/app/plataforma/{usuarios,monitoreo,auditoria}/**`; cambio mínimo en `src/app/api/cron/{avisos,exportaciones}/route.ts`.
- Tests: `tests/integracion/operacion-plataforma.test.ts`, `tests/e2e/operacion-plataforma.test.ts`.

## Validación
- `pnpm lint && pnpm typecheck && pnpm test`, e2e propios y `plataforma-superadmin` (ver resultado en el informe final).

## Pendientes y preguntas abiertas
- Correo a la persona tras restablecer contraseña desde plataforma.
- «Total 30 días» en `GraficoDiario` con series de 14 días.
