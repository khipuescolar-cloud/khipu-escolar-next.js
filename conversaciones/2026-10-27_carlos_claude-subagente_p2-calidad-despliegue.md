# P2 calidad y despliegue

| Campo | Valor |
|---|---|
| Fecha | 2026-10-27 |
| Colaborador | Carlos (desarrollo) |
| Agente y modelo | Claude Code · subagente |
| Rama y commits | `feat/p2-calidad-despliegue` |
| Specs afectadas | `specs/01`, `02`, `06`, `10`, `18` |

## Pedidos del colaborador (textual)
> Si borralos , si ya no lo estamos usando y ya no lo necesitamos , no hay problema con borrarlos no? y porfavor ve resolviendo todos los pendientes que tengamos , quiero que por a hora trabajes de manera autonoma resolviendo cada problema que tengas y que lances multiagentes para que solucioones todos, si necesitas lazar 50 miltiagentes no hay problema pr que la finalidad es que termines con todo lo pendiente que tuvimos

## Decisiones
- Esqueletos compartidos en `src/components/carga/Esqueletos.tsx`; un `loading.tsx` por ruta con datos.
- Gmail solo para el piloto (límite 450/día); luego Amazon SES.
- Ítems de dominio, región, SMTP de Auth, subdominio de correo, revisión legal y SVG de marca quedan como externos.

## Cambios realizados
- 34 archivos `loading.tsx`, `docs/despliegue.md`, `vercel.json` (crons), bloque Gmail en `.env.example`, redirect URLs 3000–3030 en `supabase/config.toml`, enlaces en README/AGENTS, specs actualizadas.

## Validación
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (275) en verde; e2e paginas-basico-por-rol y login-flow en verde (8/8).

## Pendientes y preguntas abiertas
- Externos: dominio definitivo, región, SMTP de Auth en producción, subdominio de correo por colegio, revisión legal, SVG oficiales.
- No se hicieron capturas de los esqueletos (carga demasiado rápida en local).
