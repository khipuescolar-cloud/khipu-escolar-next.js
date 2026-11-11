# Corrección de huellas y visibilidad editorial

| Campo | Valor |
|---|---|
| Fecha | 2026-11-11 |
| Colaborador | Carlos (supervisor) |
| Agente y modelo | Codex · GPT-6 |
| Rama y commits | `feat/curriculum-seguridad` · `c804842`, `b6772ba` |
| Specs afectadas | `specs/49-nudito-contenidos-del-plan.md`, `specs/54-curriculum-seguridad.md` |

## Pedidos del colaborador (textual)
> Corrección del supervisor (tu rama ya tiene todo integrado). Dos fallas: 1) scripts/curriculum/aprobar-todo.ts, cambiarEstadoEditorial y revisarBloqueEditorial deben guardar huellaContenidoRevisado = huellaActualDeTema(clave) al marcar revisado/publicado; hoy aprobar-todo no la guarda y con el filtro todos los temas quedarían «Revisar de nuevo». 2) src/lib/server/nudito/plan-publicado.ts temasPublicadosDelAlumno (y lo que use sesiones.ts para listar/practicar temas del alumno) NO filtra por estado editorial: el alumno debe recibir solo temas con temaVisibleParaAlumno (estado revisado/publicado y huella vigente); consulta temaCurricular en una sola query y calcula huellas solo de los temas de la foto. Profesores siguen viendo todo. Pruebas de integración: alumno no ve borrador ni tema con huella vieja; tras aprobar-todo sí lo ve; e2e nudito-tutor sigue OK. Luego corre pnpm db:reconstruir local, pnpm lint, typecheck, test y E2E_PORT=3061 APP_BASE_DOMAIN=lvh.me:3061 pnpm e2e tests/e2e/nudito-tutor.test.ts tests/e2e/plan-anual-nudito.test.ts. Specs 54 y 49. Commits y resumen estilo caveman.

## Decisiones
- Índice global sin tenant; lectura de alumnos exige estado revisado/publicado y huella actual igual a la guardada.
- La consulta del índice se comparte con la carga del catálogo del curso; las huellas se computan solo para claves de la foto publicada.
- Reparar huellas heredadas nulas de filas ya revisadas/publicadas, preservando las huellas antiguas no nulas para que sigan indicando cambios pendientes.

## Cambios realizados
- `src/lib/curriculum/huella.ts`, `autorizacion.ts`: cálculo global SHA-256 compartido por CLI, servidor y seed.
- `scripts/curriculum/aprobar-todo.ts`: guarda huella al revisar, repara nulas heredadas y audita totales.
- `plan-publicado.ts`, `catalogo-curso.ts`: esconden borradores y huellas vencidas al alumno con una consulta del índice; profesores conservan catálogo completo.
- `tests/integracion/temario-nudito.test.ts`: cubre borrador, huella vencida y visibilidad tras aprobar-todo.
- Specs 49 y 54 actualizadas.

## Validación
- `pnpm db:reconstruir`: OK; 3837 huellas heredadas reparadas.
- `pnpm lint`: OK.
- `pnpm typecheck`: OK.
- `pnpm test`: OK; 172 archivos, 1329 pruebas.
- E2E solicitado: FALLA; 4 pasaron, 7 fallaron, 1 no corrió. Tutor: temas sin ficha de repaso y curso especializado; plan anual: selector ambiguo «Números decimales».

## Pendientes y preguntas abiertas
- E2E no queda verde por problemas de fixture/datos de prueba fuera del filtro editorial.
- Commits: `c804842`, `b6772ba`.
