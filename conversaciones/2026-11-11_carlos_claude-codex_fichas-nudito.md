# Fichas de Nudito: producción por lotes, validador anti-plantilla y orden de trabajo

| Campo | Valor |
|---|---|
| Fecha | 2026-11-11 |
| Colaborador | Carlos (dueño del producto) |
| Agente y modelo | Claude Code (Opus 5.5 y Sonnet 5.5, supervisor; subagentes Sonnet y Fable de prueba) / Codex GPT-6-Sol / Antigravity CLI (Gemini 3.8 Flash) |
| Rama y commits | `dev`: fichas de Matemática 1.°–6.° de primaria; `docs/fichas-proceso` |
| Specs afectadas | `specs/50-nudito-banco-de-conocimiento.md` |

## Pedidos del colaborador (textual)
> no se si el modelo que tienen codex es el indicado, si lo hace mal supervisalo porfavor

> puedes usar tus propios creditos tomando de punto de partida donde lo dejaron los otros subagentes, pero se lo mas meticuloso posible para que no gastes tantos tokkens orquetalos cada uno para diferentes tareas; digamos que si necesitan investigar usar un modelo, si necesitan pensar , otro modelo, si necesitan escribir solamnete, otro modelo ; trata de orquestarlo de manera que no uses modelos pesados o modelos con mucho razonamiento solo para escribir algo chico.

> puedes usar ahora el Antigravity CLI que ya lo configure con mi cuenta y puedes probarlo usando multiagentes

> y por que no se ve asi como se ve cuando trabajas con codex?

> bueno validas lo de Gemini y trata de exprimir lo mas que se puedea; te lo dejo en tus manos ire a descansar; ya no uses tus propios creditos para trabajar , solo para supervisar

> y si usamos el modelo fable que no se ah usado nada, igual se consume mis creditos semanales?

> pucha veo que esto demorara mucho, de que otra manera podemos trabajar? usando modelos locales capaz? como deepsek o algo parecido?

> me gustaria que por el momento termien todo lo que tenga que ver con primaria; el lunes de la proxima semana es nuestra primera reunion y necesito que todo este listo al menos para primaria. Luego que terminemos con Primaraia empezaremos por secundaria y grado por grado, terminamos todo con 1º de secundaria y luego pasamos a 2º , y asi hasta 5º de secundaria; eso inscribelo como regla […] dejalo listo para que cuando abra una nueva ventana de claude y empiece a orquestar todo, que trabaje correctamente; tambien dejame el promp que voy a necesitar para la nueva conversacion de claude que tenga la misma meta

## Decisiones
- Fichas escritas a mano en lotes de 12 por escritores de modelo medio/Codex; fusión y validación por scripts sin IA.
- Las fichas de plantilla de Codex (1.° y 2.° de primaria) se rechazaron y reescribieron; el validador ahora detecta plantilla (prefijo de contexto, «Mira los X en el Y», enunciados casi iguales).
- Antigravity: cuota única compartida entre modelos (agotada ~7 días); Fable: 2 % del contador por 12 fichas y sube el semanal: no se usa para escribir; modelos locales descartados para escribir.
- Regla de orden: primaria completa para el lunes 2026-11-16; luego secundaria grado por grado (specs/50).

## Cambios realizados
- Matemática 1.°–6.° de primaria: 739 fichas en `dev` (490 + 119 + 130; 1.° y 2.° reescritas).
- `scripts/nudito-validar-banco.ts`, `tests/unit/nudito-plantillas.test.ts`.
- `scripts/fichas/` (driver y herramientas) y `docs/nudito/PROCESO-FICHAS.md` (traspaso).
- Supervisor automático `driver.py` con cola priorizada y reintento por cuota.

## Validación
- `pnpm nudito:validar-banco` OK por combinación; lint, typecheck y tests en verde en cada integración.

## Pendientes y preguntas abiertas
- Fichas de Comunicación y Ciencia y Tecnología (primaria primero), Matemática 1.° de secundaria (96/142 escritas) y secundaria 2.°–5.°.
- Revisión humana de muestras y aprobación (`pnpm curriculum:aprobar-todo`) para que los alumnos vean los temas con ficha; en la nube solo con permiso.

## Regla agregada: orquestación de modelos (2026-11-11)
> bueno entonces de esa manera vamos a usarlo, agregalo como regla al proyecto para que no lo perdamos luego, tambien agrega para que se usaria los otros modelos de claude y los otros modelos de codex, y tambien para que usaria los modelos locales; de esa manera antes de realizar una tarea que les asigno primero evaluan que modelos usar y de que manera se podria resolver sin usar tantos creditos

Resultado: norma 5 en `AGENTS.md` y `docs/orquestacion-de-modelos.md` (Fable solo revisión y temas difíciles; Opus/Sonnet/Haiku, Codex Sol/Luna, Antigravity y modelos locales con sus usos; lista de comprobación previa).
