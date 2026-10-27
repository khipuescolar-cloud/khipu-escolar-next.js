# 11 — Notas y libreta (MINEDU)

> Estado: borrador (requisitos) · Última actualización: 2026-10-26 (Claude Code). Quien lo implemente completa las secciones de la plantilla. · Plan: Fase 2 (Familia)

## Escalas
- **Literal (CNEB, inicial, primaria y secundaria):** AD (logro destacado), A (logro esperado), B (en proceso), C (en inicio).
- **Vigesimal (0–20, academias o secundaria si el colegio lo configura):** aprobado ≥ 11 (configurable).
- `tenant.escalaCalificacion` define cuál se usa. Hay un CHECK en la BD: solo un valor y 0–20.

## Estructura
- `periodos` (bimestre, trimestre o semestre; cerrado = no editable) → `competencias` por curso (CNEB) → `evaluaciones` (con peso) → `notas` por alumno.
- `calificaciones_periodo`: la calificación de cada competencia en el periodo, más la **conclusión descriptiva** (obligatoria en B y C según el CNEB). Se sugiere automáticamente:
  - vigesimal: promedio ponderado;
  - literal: el valor más frecuente, con desempate hacia el más reciente.
  El profesor la confirma o la corrige.

## Flujos
- **Profesor** (`/notas`): elige curso y periodo → grilla de alumnos × evaluaciones con guardado rápido. Crea evaluaciones y gestiona competencias. Cierra las calificaciones del periodo.
- **Dirección:** gestiona periodos (abrir y cerrar) y ve todo.
- **Apoderado:** ve las notas de sus hijos por curso y competencia, **sin comparar con otros alumnos** (no hay promedios del salón ni rankings).

## Libreta
- `/libreta`: vista por alumno y periodo (cursos → competencias → calificación + conclusión), firmada por el colegio.
- **PDF descargable** en `/api/libreta/[alumnoId]?periodo=`, generado con `@react-pdf/renderer`: logo, datos del alumno, tabla, conclusiones, asistencia del periodo y leyenda de la escala.

## Pruebas
- unit: conversión de escalas y cálculo sugerido.
- integración: el apoderado no ve las notas de otro alumno, un periodo cerrado no se edita, plan Básico → 403.
