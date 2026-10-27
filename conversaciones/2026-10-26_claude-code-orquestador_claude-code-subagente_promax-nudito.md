# Nudito (Pro Max): motor por intenciones, widget y e2e

| Campo | Valor |
|---|---|
| Fecha | 2026-10-26 |
| Colaborador | Claude Code (orquestador) |
| Agente y modelo | Claude Code (subagente) · Claude Sonnet 5.5 |
| Rama y commits | `feat/promax` · ver `git log` de la rama |
| Specs afectadas | `specs/13-nudito.md`, `specs/00-indice.md` |

## Pedidos del colaborador (textual)
> You are implementing part of the Khipu Escolar MVP (multitenant school platform for Peru, Spanish UI). Work ONLY in this git worktree (branch `feat/promax`). Scope (no LLM, no AI API keys): 1. `src/lib/server/nudito/`: interfaz `NuditoProvider` e implementación `IntentNudito` (normalizador, intenciones, elección de hijo, respuestas solo con datos reales). 2. Reglas no negociables con test unitario (disclaimer, no inventar, no comparar, no culpa, malas noticias derivan, desconocido deriva, sin cruce de datos). 3. Persistencia en `nudito_conversaciones` / `nudito_mensajes`, server actions con `requireFeature`, rol apoderado, zod, máx. 500 caracteres, rate limit. 4. UI: `NuditoWidget` flotante con mascota SVG, accesible, solo para apoderado en plan Pro Max; página `/nudito` con el historial. No cambiar `schema.prisma` ni migraciones.

## Decisiones
- Motor puro (normalizar, intenciones, respuestas) separado del acceso a datos (`intent-nudito.ts`) para probarlo sin BD.
- Preguntas con palabras delicadas se derivan sin consultar datos; asistencia y notas derivan si hay cualquier señal no positiva.
- La pregunta «¿de cuál hijo?» se guarda con `intencion = "elegir_hijo:<intencion>"` para retomarla sin cambiar el esquema.
- Límite de 20 mensajes por minuto contado en BD.
- Mascota y animación en un componente propio con `<style>` local (sin tocar `globals.css`).

## Cambios realizados
- `src/lib/server/nudito/*`: motor, tipos y textos.
- `src/app/colegio/[slug]/nudito/{actions.ts,page.tsx}`: action y página de historial.
- `src/components/nudito/*`: widget y mascota.
- `src/app/colegio/[slug]/layout.tsx`: render condicional del widget.
- `tests/unit/nudito-*.test.ts`, `tests/integracion/nudito.test.ts`, `tests/e2e/nudito.test.ts`.
- `specs/13-nudito.md` (implementado) y `specs/00-indice.md`.

## Validación
- `pnpm lint && pnpm typecheck && pnpm test` y `E2E_PORT=3003 pnpm e2e` (resultados en el mensaje final del subagente).

## Pendientes y preguntas abiertas
- Rol alumno, historial del hijo y LLM (requiere aprobación).
- Rutas `/mensajes?alumno=` y `/libreta?alumno=` pertenecen a otros módulos.
