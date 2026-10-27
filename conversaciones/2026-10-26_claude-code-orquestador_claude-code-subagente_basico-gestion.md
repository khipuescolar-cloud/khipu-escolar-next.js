# Básico-gestión: chat, comunicados, panel de dirección y privacidad

| Campo | Valor |
|---|---|
| Fecha | 2026-10-26 |
| Colaborador | Claude Code (orquestador) |
| Agente y modelo | Claude Code · subagente (claude-sonnet-5-5) |
| Rama y commits | `feat/gestion` · ver `git log` de la rama |
| Specs afectadas | `specs/08-chat-familia-profesor.md`, `specs/09-comunicados.md`, `specs/10-panel-direccion-gestion.md`, `specs/15-privacidad-auditoria-exportacion.md`, `specs/00-indice.md` |

## Pedidos del colaborador (textual)
> You are implementing part of the Khipu Escolar MVP (multitenant school platform for Peru, Spanish UI). Work ONLY in this git worktree: `khipu-wt/gestion` (branch `feat/gestion`). Other agents work in parallel in sibling worktrees; do not touch them.
>
> Tu alcance: (1) Chat familia ↔ profesor (spec 08): `/mensajes` y `/mensajes/[id]`, lógica en `src/lib/server/mensajes.ts`, sin teléfonos ni correos, leído/no leído, dirección solo lectura auditada, polling cada 10 s sin Realtime. (2) Comunicados (spec 09). (3) Panel de dirección y gestión (spec 10): `/gestion` (profesores con invitación de Supabase, salones y cursos, alumnos con importación CSV, apoderados), consentimiento de primer ingreso, `/configuracion`, `/avisos` con apertura semanal (meta 70 %) y resumen de asistencia en el inicio de dirección. (4) Privacidad (spec 15): exportación `/api/exportar`, visor `/configuracion/auditoria`, script `khipu:borrar-colegio` con `--confirmar`, revocación del consentimiento desde el perfil.
>
> Contrato de notificaciones: encolar en `avisos` (estado pendiente, canal correo) con las plantillas `mensaje_nuevo`, `comunicado` e `invitacion` mediante `src/lib/server/notificaciones/encolar.ts`, solo para apoderados con consentimiento no revocado. Reglas: `requireTenantContext`, `ctx.db`, `requireFeature`, roles, zod y `auditar()`; no cambiar `prisma/schema.prisma`, migraciones, `layout.tsx` ni `navegacion.ts`; pruebas unitarias, de integración (colegio de prueba propio) y e2e (Rosa ↔ Lucía); `pnpm lint && pnpm typecheck && pnpm test` deben pasar; commits en `feat/gestion` sin push ni merge.

## Decisiones
- Las funciones de `src/lib/server/*` reciben `ctx` y no dependen del request, así las pruebas de integración arman un contexto a mano sin cookies.
- Las server actions obtienen el colegio del `Host` (`contextoDeAccion`), no de un campo del cliente. Los formularios vuelven con `?ok=` / `?error=` (`ejecutarYVolver` + `<Flash />`), sin estado en el cliente salvo el hilo del chat.
- Consentimiento: «pendiente» (nunca aceptó) redirige a `/consentimiento`; «revocado» no bloquea el uso pero corta los avisos.
- Invitación: Supabase envía el enlace para fijar contraseña y además se encola el aviso `invitacion` (contexto del colegio), según el contrato.
- Importar CSV es todo o nada, con errores por línea.
- Dirección no hace polling en el chat para no llenar la auditoría.

## Cambios realizados
- `src/lib/server/`: `mensajes`, `comunicados`, `gestion`, `configuracion`, `avisos-panel`, `resumen-direccion`, `consentimiento`, `exportar`, `contexto-accion`, `accion-formulario`, `notificaciones/encolar`.
- `src/lib/`: `mensajes`, `importar-alumnos`, `consentimiento` (funciones y textos puros).
- `src/app/colegio/[slug]/`: `mensajes`, `comunicados`, `gestion/*`, `configuracion` (+ `auditoria`), `avisos`, `consentimiento`, `perfil`, `api/exportar`, `inicio/ResumenDireccion.tsx`; edición mínima de `inicio/page.tsx` (gate de consentimiento, resumen de dirección, enlace a `/perfil`).
- `src/components/ui/`: `Selector`, `Flash`.
- `scripts/borrar-colegio.ts` y script `khipu:borrar-colegio` en `package.json`.
- Pruebas: `tests/unit/{importar-alumnos,mensajes-etiquetas}.test.ts`, `tests/integracion/gestion-mensajes-privacidad.test.ts`, `tests/e2e/{chat-familia-profesor,direccion-panel}.test.ts`.
- Specs 08, 09, 10 y 15 completadas; índice actualizado.

## Validación
- `pnpm lint`, `pnpm typecheck` y `pnpm test` pasan; `E2E_PORT=3004 pnpm e2e` pasa. El resultado exacto está en el informe final del subagente.
- El script de borrado rechaza sin `--confirmar <slug>` y con una confirmación distinta.

## Pendientes y preguntas abiertas
- Logo (FileStorage, spec 14), contador de no leídos en el mosaico, aviso al profesor cuando escribe la familia, botón «Escribir a la tutora» en la asistencia.
- `supabase/config.toml`: `additional_redirect_urls` solo trae el puerto 3000.
- Texto legal del consentimiento pendiente de abogado.
