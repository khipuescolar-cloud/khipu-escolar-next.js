# Plan anual y contenidos de Nudito: paso 0

| Campo | Valor |
|---|---|
| Fecha | 2026-11-08 |
| Colaborador | equipo KHIPU |
| Agente y modelo | Codex · GPT-6 |
| Rama y commits | `feat/plan-anual-nudito` · Add annual planning foundation |
| Specs afectadas | `specs/48-planificacion-academica-anual.md`, `specs/49-nudito-contenidos-del-plan.md`, `specs/00-indice.md` |

## Pedidos del colaborador (textual)

> Eres el Agente 2 (Base de datos y seguridad) de KHIPU. Trabaja SOLO en este worktree: rama feat/plan-anual-nudito.
> Lee primero AGENTS.md, specs/01, specs/42, specs/43, y sobre todo los contratos specs/48-planificacion-academica-anual.md y
> specs/49-nudito-contenidos-del-plan.md (ya commiteados). Son la fuente de verdad; si encuentras una contradicción real con el
> código, sigue el código existente y anota la diferencia en la spec.
>
> OBJETIVO (paso 0, centralizado): esquema, migración local, capa de acceso y lógica pura compartida. NO hagas UI ni servicios de
> negocio completos (otros agentes los harán en paralelo después sobre tu commit).
>
> 1. prisma/schema.prisma: agrega TODOS los enums y modelos de specs/48 y specs/49 (nombres de tabla snake_case con @@map,
>    columnas con @map, @db.Uuid, @db.Timestamptz, relaciones con onDelete coherentes: Cascade al tenant y al plan; SetNull para
>    membresías opcionales; NoAction/Restrict para autores obligatorios como en Reunion). Agrega las relaciones inversas
>    necesarias en Tenant, Membership, Reunion, etc. Reunion + planAnualId opcional. NuditoConsumoIa: alumnoId opcional, + leccionId
>    opcional, OperacionIaNudito + generar_leccion. Revisa src/lib/server/db.ts (dbTenant / MODELOS_GLOBALES): todos los modelos
>    nuevos son del colegio (llevan tenantId). Revisa también exportación del colegio (specs/15, busca listas de modelos exportables
>    o de borrado de tenant) y registra los modelos nuevos donde haga falta para que no rompan pruebas de integridad existentes.
>    Ajusta el código que asume NuditoConsumoIa.alumnoId no nulo (typecheck lo dirá).
> 2. Migración: `pnpm exec prisma migrate dev --create-only --name plan_anual_nudito_contenido` (fecha posterior a
>    20261117090300) y edítala: agrega ENABLE + FORCE ROW LEVEL SECURITY en cada tabla nueva igual que
>    prisma/migrations/20261116090000_almacenamiento_cuotas (sin políticas para anon/authenticated), CHECKs útiles (grado 1..6,
>    orden >= 0, version >= 1, contadores >= 0, estado de observación no nulo cuando es_observacion), índices de specs.
>    Aplícala SOLO a la BD local con `pnpm exec prisma migrate deploy` (BD en 127.0.0.1:54322 vía .env). Luego `pnpm db:generate`.
>    PROHIBIDO: tocar Supabase remoto, .env.nube, `migrate reset`, borrar datos.
> 3. src/lib/plan-anual/estados.ts (puro): tipos, transiciones de la máquina de estados de specs/48 con
>    `puedeTransicionar(estado, accion, contexto)` devolviendo {ok:true}|{ok:false, motivo} (contexto: esCoordinador, esDireccion,
>    observacionesAbiertas, participantesActivos, conformesRonda, cantidadTemas, hayCoordinador) y `editable(estado)`.
>    src/lib/plan-anual/contratos.ts: esquemas zod de entradas (crearPlan, comentar, conformidad, ordenarTemas, copiarPlan, motivo).
> 4. src/lib/nudito/leccion.ts (puro): `esquemaLeccion` (specs/49), `validarLeccion(contenido, { evaluar?(muestra)=>boolean })`
>    con errores en español, `hashContenido`, transiciones de EstadoLeccionNudito (`puedeTransicionarLeccion`), regla de
>    ia_simulada sin edición no aprobable, y `mapearEstadoProgreso(estadoDominio|null)` → pendiente|en_progreso|necesita_refuerzo|dominado
>    (lee el enum EstadoDominioNudito real del schema y specs/43 para mapear cada valor).
> 5. src/lib/server/plan-anual/acceso.ts: `gruposDelDocente`, `docentesDelGrupo` (una sola consulta agrupada, sin N+1; un
>    docente con varias secciones aparece una vez con sus secciones), `requireAccesoPlan(ctx, planId, {editar, coordinador})`
>    (dirección todo el colegio; profesor participante activo; si no notFound()). Usa ctx.db siempre; nunca tenantId del cliente.
>    Para el plan Pro: revisa src/lib/planes.ts y src/lib/server/plan.ts; exporta `exigirPlanificacion(ctx)` que use la feature Pro
>    académica más adecuada ya existente (justifica en la spec cuál).
> 6. Pruebas: tests/unit/plan-anual-estados.test.ts y tests/unit/leccion-validacion.test.ts (completas: transiciones válidas e
>    inválidas, publicar con observaciones abiertas falla, aprobación sin conformidad de todos falla, ia_simulada…).
>    tests/integracion/plan-anual-acceso.test.ts: usa los ayudantes de tests/integracion/ayudantes (mira cómo otros tests crean
>    colegios/salones/cursos ficticios) para probar: dos docentes de Matemática 3.° (secciones A-C y D-F) salen como un grupo con 2
>    docentes; docente de otro curso no accede (notFound); colegio B no ve planes del colegio A; RLS: las tablas nuevas tienen
>    relrowsecurity y relforcerowsecurity = true.
> 7. Verifica: `pnpm lint`, `pnpm typecheck`, `pnpm exec vitest run tests/unit/plan-anual-estados.test.ts tests/unit/leccion-validacion.test.ts tests/integracion/plan-anual-acceso.test.ts`
>    y además la suite unitaria completa (`pnpm exec vitest run tests/unit`) para detectar roturas por el cambio de alumnoId.
> 8. Actualiza specs/48 y 49 (sección Modelo de datos con lo real, estado «en desarrollo (paso 0 hecho)») y specs/00-indice.md
>    (filas 48 y 49). Commit local con asunto imperativo en inglés, git add SOLO de tus archivos (nunca git add -A), terminado en
>    la línea: Co-Authored-By: Codex <noreply@openai.com>
>    NO hagas git push. No toques el checkout principal (../../khipu-escolar). Usa datos ficticios.
>
> Al terminar responde con: archivos cambiados, nombre de la migración, comandos ejecutados y su resultado real (copiado), y
> cualquier decisión o duda.

