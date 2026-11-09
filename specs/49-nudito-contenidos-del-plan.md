# 49 — Nudito: repaso del catálogo y contenidos opcionales

> Estado: en desarrollo (paso 0 hecho) · Plan: Khipu Pro · Última actualización: 2026-11-08 (Claude Code, orquestador) · Responsable: orquestador + agentes Codex

## Objetivo
Que Nudito (specs/41–44) use los temas de la última versión habilitada del temario (specs/48). Una lección publicada es opcional: si falta, el repaso proviene del catálogo global. La IA queda para dudas, pistas y
retroalimentación; nunca genera una clase por alumno.

## Reglas de negocio
1. **Temas del alumno** = temas de la última `plan_anual_versiones` publicada del grupo `(tenant, salon.anio,
   salon.nivel, salon.grado, area)` sin exigir una lección publicada; las claves `col:` históricas no se presentan.
   Todos disponibles desde el inicio: **sin bloqueo semanal ni por avance del docente**. Sin plan publicado: lista
   vacía y el mensaje «Tu colegio está preparando los temas de este curso.» (Nudito nunca da malas noticias).
2. **Se elimina «Otro tema»**: `elegirTema` solo acepta `temaClave` y la rechaza si no está en la lista del punto 1
   (también para temas de grados anteriores o desbloqueados: el desbloqueo automático al grado superior queda inactivo).
3. Áreas: Matemática, Comunicación, Ciencia y Tecnología, filtradas por la matrícula (cursos del salón, specs/42).
4. **Repaso** = contenido de la lección publicada cuando exista; en su ausencia, repaso del catálogo global. «Explícame otra vez» sigue usando la IA
   con caché y límites (specs/41).
5. **Progreso**: estados del alumno por tema = `pendiente` (sin dominio) · `en_progreso` · `necesita_refuerzo` ·
   `dominado`, mapeados desde `nudito_dominios.estado` (specs/43). Abrir un tema no lo completa; dominar exige la
   política de dominio. El alumno puede volver a practicar cualquier tema.
6. **Plan completo**: si todos los temas del plan publicado están `dominado` → felicitación, repaso libre y
   «profundización» (dificultad máxima del tema). No se abre el grado superior (queda solo previsto).
7. **Versiones**: publicar una nueva versión del plan o retirar/reordenar un tema **no borra** sesiones, intentos ni
   dominios; el seguimiento muestra temas retirados como «fuera del plan vigente».
8. **Resultados formativos**: Nudito nunca escribe en notas, evaluaciones, competencias ni libretas.

## Lecciones (histórico y uso opcional)

La revisión docente y la publicación de lecciones dejan de ser requisitos para que el alumno vea un tema. Se retiran las pantallas de materiales y revisión docente; los datos y servicios que usan otros flujos se conservan.
- `nudito_lecciones` (tenant): una fila por `(tenant, temaClave, version)`; la vigente es la mayor versión `publicada`.
- `contenido` (zod `esquemaLeccion` en `src/lib/nudito/leccion.ts`):
  `{ titulo, idea (≤400), explicacion (≤1500), ejemplos: [{enunciado, desarrollo}] (1–3), errorFrecuente?,
  recursos: [{ tipo: "svg" | "diagrama" | "enlace", titulo, valor }] (enlaces solo de `SitioPermitido`),
  ejerciciosMuestra: [{ enunciado, respuesta, pistas: string[] }] }` — las muestras salen de los generadores/bancos
  deterministas del tema (specs/43) con semillas fijas; la práctica real sigue usando generadores con validación por código.
- **Origen**: `catalogo` (armada sin IA desde el repaso del catálogo + muestras de generadores; reutilizable entre
  colegios sin costo), `ia` (proveedor real), `ia_simulada` (proveedor simulado), `docente` (escrita o editada por un docente).
- **Estados**: `borrador → en_revision → (cambios_solicitados → en_revision)* → aprobada → publicada`; `retirada`.
  - Validación automática (`validarLeccion`, pura): esquema, longitudes, que las respuestas de las muestras coincidan con
    el evaluador del tema, enlaces permitidos, sin datos personales. Si falla, no puede pasar a `en_revision`.
  - Aprobar = docente participante activo del plan del tema (o dirección) — registra `aprobado_por_id/aprobado_at`.
  - **Una lección `ia_simulada` no puede aprobarse sin edición docente** (al editar pasa a `docente`). No se presenta un
    tema como preparado si su contenido es simulado.
  - Publicar (coordinador o dirección) deja la versión anterior como histórico.
