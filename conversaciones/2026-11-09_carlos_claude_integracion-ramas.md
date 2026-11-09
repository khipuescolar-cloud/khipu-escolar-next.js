# 2026-11-09 · carlos · claude · integración de ramas

## Pedidos (literal)
- «sí, únelo a dev»
- «creo que aun hay cosas por unir verdad? puedes encargarte de eso?»

## Decisiones
- `feat/chat-tutor-whatsapp` (Codex) unida a dev (ver `2026-11-09_carlos_codex_chat-tutor-whatsapp.md`).
- `feat/plan-anual-nudito` unida a dev: sin conflictos; lint, typecheck y `pnpm test` (163 archivos, 1322 pruebas) en verde; migración ya aplicada en BD local.
- `docs-sin-biblioteca` (quitaba «Biblioteca del colegio»): Carlos decidió descartarla; se conserva la rama sin unir.
- Worktree `normativa-chats`: sin commits, solo archivos sin seguimiento (`src/components/chat/`); no se une.

## Pendientes
- Borrar a mano el worktree `khipu-wt/plan-anual` y la rama `feat/plan-anual-nudito` (el modo automático no permitió borrarlos).
- Decidir qué hacer con `normativa-chats` (trabajo incompleto de otra sesión).
