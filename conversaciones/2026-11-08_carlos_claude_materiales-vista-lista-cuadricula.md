# Documentos: vista lista/cuadrícula · Agenda: clases del alumno

| Campo | Valor |
|---|---|
| Fecha | 2026-11-08 |
| Colaborador | Carlos (desarrollo) |
| Agente y modelo | Claude Code · claude-opus-5-5 |
| Rama y commits | `dev` · ver commit «Fix list/grid toggle for course folders in class materials» |
| Specs afectadas | `specs/31-documentos.md`, `specs/12-tareas-y-agenda.md` |

## Pedidos del colaborador (textual)
> [Image #1] dentro de este modulo , estos botones que son para poder mostrar las carpetas en columnas o en cajas no funciona [Image #2], necesito que funcionen

> pero sea donde sea igual debe tener la opcion de verse en cajas o en filas

> [Image #3] en el modulo de Agenda, tambien debo visualizar mi horario que tengo

## Decisiones
- La raíz de «Materiales de clase» (carpetas de cursos por año) ignoraba el modo y siempre dibujaba cuadrícula. Ahora respeta la vista: lista con filas y flecha, cuadrícula con tarjetas.
- Segundo pedido: una sola preferencia de vista para todas las secciones (antes Materiales y el explorador guardaban claves distintas). Hook `useModoExplorador` en `BarraExplorador.tsx`. «Gestión académica» no lleva botones: es un formulario de solicitudes, no un listado de carpetas.
- Tercer pedido: el alumno ve en el calendario de la Agenda (Día, Semana, Mes y Lista; filtro «Todo») las clases de su salón proyectadas desde el horario, como ya las veía el profesor. En la tarjeta se muestra el profesor en lugar del salón. La familia sigue sin clases en la agenda (pueden ser varios hijos); su horario está en «Mi horario».
- Codex sin créditos hasta 2026-11-11: implementó Claude directamente.

## Cambios realizados
- `src/app/colegio/[slug]/documentos/materiales/PanelMateriales.tsx`: `grupos()` usa `modo`.
- `BarraExplorador.tsx`: `useModoExplorador` (clave `documentos-modo`, migra `materiales-modo`); lo usan `ExploradorDocumentos.tsx` y `PanelMateriales.tsx`.
- `specs/31-documentos.md`: la raíz también respeta la vista; preferencia única.

- `src/lib/server/agenda.ts`: `verClases` incluye al alumno; `bloquesDeSalones`; ámbito = profesor. `agenda/page.tsx`: descripción para el alumno. `tests/integracion/agenda-calendario.test.ts`: caso «calendario del alumno». `specs/12`.

## Validación
- `eslint` del archivo y `pnpm typecheck`: sin errores.
- Capturas con Playwright (alumno 5.° A) en lista y cuadrícula; `aria-pressed` correcto en cada botón.
- Recorrido Playwright (alumno y dirección) por Materiales, Mis borradores, Recientes, Destacados y Papelera: cuadrícula y lista funcionan y la elección se recuerda al recargar. Carpeta de prueba en la BD local creada y luego borrada.

- `vitest` agenda-calendario (integración + unit): 18/18. Captura de la semana del alumno 5.° A con sus clases y el profesor.

## Pendientes y preguntas abiertas
- ¿La familia también debe ver las clases de sus hijos en el calendario? Por ahora no.
