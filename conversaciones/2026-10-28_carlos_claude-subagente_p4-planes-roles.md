# Panel de plataforma v2 · planes, módulos y roles desde la BD

| Campo | Valor |
|---|---|
| Fecha | 2026-10-28 |
| Colaborador | Carlos (desarrollo) |
| Agente y modelo | Claude Code (subagente, frente `planes-roles`) · claude-opus-5-5 |
| Rama y commits | `feat/p4-planes-roles` · ver `git log` de la rama |
| Specs afectadas | `specs/19-planes-modulos-y-roles.md` (nueva), `specs/03-planes-y-permisos.md`, `specs/16-plataforma-superadmin.md`, `specs/00-indice.md` |

## Pedidos del colaborador (textual)
> aqui en esta panel faltan bastantes cosas , como el tema de los planes, los roles por defectos que dispondremos a cada colegio, los modulos que podran ver cada plan , configurar cada colegio para agregar mas de 1 responsable , etc . ponte creativo y agrega modulos necesarios para este sistema

(El orquestador asignó a este subagente el frente «planes y roles»: resolución central de módulos desde la BD, `/planes`, `/roles` y la sección «Módulos del colegio» de la ficha.)

## Decisiones
- Fuente de verdad en la BD (`plan_modulos`, `tenant_modulos`, `rol_modulos`) con respaldo en `FEATURES` si un plan no tiene filas. `gestion` es esencial en planes, colegios y roles.
- `TenantContext` gana `modulos` y `accesoModulos`; `tieneFeature` usa el contexto y `requireFeature` no cambia por fuera.
- Roles: el código fija qué combinaciones existen (`ROLES_SOPORTADOS`, de `MOSAICOS` + la familia en `avisos` por sus preferencias). En `tieneFeature` solo se aplica lo configurable (rol desactivado); la restricción de código sigue en `requireRol`.
- Candado: nombre del plan mínimo del catálogo (prefiere planes activos); si ningún plan lo incluye, el módulo se oculta.
- Caché en memoria de 30 s + `cache` de React; se invalida en cada guardado del panel.
- E2E: cada paso del panel abre su sesión porque otros e2e en paralelo cierran la sesión del super administrador demo (signOut global de Supabase).

## Cambios realizados
- `src/lib/modulos.ts` (nuevo, puro), `src/lib/server/modulos.ts` (nuevo), `src/lib/server/plan.ts`, `src/lib/server/tenant.ts`.
- `src/lib/server/plataforma-planes.ts`, `src/lib/server/plataforma-roles.ts` (nuevos); acciones de auditoría nuevas en `plataforma.ts`.
- `src/app/plataforma/planes/*`, `src/app/plataforma/roles/*`, `src/app/plataforma/_componentes/BotonAccion.tsx` (nuevos).
- Ficha del colegio: `ModulosColegio.tsx`, `CambiarModuloColegio.tsx`, `modulos-actions.ts` (nuevos) y dos líneas en `page.tsx` (sección + etiqueta de auditoría).
- Colegio: layout, inicio, `ResumenDireccion`, asistencia y configuración usan `ctx` en vez de `planIncluye`; `PlanLock` recibe el nombre del plan.
- Contextos sintéticos (`exportar.ts`, exportación desde plataforma) y tests de integración usan `accesoModulos` / `accesoModulosDeCodigo`.

## Validación
- `pnpm lint && pnpm typecheck && pnpm test` → verde (56 archivos, 507 pruebas).
- `E2E_PORT=3061`: `planes-modulos`, `paginas-basico-por-rol`, `notas-libreta`, `crm-personal`, `plataforma-superadmin` → 19/19.
- Capturas 1366 y 390 px en el scratchpad `p4-planes-roles/`.

## Pendientes y preguntas abiertas
- Pasar las pantallas de plataforma que usan `NOMBRE_PLAN` (crear colegio, filtros, insignia) al nombre del catálogo y ocultar planes inactivos al crear colegios.
- Decidir si quitar `avisos` a un colegio debe frenar también el envío automático al pasar lista.
