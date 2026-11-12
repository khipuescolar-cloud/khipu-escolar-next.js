# Proceso de fichas de Nudito (traspaso para nuevas conversaciones)

> Última actualización: 2026-11-11 (Claude + Codex). Léelo completo antes de orquestar. Lo pidió Carlos (dueño del producto): es una **regla del proyecto**.

## Meta y reglas de Carlos (obligatorias)
1. **Primera reunión: lunes 2026-11-16.** Para esa fecha debe estar lista **TODA la primaria** (6 grados × Matemática, Comunicación y Ciencia y Tecnología) con fichas completas.
2. **Después, secundaria GRADO POR GRADO:** se termina **1.° de secundaria completo** (Matemática + Comunicación + Ciencia y Tecnología) y recién se pasa a 2.°, luego 3.°, 4.° y 5.°. No avanzar a otro grado con uno incompleto.
3. **El piloto usa toda primaria y secundaria** (33 combinaciones curso × grado, 3 839 fichas = una por tema de `temario-propuesto.json`).
4. **Calidad antes que velocidad.** Carlos ya rechazó dos veces fichas de plantilla. Nunca integrar sin pasar el validador **y** revisar una muestra a mano (`scripts/fichas/ver-ficha.py`).
5. **Costo y modelos:** aplica `docs/orquestacion-de-modelos.md` (norma 5 de AGENTS.md). Resumen: el trabajo de escribir lo hacen Codex y, cuando haya cuota, Claude (Sonnet) en lotes. **No usar Fable para escribir** (2 % de su contador por 12 fichas y además baja el contador semanal general); solo para revisar muestras si Carlos lo pide. No usar modelos pesados para escribir cosas chicas.
6. Salida breve (estilo caveman) para todos los agentes/modelos. No usar Artifacts/Docs de claude.ai. Preguntar antes de escribir en la nube (Supabase, Gmail, Cloudinary reales).

## Estado al 2026-11-11 (17:45)
| Curso | Temas/fichas | Integradas en `dev` | Notas |
|---|---:|---:|---|
| Matemática | 1 365 | 739 (1.°–6.° de primaria completos) | `mat-s1`: 96 de 142 escritas y validadas, sin integrar (lotes 10–12 pendientes) |
| Comunicación | 1 139 | 0 | primaria 1–6 = 623 fichas pendientes |
| Ciencia y Tecnología | 1 335 | 0 | primaria 1–6 = 630 fichas pendientes |

**Falta para la meta del lunes:** Comunicación primaria (6 grados) y Ciencia y Tecnología primaria (6 grados) ≈ 1 250 fichas ≈ 105 lotes de 12.

## Dónde está todo
- Fichas: `src/lib/nudito/conocimiento/banco/<area>/<nivel>-<grado>/fichas/*.json`; temarios: `…/temario-propuesto.json`; esquema: `src/lib/nudito/conocimiento/esquema.ts`; validador del repo: `pnpm nudito:validar-banco` (specs/50).
- Herramientas (copias versionadas en `scripts/fichas/`; las que corren viven en `khipu-wt/_briefs/`, fuera del repo, con rutas absolutas):
  - `driver.py` — supervisor automático **sin IA propia**: cola de lotes (12 fichas) → escritor → `validar-lote.ts` → al completar una combinación: `validar-banco` + tests unit + commit + fast-forward a `dev`. Estado en `_briefs/estado.json` (reanudable: `cd khipu-wt/_briefs && python3 driver.py`); log `/tmp/claude-1000/driver.log` (se pierde al reiniciar); panel `ver-progreso.sh`.
  - `validar-lote.ts` — valida un lote contra el esquema y las reglas anti-plantilla (usa `mayorGrupoParecido` del validador del repo).
  - `ver-ficha.py <clave|nombre>` — muestra una ficha legible.
  - Worktree único de trabajo: `khipu-wt/fichas-mat-p5` (rama `feat/fichas-banco`; el nombre es histórico). Los lotes de claves están en `_briefs/lotes/<lote>.txt`, los prompts en `_briefs/prompts/`, las salidas en `_briefs/salida/<lote>.json`.
- El orden de la cola ya refleja la regla de Carlos (primaria completa; luego secundaria grado por grado) en `construir_cola()` de `driver.py`.

