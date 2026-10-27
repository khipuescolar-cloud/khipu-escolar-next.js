# 13 — Nudito (asistente, sin LLM en el MVP)

> Estado: borrador (requisitos) · Última actualización: 2026-10-26 (Claude Code). Quien lo implemente completa las secciones de la plantilla. · Plan: Pro Max

## Qué es
Un widget flotante abajo a la derecha (fuente Nunito, SVG animado por CSS que respeta `prefers-reduced-motion`) que se abre como burbuja de chat. Por ahora es solo para el rol **apoderado** (alumno: después).

## Motor (`src/lib/server/nudito/`)
- Interfaz `NuditoProvider { responder(ctx, mensaje, historial) }`. Implementación `IntentNudito`: normaliza el texto en español (sin tildes, minúsculas, sinónimos) → detecta la intención → la resuelve **solo con los datos reales** del apoderado en el colegio activo, usando `ctx.db` y `alumnoIdsVisibles`.
- Intenciones:
  - `saludo`, `ayuda`
  - `tareas_pendientes` («¿qué tareas tiene Mateo?»)
  - `proximas_fechas` (agenda: exámenes, reuniones, feriados)
  - `asistencia_hoy`: si llegó, responde con la hora; si no hay buenas noticias → **deriva**
  - `notas`: deriva a la libreta o a la tutora; nunca interpreta notas bajas
  - `horario` / `reglamento` (`documentos_colegio`)
  - `hablar_con_persona`
- Si tiene varios hijos y no dice cuál, pregunta con botones.
- Más adelante se enchufa un LLM implementando la misma interfaz (requiere aprobación: AGENTS.md prohíbe API keys de IA por ahora).

## Reglas (no negociables)
- La primera respuesta de cada conversación dice: «Soy un asistente con IA. Si no sé algo, te paso con una persona del colegio.»
- Nunca inventa datos, nunca compara alumnos, nunca usa la culpa ni las rachas, nunca guarda secretos y **nunca da malas noticias**: faltas, tardanzas, problemas o notas B/C → «Para eso es mejor hablar con su tutora» + botón que abre el chat (spec 08), `derivado = true`.
- Sin coincidencia → «No estoy seguro. Te paso con una persona del colegio.»
- Nunca cruza datos entre colegios ni entre familias.
- Las conversaciones se guardan en `nudito_conversaciones` y `nudito_mensajes`. El apoderado puede ver su historial (y en el futuro el de su hijo).
- `requireFeature(ctx, "nudito")` en la action y en el render del widget.

## Pruebas
- unit: la tabla de frases → intención; las malas noticias siempre derivan; el disclaimer aparece.
- integración: no devuelve tareas de otro alumno ni de otro colegio.
