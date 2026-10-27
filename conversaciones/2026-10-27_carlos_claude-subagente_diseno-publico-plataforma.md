# Rediseño de páginas públicas y panel de plataforma

| Campo | Valor |
|---|---|
| Fecha | 2026-10-27 |
| Colaborador | Carlos (desarrollo) |
| Agente y modelo | Claude Code (subagente) · claude-sonnet-5-5 |
| Rama y commits | `feat/diseno-publico-plataforma` · ver `git log` |
| Specs afectadas | `specs/18-sistema-de-diseno.md` (sección 8) |

## Pedidos del colaborador (textual)
> mejora el diseño de todo el sistema y deja un archivo donde se especifique el diseño, tema, colores, formas, stilos etc

## Decisiones
- Layout público con panel de marca índigo (solo escritorio) y tarjeta centrada; móvil apilado.
- Plataforma: `EncabezadoPagina`, `StatTile`, tablas `Table` en tarjeta, insignias de plan/estado, estados vacíos, `Notificar` y toasts.
- Suspender/cambiar estado y reenviar bienvenida pasan por `BotonConfirmar`.
- Sin cambios en lógica, actions ni selectores de tests.

## Cambios realizados
- `src/app/(publico)/**`, `forbidden.tsx`, `not-found.tsx`: nuevo diseño con tokens.
- `src/app/plataforma/**` (salvo layout): vista principal, reporte, nuevo colegio, ficha; nuevos `_componentes/StatTile.tsx` y `_componentes/CambiarEstado.tsx`; `PlanColegio` en `EstadoColegio.tsx`.
- `specs/18-sistema-de-diseno.md`: patrones nuevos.

## Validación
- `pnpm lint`, `pnpm typecheck`: sin errores.
- e2e login-flow y plataforma-superadmin: 6/6 en verde (puerto 3011, porque el 3001 estaba ocupado por otro proceso ajeno).
- Capturas 1366 px y 390 px, claro y oscuro.

## Pendientes y preguntas abiertas
- Gráficos de 30 días con `chart-1…5`.
