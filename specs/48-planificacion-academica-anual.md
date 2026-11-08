# 48 — Planificación académica anual (sílabo compartido por grado y curso)

> Estado: en desarrollo (paso 0 hecho) · Plan: Khipu Pro · Última actualización: 2026-11-08 (Claude Code, orquestador) · Responsable: orquestador + agentes Codex

## Objetivo
Que los docentes que dictan el **mismo curso (área CNEB) en el mismo grado, nivel y año** elaboren, revisen y aprueben
**un solo plan anual** de temas, sin un sílabo por sección. El plan publicado es la única fuente de temas de Nudito
(specs/49) para los alumnos de ese grado y curso.

## Conceptos y claves
- **Grupo curricular** = `(tenant, anio, nivel, grado, area)`. `area` = `cursos.area_cneb` (specs/42). No se crea ninguna
  entidad nueva de curso, grado, sección ni docente: el grupo se calcula desde `salones` (`anio`, `nivel`, `grado`,
  `archivado_at IS NULL`) y sus `cursos` con ese `area_cneb`.
- **Docentes del grupo** = `DISTINCT cursos.profesor_id` (no nulos) de los cursos del grupo. Un docente con 3 secciones
  participa **una sola vez** (`plan_anual_participantes` único por `(plan_id, membership_id)`).
- **Tema** = clave del catálogo efectivo (specs/42): global (`mat.p3.…`) o del colegio (`col:<uuid>`). El catálogo global
  vive en código y **nunca** lo modifica un colegio; los temas propios están en `nudito_temas_colegio` (aislados por tenant).
- **Plan anual** = una fila por grupo curricular y año (`@@unique([tenantId, anio, nivel, grado, area])`). 2028 es otro
  plan; copiar 2027 crea un borrador nuevo con `copiado_de_id`.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| direccion | Crear planes de cualquier grupo, designar/sustituir coordinador, agregar/retirar participantes con motivo, archivar, copiar planes, ver todo | Aprobar ni publicar en nombre del coordinador; registrar conformidad en nombre de un docente |
| profesor participante | Ver el plan, proponer y ordenar temas (en `borrador`/`con_observaciones`), comentar, levantar observaciones, registrar su conformidad u observaciones en la ronda vigente, crear el plan de un grupo suyo si no existe | Editar planes de otros grupos; publicar si no es coordinador |
| profesor coordinador | Lo anterior + resolver observaciones, enviar a revisión, aprobar, publicar, abrir una revisión de un plan publicado, convocar reuniones del plan | Publicar con observaciones abiertas o sin la conformidad de todos los participantes activos |
| otros (alumno, apoderado, portería, administrativo) | — (el alumno solo ve los temas publicados vía Nudito) | Todo lo demás |

Permisos de administrador **no** equivalen a aprobación pedagógica. Toda acción de dirección sobre participantes y
coordinador se audita (`auditar()`) y queda en `plan_anual_eventos`.

## Máquina de estados (`src/lib/plan-anual/estados.ts`, pura)
```
borrador ──enviar_revision──▶ en_revision ──(observación abierta)──▶ con_observaciones
   ▲                             │  ▲                                   │
   │                             │  └──────reenviar_revision────────────┘ (sin observaciones abiertas; ronda+1)
   │                          aprobar (coordinador; 0 observaciones abiertas; todos los participantes activos «conforme» en la ronda)
   │                             ▼
   │                          aprobado ──publicar──▶ publicado ──abrir_revision (coordinador, motivo)──▶ borrador
   │                                                     │
   └──────────── archivar (dirección, desde cualquier estado salvo archivado) ──▶ archivado (solo lectura)
```
- Edición de temas/unidades: solo en `borrador` y `con_observaciones`. `en_revision`, `aprobado`, `publicado`,
  `archivado` bloquean la edición.
- `enviar_revision` exige ≥ 1 tema y coordinador designado; incrementa `ronda_revision`.
- Registrar una observación (comentario con `es_observacion = true`) en `en_revision` pasa el plan a `con_observaciones`.
- `aprobar` exige: estado `en_revision`, actor = coordinador, 0 observaciones `abierta`, y una `plan_anual_conformidades`
  `conforme` de **cada participante activo** en la ronda vigente (el coordinador también registra la suya).
