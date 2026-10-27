# Bitácora de conversaciones

**Norma del proyecto (obligatoria para personas y agentes de cualquier tipo):** cada sesión de trabajo de un colaborador con un agente (Claude Code, Codex u otro) que lleve a decisiones o cambios se registra aquí. Sirve para que no haya cambios ni malentendidos sin dejar rastro.

- Un archivo por sesión: `AAAA-MM-DD_<colaborador>_<agente>_<tema>.md` (en minúsculas y con guiones; p. ej. `2026-10-26_carlos_claude-code_plan-mvp.md`).
- Usa `_plantilla.md`.
- Los mensajes del colaborador se copian **textualmente**. Las respuestas del agente se resumen.
- **Nunca** incluyas claves, contraseñas, tokens, `.env` ni datos reales de alumnos o familias: reemplázalos por `[REDACTADO]`.
- El archivo va en el mismo PR o commit que los cambios de la sesión. Un PR sin su registro no se integra.
- Los agentes lanzados por otro agente (p. ej. Codex vía Herdr) registran su propia sesión, con el orquestador como «colaborador».
