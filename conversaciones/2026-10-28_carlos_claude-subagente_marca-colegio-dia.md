# Manual de marca en el día a día del colegio

| Campo | Valor |
|---|---|
| Fecha | 2026-10-28 |
| Colaborador | Carlos (desarrollo) |
| Agente y modelo | Claude Code (subagente) · claude-sonnet-5-5 |
| Rama y commits | `feat/marca-colegio-dia` |
| Specs afectadas | `specs/04-asistencia.md` |

## Pedidos del colaborador (textual)
> okey ahora te eh dejado una carpeta completa que me entrego mi compañero de marketing; donde tiene el contenido completo de los colores, iconos, svg , etc ; quiero que lo estudies y lo implementes en el sistema; quiero que todo este como lo esta proponiendo en diseño porfavor

## Decisiones
- Estados de asistencia: Llegó (Check), Tarde (Clock), No llegó (CircleAlert), Aviso (TriangleAlert, rojo). Los valores internos `falta`/`problema` no cambian.
- Inicio: mosaicos agrupados con rótulos `sobretitulo` según `NOMBRE_GRUPO`; contador de mensajes como nudo maíz.
- Burbujas de chat: propias `primary`, ajenas `superficie-2`, `rounded-lg`.

## Cambios realizados
- `src/components/`: EstadoAsistencia, PlanLock, VistaPreviaAviso, FormJustificar, IndicadorSinConexion, AvisoColaFallida.
- `src/app/colegio/[slug]/` inicio, asistencia, porteria, avisos, justificaciones, mensajes, comunicados, perfil, consentimiento: tipografía, formas, sin sombras en reposo, enlaces `enlace`, íconos de estado.
- `tests/e2e/pasar-lista-aviso-justificar.test.ts`: botón «Falta» pasa a «No llegó».
- `specs/04-asistencia.md`: textos de estado.

## Validación
- `pnpm lint` y `pnpm typecheck` en verde; e2e de la lista (15 pruebas, `E2E_PORT=3051`) en verde.
- `pnpm test`: 485 de 486; falla `dia-a-dia-offline-plazo` (un caso que usa «hace 1 h» y falla pasada la medianoche; no depende de esta rama).

## Pendientes y preguntas abiertas
- Corregir el caso horario de `dia-a-dia-offline-plazo.test.ts`.
