# CRM del colegio: profesores, personal y grados

| Campo | Valor |
|---|---|
| Fecha | 2026-10-27 |
| Colaborador | Orquestador (Claude Code) en nombre del colaborador |
| Agente y modelo | Claude Code (subagente) · claude-opus-5-5 |
| Rama y commits | `feat/crm-personal` · ver `git log` de la rama |
| Specs afectadas | `specs/17-crm-personal-colegio.md`, `specs/10-panel-direccion-gestion.md`, `specs/00-indice.md` |

## Pedidos del colaborador (textual)
> …podra darle click a un boton que le aparezca donde estara la ruta del dominio del sistema, y con eso mismo poder ingresar al sistema que es un crm , lista de profesores, lista de grados, lista de personal , va a tener muchos modulos y podra agregar nuevos profesores con sus respectivos datos personales y correos tambien

## Decisiones
- El alta de profesores y personal reutiliza `crearCuentaConDocumento` + `encolarBienvenida` (usuario = correo, contraseña inicial = documento, cambio obligatorio; el correo nunca lleva el número). Reemplaza la invitación de Supabase para profesores; los apoderados mantienen su invitación por correo personal.
- Correo ya existente en Khipu: solo se agrega la membresía y la bienvenida indica usar su contraseña de siempre.
- Todo en `src/lib/server/personal.ts` bajo `exigirGestion` (solo dirección). El historial de la ficha guarda solo los nombres de los campos editados, no los valores.
- El esquema no tiene campo de archivado para salones: se permite quitar solo salones vacíos y se reporta la brecha.
- `administrativo` se agregó a la prioridad de roles en `tenant.ts` (sin eso no podía iniciar sesión) y ve Comunicados en su inicio.
- La importación CSV valida todo antes de crear nada (todo o nada).

## Cambios realizados
- `src/lib/server/personal.ts`, `src/lib/importar-personal.ts` (nuevos); `gestion.ts` (invitarUsuario solo apoderados, estados de personal, salones con tutor y alumnos activos); `tenant.ts`, `navegacion.ts`, `comunicados/page.tsx` (rol administrativo).
- `src/app/colegio/[slug]/gestion/`: `_personal/` (lista, formulario y ficha compartidos), `profesores/`, `profesores/[id]/`, `personal/`, `personal/[id]/`, `salones/` (nivel → grado → sección), layout, hub y acciones (`after()` + `procesarCola()`).
- Tests: `tests/unit/importar-personal.test.ts`, `tests/integracion/crm-personal.test.ts`, `tests/e2e/crm-personal.test.ts`; adaptados `invitaciones-y-logo.test.ts` y `direccion-panel.test.ts`.

## Validación
- `pnpm lint`, `pnpm typecheck`, `pnpm test` y `E2E_PORT=3009 pnpm exec playwright test` en verde.

## Pendientes y preguntas abiertas
- Campo de archivado para salones (cambio de esquema).
- Permisos del rol `administrativo` más allá de Comunicados.
- Editar datos personales cambia el perfil global de la persona.