- `publicar` crea `plan_anual_versiones(numero = version_publicada + 1)` con la foto de temas, unidades y conformidades,
  y actualiza `version_publicada`, `publicado_por_id`, `publicado_at`. Transacción.
- `abrir_revision` (plan publicado → borrador) **no** toca la versión publicada: los alumnos siguen usando la última
  versión publicada hasta que se publique otra. Nada borra sesiones, intentos ni dominios.
- Ausencia o cambio de docente: dirección retira (`activo = false`, motivo) o agrega participantes; sustituye al
  coordinador. Todo auditado. `sincronizarParticipantes` agrega a los docentes nuevos del grupo y **no** retira solo a
  nadie (marca `fuera_de_asignacion = true` para que dirección decida).

## Modelo de datos (paso 0 implementado)
```prisma
enum EstadoPlanAnual { borrador en_revision con_observaciones aprobado publicado archivado }
enum RolParticipantePlan { coordinador docente }
enum EstadoObservacionPlan { abierta resuelta }
enum DecisionConformidadPlan { conforme observaciones }

model PlanAnual {            // planes_anuales
  id, tenantId, anio Int, nivel Nivel, grado Int, area String, nombreCurso String
  estado EstadoPlanAnual @default(borrador)
  coordinadorId String? (Membership, SetNull)
  rondaRevision Int @default(0), versionPublicada Int @default(0)
  copiadoDeId String? (PlanAnual, SetNull)
  creadoPorId, aprobadoPorId?, aprobadoAt?, publicadoPorId?, publicadoAt?, archivadoAt?, createdAt, updatedAt
  @@unique([tenantId, anio, nivel, grado, area]) @@index([tenantId, estado]) @@index([tenantId, anio])
}
model PlanAnualUnidad       { id, tenantId, planId, titulo, orden Int; @@index([planId, orden]) }
model PlanAnualTema         { id, tenantId, planId, temaClave, unidadId?, orden Int, nota String?, propuestoPorId, createdAt
                              @@unique([planId, temaClave]) @@index([planId, orden]) }
model PlanAnualParticipante { id, tenantId, planId, membershipId, rol RolParticipantePlan, activo Bool, fueraDeAsignacion Bool,
                              agregadoPorId?, motivo?, createdAt, retiradoAt?; @@unique([planId, membershipId]) }
model PlanAnualComentario   { id, tenantId, planId, temaClave?, autorId, contenido, esObservacion Bool,
                              estado EstadoObservacionPlan?, resueltoPorId?, resolucion?, resueltoAt?, createdAt
                              @@index([planId, createdAt]) @@index([planId, estado]) }
model PlanAnualConformidad  { id, tenantId, planId, ronda Int, membershipId, decision DecisionConformidadPlan, comentario?, createdAt
                              @@unique([planId, ronda, membershipId]) }
model PlanAnualVersion      { id, tenantId, planId, numero Int, temas Json /*[{temaClave, orden, unidad}]*/, unidades Json,
                              conformidades Json, motivo String?, publicadoPorId, publicadoAt
                              @@unique([planId, numero]) @@index([tenantId, planId]) }
model PlanAnualEvento       { id, tenantId, planId, actorId?, tipo String, detalle Json, createdAt; @@index([planId, createdAt]) }
// Reunion: + planAnualId String? (PlanAnual, SetNull) @@index([planAnualId])
```
Las ocho tablas reales de planificación están en `prisma/schema.prisma` y se crean en `20261118090000_plan_anual_nudito_contenido`. `Reunion.planAnualId` es opcional con `SetNull`. Las FKs de autores obligatorios usan `NoAction`; las membresías opcionales usan `SetNull`. Hay CHECKs para grado 1–6, orden no negativo, rondas y versiones positivas, y observación con estado obligatorio. Todas llevan `tenant_id`, RLS activada y forzada, cerrada para `anon`/`authenticated` (como el resto, specs/01) y acceso solo vía
`ctx.db`. Ningún `tenantId`, `planId` de otro colegio o rol enviado por el navegador se acepta sin pasar por `ctx`.

La puerta de plan Pro es `requireFeature(ctx, "notas")`: es la feature académica Pro existente que ya está disponible para dirección y profesores, mientras `nudito_plus` representa el tutor y su interruptor institucional. `gruposDelDocente` y `docentesDelGrupo` consultan los cursos asignados y agrupan las secciones por docente en memoria tras una única consulta. La acción `registrar_observacion` de la máquina pura presupone que la capa de acceso ya verificó al participante; las demás acciones pedagógicas exigen coordinador.

