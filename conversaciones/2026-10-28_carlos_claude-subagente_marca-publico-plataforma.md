# Marca: pantallas públicas y plataforma

| Campo | Valor |
|---|---|
| Fecha | 2026-10-28 |
| Colaborador | Carlos |
| Agente y modelo | Claude Code (subagente) · claude-sonnet-5-5 |
| Rama y commits | `feat/marca-publico-plataforma` |
| Specs afectadas | `specs/16-plataforma-superadmin.md` |

## Pedidos del colaborador (textual)
> okey ahora te eh dejado una carpeta completa que me entrego mi compañero de marketing; donde tiene el contenido completo de los colores, iconos, svg , etc ; quiero que lo estudies y lo implementes en el sistema; quiero que todo este como lo esta proponiendo en diseño porfavor

## Decisiones
- Se conserva el encabezado «No tienes acceso a esta sección» porque varios e2e de otros frentes lo usan.
- `EncabezadoPagina` (shell) aún usa `text-2xl`: fuera de alcance, se reporta.

## Cambios realizados
- `src/app/(publico)/**`: títulos Sora `text-titulo-2`, sin sombras, enlaces `enlace`, «Entrando a…» con isotipo oficial, carnet público «Carnet escolar».
- `forbidden.tsx`, `not-found.tsx`: isotipo oficial y tipografía de marca.
- `src/app/plataforma/**`: tipografía, `sobretitulo` en cabeceras, insignias con ícono, padding 16 px, título «· Khipu Escolar».

## Validación
- lint, typecheck, vitest (1 falla ajena: dia-a-dia-offline-plazo) y e2e login-flow, plataforma-superadmin, rol-alumno con `E2E_PORT=3054`: verdes.

## Pendientes y preguntas abiertas
- `EncabezadoPagina` a `text-titulo-1` (shell).
