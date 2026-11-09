# Planificación académica anual y Nudito con contenidos del plan (orquestación multiagente)

| Campo | Valor |
|---|---|
| Fecha | 2026-11-08 |
| Colaborador | Carlos (dueño del producto) |
| Agente y modelo | Claude Code · claude-opus-5-5 (orquestador) · Codex CLI 0.167 vía Herdr (3 agentes) · 1 subagente Claude (E2E) |
| Rama y commits | `feat/plan-anual-nudito` · `d1f2636` → `c5467a0` (sin push, sin merge a `dev`) |
| Specs afectadas | `specs/48` (nueva), `specs/49` (nueva), `specs/41–44`, `specs/35`, `specs/00-indice.md` |

## Pedidos del colaborador (textual)
El pedido fue un documento largo pegado en un solo mensaje, titulado
**«KHIPU PRO — IMPLEMENTACIÓN INTEGRAL DE PLANIFICACIÓN ACADÉMICA ANUAL Y NUDITO»**, con 22 secciones: 1. Objetivo general;
2. Orquestación de múltiples agentes (Agentes 1–6 y reglas de coordinación); 3. Reglas generales del desarrollo; 4. Planificación
Académica Anual (concepto y catálogo curricular, referencia Minedu); 5. Elaboración colaborativa del sílabo (identificación de
docentes, docente coordinador, selección de temas, «No debe existir desbloqueo obligatorio por semanas, meses, bimestres ni por
avance del docente»); 6. Reuniones de coordinación docente (reutilizar Agenda); 7. Comentarios, revisión y aprobación («Modelo
confirmado: revisión de todos los docentes y publicación final por un coordinador académico designado»); 8. Publicación y acceso
para estudiantes («todos los temas seleccionados deben quedar disponibles desde el inicio»); 9. Preparación de contenidos de
Nudito (objetivo económico, generación anticipada por lotes, validación docente); 10. Nudito como tutor educativo («Se elimina la
opción «Otro tema» del flujo de selección»); 11. Estrategias por asignatura; 12. Inteligencia artificial (interfaz
intercambiable, sin credenciales nuevas); 13. Ejercicios, imágenes y multimedia; 14. Progreso individual y finalización del
sílabo («Por ahora no desbloquear automáticamente el sílabo del grado superior»); 15. Historial académico y versiones;
16. Integración con módulos existentes; 17. Base de datos y seguridad; 18. Rendimiento y costos; 19. Pruebas obligatorias
(30 casos); 20. Restricciones de ejecución (sin push, sin Vercel, sin Supabase remoto, sin datos reales); 21. Criterios de
finalización (escenario de 19 pasos con datos ficticios); 22. Informe final del orquestador. Instrucción final textual:

> Comienza con la auditoría y la definición de contratos compartidos.
> Después distribuye el trabajo entre los agentes de Claude Code y Codex que estén realmente disponibles.
> Trabaja por etapas, integra los resultados y continúa hasta completar la mayor cantidad posible de funcionalidades verificadas.
> El objetivo es dejar la Planificación Académica Anual y Nudito funcionalmente integrados en Khipu Pro, con seguridad multitenant, contenidos educativos reutilizables y control de costos de inteligencia artificial.
> **No despliegues ni modifiques producción.**

(El texto completo del pedido no se copia entero aquí por su extensión; sus reglas quedaron trasladadas a specs/48 y specs/49.)

## Decisiones
- **Grupo curricular** = (colegio, año, nivel, grado, `cursos.area_cneb`); docentes = `DISTINCT cursos.profesor_id`. No se
  duplican cursos, grados, secciones ni docentes. Un plan por grupo y año (único).
- Máquina de estados borrador → en_revision ⇄ con_observaciones → aprobado → publicado → (abrir revisión → borrador) /
  archivado. Aprobar exige 0 observaciones abiertas y conformidad de **todos** los participantes activos de la ronda; solo
  el coordinador aprueba y publica; dirección designa/sustituye coordinador y participantes (auditado), no aprueba.
- Los alumnos leen la **foto de la última versión publicada** (`plan_anual_versiones`), no las filas vivas; abrir una
  revisión o publicar v2 no toca sesiones, intentos ni dominios.
- Temas del alumno = versión publicada ∩ lecciones publicadas; todos desde el inicio; «Otro tema» eliminado (UI, acción y
  servicio); desbloqueo al grado superior desactivado para la selección.
- Lecciones por colegio con origen `catalogo` (sin IA, costo 0), `ia`, `ia_simulada` (no aprobable sin edición docente) o
  `docente`; preparación idempotente por (plan, versión), lotes de 5, concurrencia 2, 3 intentos, presupuesto del trabajo y
  tope mensual del colegio.
