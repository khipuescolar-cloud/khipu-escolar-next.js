# Rediseño de notas, libreta, tareas y agenda

| Campo | Valor |
|---|---|
| Fecha | 2026-10-27 |
| Colaborador | Carlos (desarrollo) |
| Agente y modelo | Claude Code (subagente) · claude-sonnet-5-5 |
| Rama y commits | `feat/diseno-academico` · ver `git log` |
| Specs afectadas | `specs/18-sistema-de-diseno.md` (§8), `specs/11-notas-y-libreta.md`, `specs/12-tareas-y-agenda.md` |

## Pedidos del colaborador (textual)
> mejora el diseño de todo el sistema y deja un archivo donde se especifique el diseño, tema, colores, formas, stilos etc

(Este subagente cubrió el bloque académico: notas, libreta, tareas, agenda y `Calificacion`.)

## Decisiones
- Formularios cortos en `Dialog` con un componente nuevo `DialogoAccion` (toast + cierre al éxito, error dentro del modal).
- Rejilla de notas dentro de `Card` con scroll propio, primera columna fija y celdas de 40 px; se mantienen `aria-label` y textos «Guardando/Guardado».
- Acciones destructivas con `BotonConfirmar`; `NavegacionPildoras` para secciones/periodos.
- Títulos de tarjeta como `h2` reales (el `CardTitle` de shadcn es un `div`).
- Sin cambios de lógica de negocio ni server actions.

## Cambios realizados
- `src/app/colegio/[slug]/notas/**` (VistaDocente, VistaFamilia, GrillaNotas, FilaCalificacion, periodos), `libreta/page.tsx`, `tareas/page.tsx`, `agenda/page.tsx`, `src/components/Calificacion.tsx`.
- Nuevos: `src/components/academico/DialogoAccion.tsx`, `NavegacionPildoras.tsx`.
- `tests/e2e/tareas-agenda.test.ts`: crear tarea abre primero «Nueva tarea»; editar usa el `dialog`; eliminar confirma en el `alertdialog` («Eliminar tarea»); «Nuevo evento» ahora es un botón (antes un heading visible).
- Specs 18, 11 y 12 actualizadas.

## Validación
- `pnpm lint`, `pnpm typecheck`, `pnpm test` y los e2e de notas-libreta, tareas-agenda y paginas-basico-por-rol (ver resultado en el informe final).
- Capturas Playwright 1366 y 390 px, claro y oscuro, con cuentas demo.

## Pendientes y preguntas abiertas
- La descarga PDF de la libreta no se tocó.
- Estados de carga (`Skeleton`) por página siguen pendientes.