## Escritores (backends) y límites conocidos
- **Codex (`codex exec -m gpt-6-sol`)**: ventana de 5 h (el mensaje trae «try again at HH:MM»; el driver espera ese momento). Capacidad medida: ~29 lotes por ventana con 3–4 en paralelo. Puede ejecutar el validador por su cuenta. Cuota semanal desconocida.
- **Antigravity (`agy`)**: la cuota «Individual quota reached» es **una sola para todos los modelos** (Gemini, Claude 4.6, GPT-OSS). Agotada el 2026-11-11 con «Resets in ~168 h» (vuelve ≈ 2026-11-18). En modo sin pantalla **no ejecuta comandos** (solo edita archivos) y `--dangerously-skip-permissions` lo bloquea el sistema de permisos: el supervisor valida y fusiona por él. Sintaxis: `agy --model <m> --mode accept-edits --add-dir <dir> --print="<prompt>"` (el prompt va pegado a `--print=`).
- **Claude Sonnet (subagentes)**: cuando vuelvan los créditos, usar `Agent` con `model: sonnet` y el prompt que genera `driver.escribir_prompt(lote, area, nivel, grado, None, shell=True)`; escribe `salida/<lote>.json` y el driver lo toma (si el archivo ya existe y valida, no lo reescribe). ~100 mil tokens por lote.
- **Modelos locales (Ollama: qwen3:8b, llama3.1, gemma4; RTX 5050 8 GB)**: no recomendados para escribir fichas (cuentas y datos científicos erróneos que el validador no detecta). Útiles solo para tareas mecánicas.
- Fable: ver regla 5.

## Lecciones aprendidas (no repetir)
- Las fichas hechas con plantilla (mismo enunciado cambiando lugar/nombre/número; pistas «Mira los X en el Y»; prefijos «En el aula: …») pasaron un validador flojo. Hoy el validador las rechaza (specs/50). Aun así, **revisar muestras**: el validador no verifica que las cuentas ni los datos científicos sean correctos.
- Fichas completas por combinación: el validador del repo exige 100–180 fichas por combinación **si hay carpeta `fichas/`**; por eso el driver fusiona una combinación solo cuando todos sus lotes validaron.
- Tras agregar fichas, la **huella** de cada tema cambia y los alumnos dejan de verlo hasta volver a aprobarlo: correr `pnpm curriculum:aprobar-todo --revisor <correo>` (solo BD local; en la nube únicamente con permiso expreso de Carlos). Los temas sin ficha se muestran como «Práctica en preparación» (profesor) / «Pronto» (alumno).
- `pkill -f "<texto>"` puede matar tu propio shell si el comando contiene ese texto: usa el truco `[d]river.py`.
- Rutas con espacios: entrecomilla siempre. `git add` solo de tus archivos; en el checkout principal hay un archivo ajeno sin commitear (`docs/evaluacion-modelo-de-negocio.md`), no tocarlo.
- Cada sesión debe dejar su archivo en `conversaciones/` y las specs actualizadas (AGENTS.md).

## Cómo retomar (checklist para una conversación nueva)
1. Leer este archivo, `specs/50-nudito-banco-de-conocimiento.md` y `specs/51-plan-de-estudios-del-colegio.md`.
2. `ps aux | grep "[d]river.py"`: si no corre, `cd khipu-wt/_briefs && python3 driver.py &` (con `setsid nohup`). Ver estado: `python3 -c "import json;…"` sobre `estado.json` o `bash ver-progreso.sh`.
3. Comprobar cuotas (Codex: mensaje «try again at»; agy: `agy --model claude-sonnet-4-6 --print="Responde solo: OK"`).
4. Con créditos de Claude: lanzar subagentes Sonnet (4–8 en paralelo) sobre los lotes pendientes de la **primaria** primero; validar y revisar muestras de cada combinación antes de integrarla.
5. Al cerrar una combinación: revisar muestra (`ver-ficha.py`), correr `pnpm lint && pnpm typecheck && pnpm test` en `dev`, actualizar el conteo de este archivo y de specs/50.
6. Al terminar la primaria, avisar a Carlos y seguir con secundaria 1.°, 2.°… en orden.
