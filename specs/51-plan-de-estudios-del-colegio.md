# 51 — Plan de estudios del colegio (cursos por grado) y Nudito por curso

> Estado: en desarrollo (catálogo de cursos y disciplinas listos; modelo, asistente y Nudito por curso pendientes) · Plan: Khipu Base (plan de estudios) / Khipu Pro (Nudito) · Última actualización: 2026-11-09 (Claude)

## Objetivo
Cada colegio dicta sus propios cursos, y no siempre son las áreas del CNEB. Muchos colegios particulares dictan Aritmética, Álgebra, Geometría, Química, Física o Razonamiento Verbal desde primaria. El colegio declara qué cursos dicta y cuáles lleva cada grado, y Nudito muestra esos cursos **como cursos**, cada uno con su temario, sus profesores y sus temas.

## Decisiones (Carlos, 2026-11-09)
- Los cursos se eligen de la **lista de cursos de Khipu**. También se puede escribir «otro curso» con nombre libre, pero ese curso no tiene Nudito.
- Cada curso con Nudito tiene un **banco de temas propio por curso y grado** (p. ej. Química de 5.° de primaria).
- Si en un grado conviven un área y un curso especializado de esa área (p. ej. «Ciencia y Tecnología» y «Química»), **cada uno ve solo lo suyo**: el área deja de mostrar los temas con la disciplina que cedió.
- El asistente de configuración se hará dentro del panel de dirección y administración, que todavía no está diseñado.

## Flujos (previstos)
1. **Cursos del colegio.** Dirección o administración marca los cursos de la lista de Khipu y agrega los propios.
2. **Malla por grado.** De 1.° de primaria a 5.° de secundaria, marca con casillas qué cursos lleva cada grado. Puede copiar la malla del grado anterior.
3. **Creación de cursos.** Khipu crea los cursos en cada salón del grado. Nunca borra un curso con asistencia, notas o tareas.
4. **Nudito.** El profesor de «Química» de 5.° arma el temario de su curso. El alumno ve «Química» y «Ciencia y Tecnología» por separado.

## Reglas de negocio
- **Catálogo** (`src/lib/cursos-khipu/catalogo.ts`):
  - Incluye las áreas CNEB (sin «transversales») y los cursos especializados: Aritmética, Álgebra, Geometría, Trigonometría, Estadística, Razonamiento Matemático, Lenguaje, Literatura, Razonamiento Verbal, Plan Lector, Biología, Química y Física.
  - Cada curso tiene clave estable, área CNEB, niveles, prefijo de tema, sinónimos y `nudito`.
  - Cada especializado declara qué **disciplinas** cede su área.
  - Razonamiento Matemático no cede ninguna: tiene banco propio.
- **Disciplinas** (`src/lib/nudito/conocimiento/disciplinas.ts`):
  - Matemática: aritmética, álgebra, geometría, trigonometría, estadística.
  - Comunicación: lenguaje, literatura, comprensión lectora, oralidad, escritura, razonamiento verbal.
  - Ciencia y Tecnología: biología, química, física, Tierra y universo, indagación, tecnología.
  - Cada tema de los 33 temarios y cada ficha llevan una disciplina. `pnpm nudito:validar-banco` lo exige y comprueba que la ficha coincida con su tema.
- **Detección del curso.** `detectarCursoKhipu(nombre, nivel)` usa el sinónimo más largo y da prioridad al curso especializado sobre el área («Álgebra» → `algebra`, no `matematica`).
- **Disciplinas cedidas.** `disciplinasCedidas(area, cursosDelGrado)` calcula qué disciplinas pierde el área en un grado.
- **Áreas CNEB.** Trigonometría y Estadística se reconocen como Matemática (`src/lib/cneb/matematica.json`).

## Modelo de datos (previsto, migración aditiva)
- `CursoColegio`: `tenantId`, `cursoKhipu?` (null en los cursos propios), `nombre`, `orden`, `archivadoAt`.
- `CursoColegioGrado`: `cursoColegioId`, `nivel`, `grado`. Es único por esas tres columnas.
- `Curso.cursoColegioId?`: enlaza el curso del salón con su curso del colegio.
- Un script idempotente arma el plan de estudios de los colegios existentes a partir de sus cursos.
- Nudito agrupa por (colegio, año, nivel, grado, **curso de Khipu**). Para guardarlo reutiliza `planes_anuales.area`, porque las claves actuales `matematica`, `comunicacion` y `ciencia-tecnologia` ya son claves del catálogo.

## Pendientes
- Modelo, servicio `src/lib/server/plan-estudios.ts` y script de migración.
- Asistente dentro del panel de dirección y administración.
- Nudito por curso:
  - grupos y acceso (`plan-anual/acceso.ts`);
  - cursos del alumno (`nudito/areas-cursos.ts`);
  - temas publicados (`plan-publicado.ts`);
  - exclusión por disciplina.
- Temarios de los cursos especializados por grado (para revisión de Carlos) y después sus fichas.
- Datos demo (specs/35): un salón de secundaria con Química y Física y uno de primaria con Aritmética.

## Pruebas
- Unit: `cursos-khipu-catalogo.test.ts` comprueba claves y prefijos únicos, que cada curso apunte a un área CNEB válida, la detección del especializado antes que el área y las disciplinas cedidas.
