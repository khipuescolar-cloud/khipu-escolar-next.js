# 13 — Nudito (asistente, sin LLM en el MVP)

> Estado: implementado · Plan: Pro Max · Última actualización: 2026-10-26 (Claude Code)

## Objetivo
Un asistente conversacional para las familias del colegio (rol **apoderado**) que responde dudas del día a día (tareas, fechas, llegada, horario, reglamento) usando **solo datos reales** del colegio y de sus hijos. Funciona por intenciones, sin LLM ni API keys de IA (AGENTS.md). Alumno: después.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| apoderado (colegio Pro Max) | Usar el widget, ver su historial en `/nudito`, preguntar por **sus** hijos | Ver datos de otras familias o colegios |
| profesor, dirección, portería | — | Ver el widget, la página ni usar la action (403) |
| cualquier rol en colegio Básico o Fase 2 | — | Nudito (403 por plan; el widget no se renderiza) |

## Flujos
1. El apoderado abre la burbuja (abajo a la derecha) y escribe (máx. 500 caracteres).
2. La action guarda la conversación y el mensaje, llama a `IntentNudito`, guarda la respuesta (con `intencion` y `derivado`) y la devuelve.
3. Si tiene varios hijos y no dice cuál, Nudito pregunta con botones (`elegir_hijo`); el botón envía el nombre y Nudito retoma la pregunta pendiente (se guarda como `intencion = "elegir_hijo:<intencion>"`).
4. Si deriva, ofrece botones `abrir_chat` hacia `/mensajes?alumno=<id>` (spec 08).
5. `/nudito` lista las conversaciones del apoderado (hasta 20, con su historial completo).

## Reglas de negocio
- La primera respuesta de cada conversación dice: «Soy un asistente con IA. Si no sé algo, te paso con una persona del colegio.»
- Nunca inventa datos: sin datos lo dice («No encuentro tareas por entregar registradas para Mateo.»).
- Nunca compara alumnos, nunca usa la culpa ni las rachas.
- **Nunca da malas noticias:** faltas, tardanzas, «problema», notas B/C o menores a 11 → «Para eso es mejor hablar con su tutora.» + botón al chat, `derivado = true`. Las preguntas con palabras delicadas se derivan sin consultar datos.
- Si llegó hoy: «Mateo llegó al colegio a las 7:52 a. m.» Si hay cualquier registro de hoy que no sea «llegó», deriva. Sin registro: «Todavía no veo el registro de hoy de Mateo.»
- Sin coincidencia: «No estoy seguro. Te paso con una persona del colegio.» (deriva).
- Solo responde sobre los hijos del apoderado en el colegio activo (`alumnoIdsVisibles` + `ctx.db`).
- Límite: 20 mensajes por minuto por membresía (cuenta en BD).
- Tono: «tú», corto, una idea por mensaje.

## Modelo de datos
`nudito_conversaciones` (`membership_id`, `alumno_id` opcional: último hijo consultado) y `nudito_mensajes` (`autor`, `cuerpo`, `intencion`, `derivado`, `acciones` Json opcional: los botones de la respuesta). Lee: `tareas`, `eventos_agenda`, `asistencias`, `calificaciones_periodo`, `notas`, `documentos_colegio`. No se cambió el esquema.

## Contratos de `src/lib/server/nudito`
```ts
interface NuditoProvider { responder(ctx, entrada: string, historial: MensajeHistorial[]): Promise<RespuestaNudito> }
type RespuestaNudito = { texto; intencion; derivado; acciones?: { tipo: "abrir_chat"|"elegir_hijo"|"ir"; etiqueta; valor }[]; alumnoId? }
// puro (sin BD): normalizar.ts, intenciones.ts (detectarIntencion, decidir, esTemaDelicado…), respuestas.ts (textos)
// con BD: intent-nudito.ts → class IntentNudito
// action: enviarMensajeNuditoAction({ slug, conversacionId|null, texto }) → { ok, conversacionId, texto, derivado, acciones } | { ok:false, error }
```
Intenciones: `saludo`, `ayuda`, `tareas_pendientes`, `proximas_fechas`, `asistencia_hoy`, `notas`, `horario`, `reglamento`, `hablar_con_persona`, `desconocido`. Más adelante se enchufa un LLM implementando `NuditoProvider` (requiere aprobación: AGENTS.md prohíbe API keys de IA).

## Rutas y UI
- Widget `NuditoWidget` (cliente, `font-nudito`) renderizado desde `src/app/colegio/[slug]/layout.tsx` solo si `rol === "apoderado"` y el plan incluye `nudito`. Mascota SVG con animación suave desactivada con `prefers-reduced-motion`. Accesible: `role="dialog"`, foco al abrir, Esc cierra y devuelve el foco, respuestas en `aria-live`.
- `/nudito` (apoderado): historial de conversaciones; los botones guardados (`abrir_chat`, `ir`) se muestran como enlaces bajo cada respuesta (los de `elegir_hijo` ya no tienen sentido y se omiten).
- Diseño: el panel del widget usa tokens shadcn (cabecera `primary` con mascota, burbujas propias `primary` / de Nudito `muted`, botones y sugerencias iniciales como chips `rounded-pildora`). Se mantienen `font-nudito`, la animación y `prefers-reduced-motion`. `/nudito` usa `EncabezadoPagina`, `Card` por conversación y `EstadoVacio`.
- Al abrir el widget por primera vez retoma la última conversación con actividad en las últimas 12 horas (`cargarConversacionNuditoAction`), con sus botones. `leerAcciones` (`nudito/acciones.ts`) valida el Json guardado.

## Textos y UX
Los textos exactos están en `src/lib/server/nudito/respuestas.ts`. Estados siempre con texto; sin emojis en avisos serios.

## Errores y casos borde
- Mensaje vacío o de más de 500 caracteres: error de validación (zod). Demasiados mensajes: «Estás escribiendo muy rápido…».
- Conversación que no es de la membresía: «No encontré esa conversación.»
- Plan sin Nudito o rol distinto de apoderado: 403.

## Pruebas
- unit (`tests/unit/nudito-*.test.ts`): tabla de frases → intención, malas noticias siempre derivan, disclaimer, elección de hijo, no compara.
- integración (`tests/integracion/nudito.test.ts`): no devuelve tareas de otro salón ni de otro colegio (crea su propio colegio `test-promax-*`), Fase 2 sin Nudito.
- e2e (`tests/e2e/nudito.test.ts`): Rosa pregunta por las tareas de Mateo; el widget no aparece para profesora ni en Academia Euler.

## Pendientes
- Rol alumno y ver las conversaciones del hijo.
- LLM tras aprobación explícita.
- `/mensajes?alumno=` y `/libreta?alumno=` dependen de otros módulos.
- Un apoderado que nombra a un alumno que no es su hijo recibe la respuesta de su propio hijo si solo tiene uno (no se filtran datos ajenos).
