# Orquestación del refuerzo de primaria

Modelo de trabajo acordado con Carlos (2026-11-16) para los lotes de `claseGuiada` de primaria. Fuente de verdad del avance: `docs/nudito/estado-refuerzo-primaria.json`. Criterios de terminado: `docs/nudito/INSTRUCCIONES-CONTINUAR-REFUERZO-PRIMARIA.md`.

## Roles

- **Líder (Opus):** planifica el lote, reparte tareas, integra resultados y decide. No escribe código ni texto de clases.
- **Sonnet:** autores de `claseGuiada` y revisores visuales y factuales. Cada lote tiene un autor y un revisor distintos.
- **Haiku:** escritura de documentación y repaso de texto: ortografía, concordancia, legibilidad oral.
- **GPT terra/luna (Codex):** trabajador si su sandbox funciona. Hoy falla con `bwrap: setting up uid map: Permission denied` (AppArmor); hasta resolverlo, Sonnet lo sustituye como autor. El arreglo `sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0` requiere decisión de Carlos.
- **Imágenes:** `gpt-img` (Codex ImageGen), Gemini `agy` y Z-Image local (`~/comfyui-khipu`). Un solo generador por ficha, para no mezclar estilos.
- **Matemática:** se hace con SVG como código, sin generador de imágenes.

## Reglas

1. Las tareas en paralelo no tocan el mismo archivo. Cada autor trabaja en sus fichas y sus SVG.
2. Cada subagente devuelve un resumen de como máximo 6 líneas. El detalle queda en archivos del repo.
3. Un autor nunca aprueba su propio lote. La aprobación la da un revisor independiente.
4. La huella se renueva solo por clave, después de la aprobación independiente, con `scripts/curriculum/renovar-huellas-locales.ts`. Nunca en masa.
5. Editar ejercicios existentes solo por error factual, y documentarlo en los `## Correcciones` del informe. Las ediciones de claridad se señalan aparte para que el líder las confirme.
6. Sin ventanas de navegador en los subagentes. El recorrido de navegador lo hace el líder o una tarea dedicada.
7. Imágenes: cada imagen se inspecciona con Read antes de integrarla. Si falla, otra semilla (máximo 3 intentos) o SVG.
8. Estados y visibilidad: `escritura`, `validacionTecnica`, `revisionPedagogica`, `aprobacionEditorial` y `huellaVigente` se actualizan solo tras la aprobación. `visibilidadAlumno` no pasa a `si_*` sin revisar el plan publicado.

## Ahorro de créditos

- Primero un lint mecánico antes de revisar: `scripts/nudito-lint-clase-guiada.ts` (en construcción, aún no existe en el repo). Atrapa longitudes de opciones, letras sueltas, `recursoRef` sin recurso y palabras duplicadas.
- Segunda ronda acotada: el revisor solo verifica los defectos señalados en la primera ronda, no toda la clave otra vez.
- Modelo más barato que dé la calidad exigida. Opus solo para planificar y para lo más difícil.

## Ciclo de un lote

1. El líder reparte 6 o 7 claves: un autor Sonnet (o Codex si su sandbox funciona) y un revisor distinto.
2. Autor escribe la clase y los SVG. Lint mecánico.
3. Revisor independiente aprueba o pide cambios.
4. Correcciones del autor, segunda ronda acotada.
5. Huella por clave y registro en el JSON de estado.
6. Informe `docs/nudito/informe-editorial-primaria-lote-NN.md` y revisión `docs/nudito/revision-lote-NN.md`.
7. Pendientes del lote en `docs/nudito/PENDIENTES-IMAGENES-6AM.md`.

## Pendientes de esta orquestación

- Decidir el arreglo de AppArmor para Codex.
- Crear `scripts/nudito-lint-clase-guiada.ts`.
- Recorrido humano y audio real de las clases integradas.

## Lanzamiento visible de agentes (lotes 46 a 57)

- **Codex u otra IA externa:** `hc run --bg` de Herdr. Cada agente abre su ventana y se puede ver mientras trabaja.
- **Sonnet:** `claude --model sonnet ...` visible. Se lanza desde el cwd `StartUp`, no desde `khipu-escolar`, porque ese repositorio pide confirmar la confianza del directorio.
- **Resultados:** cada agente escribe su resumen en `scratchpad/resultados/*.md` de la sesión. El orquestador lee ese resumen, no el detalle del trabajo.
- **Vigilancia:** `hc ls` para ver los agentes activos y el monitor de Herdr para seguir su salida.
- **Límites:** los hijos de `hc` quedan dentro de la pestaña del orquestador; no hay API de paneles para moverlos ni reordenarlos.
- **Límite de Codex por cuenta:** cuando la cuenta ChatGPT llega a su límite de uso, el proceso se detiene. Se retoma esa parte con Claude y se cierran los agentes de Codex que quedaron colgados. En los lotes 46 a 57 Codex se detuvo por ese límite (7 de 8 procesos).