## Decisiones

- Los modelos nuevos son del colegio y entran automáticamente en `dbTenant` y en la exportación, porque no están en `MODELOS_GLOBALES` ni en `TABLAS_OMITIDAS`.
- Se usa `notas` como puerta académica Pro existente para planificación.
- `migrate dev --create-only` se detuvo por dos migraciones antiguas modificadas tras aplicarse. Se generó la migración desde el esquema base del commit y se aplicó con `migrate deploy`, sin reset.
- La validación pura acepta un callback para `SitioPermitido`; la comprobación de la lista queda para la capa de servicio.

## Cambios realizados

- `prisma/schema.prisma` y `prisma/migrations/20261118090000_plan_anual_nudito_contenido/migration.sql`: 12 tablas, 8 enums, relaciones, índices, CHECKs y RLS.
- `src/lib/plan-anual/*`, `src/lib/nudito/leccion.ts`, `src/lib/server/plan-anual/acceso.ts`: reglas puras y acceso.
- `tests/unit/*` y `tests/integracion/plan-anual-acceso.test.ts`: estados, lecciones, roles, aislamiento y RLS.
- `specs/48-*`, `specs/49-*`, `specs/00-indice.md`: modelo real y estado.

## Validación

- `prisma validate`: esquema válido.
- `prisma migrate deploy`: migración aplicada en 127.0.0.1:54322.
- `prisma generate`: cliente generado.
- `lint` y `typecheck`: aprobados.
- Vitest dirigido: 3 archivos, 21 pruebas aprobadas.
- Vitest unitario: 89 archivos, 619 pruebas aprobadas.
- Integridad de exportación: 7 pruebas aprobadas.

## Pendientes y preguntas abiertas

- Los servicios de planes, revisión y preparación de materiales, así como la UI, corresponden a pasos posteriores.
