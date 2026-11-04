# 42 — Nudito: currículo, áreas de los cursos y validación de temas

> Estado: borrador (paso 0: esqueletos) · Plan: Khipu Pro · Última actualización: 2026-11-14 (Claude Code, paso 0) · Responsable: Dev A

## Objetivo
Dar a Nudito (specs/41) un catálogo curricular **verificable** de temas por área, nivel y grado, alineado al CNEB (specs/30), y
decidir de forma **determinista** qué tema puede practicar cada alumno.

## Responsabilidades (Dev A)
- Esquema y migración `20261114090000_nudito_tutor` (paso 0, hecho).
- Catálogo global en código: `src/lib/nudito/catalogo/{matematica,comunicacion,ciencia-tecnologia}.json` + `catalogo/index.ts`.
  Primera versión: primaria 3.°–6.° y secundaria 1.°–2.°, unos 6–10 temas por grado y área, con prerrequisitos.
- Temas propios del colegio (`nudito_temas_colegio`, clave «col:<id>») y su CRUD para dirección.
- Área CNEB de cada curso (`cursos.area_cneb`): relleno, cálculo al crear o renombrar cursos (Gestión y carga masiva, specs/36),
  selector manual de dirección.
- `validarTema` («Otro tema») y seed `prisma/seed-nudito-tutor.ts`.

## Reglas de negocio
- **Área del curso**: `cursos.area_cneb` = clave de `CATALOGO_CNEB` (las 15 áreas, no solo las de Nudito).
  1. La migración rellenó por el prefijo de los desempeños importados (`MAT-`, `COM-`, `CYT-`; gana el más frecuente).
  2. `rellenarAreasCursos` completa por nombre con `detectarArea(nombre, nivel)` (sinónimos de `src/lib/cneb`).
  3. `area_cneb_manual = true` (dirección) nunca se pisa; `area = null` vuelve al cálculo automático.
  4. `importarCneb` (specs/30) fija el área importada.
- **Tema**: cumple `esquemaTema`; `desempenoCodigo` existe en `src/lib/cneb/*.json` y es de su área, competencia, nivel y grado;
  prerrequisitos existentes y sin ciclos; recursos solo de dominios en `SitioPermitido`; `fuente` registrada por B.
- **Validación de «Otro tema»** (`validarTema`, puro): búsqueda por palabras clave y sinónimos normalizados →
  grado actual (`permitido/grado_actual`), grados anteriores (`permitido/grado_anterior`), superior desbloqueado
  (`permitido/desbloqueado`), superior no desbloqueado (`demasiado_avanzado` + alternativas: prerrequisitos de su grado),
  varias coincidencias parecidas (`ambiguo` + pregunta), sin coincidencias (`no_reconocido` + sugerencias del grado), otra área
  (`fuera_de_area`). La IA, como mucho, propone claves del catálogo (`esquemaCandidatosTema`) que se vuelven a validar aquí.

## Contratos
```ts
// src/lib/nudito/catalogo/index.ts (puro): temasGlobales(), temasDe(area, nivel, grado?), temaPorClave(clave),
//   buscarTemas(texto, temas) → { tema, puntaje }[]
// src/lib/nudito/validar-tema.ts (puro): validarTema: ValidarTema
// src/lib/server/nudito/catalogo.ts: catalogoDelColegio(db, { area, nivel }), crearTemaColegio(ctx, entrada),
//   editarTemaColegio(ctx, id, entrada), desactivarTemaColegio(ctx, id)
// src/lib/server/nudito/areas-cursos.ts: areaDeCurso(nombre, nivel), rellenarAreasCursos(tenantId?),
//   fijarAreaCurso(ctx, entrada), cursosNuditoDelAlumno(db, alumnoId, areas)
```

## Modelo de datos
`cursos.area_cneb`, `cursos.area_cneb_manual` (índice `(tenant_id, area_cneb)`, CHECK de formato), `nudito_temas_colegio`.

## Pruebas
- unit: `nudito-catalogo-integridad.test.ts`, `nudito-validar-tema.test.ts`. integración: `nudito-areas-cursos.test.ts`.

## Pendientes
- Todo lo de «Responsabilidades» (paso 0 entregó solo firmas y esquema).