- `nudito_leccion_revisiones`: historial `(leccion, actor, accion, comentario, created_at)`.

## Preparación de materiales (al aprobar/publicar el plan)
`prepararMateriales(ctx, planId)` crea (idempotente por `(plan_id, version_plan)`) un `nudito_trabajos_contenido` con un
ítem por tema: reutiliza la lección vigente si existe (`reutilizada`), si no arma la de `catalogo` cuando el tema global
tiene repaso, y solo si falta (temas `col:`) pide un borrador al proveedor. `procesarLote(ctx, trabajoId, { lote = 5,
concurrencia = 2 })` procesa ítems `pendiente`/`fallido` (máx. 3 intentos), respeta el presupuesto del trabajo y
`nudito_config_colegio.tope_costo_usd_mes`, registra cada llamada en `nudito_consumos_ia` (`operacion =
generar_leccion`, `alumno_id = NULL`) y nunca envía todos los temas a la vez. Se dispara desde la UI («Preparar
materiales» / «Continuar») y desde `/api/cron/nudito-contenido` (local; `CRON_SECRET`).

## Modelo de datos (paso 0 implementado)
```prisma
enum EstadoLeccionNudito { borrador en_revision cambios_solicitados aprobada publicada retirada }
enum OrigenLeccionNudito { catalogo ia ia_simulada docente }
enum EstadoTrabajoContenido { pendiente en_proceso completado fallido cancelado }
enum EstadoItemTrabajo { pendiente en_proceso reutilizada generada fallida omitida }
model NuditoLeccion          { id, tenantId, temaClave, area, version Int, estado, origen, contenido Json, validacion Json?,
                               contenidoHash String, creadoPorId?, aprobadoPorId?, aprobadoAt?, publicadoPorId?, publicadaAt?,
                               comentarioRevision?, createdAt, updatedAt
                               @@unique([tenantId, temaClave, version]) @@index([tenantId, temaClave, estado]) }
model NuditoLeccionRevision  { id, tenantId, leccionId, actorId?, accion String, comentario?, createdAt; @@index([leccionId, createdAt]) }
model NuditoTrabajoContenido { id, tenantId, planId, versionPlan Int, estado, total, procesados, reutilizados, generados, fallidos Int,
                               presupuestoUsd Decimal?, costoUsd Decimal @default(0), creadoPorId?, error?, createdAt, iniciadoAt?, terminadoAt?
                               @@unique([tenantId, planId, versionPlan]) }
model NuditoTrabajoItem      { id, tenantId, trabajoId, temaClave, estado, intentos Int, leccionId?, error?, updatedAt
                               @@unique([trabajoId, temaClave]) @@index([trabajoId, estado]) }
// NuditoConsumoIa: alumnoId opcional con SetNull; leccionId opcional con SetNull; OperacionIaNudito + generar_leccion
```

Las cuatro tablas reales de materiales están en `prisma/schema.prisma` y se crean en `20261118090000_plan_anual_nudito_contenido`, con RLS activada y forzada sin políticas para clientes públicos. La migración agrega CHECKs de versión positiva y contadores/costos no negativos. El hash SHA-256 canoniza las claves del JSON. `validarLeccion` comprueba el esquema, datos personales, HTTPS y SVG sin código; recibe `evaluar` para verificar muestras y `permitirEnlace` para aplicar la lista de `SitioPermitido` desde el servicio. La función pura no consulta esa lista por sí misma. `ia_simulada` nunca pasa a aprobada: una edición docente debe cambiar su origen a `docente`.

