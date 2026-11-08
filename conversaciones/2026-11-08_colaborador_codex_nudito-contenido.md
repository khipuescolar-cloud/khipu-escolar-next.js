# Nudito: contenidos del plan anual

| Campo | Valor |
|---|---|
| Fecha | 2026-11-08 |
| Colaborador | colaborador Khipu |
| Agente y modelo | Codex · GPT-6 |
| Rama y commits | `feat/plan-anual-nudito-contenido` · este commit |
| Specs afectadas | `specs/41–44`, `specs/49` |

## Pedidos del colaborador (textual)

> Eres el Agente 4 (Motor pedagógico de Nudito) + parte del Agente 5 (UI de Nudito y de materiales) de KHIPU. Worktree propio,
> rama feat/plan-anual-nudito-contenido (sale del commit del paso 0). Lee AGENTS.md, specs/18, specs/41, 42, 43, 44 y los
> contratos specs/48 y specs/49 (fuente de verdad). El esquema, la migración, src/lib/plan-anual/*, src/lib/nudito/leccion.ts y
> src/lib/server/plan-anual/acceso.ts YA EXISTEN: úsalos; NO edites prisma/schema.prisma ni migraciones (si falta algo, detente y
> repórtalo).
>
> PROPIEDAD DE ARCHIVOS (otro agente hace en paralelo el servicio y la UI de planificación):
> - TUYO: src/lib/server/nudito/** (incluye nuevos plan-publicado.ts, lecciones/*, ia/*), src/lib/nudito/** (salvo leccion.ts:
>   solo amplíalo si es imprescindible), src/components/nudito/**, src/app/colegio/[slug]/nudito/**,
>   src/app/colegio/[slug]/planificacion/[planId]/materiales/** y .../[planId]/progreso/** (páginas propias; el otro agente pone
>   las pestañas y el layout de [planId]: crea tus page.tsx sin layout propio y usa EncabezadoPagina), src/app/api/cron/nudito-contenido/**,
>   src/components/nudito-materiales/**, tests de Nudito nuevos o existentes que debas ajustar, specs/41–44 y specs/49.
> - PROHIBIDO tocar: src/lib/server/plan-anual/{planes,temas,revision,reuniones-plan}.ts, src/components/planificacion/**, resto
>   de src/app/colegio/[slug]/planificacion/**, src/lib/navegacion.ts, prisma/**, reuniones.ts. Para leer planes usa consultas
>   propias de solo lectura sobre PlanAnual/PlanAnualVersion/PlanAnualParticipante vía ctx.db y requireAccesoPlan de acceso.ts.
> - NO modifiques notas, evaluaciones, competencias, libretas, NSP, justificaciones, recuperación ni registro auxiliar.
>
> IMPLEMENTA specs/49 completo:
> 1. plan-publicado.ts: temasPublicadosDelAlumno (última versión publicada del grupo del salón del alumno ∩ lecciones publicadas;
>    sin N+1; todos disponibles desde el inicio, sin bloqueo temporal) y progresoDelPlan (mapearEstadoProgreso).
> 2. Cambiar el flujo de sesiones (sesiones.ts, catalogo.ts y la API/acciones de /nudito): el alumno solo ve/elige temas de (1);
>    ELIMINA por completo «Otro tema» (textoLibre) de la UI, la acción y el servicio (elegirTema solo acepta temaClave de la lista;
>    si no está → no_reconocido con sugerencias de la lista). Desactiva el desbloqueo automático al grado superior para la
>    selección de temas (consérvalo como dato, no lo borres). Repaso = contenido de la lección publicada (idea, explicación,
>    ejemplos, recursos SVG/diagramas); «Explícame otra vez» sigue con IA+caché+límites. Ajusta los tests existentes de Nudito
>    que dependían de «Otro tema» o del catálogo libre, conservando su intención (no los borres sin reemplazo).
> 3. Lecciones (lecciones/*): CRUD y estados de specs/49 con src/lib/nudito/leccion.ts; armado `catalogo` sin IA desde el repaso
>    del catálogo + ejerciciosMuestra de los generadores/bancos/lecturas del tema con semillas fijas y respuestas verificadas con
>    los evaluadores existentes; permisos: participantes activos del plan del tema o dirección para revisar/aprobar; publicar:
>    coordinador o dirección; ia_simulada no aprobable sin edición docente; historial en NuditoLeccionRevision; auditar().
> 4. Preparación: prepararMateriales (idempotente por plan+versión) y procesarLote (lote 5, concurrencia 2, máx. 3 intentos,
>    reanudable, presupuesto del trabajo y tope mensual del colegio, sin enviar todo a la vez). Agrega generarLeccion al
>    ProveedorTutorIA (simulado determinista + claude/openai/gemini con la configuración existente que ya leen esos archivos; NO
>    agregues claves ni actives servicios). Registra consumo (operacion generar_leccion, alumnoId null). Route handler
>    /api/cron/nudito-contenido protegido como los otros cron (mira src/app/api/cron/*).
> 5. metricasContenido (specs/49 §contratos) y cuotas: usa los límites existentes de consumo.ts y el tope del colegio.
> 6. UI: /planificacion/[planId]/materiales (estado por tema con ícono + palabra, «Preparar materiales»/«Continuar», avance del
>    trabajo, métricas, pendientes de aprobación), /materiales/[temaClave] (revisión completa: explicación, ejemplos, muestras con
>    respuesta y pistas, dificultad, recursos; editar; solicitar cambios; aprobar; publicar), /planificacion/[planId]/progreso
>    (alumnos del grupo × temas, estados, sin notas). /nudito: bienvenida con el nombre, cursos de su matrícula (3 áreas), temas
>    del plan, repaso, práctica con pistas progresivas que no revelan la solución de inmediato, retroalimentación de errores,
>    resultados (completados, aciertos, dificultades, habilidades, recomendaciones), felicitación + repaso libre + profundización
>    al completar todo el plan; sin opción de grado superior (solo un texto «Pronto podrás pedir temas del siguiente grado» NO;
>    mejor nada visible: déjalo previsto en código/spec). Mascota y animaciones ligeras ya existentes (NuditoMascota), respetar
>    prefers-reduced-motion, móvil 360px sin scroll horizontal. Fuente Nunito solo para Nudito.
> 7. Seguimiento docente existente (/nudito/seguimiento): que muestre temas fuera del plan vigente como tales; no borres historial.
> PRUEBAS obligatorias: tests/unit/plan-publicado-reglas.test.ts y tests/integracion/nudito-plan-anual.test.ts con colegios
> ficticios (crea el plan publicado y su versión con inserciones directas vía ctx.db/ayudantes, porque el servicio de
> planificación lo hace otro agente): 13 todos los temas publicados disponibles desde el inicio; 14 sin bloqueo semanal (fechas
> distintas, mismo resultado); 15 un alumno domina todos los temas a mitad de año y ve plan completo; 16 solo ve temas aprobados
> de su grado y curso (no los de otro grado/curso ni los sin lección publicada); 17 elegirTema con textoLibre es rechazado y no
> existe en la acción; 18/19/20 Matemática, Comunicación y Ciencia y Tecnología permiten repaso y ejercicios; 21 respuesta
> incorrecta genera retro; 22 la primera pista no contiene la respuesta; 23 progreso persiste por alumno; 24 un alumno no accede a
> sesiones de otro; 25 tras practicar, tablas de notas/evaluaciones no cambian (conteo antes/después); 26 una lección publicada se
> reutiliza entre dos alumnos sin nuevas llamadas de generación; 27 publicar versión 2 del plan sin un tema conserva dominio y
> sesiones del tema retirado; 28 procesarLote respeta presupuesto/tope (se detiene y deja ítems pendientes) y es idempotente.
> Verifica: pnpm lint; pnpm typecheck; pnpm exec vitest run tests/unit tests/integracion/nudito-*.test.ts tests/integracion/rol-alumno.test.ts
> Si levantas la app usa `NEXT_DIST_DIR=.next-nud PORT=3072 pnpm exec next dev -p 3072` y luego `git checkout tsconfig.json`.
> BD solo local, datos ficticios, sin push ni remoto. Actualiza specs/41–44 donde cambió el comportamiento («Otro tema» retirado,
> temas desde el plan) y specs/49 (estado, rutas reales, limitaciones). Commit local (git add solo tus archivos, nunca -A),
> asunto imperativo en inglés, última línea: Co-Authored-By: Codex <noreply@openai.com>
> Responde al final con archivos, comandos y resultados reales copiados, qué quedó simulado y dudas.

## Decisiones
- La última foto publicada del plan y las lecciones publicadas determinan los temas disponibles. El desbloqueo histórico sigue guardado y no amplía la selección.
- Las lecciones globales se arman con repaso del catálogo y muestras deterministas; los temas propios usan el proveedor configurado.
- Las lecciones simuladas requieren edición docente antes de la aprobación.
- Las páginas de materiales y progreso son propias de esta rama y usan el layout de planificación de la otra rama.

## Cambios realizados
- `src/lib/server/nudito/plan-publicado.ts`, `lecciones/*`, `ia/*`, `sesiones.ts`, `progreso.ts`: temas del plan, repaso publicado, revisión, preparación, consumo, métricas y seguimiento.
- `src/app/colegio/[slug]/nudito/**`, `src/components/nudito/**`: selección sin texto libre, repaso y resultados del plan.
- `src/app/colegio/[slug]/planificacion/[planId]/materiales/**`, `progreso/**`, `src/app/api/cron/nudito-contenido/**`: revisión y progreso, worker protegido.
- `tests/unit/plan-publicado-reglas.test.ts`, `tests/integracion/nudito-plan-anual.test.ts` y ajustes a `nudito-sesiones.test.ts`.
- `specs/41–44` y `specs/49`: comportamiento vigente y limitaciones.

## Validación
- `pnpm exec next typegen`: tipos de rutas generados.
- `pnpm lint`: sin errores; se corrigió una advertencia de import no usado tras la primera ejecución.
- `pnpm typecheck`: sin errores.
- `pnpm exec vitest run tests/unit tests/integracion/nudito-*.test.ts tests/integracion/rol-alumno.test.ts`: 101 archivos y 731 pruebas aprobadas (glob expandido explícitamente para la ejecución desde Node).
- `pnpm exec vitest run tests/integracion/nudito-plan-anual.test.ts tests/integracion/nudito-sesiones.test.ts`: 34 pruebas aprobadas tras reforzar el alcance por alumno.

## Pendientes y preguntas abiertas
- No se activó IA real ni se añadieron claves. La interfaz inicial de edición de lecciones es JSON; SVG se muestra como imagen inerte y los diagramas de texto no ejecutan HTML.
- La revisión pedagógica del catálogo global sigue pendiente según specs/42.
