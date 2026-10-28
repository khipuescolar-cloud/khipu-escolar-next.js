# 13 — Nudito (asistente, sin LLM en el MVP)

> Estado: implementado · Plan: Pro Max · Última actualización: 2026-10-27 (Claude Code)

## Objetivo
Un asistente conversacional para las familias del colegio (rol **apoderado**) que responde dudas del día a día (tareas, fechas, llegada, horario, reglamento) usando **solo datos reales** del colegio y de sus hijos. Funciona por intenciones, sin LLM ni API keys de IA (AGENTS.md).

**Decisión (protección de menores):** el rol `alumno` (cuenta propia del estudiante, specs/03) **no usa Nudito**: ni widget, ni `/nudito`, ni la action (403). Un asistente conversacional automático habla solo con adultos responsables; el alumno consulta sus datos en las pantallas de solo lectura.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| apoderado (colegio Pro Max) | Usar el widget, ver su historial en `/nudito`, preguntar por **sus** hijos | Ver datos de otras familias o colegios |
| profesor, dirección, portería, administrativo, **alumno** | — | Ver el widget, la página ni usar la action (403) |
| cualquier rol en colegio Básico o Fase 2 | — | Nudito (403 por plan; el widget no se renderiza) |

## Flujos
1. El apoderado abre la burbuja (abajo a la derecha) y escribe (máx. 500 caracteres).
2. La action guarda la conversación y el mensaje, llama a `IntentNudito`, guarda la respuesta (con `intencion` y `derivado`) y la devuelve.
3. Si tiene varios hijos y no dice cuál, Nudito pregunta con botones (`elegir_hijo`); el botón envía el nombre y Nudito retoma la pregunta pendiente (se guarda como `intencion = "elegir_hijo:<intencion>"`).
4. Si deriva, ofrece botones `abrir_chat` hacia `/mensajes/nuevo?alumno=<id>` (spec 08): la lista de profesores **de ese hijo**. `/mensajes/nuevo` y `/libreta` validan `?alumno=` con `requireAlumnoVisible` (403 si no es su hijo). Los enlaces antiguos `/mensajes?alumno=<id>` (historial guardado) redirigen a `/mensajes/nuevo?alumno=<id>`. Las notas ofrecen «Abrir la libreta» → `/libreta?alumno=<id>`, que abre la libreta de ese hijo.
5. `/nudito` lista las conversaciones del apoderado (hasta 20, con su historial completo), **agrupadas por hijo**: píldoras «Todas · <cada hijo> · Generales» (`?hijo=<alumnoId>` filtra por `NuditoConversacion.alumnoId`, validado contra sus hijos activos; `?hijo=general` = conversaciones que no hablaron de un hijo). El hijo de una conversación es el primero que se consultó en ella.
6. Si el apoderado **nombra a un niño que no es su hijo** (aunque tenga uno solo), Nudito no responde con los datos de su hijo: «No encuentro a <nombre> entre tus hijos. Puedo ayudarte con <nombres de sus hijos>.», con botones para elegir a uno de ellos si la pregunta necesitaba un hijo. No consulta la BD por ese nombre, así que **no revela si ese alumno existe** en el colegio (la respuesta es idéntica para un alumno real y un nombre inventado).

