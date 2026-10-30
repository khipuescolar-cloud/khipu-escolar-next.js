# 30 — Capacidades y desempeños del CNEB

> Estado: en construcción · Plan: Khipu Pro (módulo `notas`) · Última actualización: 2026-10-31 (Claude Code)

## Objetivo
Completar las notas por competencias (`specs/11`) con la estructura del Currículo Nacional (CNEB): cada competencia
tiene **capacidades**, y para cada nivel y grado hay **desempeños** esperados. El profesor vincula cada evaluación a los
desempeños que mide, para que la libreta y los reportes muestren avance por desempeño.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| dirección | Cargar/editar capacidades y desempeños (por definir: importar plantilla CNEB) | — |
| profesor del curso | Vincular evaluaciones a desempeños; (por definir) editar los de su curso | Tocar cursos ajenos |
| apoderado / alumno | Ver desempeños evaluados (por definir) | Editar |

## Flujos
1. Dirección (o una plantilla) crea capacidades por competencia y desempeños por nivel/grado.
2. Al crear o editar una evaluación, el profesor elige uno o más desempeños (`EvaluacionDesempeno`).

## Reglas de negocio
- `Competencia` sigue siendo por **curso** (sin cambios); capacidades y desempeños cuelgan de ella, así que se repiten por curso. Una plantilla CNEB global es un pendiente.
- Desempeño de una evaluación: debe ser de la misma competencia/curso y del nivel/grado del salón del curso (validar en servidor).
- `requireFeature(ctx, "notas")`.

## Modelo de datos
Migración `20261031130000_pro_completo_nudito_plus`. Sin cambios en `Competencia`, `Evaluacion`, `Nota`, `CalificacionPeriodo` (solo relaciones nuevas).

- **`Capacidad`** (`capacidades`): `competenciaId` (Cascade), `nombre`, `descripcion?`, `orden` (def. 0).
- **`Desempeno`** (`desempenos`): `competenciaId` (Cascade), `capacidadId?` (SetNull), `nivel` (`Nivel`), `grado` (Int 1–6, CHECK; en inicial, la edad 3–5), `descripcion`, `codigo?`, `orden`. Índice `(tenantId, competenciaId, nivel, grado)`.
- **`EvaluacionDesempeno`** (`evaluacion_desempenos`): `evaluacionId` (Cascade), `desempenoId` (Cascade); único `(evaluacionId, desempenoId)`.
- Relaciones nuevas: `Competencia.capacidades`, `Competencia.desempenos`, `Evaluacion.desempenos`.

## Contratos de `src/lib/server`
```ts
// por definir en notas.ts o cneb.ts: listarCapacidades, crearCapacidad, listarDesempenos(ctx, competenciaId, nivel, grado), vincularDesempenos(ctx, evaluacionId, desempenoIds)
```

## Rutas y UI
- Por definir.

## Textos y UX
- Por definir.

## Errores y casos borde
- Borrar una capacidad deja sus desempeños sin capacidad (SetNull), no los borra.

## Pruebas
- Por definir.

## Pendientes
- Plantilla CNEB oficial (global) e importación por grado.
- ¿Calificación por desempeño o solo por competencia?
