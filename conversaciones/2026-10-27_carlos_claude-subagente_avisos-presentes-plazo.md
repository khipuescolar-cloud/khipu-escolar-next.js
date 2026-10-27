# Aviso de llegada a las familias de los presentes y plazo de justificación en días hábiles

| Campo | Valor |
|---|---|
| Fecha | 2026-10-27 |
| Colaborador | Carlos (dirección del proyecto) |
| Agente y modelo | Claude Code (subagente del orquestador) · claude-opus-5-5 |
| Rama y commits | `feat/avisos-presentes-plazo` · ver `git log` de la rama (commit «Notify families of present students and use business-day justification deadline») |
| Specs afectadas | `specs/04-asistencia.md`, `specs/05-porteria-qr.md`, `specs/06-avisos-notificaciones.md`, `specs/07-justificaciones.md`, `specs/10-panel-direccion-gestion.md` |

## Pedidos del colaborador (textual)
> al momento de pasar lista y cerrar la lista los alumnos que estuvieron presente les debe de llegar una notificacion a sus apoderados; el plaso para poder justificar una falta es de 15 dias habiles

## Decisiones
- Se eliminó el modo «solo excepciones» y el resumen diario de llegadas: al guardar la lista se avisa a las familias de presentes, tardanzas, faltas y problemas. Valor de enum `solo_excepciones`, `Tenant.modoAvisos`, `Tenant.horaEnvioAvisos` y `TipoAviso.resumen_llegadas` quedan sin uso en la BD (no se tocó el esquema).
- Un solo aviso de llegada por alumno y día (costo y tope diario de envío, Gmail ~500/día): se generalizó a cualquier lista (no solo las de curso) y a portería; tampoco se repite si la misma lista pasa de «Tarde» a «Llegó».
- El resumen previo de pasar lista cuenta familias con consentimiento y canal: «Se avisará a N familias: X llegadas, Y tardanzas, Z faltas.» más «La llegada de K alumnos ya se avisó hoy.».
- Plazo de justificación: 15 días hábiles desde el día de la falta (no desde el envío), fin del día en Lima; feriados nacionales del Perú con Semana Santa por algoritmo de Gauss/Meeus; acepta feriados extra como parámetro. Aplica al enlace del correo y a la justificación con sesión.
- `actualizarConfiguracion` rechaza explícitamente `modoAvisos`/`horaEnvioAvisos` y el esquema zod es estricto.

## Cambios realizados
- `src/lib/dias-habiles.ts` (nuevo): `esDiaHabil`, `sumarDiasHabiles`, `venceJustificacion`, `domingoDePascua`, `feriadosNacionales`, `finDelDia`.
- `src/lib/plazo-justificacion.ts`: días hábiles (1–30, 15), `mensajePlazoVencido`, `textoPlazoJustificacion`, `ultimoDiaJustificacion`.
- `src/lib/resumen-avisos-lista.ts` (nuevo): conteo del resumen previo.
- `src/lib/server/notificaciones/encolar.ts`: sin condición de solo excepciones; token con `fechaFalta`/`plazoDias`; `familiasConAvisoPorAlumno`.
- `src/lib/server/notificaciones/cola.ts`, `limites.ts`, `email/plantillas/index.ts`: fuera `generarResumenesLlegadas`, `tocaResumen`, `resumenes` y la plantilla `resumen_llegadas`.
- `src/lib/server/asistencia.ts`: regla de una llegada por día en todas las listas; `obtenerLista` con `familiasConAviso`/`llegadaAvisada`; `historialDeHijos` con `justificarHasta`/`plazoVencido`.
- `src/lib/server/porteria.ts`: no repite la llegada ya registrada en una lista de curso.
- `src/lib/server/justificaciones.ts`: plazo en la vía con sesión; mensaje con días hábiles.
- `src/lib/server/configuracion.ts` + `/configuracion` (página y acción): campo «Plazo para justificar faltas (días hábiles)», sin modo ni hora del resumen.
- UI: `ListaAsistencia.tsx` (resumen previo; «Marcar a todos» limpia el resultado anterior), `/asistencia` (fecha límite / «Plazo vencido»), `/asistencia/justificar/[id]`, `/justificar/[token]`, filtro de `/avisos`.
- Tests: `tests/unit/dias-habiles.test.ts`, `tests/unit/resumen-avisos-lista.test.ts`, `tests/unit/plazo-justificacion.test.ts`; integración `pasar-lista`, `justificar-token`, `dia-a-dia-offline-plazo`, `cola-avisos`, `canales-whatsapp-sms`; e2e `pasar-lista-aviso-justificar` (correo de llegada en Mailpit).

## Validación
- `pnpm lint && pnpm typecheck && pnpm test`: verde (53 archivos, 486+ tests).
- `E2E_PORT=3041 pnpm exec playwright test pasar-lista-aviso-justificar direccion-panel dia-a-dia-offline-calendario paginas-basico-por-rol`: 11/11 verde.

## Pendientes y preguntas abiertas
- Feriados regionales y días no laborables decretados por colegio: la lógica acepta `feriadosExtra`, falta la configuración.
- Limpieza futura del esquema (columnas/enums sin uso) en una migración aparte, si se decide.
