# Marca en gestión, configuración y académico (frente colegio-gestion)

| Campo | Valor |
|---|---|
| Fecha | 2026-10-28 |
| Colaborador | Carlos (desarrollo) |
| Agente y modelo | Claude Code subagente · claude-sonnet-5-5 |
| Rama y commits | `feat/marca-colegio-gestion` |
| Specs afectadas | `specs/05-porteria-qr.md`, `specs/11-notas-y-libreta.md`, `specs/18-sistema-de-diseno.md` |

## Pedidos del colaborador (textual)
> okey ahora te eh dejado una carpeta completa que me entrego mi compañero de marketing; donde tiene el contenido completo de los colores, iconos, svg , etc ; quiero que lo estudies y lo implementes en el sistema; quiero que todo este como lo esta proponiendo en diseño porfavor

## Decisiones
- Tipografía por clases del manual (`text-titulo-1/2`, `text-cuerpo-sm`, `sobretitulo`); texto de lectura nunca menor a 14 px; enlaces con `enlace`.
- Sin sombras en reposo; mosaicos de Gestión con `hover:shadow-sombra-1`.
- Nuevo `EtiquetaCurso` (turquesa) y etiqueta del plan en Configuración.
- PDF de libreta y carnets con paleta del manual y firma con isotipo; Helvetica por falta de fuentes incrustadas.
- «Falta» pasa a «No llegó» y «Con problema» a «Aviso» en el resumen de libreta.

## Cambios realizados
- `src/app/colegio/[slug]/{gestion,configuracion,notas,libreta,tareas,agenda}/**`, `src/components/{academico,adjuntos,Calificacion}`: tipografía, formas, espacios.
- `src/lib/server/{libreta-pdf,carnets-pdf}.tsx`, `marca-pdf.ts` (nuevo), rutas `api/libreta` y `api/carnets`.

## Validación
- `pnpm lint`, `pnpm typecheck` en verde; e2e (crm-personal, ui-pendientes, notas-libreta, tareas-agenda, rol-alumno) 18/18 con `E2E_PORT=3052`.

## Pendientes y preguntas abiertas
- `EncabezadoPagina` (shell) aún usa `text-2xl sm:text-3xl`; debería pasar a `text-titulo-1`.
- Incrustar Sora/Inter en los PDF.
