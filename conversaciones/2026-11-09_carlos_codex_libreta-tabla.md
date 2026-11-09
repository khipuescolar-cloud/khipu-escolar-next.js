# Rediseño de Libreta por salón

| Campo | Valor |
|---|---|
| Fecha | 2026-11-09 |
| Colaborador | Carlos (producto) |
| Agente y modelo | Codex · GPT-6 |
| Rama y commits | `feat/libreta-tabla` · `da2ddca` (código, spec y pruebas); este commit (bitácora) |
| Specs afectadas | `specs/11-notas-y-libreta.md` |

## Pedidos del colaborador (textual)

> Lee y ejecuta completa la tarea descrita en el archivo /tmp/claude-1000/-home-carlos-calderon-Escritorio-StartUp/ac52f5b6-0ec9-478d-9213-3c4be7fffde7/scratchpad/prompt-libreta.md . Trabaja de forma autónoma hasta terminar, sin pedir confirmación.

Pedido de Carlos citado literalmente en ese archivo:

> «ahora vamos a mejorar el modulo de libretas, me gustaria que se vea algo similar a esto [tabla del Reporte del periodo del salón: alumnos en filas, curso → competencias en columnas, encabezado de dos niveles, primera columna fija], pero que tenga una columna que diga, ver documento y que pueda visualizarse el documento de la libreta de forma profesional; no de esta manera [la lista actual de /libreta: curso con viñeta, competencias en filas sueltas con píldora] sino que deberías mostrarlo en un cuadro o algo para que se vea ordenado y profesional por favor»

## Decisiones

- Personal: filtros GET de salón y periodo, tabla de alumnos por curso y competencia, documento en diálogo con descarga, navegación y rectificaciones.
- Familia: selector actual de hijos y periodos publicados; el mismo documento se muestra en línea.
- El resumen consulta el salón en conjunto y toma la última versión emitida; solo la apertura del documento llama a `datosLibreta` y audita la vista.
- El PDF existente se conservó.

## Cambios realizados

- `src/lib/server/libreta.ts`: resumen por salón con validación de plan, rol, alcance y periodo.
- `src/app/colegio/[slug]/libreta/`: página separada por rol, tabla con columnas fijas, diálogo y documento formal reutilizable; acciones de rectificación conservadas.
- `tests/integracion/notas-libreta-tareas-agenda.test.ts`: alcance, versión emitida y ausencia de auditoría al listar.
- `tests/e2e/notas-libreta.test.ts`: tabla, diálogo, cierre, enlace directo y descarga.
- `specs/11-notas-y-libreta.md`: flujo 5 y permisos, fecha 2026-11-09.
- Commit `da2ddca`: `Redesign report cards by classroom`.

## Validación

- `pnpm lint`, `pnpm typecheck` y `pnpm test`: no arrancaron porque pnpm rechazó el `node_modules` enlazado fuera del worktree (`ERR_PNPM_UNSAFE_MODULES_DIR`).
- Binarios locales equivalentes: ESLint completo y TypeScript sin errores; Vitest: 163 archivos y 1323 pruebas aprobadas.
- Playwright en puerto 3060: 9 de 9 pruebas del archivo de notas y libreta aprobadas. El enlace directo se volvió a verificar tras añadir su aserción.
- Para e2e se usó temporalmente una raíz Turbopack que incluía las dependencias compartidas; `next.config.ts` se restauró antes del commit.
- Revisión visual del documento y `git diff --check`: sin problemas.

## Pendientes y preguntas abiertas

- Ninguno para este rediseño.
