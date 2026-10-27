# Pendientes v2 · plataforma: último ingreso, gráficos de 30 días y acceso de soporte

| Campo | Valor |
|---|---|
| Fecha | 2026-10-27 |
| Colaborador | Carlos (equipo Khipu) |
| Agente y modelo | Claude Code (subagente del orquestador) · claude-opus-5-5 |
| Rama y commits | `feat/p2-plataforma` · ver `git log` de la rama («Add support access, login-based metrics and 30-day charts to platform») |
| Specs afectadas | `specs/16-plataforma-superadmin.md`, `specs/01-arquitectura-multitenant.md`, `specs/02-autenticacion-login.md` |

## Pedidos del colaborador (textual)
> Si borralos , si ya no lo estamos usando y ya no lo necesitamos , no hay problema con borrarlos no? y porfavor ve resolviendo todos los pendientes que tengamos , quiero que por a hora trabajes de manera autonoma resolviendo cada problema que tengas y que lances multiagentes para que solucioones todos, si necesitas lazar 50 miltiagentes no hay problema pr que la finalidad es que termines con todo lo pendiente que tuvimos

(El orquestador repartió los pendientes por frente; a este subagente le tocó «plataforma».)

## Decisiones
- **Usuarios activos / último ingreso** salen de `profiles.ultimo_ingreso_at` y `login_intentos.user_id` (ya no se hace join por correo). Por colegio solo cuentan perfiles con membresía **activa** en ese colegio.
- **Gráficos:** líneas para series diarias (ingresos; enviados vs. abiertos en el mismo eje), barras horizontales para alumnos por colegio. Solo `--chart-1` y `--chart-2` (el par pasa el validador de daltonismo en claro y oscuro); la 2.ª serie va además punteada y con leyenda. Tabla `sr-only` por gráfico. En la ficha del colegio la tabla semanal queda dentro de un `<details>`.
- **Modo soporte:** se arma en `resolverContextoColegio` (tenant.ts) solo si el usuario no tiene membresía activa. Solo lectura con `dbTenant(id, { soloLectura: true })` (bloquea también modelos globales). Las funciones privadas se bloquean de forma central en `requireFeature`/`tieneFeature` (`FEATURES_PRIVADAS_SOPORTE`), porque todas las páginas/actions/routes de mensajes, notas, libreta y Nudito ya lo llaman. Además una línea en `/api/exportar` (el ZIP contiene chats y notas).
- «Terminar» desde el banner del colegio es un POST a un route handler del panel (`/soporte/terminar`) que valida `Origin` de nuestro dominio; las server actions no sirven entre subdominios.
- La auditoría `soporte_ver` se registra una vez por request (el contexto está cacheado), sin la ruta exacta (el layout y la página comparten contexto).
- Compensación: `crearCuentaConDocumento` devuelve `camposCompletados`; `revertirCamposCompletados` los pone en `null` solo si siguen con el valor escrito. Se usa en `crearColegio` y en `agregarAdministrador`.

## Cambios realizados
- `src/lib/server/auth.ts`: `registrarIntentoLogin` (userId + `ultimoIngresoAt`).
- `src/lib/server/plataforma.ts`: métricas por `ultimoIngresoAt`/`user_id`, `FilaReporte.usuariosActivos7d`, `serieDiariaPlataforma`, bitácora por `(tenant_id, created_at)`, `iniciarAccesoSoporte`/`terminarAccesoSoporte`/`accesoSoporteActual`, compensación de campos completados.
- `src/lib/server/tenant.ts`: `resolverContextoColegio`, `accesoSoporteVigente`, `ctx.soporte`, auditoría `soporte_ver`.
- `src/lib/server/db.ts`: `dbTenant(id, { soloLectura })`, `ErrorSoloLectura`.
- `src/lib/server/plan.ts`: `FEATURES_PRIVADAS_SOPORTE`. `src/lib/server/auditoria.ts`: acción `soporte_ver`. `src/lib/server/cuentas.ts`: `camposCompletados`, `revertirCamposCompletados`.
- `src/app/plataforma/page.tsx` y `colegios/[id]/page.tsx`: gráficos, tarjeta de acceso activo, «Entrar como soporte» (`_componentes/DialogoSoporte.tsx`), `_componentes/Graficos.tsx`, actions `entrarSoporteAction`/`terminarSoporteAction`, route `soporte/terminar`.
- `src/app/colegio/[slug]/layout.tsx`: banner del modo soporte y navegación sin módulos privados. `src/app/colegio/[slug]/api/exportar/route.ts`: una línea (403 en soporte).
- Tests: `tests/integracion/acceso-soporte.test.ts` (nuevo), compensación ampliada en `tests/integracion/plataforma-superadmin.test.ts`, e2e de modo soporte en `tests/e2e/plataforma-superadmin.test.ts`.
- Specs 16, 01 y 02 actualizadas; en la 16 se quitaron los pendientes resueltos (incluida la página 403, que ya enlaza a `/`).

## Validación
- `pnpm lint` ✔ · `pnpm typecheck` ✔ · `pnpm test` ✔ (32 archivos, 291 pruebas).
- `E2E_PORT=3021 pnpm exec playwright test tests/e2e/plataforma-superadmin.test.ts tests/e2e/login-flow.test.ts` ✔ (7 pruebas).
- Revisión visual de los gráficos de la vista principal (captura local).

## Pendientes y preguntas abiertas
- Producto: ¿avisar a la dirección del colegio cuando el equipo Khipu entra como soporte? Hoy solo queda en su auditoría.
- Los `login_intentos` previos a la migración no tienen `user_id` (los gráficos de ingresos cuentan desde ahora).
- Ingresos que no pasan por `iniciarSesion` (fijar contraseña desde la invitación) no actualizan `ultimo_ingreso_at`.
- Los tokens `--chart-*` fallan la banda de luminosidad del validador de dataviz (decisión de marca, fuera de este frente); por eso se usan solo dos series con codificación secundaria.
