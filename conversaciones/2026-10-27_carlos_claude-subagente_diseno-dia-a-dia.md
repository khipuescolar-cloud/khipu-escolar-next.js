# Rediseño del día a día (inicio, asistencia, portería, avisos, justificaciones)

| Campo | Valor |
|---|---|
| Fecha | 2026-10-27 |
| Colaborador | Carlos (desarrollo) |
| Agente y modelo | Claude Code (subagente) · Claude Sonnet 5.5 |
| Rama y commits | `feat/diseno-dia-a-dia` · commit «Redesign daily attendance pages» |
| Specs afectadas | `specs/18-sistema-de-diseno.md`, `04-asistencia.md`, `07-justificaciones.md` |

## Pedidos del colaborador (textual)
> mejora el diseño de todo el sistema y deja un archivo donde se especifique el diseño, tema, colores, formas, stilos etc

## Decisiones
- Todo por tokens shadcn y componentes `Card`, `Table`, `Badge`, `EstadoVacio`, `EncabezadoPagina`.
- Pasar lista: barra de guardado fija en móvil (botón duplicado por CSS, uno oculto según ancho) para no cambiar los selectores e2e.
- Aceptar/rechazar justificación usan `BotonConfirmar`. Pasar lista no pide confirmación extra (flujo rutinario; el botón ya dice que avisa a los padres).
- Toast en justificación enviada se omitió porque duplicaba el texto visible que verifica el e2e.

## Cambios realizados
- `inicio/*`: saludo, mosaicos con ícono tintado, contador como `Badge`, stat tiles por salón.
- `asistencia/*`, `porteria/*`, `avisos/page.tsx`, `justificaciones/*` (nuevo `RevisionJustificacion.tsx`), `FormJustificar`, `PlanLock`, `EstadoAsistencia`, `VistaPreviaAviso`.
- Specs 04, 07 y 18 §8.

## Validación
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (275) en verde; e2e de los 4 archivos: 11 pasan.
- Capturas 1366 y 390 px, claro y oscuro, en el scratchpad `diseno-dia-a-dia/`.

## Pendientes y preguntas abiertas
- Confirmar si dirección quiere confirmación también al guardar la lista.
- El indicador de desarrollo de Next tapa parte de la barra fija en capturas (solo en dev).