- Feature Pro usada para planificación: `notas` (la académica existente); Nudito sigue con `nudito_plus`.
- Codex se quedó sin cuota a mitad de la fase de QA (vuelve 7:49 a. m.); el resto (prueba de flujo de servicios, seed demo,
  E2E vía subagente Claude, integración y verificación) lo hizo Claude.

## Cambios realizados
- Paso 0 (Codex «bd-seguridad», `e67ed7c`): esquema y migración `20261118090000_plan_anual_nudito_contenido` (12 tablas
  con RLS ENABLE+FORCE, CHECKs, índices; `reuniones.plan_anual_id`; `nudito_consumos_ia.alumno_id` opcional +
  `leccion_id`; operación `generar_leccion`), `src/lib/plan-anual/{estados,contratos}.ts`, `src/lib/nudito/leccion.ts`,
  `src/lib/server/plan-anual/acceso.ts`, pruebas unitarias y de acceso.
- Planificación (Codex «planificacion», `8244b27`): `src/lib/server/plan-anual/{planes,temas,revision,reuniones-plan}.ts`,
  rutas `/planificacion` y `/planificacion/[planId]/{temas,revision,reuniones,versiones}`, navegación, `planAnualId` en
  reuniones, `tests/integracion/plan-anual.test.ts`.
- Nudito (Codex «nudito», `cb836fa`): `plan-publicado.ts`, `lecciones/{index,muestras,preparacion}.ts`, `generarLeccion`
  en proveedores, `/api/cron/nudito-contenido`, páginas `materiales` y `progreso`, cambios en sesiones/selector/repaso/
  resultados, `tests/integracion/nudito-plan-anual.test.ts`.
- QA (Codex, `9d621dd`): autor y fecha en comentarios, resolución con campo, conformidad con observaciones exige comentario,
  formulario de edición de lección.
- Claude: `tests/integracion/plan-anual-flujo-completo.test.ts` (flujo 1–19 encadenando servicios reales), seed
  `prisma/seed-plan-anual.ts` + `pnpm db:demo-plan-anual`, `armarLeccionCatalogo` movida a `muestras.ts` (pura).
- Subagente Claude E2E (`4277a22`): `tests/e2e/plan-anual-nudito.test.ts` (5 pruebas, escritorio y 360×740); corrigió el
  error sin capturar en Materiales/Progreso de un plan sin publicar y la clave interna visible en lugar del nombre del tema;
  actualizó `tests/e2e/nudito-tutor.test.ts` (ya no existe «Otro tema»).

## Validación
- `pnpm lint` y `pnpm typecheck`: OK.
- `pnpm test`: 163 archivos, 1310 pruebas OK (una corrida previa tuvo 1 falla intermitente en
  `nudito-sesiones.test.ts › salida inválida o pista que revela`, no reproducida en 8 corridas posteriores).
- `tests/e2e/plan-anual-nudito.test.ts`: 5 passed; `nudito-tutor` + `reuniones` e2e: 13 passed.
- E2E completo (puerto 3063): 118 passed, 9 failed, 3 skipped. Al reintentar, 6 pasaron (`ERR_NETWORK_CHANGED`/timeouts). 3 fallan igual en `dev` limpio (`4d06fbc`), así que ya fallaban antes de esta rama: `asistencia-colegio-cursos`, `reportes-asistencia` (no aparece «Asistieron»; posible dependencia de la fecha, domingo) y `rol-alumno` («Cuenta del alumno creada»).
- `pnpm db:reconstruir` no se ejecutó (bloqueado por borrar datos); quedan colegios temporales de e2e si alguno no se limpió.
- `pnpm db:demo-plan-anual` ejecutado en la BD local: 23 planes publicados, 143 lecciones; segunda corrida 0/0 (idempotente).

## Pendientes y preguntas abiertas
- Merge a `dev` pendiente de revisión de Carlos.
- IA real sin conectar (sin claves): generación de lecciones de temas propios y explicaciones extra usan el proveedor simulado.
- Catálogo global: 150 temas propios del equipo anclados al CNEB, pendientes de revisión pedagógica; faltan secundaria 3.°–5.°.
- Reuniones del plan: convocatoria con los participantes precargados, consulta de disponibilidad con alternativas
  (`consultarDisponibilidad`), invitaciones, confirmaciones, acta y acuerdos del módulo de reuniones existente. Sin E2E propio
  de esta pestaña (cubierta por las pruebas de reuniones existentes).
- Solicitud de acceso al grado superior: prevista, no implementada.