## Reglas de negocio
- La primera respuesta de cada conversación dice: «Soy un asistente con IA. Si no sé algo, te paso con una persona del colegio.»
- Nunca inventa datos: sin datos lo dice («No encuentro tareas por entregar registradas para Mateo.»).
- Nunca compara alumnos, nunca usa la culpa ni las rachas.
- **Nunca da malas noticias:** faltas, tardanzas, «problema», notas B/C o menores a 11 → «Para eso es mejor hablar con su tutora.» + botón al chat, `derivado = true`. Las preguntas con palabras delicadas se derivan sin consultar datos.
- Si llegó hoy: «Mateo llegó al colegio a las 7:52 a. m.» Si hay cualquier registro de hoy que no sea «llegó», deriva. Sin registro: «Todavía no veo el registro de hoy de Mateo.»
- Sin coincidencia: «No estoy seguro. Te paso con una persona del colegio.» (deriva).
- Solo responde sobre los hijos del apoderado en el colegio activo (`alumnoIdsVisibles` + `ctx.db`).
- Detector de nombres ajenos (`nombresAjenos` en `intenciones.ts`, puro): cuenta como nombre (a) un nombre de pila frecuente en cualquier posición (lista `NOMBRES_COMUNES`, sin los que son palabras comunes como luz, paz o flor), (b) una palabra con mayúscula fuera del inicio de una oración, (c) la palabra que sigue a «mi hijo/hija/hijito…», y (d) la respuesta corta a «¿de cuál hijo?» que no es ninguno de ellos. No cuentan: nombres y apellidos de los hijos, el nombre del apoderado y del colegio, cursos, días, meses, saludos, palabras de intención («Tareas») ni quien va tras un título («la miss Lucía», «la profesora Ana»). Se aplica a intenciones sobre un niño (tareas, fechas, asistencia, notas, hablar con persona, desconocido) y antes de la derivación por tema delicado; horario y reglamento son del colegio y no cambian. Es una heurística conservadora: un nombre poco común escrito en minúsculas a mitad de frase no se detecta (entonces responde por su hijo, como antes).
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
Decisión `no_es_hijo` (`decidir(entrada, hijos, historial, { excluir })`) → `noEsHijo(nombre, hijos, intencionPendiente)` en `respuestas.ts` (intención guardada `no_es_hijo` o `elegir_hijo:<intencion>`). Rutas: `rutaChatDe(id)`, `rutaLibretaDe(id)`.
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
- unit (`tests/unit/nudito-*.test.ts`): tabla de frases → intención, malas noticias siempre derivan, disclaimer, elección de hijo, no compara; `nudito-nombres-ajenos.test.ts`: detector de nombres ajenos (positivos y falsos positivos: cursos, días, nombre del apoderado, «la miss Lucía», apellidos de los hijos), `no_es_hijo` con un solo hijo y en la respuesta a «¿de cuál hijo?», texto de `noEsHijo` y enlaces al hijo correcto.
- integración (`tests/integracion/nudito.test.ts`): no devuelve tareas de otro salón ni de otro colegio (crea su propio colegio `test-promax-*`); nombrar a un alumno real que no es su hijo da la misma respuesta que un nombre inventado y sin datos; Fase 2 sin Nudito.
- e2e (`tests/e2e/nudito.test.ts`): Rosa pregunta por las tareas de Mateo; «¿qué tareas tiene Pedro?» → «No encuentro a Pedro…»; el botón «Hablar con la tutora» abre `/mensajes/nuevo` con los profesores de Mateo y el enlace antiguo redirige; `/nudito` filtra por hijo; el widget no aparece para profesora ni en Academia Euler. `tests/e2e/rol-alumno.test.ts`: el alumno no ve Nudito (403).

## Pendientes
- **Externo:** LLM tras aprobación explícita (AGENTS.md prohíbe API keys de IA); se enchufaría implementando `NuditoProvider` y mejoraría la detección de nombres.

## Marca (manual, 28/10/2026)
- `NuditoMascota` dibuja el diseño oficial (`public/marca/nudito.svg`) en SVG en línea con estados `reposo|saludo|pensando|avisando|celebrando|preocupado|durmiendo` (animaciones CSS de 0,5–2 s; en bucle solo reposo, pensando y durmiendo; quieto con `prefers-reduced-motion`; `aria-hidden`). En tema oscuro se dibuja sobre un círculo crema.
- El estado lo elige `src/lib/nudito/estado.ts` (`elegirEstadoNudito`): durmiendo fuera del horario escolar 7:00–17:00 (Lima, constante `HORARIO_ESCOLAR`), pensando mientras responde, saludo 1,2 s al abrir.
- Widget: botón de 64 × 64 px, `aria-label="Abrir a Nudito, asistente de Khipu"`; burbujas en `font-nudito text-voz-nudito`; aviso fijo «Soy un asistente con IA. Si no sé algo, te paso con una persona del colegio.»; avatar de 32 px (cara y colita). No cambia la lógica de respuestas.