## Contratos
```ts
// src/lib/server/nudito/plan-publicado.ts
temasPublicadosDelAlumno(ctx, acceso, area): Promise<TemaDisponible[]>   // regla 1, sin N+1 (una consulta por tabla)
progresoDelPlan(ctx, alumnoId, area): Promise<{ total, dominados, completo: boolean, temas: {temaClave, estado}[] }>
// src/lib/server/nudito/lecciones/*
leccionVigente(db, temaClave) · listarLeccionesDelPlan(ctx, planId) · editarLeccion · enviarARevision
solicitarCambios · aprobarLeccion · publicarLeccion · retirarLeccion
prepararMateriales(ctx, planId) · procesarLote(ctx, trabajoId, opciones?)
metricasContenido(ctx, { desde?, hasta? }): { reutilizadas, generadas, solicitudesIa, tokens, costoColegioUsd,
  costoPorAlumnoActivoUsd, errores, pendientesAprobacion }
// Proveedor IA: ProveedorTutorIA + generarLeccion({ tema, grado, nivel }) → borrador validado con esquemaLeccion
```

## Rutas y UI
- /nudito/temario y /nudito/temario/[id]: elección y aceptación del temario (specs/48).
- /nudito (alumno / modo hijo): bienvenida, curso, temas de la última versión habilitada, repaso de lección publicada si existe o del catálogo, práctica y progreso.
- Las antiguas rutas /planificacion y subrutas redirigen al temario. Se retiran las pantallas de materiales, revisión de lecciones y progreso del plan; el seguimiento general permanece en /nudito/seguimiento.

## Edición docente (histórico; UI retirada)
La pantalla de materiales usa campos etiquetados para título, idea, explicación, hasta tres ejemplos, error frecuente y hasta cinco muestras con respuesta y pistas. El servidor reconstruye y valida con `esquemaLeccion`; los recursos vigentes se conservan y los errores de forma se muestran junto al formulario.

## Pruebas
- unit: `leccion-validacion.test.ts`, `plan-publicado-reglas.test.ts`.
- integración: `nudito-plan-anual.test.ts` (casos 13–28 del pedido).
- e2e: `plan-anual-nudito.test.ts` (colegio temporal Pro: crear plan, designar coordinador, temas, observación y
  bloqueos, conformidades, publicación, versión 1, materiales, revisión y publicación de lecciones, alumno solo con temas
  publicados y sin «Otro tema», progreso docente y recorrido móvil 360×740 sin scroll horizontal).

## Limitaciones honestas
- Sin claves de IA: generación y explicaciones extra usan el proveedor **simulado**; las lecciones de catálogo no usan IA.
- Fotos de ejercicios: se mantiene specs/41 (`permitirFotos`, interpretación confirmada por el alumno).

## Estado histórico de implementación — 2026-11-08

Este bloque documenta servicios de contenido que permanecen en el repositorio; la interfaz de revisión y su requisito de publicación quedaron retirados en 2026-11-09.
- Rutas: `/planificacion/[planId]/materiales`, `/planificacion/[planId]/materiales/[temaClave]`, `/planificacion/[planId]/progreso`, `/nudito` y `/api/cron/nudito-contenido` (Bearer `CRON_SECRET`). Las páginas de planificación usan el layout y las pestañas del agente responsable del plan.
- `temasPublicadosDelAlumno` consulta la última foto publicada y las lecciones publicadas, sin depender de semanas. `progresoDelPlan` mapea los estados sin borrar temas retirados del historial. La selección acepta solo claves de esa lista; «Otro tema» y el desbloqueo superior desaparecen de la interfaz.
- Preparación: trabajo idempotente por plan y versión; cada llamada procesa hasta cinco ítems con concurrencia máxima de dos, tres intentos por ítem y cupos de trabajo/colegio. Lecciones globales se arman desde el catálogo y muestras deterministas. Los temas propios usan el proveedor configurado; sin credenciales, el simulado deja borradores `ia_simulada` que requieren edición docente para poder aprobarse.
- Revisión: participantes activos y dirección editan y cambian estados; publicar exige coordinación o dirección. Se registran revisiones y auditoría. El contenido publicado alimenta el repaso de Nudito. El seguimiento marca temas fuera del plan vigente.
- Limitaciones: la revisión se edita como JSON en esta primera interfaz; los SVG se renderizan como imagen inerte y los diagramas de texto se muestran sin HTML ejecutable. El catálogo global original sigue pendiente de revisión pedagógica docente (specs/42). No se configuraron credenciales de IA ni se activó un proveedor real. La generación real por chat queda sujeta a la validación de esquema y revisión docente antes de publicar.
- Los resultados de sesión presentan aciertos, progreso del plan, habilidades, dificultades y recomendaciones formativas; si el plan está completo, ofrecen repaso libre y profundización.
