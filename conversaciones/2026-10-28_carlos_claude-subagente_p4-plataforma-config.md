# Panel de plataforma v2 · equipo, anuncios y configuración

| Campo | Valor |
|---|---|
| Fecha | 2026-10-28 |
| Colaborador | Carlos (desarrollo) |
| Agente y modelo | Claude Code (subagente p4-plataforma-config) · Sonnet 5.5 |
| Rama y commits | `feat/p4-plataforma-config` |
| Specs afectadas | `specs/22-equipo-anuncios-y-configuracion.md`, `specs/00-indice.md`, `specs/16-plataforma-superadmin.md` |

## Pedidos del colaborador (textual)
> aqui en esta panel faltan bastantes cosas , como el tema de los planes, los roles por defectos que dispondremos a cada colegio, los modulos que podran ver cada plan , configurar cada colegio para agregar mas de 1 responsable , etc . ponte creativo y agrega modulos necesarios para este sistema

Encargo al subagente: módulos `/equipo`, `/anuncios` y `/configuracion` (feriados conectados al plazo de justificación, horario de Nudito, datos de solo lectura).

## Decisiones
- Lógica de alta de super admin movida a `plataforma-equipo.ts` (el script la reutiliza); por la web nunca se muestra contraseña (documento o enlace por correo).
- Auditoría con `plataforma-registro.ts` (acción como texto) para no tocar el tipo `AccionPlataforma` de `plataforma.ts` que editan otros agentes.
- Feriados extra: parámetro opcional `feriadosExtra` en las funciones de `plazo-justificacion.ts`; los servidores llaman a `feriadosAplicables` (caché de 30 s).
- Horario de Nudito en horas enteras; el widget recibe `horario` por prop desde el layout del colegio.
- Layout del colegio: cambio mínimo (fragmento en `avisoSuperior` + una línea con `anunciosVigentes`/`horarioNudito`).

## Cambios realizados
- `src/lib/server/plataforma-{equipo,anuncios,configuracion,registro}.ts`, `src/lib/anuncios-plataforma.ts`, `src/components/AnunciosPlataforma.tsx`.
- `src/app/plataforma/{equipo,anuncios,configuracion}/**`; `scripts/crear-superadmin.ts`.
- `dias-habiles.ts`, `plazo-justificacion.ts`, `justificaciones.ts`, `asistencia.ts`, `notificaciones/encolar.ts`, `nudito/estado.ts`, `NuditoWidget.tsx`, `colegio/[slug]/layout.tsx`, `colegio/[slug]/asistencia/page.tsx`.
- Tests: unit, integración y e2e nuevos (ver spec 22).

## Validación
- `pnpm lint && pnpm typecheck && pnpm test`, e2e propio y `plataforma-superadmin.test.ts` con `E2E_PORT=3064` (resultados en el informe final).

## Pendientes y preguntas abiertas
- Horario de Nudito por colegio; estadísticas de lectura de anuncios.
