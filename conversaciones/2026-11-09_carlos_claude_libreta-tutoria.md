# Libreta solo para el tutor y rectificaciones desde Calificación del periodo

| Campo | Valor |
|---|---|
| Fecha | 2026-11-09 |
| Colaborador | Carlos (producto) |
| Agente y modelo | Codex (inicio, se quedó sin créditos) → Claude Code · claude-opus-5-5 con 2 subagentes |
| Rama y commits | `feat/libreta-tutoria` |
| Specs afectadas | `specs/11-notas-y-libreta.md`, `specs/37-nsp-justificaciones-recuperacion.md`, `specs/47-registro-de-notas.md` |

## Pedidos del colaborador (textual)
> me gusta como se ve ahorita, pero veo que un tutor del grado 3º A , puede ver las libretas de la seccion B , cosa que no deberia ser asi , ya que el profesor solo es tutor del A y las rectificaciones que se hacen para las libretas lo realiza el profesor del curso al cual se quiere rectificar, lo hace por medio de la calificacion del periodo [captura] aqui como se puede ver en la imagen ese boton aun esta bloqueado, pero cuando se habilite , el profesor podra subir la nota de cada alumno y una vez enviada si tiene algura rectificacion, lo pueda hacer desde esa parte solamente

> se acabaron los creditos de codex, puedes trabajarlo por medio de multiagentes

## Decisiones
- `/libreta`: el profesor solo ve los salones de los que es tutor (`salonIdsLibreta`, `requireLibretaVisible`); dirección, todos; apoderado, sus hijos. Un `?salon=` o `?alumno=` ajeno da 403; el PDF también (usa `datosLibreta`).
- Profesor sin tutoría: no ve «Libreta» en el menú y, si entra por URL, ve «La libreta la ven el tutor del salón y la dirección.».
- Rectificaciones: solo las pide el profesor del curso desde «Calificación del periodo», con la calificación enviada y la libreta del alumno emitida; si no está emitida, se le indica pedir a dirección reabrir el curso. Dirección ya no las pide (nadie aprueba la suya) y las aprueba o rechaza en el diálogo de la libreta.
- El profesor (incluido el tutor) ya no ve la sección «Rectificaciones» en la libreta; sigue su estado en la Calificación del periodo.

## Cambios realizados
- `src/lib/server/libreta.ts`, `libreta/page.tsx`, `colegio/[slug]/layout.tsx`: alcance por tutoría.
- `src/lib/server/libreta-emision.ts`: `solicitarRectificacion` exige profesor del curso, curso enviado y libreta emitida.
- `notas/[cursoId]/periodo/RectificarPeriodo.tsx` (nuevo), `TablaPeriodo.tsx`, `actions.ts`, `src/lib/server/calificacion-periodo.ts`: botón «Rectificar» por celda, estados y lista «Rectificaciones del curso».
- `libreta/Rectificacion.tsx` eliminado; `libreta/actions.ts` y `TablaLibretas.tsx`: rectificaciones solo para dirección.
- Tests: `tests/integracion/libreta-alcance-tutor.test.ts`, `tests/integracion/rectificacion-desde-periodo.test.ts`; ajuste del caso 14 en `nsp-justificaciones-recuperacion.test.ts`.

## Validación
- `pnpm lint` y `pnpm typecheck`: ok. `pnpm test`: 166 archivos, 1338 pruebas ok.
- e2e `tests/e2e/notas-libreta.test.ts` en puerto 3060: 9/9 (la primera corrida falló 5 por compilación en frío).
- Revisión manual en puerto 3062: tutora de 3.° A Sec. solo ve ese salón; `?salon=` de 4.° A Sec. → «No tienes acceso»; profesor sin tutoría → estado vacío y sin «Libreta» en el menú.

## Pendientes y preguntas abiertas
- El flujo «Rectificar» no se pudo ver en pantalla con el seed: la Calificación del periodo se habilita el 18/12. Cubierto por pruebas de integración.