## Contratos de `src/lib/server/plan-anual/`
```ts
// acceso.ts (paso 0)
requireAccesoPlan(ctx, planId, opciones?: { editar?: boolean; coordinador?: boolean }): Promise<PlanConAcceso>
  // direccion: todo el colegio; profesor: participante activo; si no → notFound() (no revela existencia)
gruposDelDocente(ctx): Promise<GrupoCurricular[]>          // grupos donde dicta (calculados desde cursos)
docentesDelGrupo(db, grupo): Promise<{ membershipId, nombre, secciones: string[] }[]>
// planes.ts
listarPlanes(ctx, filtro?) · obtenerPlan(ctx, planId) · crearPlan(ctx, { anio, nivel, grado, area })
sincronizarParticipantes(ctx, planId) · designarCoordinador(ctx, planId, membershipId, motivo)
agregarParticipante / retirarParticipante(ctx, planId, membershipId, motivo)
copiarPlan(ctx, planOrigenId, anioDestino) · archivarPlan(ctx, planId, motivo)
// temas.ts
buscarCatalogo(ctx, planId, { texto?, competencia?, pagina }) // catálogo efectivo del grado/área, paginado (≥ cientos de temas)
agregarTemas(ctx, planId, temaClaves[]) · quitarTema · ordenarTemas(ctx, planId, [{temaClave, orden, unidadId}])
crearUnidad / renombrarUnidad / eliminarUnidad · proponerTemaColegio(ctx, planId, entrada) // crea nudito_temas_colegio del colegio
// revision.ts
comentar(ctx, planId, { contenido, temaClave?, esObservacion }) · resolverObservacion(ctx, comentarioId, resolucion)
registrarConformidad(ctx, planId, { decision, comentario? })
enviarARevision · reenviarARevision · aprobar · publicar(ctx, planId) · abrirRevision(ctx, planId, motivo)
versiones(ctx, planId) · eventos(ctx, planId)
// reuniones del plan
convocarReunionPlan(ctx, planId, entrada) // envuelve convocarReunion (specs/32/40) con requeridos = participantes y planAnualId
```
Errores de negocio con `ErrorDeNegocio` (mensajes en español); operaciones críticas (aprobar, publicar, copiar, designar)
en `db.$transaction` con revalidación del estado dentro de la transacción.

## Rutas y UI
- `/planificacion` (profesor, dirección): mis grupos detectados con su plan (estado con ícono + palabra) y «Crear plan».
  Dirección ve todos y filtra por año/nivel/grado/área.
- `/planificacion/[planId]`: navegación arriba (preferencia de UI) con pestañas Temas · Revisión · Reuniones ·
  Versiones · Materiales (specs/49) · Progreso (specs/49).
  - Temas: catálogo con búsqueda y filtros (paginado), selección múltiple, unidades, orden (subir/bajar), comentarios por tema.
  - Revisión: participantes y su conformidad, observaciones abiertas/resueltas, acciones según estado.
  - Reuniones: convocar con docentes precargados (usa el asistente de disponibilidad existente), acuerdos y actas.
  - Versiones: historial, eventos, «Copiar a otro año».
- Navegación: entrada «Planificación anual» (grupo académico, roles profesor y dirección, feature Pro).

## Reglas clave para alumnos
- El plan es anual: **no hay desbloqueo por semanas, meses, bimestres ni avance del docente**. El orden es referencia.
- Lo que ve el alumno se lee de la **última `plan_anual_versiones` publicada** (no de las filas vivas), filtrado por
  temas con lección publicada (specs/49).

## Pruebas
- unit: `tests/unit/plan-anual-estados.test.ts` (máquina de estados).
- integración: `tests/integracion/plan-anual.test.ts` (casos 1–12 del pedido: compartir plan, aislamiento por curso y
  colegio, proponer/observar/resolver, bloqueo de publicación, quién aprobó, versión, copia 2028, docente nuevo, catálogo
  privado, catálogo global intacto).
- e2e: `tests/e2e/plan-anual-nudito.test.ts` (flujo completo, ver specs/49).

## Pendientes
- Solicitud de acceso al grado superior (prevista, no implementada).
