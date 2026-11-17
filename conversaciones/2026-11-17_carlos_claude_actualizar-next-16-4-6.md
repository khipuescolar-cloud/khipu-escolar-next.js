# Actualizar Next.js 16.4.3 → 16.4.6 (aviso de seguridad)

| Campo | Valor |
|---|---|
| Fecha | 2026-11-17 |
| Colaborador | Carlos (desarrollo) |
| Agente y modelo | Claude Code · claude-opus-5-5 |
| Rama y commits | `chore/next-16.4.6` (worktree `khipu-wt/next-16.4.6`, desde `dev`) |
| Specs afectadas | ninguna (cambio de dependencia, sin cambio de comportamiento) |

## Pedidos del colaborador (textual)
> We're upgrading the app in "…/khipu-escolar" from Next.js 16.4.3 to 16.4.6 because the installed version is affected by a published security advisory.
>
> If the app is in a Git repository, perform the upgrade in a separate Git worktree. […]
>
> Set `experimental.agentUpgrade` to "security" in the app's Next.js config as part of this upgrade. Preserve unrelated configuration. […]

## Decisiones
- Actualización dentro de la misma versión mayor: sin codemods ni guía de migración.
- `eslint-config-next` se sube a la par (16.4.6) para no desalinearlo de `next`.
- Se agrega `experimental.agentUpgrade: "security"` (lo admite 16.4.6); el resto de `next.config.ts` queda igual.
- `docs/pruebas-de-estres.md` no se toca: registra la versión con la que se hizo esa prueba.

## Cambios realizados
- `package.json`, `pnpm-lock.yaml`: `next` y `eslint-config-next` 16.4.3 → 16.4.6.
- `next.config.ts`: `experimental.agentUpgrade: "security"`.

## Validación
- `pnpm exec next --version` → `Next.js v16.4.6`.
- `pnpm typecheck` (tras `next typegen`): sin errores.
- `pnpm lint`: 3 errores y 3 avisos, idénticos a `dev` antes del cambio (preexistentes).
- `vitest run tests/unit`: 657/658; la falla (`nudito-plus-interruptor.test.ts`) también ocurre en `dev` (preexistente, depende del entorno).
- `NODE_ENV=production next build`: correcto. `next start` + `curl` a `lvh.me` y `nuevohorizonte.lvh.me` → 200.
- Ojo: con `NODE_ENV=development` exportado en la terminal, `next build` falla al prerenderizar (`useContext` nulo); es del entorno, no de la actualización.

## Pendientes y preguntas abiertas
- Abrir PR a `dev` cuando el colaborador lo autorice.
- No se corrieron tests de integración ni e2e.
