# Orquestación de modelos y ahorro de créditos (regla del proyecto)

> Regla de Carlos (dueño del producto), 2026-11-11. Obliga a **todos los agentes y modelos** (Claude, Codex u otro). Resumen en `AGENTS.md`, norma 5.

## Regla de oro
**Antes de ejecutar o delegar cualquier tarea, evalúa qué modelo usar y cómo resolverla gastando lo mínimo.** Si la tarea es grande, escribe en una línea el plan de modelos (quién investiga, quién piensa, quién escribe, quién verifica) y sigue ese plan. Nunca uses un modelo pesado para algo chico.

## Lista de comprobación previa (en este orden)
1. **¿Se resuelve sin IA?** Un script, `grep`, `sed`, una prueba o un validador cuestan 0 créditos. Hazlo así si es mecánico (juntar archivos, validar, renombrar, contar, reintentar).
2. **¿Cuál es el modelo más barato que da la calidad exigida?** Sube por la escalera solo si el anterior falla (tabla de abajo).
3. **¿Qué cuota hay hoy?** Claude: `/usage` (barra «Todos los modelos» y barra de Fable). Codex: mensaje «5h limit» / «try again at». Antigravity: `agy --model <m> --print="Responde solo: OK"`. Si una cuota está al 90 % o más, no empieces trabajo grande con ese proveedor.
4. **Divide la tarea por tipo de trabajo:** investigar (buscar, leer mucho) → pensar (decidir, diseñar, razonar) → escribir (código, texto, fichas) → verificar (script y muestreo). Cada fase puede usar un modelo distinto.
5. **Pon un tope de gasto** y avisa a Carlos antes de superarlo (ejemplo vigente: máximo 20 lotes con Fable).
6. **Registra la decisión** (modelos usados y por qué) en la bitácora `conversaciones/` de la sesión.

## Qué modelo para qué

### Claude (cuenta de Carlos; la barra «Todos los modelos» es **una sola bolsa semanal compartida**; Fable tiene además su propia barra)
| Modelo | Úsalo para | No lo uses para |
|---|---|---|
| **Fable 5.1** (`claude-fable-5-1`, el más capaz y caro) | **Revisar la calidad de lo que escriben otros** (recalcular respuestas, datos científicos), **temas difíciles** (secundaria: logaritmos, química orgánica, física, literatura universal), decisiones de diseño que exigen razonar, atascos | Escribir en masa; tareas mecánicas |
| **Opus 5.5** | Arquitectura, seguridad, revisión de código delicado, planes complejos | Escribir fichas en masa; ediciones chicas |
| **Sonnet 5.5** | **Orquestar y supervisar**; escritores en lotes (fichas, textos, código acotado) cuando haya créditos; arreglos puntuales | Razonamiento muy difícil (sube a Opus/Fable) |
| **Haiku 5.5** | Lo más barato de Claude: clasificar, extraer datos de archivos grandes, resumir registros, reformatear texto, tareas triviales | Contenido pedagógico final; decisiones |
Notas: cualquier subagente Claude (incluido Fable) descuenta de «Todos los modelos». Medición 2026-11-11: **12 fichas con Fable ≈ 2 % de su barra, y también sube la semanal general**. Usa `model:` explícito al lanzar subagentes; no dejes que hereden el modelo pesado.

### Codex (cuenta ChatGPT/Codex de Carlos; ventana de 5 h; cuota semanal desconocida; se ejecuta vía Herdr o `codex exec`)
| Modelo | Úsalo para |
|---|---|
| **GPT-6-Sol** | Implementar código y funcionalidades, escritura pedagógica de calidad, cualquier trabajo donde un error cueste caro |
| **GPT-6-Luna** (más barato) | Ediciones simples, pruebas, andamiaje, correcciones de formato, tareas repetitivas con receta clara |
Codex es el **escritor principal** del proyecto: implementa y escribe; Claude supervisa. Si pide cambiar de modelo por límite, elige Luna solo para tareas fáciles. Cuando la cuota se agota, el supervisor espera la hora indicada y retoma.

### Antigravity CLI (`agy`; cuenta Google de Carlos)
Modelos: Gemini 3.8 Flash (high/medium/low), Claude Sonnet 4.6, Claude Opus 4.6 (thinking), GPT-OSS 120B. **La cuota es una sola para todos los modelos** (si se agota Gemini, se agotan todos; el 2026-11-11 quedó agotada ~7 días). Sin pantalla solo edita archivos (no ejecuta comandos); el sistema bloquea `--dangerously-skip-permissions`. Úsalo para escritura en lotes cuando haya cuota, con validación por script.

### Modelos locales (Ollama en la laptop: RTX 5050 8 GB, 23 GB RAM)
Instalados: `qwen3:8b`, `qwen2.5-coder:7b`, `llama3.1`, `gemma4`, `llama3.2-vision`, `qwen3-embedding:0.6b`. Gratis, sin cuota, ~30–40 tokens/s en modelos de 7–8 B.
- **Sí:** reparar JSON/formato, clasificar o etiquetar con reglas claras, traducir o reformatear texto corto, embeddings y búsqueda semántica, borradores internos que alguien revisará, código simple con `qwen2.5-coder`.
- **No:** contenido educativo final (cuentas y datos científicos con errores que el validador no detecta), seguridad, decisiones de producto, cualquier cosa que llegue a niños sin revisión.
- Modelos de más de ~8 B no caben en la VRAM y se vuelven muy lentos.

## Escalera de decisión (resumen)
Script → modelo local (si es mecánico y seguro) → Haiku / Codex Luna → Sonnet / Codex Sol / Antigravity → Opus → **Fable** (revisión y lo más difícil). Siempre se verifica con script y, para contenido educativo, con muestreo humano o de Fable.

## Ejemplo: fichas de Nudito (specs/50, `docs/nudito/PROCESO-FICHAS.md`)
- Escribir lotes: Codex Sol (y Sonnet/Antigravity cuando haya cuota).
- Validar, juntar, integrar a `dev`, reintentar: scripts (`driver.py`), 0 créditos.
- Revisar muestras de cada combinación antes de integrar: **Fable** (o Sonnet si Fable no alcanza), pocas fichas por combinación.
- Temas difíciles de secundaria: Fable puede escribirlos.
- Arreglos de 1–2 ejercicios: el modelo que ya esté activo, a mano; no lances un subagente para eso.
- Modelos locales: solo reparar formato del JSON si un lote viene roto.
