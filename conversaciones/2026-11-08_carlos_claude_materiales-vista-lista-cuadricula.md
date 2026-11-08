# Materiales de clase: botones de vista lista/cuadrícula

| Campo | Valor |
|---|---|
| Fecha | 2026-11-08 |
| Colaborador | Carlos (desarrollo) |
| Agente y modelo | Claude Code · claude-opus-5-5 |
| Rama y commits | `dev` · ver commit «Fix list/grid toggle for course folders in class materials» |
| Specs afectadas | `specs/31-documentos.md` |

## Pedidos del colaborador (textual)
> [Image #1] dentro de este modulo , estos botones que son para poder mostrar las carpetas en columnas o en cajas no funciona [Image #2], necesito que funcionen

> pero sea donde sea igual debe tener la opcion de verse en cajas o en filas

## Decisiones
- La raíz de «Materiales de clase» (carpetas de cursos por año) ignoraba el modo y siempre dibujaba cuadrícula. Ahora respeta la vista: lista con filas y flecha, cuadrícula con tarjetas.
- Segundo pedido: una sola preferencia de vista para todas las secciones (antes Materiales y el explorador guardaban claves distintas). Hook `useModoExplorador` en `BarraExplorador.tsx`. «Gestión académica» no lleva botones: es un formulario de solicitudes, no un listado de carpetas.
- Codex sin créditos hasta 2026-11-11: implementó Claude directamente.

## Cambios realizados
- `src/app/colegio/[slug]/documentos/materiales/PanelMateriales.tsx`: `grupos()` usa `modo`.
- `BarraExplorador.tsx`: `useModoExplorador` (clave `documentos-modo`, migra `materiales-modo`); lo usan `ExploradorDocumentos.tsx` y `PanelMateriales.tsx`.
- `specs/31-documentos.md`: la raíz también respeta la vista; preferencia única.

## Validación
- `eslint` del archivo y `pnpm typecheck`: sin errores.
- Capturas con Playwright (alumno 5.° A) en lista y cuadrícula; `aria-pressed` correcto en cada botón.
- Recorrido Playwright (alumno y dirección) por Materiales, Mis borradores, Recientes, Destacados y Papelera: cuadrícula y lista funcionan y la elección se recuerda al recargar. Carpeta de prueba en la BD local creada y luego borrada.

## Pendientes y preguntas abiertas
- Ninguno.
