# 30 — Capacidades y desempeños del CNEB

> Estado: implementado · Plan: Khipu Pro (módulo `notas`; la libreta usa `libreta`) · Última actualización: 2026-10-30 (Claude Code)

## Objetivo
Completar las notas por competencias (`specs/11`) con la estructura del Currículo Nacional de Educación Básica (CNEB, MINEDU):
competencia → **capacidades** → **desempeños por nivel y grado**. Dirección carga la estructura (a mano o importándola de un
catálogo incluido), el profesor marca qué desempeños mide cada evaluación, y la calificación del periodo y la libreta muestran
las capacidades y los desempeños evaluados de cada alumno. La nota sigue igual que hoy (AD/A/B/C o 0–20, por evaluación).

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Dirección | Ver la estructura de cualquier curso; indicar el grado del salón; importar desde el CNEB; crear, editar, reordenar y eliminar capacidades y desempeños; reordenar competencias | Marcar desempeños en evaluaciones (las crea el profesor, como hoy) |
| Profesor del curso (dicta o es tutor del salón) | Ver la estructura de sus cursos; marcar desempeños al crear o editar una evaluación; ver qué desempeños evaluó cada alumno | Editar capacidades o desempeños, importar, cambiar el grado; tocar cursos ajenos (403) |
| Apoderado / alumno | Ver en la libreta las capacidades de cada competencia y los desempeños evaluados de su hijo (o propios) | Editar |
| Colegio con Khipu Base | — | Todo (403 por `requireFeature(ctx, "notas")`) |

Decisión: la estructura curricular la mantiene dirección (una sola versión por curso, igual para todos los profesores); el profesor
la usa en solo lectura y pide cambios a dirección.

## Flujos
1. **Grado del salón.** Los desempeños dependen de `Salon.nivel` + `Salon.grado`. Si el salón no tiene grado (o no es válido para
   su nivel), la pestaña muestra «Este salón no tiene grado.»; dirección lo indica con «Indicar grado» (diálogo con los grados del nivel:
   primaria 1–6, secundaria 1–5, inicial 3–5 años) o desde Gestión · Salones. Academia no usa el CNEB (aviso informativo). El profesor
   ve «Pide a dirección que lo indique». Sin grado no se listan desempeños, no se importan ni se marcan.
2. **Importar desde el CNEB** (dirección) → `/notas?curso=…&seccion=cneb` → «Importar desde el CNEB»: diálogo con el **área** (se
   sugiere por el nombre del curso: «Matemática», «Comunicación», «Lenguaje»…). Crea las competencias, capacidades y desempeños del
   catálogo para el nivel y grado del salón que falten. Toast «Importamos N competencias, N capacidades y N desempeños del CNEB.» o
   «Ya estaba todo importado. No se agregó nada.».
3. **Gestionar a mano** (dirección), en la misma pestaña, por competencia: «Nueva capacidad», editar (lápiz), subir/bajar, «Eliminar»
   (confirmación); «Nuevo desempeño» (descripción, capacidad opcional, código opcional) para el grado del salón, editar, subir/bajar,
   «Eliminar» (la confirmación dice en cuántas evaluaciones está). Las competencias también se suben o bajan (su orden se usa en
   notas, libreta y PDF).
4. **Evaluación con desempeños** (profesor) → «Nueva evaluación» o «Editar»: al elegir la competencia aparece la lista de sus desempeños
   del grado (casillas, con código) — «Desempeños que evalúa (opcional · N marcados)». Cambiar de competencia desmarca los anteriores.
   La lista de evaluaciones muestra «· N desempeños».
5. **Desempeños evaluados por alumno**: en «Calificación del periodo», cada tarjeta de alumno tiene «Desempeños evaluados (N)»
   (desplegable) con los desempeños de las evaluaciones de esa competencia **en las que el alumno tiene nota**; si tiene notas pero
   ninguna evaluación con desempeños: «Sus evaluaciones no tienen desempeños marcados.».
6. **Libreta** (página): bajo cada competencia, «Capacidades: a · b · c» y un desplegable «Desempeños evaluados (N)». **PDF**: la
   columna «Competencia» lleva debajo, en letra pequeña gris, «Capacidades: …» (los desempeños no van al PDF para no alargarlo). La
   conclusión descriptiva y el resto del diseño no cambian.

## Reglas de negocio
- `Competencia` sigue siendo **por curso**; capacidades y desempeños cuelgan de ella (se repiten por curso). El catálogo CNEB es global
  pero vive en código (JSON), no en la BD.
- Un desempeño de una evaluación debe ser de **la competencia elegida** (y por lo tanto del curso) y del **nivel y grado del salón**;
  el servidor lo valida (`validarDesempenosEvaluacion`). Sin competencia no se pueden marcar desempeños. Máximo 30 por evaluación.
- Editar una evaluación desde un formulario sin el selector (o una llamada sin `desempenoIds`) conserva los desempeños que siguen
  siendo de la competencia; con `desempenoIds: []` los quita.
- Las escrituras de notas siguen las reglas de `specs/11` (periodo y curso abiertos, solo el profesor del curso).
- **Importación idempotente** (`planearImportacion`, lógica pura): competencia existente = mismo nombre normalizado (sin tildes ni
  mayúsculas) o uno es prefijo del otro (15+ caracteres; «Lee diversos tipos de textos escritos» = «… en su lengua materna»);
  capacidad existente = mismo nombre dentro de la competencia; desempeño existente = mismo **código** o misma descripción normalizada,
  en el mismo nivel y grado. Lo existente no se modifica. Los nuevos van al final (`orden` = máximo + 1). Todo en una transacción.
- Código de los desempeños del catálogo: `MAT-C1-P3-01` (área, competencia, P/S + grado, número). Sirve para no duplicar y para buscarlos.
- Borrar una capacidad deja sus desempeños sin capacidad (SetNull). Borrar un desempeño lo quita de las evaluaciones (Cascade); las
  notas no cambian. Borrar una competencia sigue la regla de `specs/11` (no si tiene calificaciones en libreta) y arrastra capacidades
  y desempeños.
- Reordenar: subir/bajar intercambia con el vecino y renumera `orden` 0..n de la lista (competencias del curso, capacidades de la
  competencia, desempeños de la competencia en ese nivel y grado).
- Auditoría: `editar salon` (grado) y `crear cneb_importacion` (con área, grado y conteos).

## Catálogo CNEB incluido (`src/lib/cneb/`)
- `matematica.json` y `comunicacion.json` (datos puros) + `catalogo.ts` (tipos, `detectarArea`, `plantillaCneb`, `planearImportacion`,
  `reordenar`, `gradoValido`, `textoGrado`).
- **Matemática** (primaria y secundaria): 4 competencias oficiales, cada una con sus 4 capacidades oficiales: «Resuelve problemas de
  cantidad», «… de regularidad, equivalencia y cambio», «… de forma, movimiento y localización», «… de gestión de datos e incertidumbre».
- **Comunicación** (primaria y secundaria): «Se comunica oralmente en su lengua materna» (6 capacidades), «Lee diversos tipos de textos
  escritos en su lengua materna» (3), «Escribe diversos tipos de textos en su lengua materna» (4).
- Desempeños: 3 o 4 por competencia y grado (primaria 1.°–6.°, secundaria 1.°–5.°), 253 en total, cada uno ligado a una capacidad.
- Los nombres de competencias y capacidades siguen el CNEB oficial. **Los textos de los desempeños son una redacción cercana al
  programa curricular, abreviada o resumida en varios casos: revisar con el texto oficial del CNEB** (Programas Curriculares de
  Primaria y Secundaria, MINEDU 2016) antes de usarlos como oficiales. Inicial y las demás áreas no están incluidas.

## Modelo de datos
Migración `20261031130000_pro_completo_nudito_plus` (sin cambios de esquema en esta función).
- **`Capacidad`** (`capacidades`): `competenciaId` (Cascade), `nombre`, `descripcion?`, `orden`.
- **`Desempeno`** (`desempenos`): `competenciaId` (Cascade), `capacidadId?` (SetNull), `nivel`, `grado` (CHECK 1–6; en inicial la edad),
  `descripcion`, `codigo?`, `orden`. Índice `(tenantId, competenciaId, nivel, grado)`.
- **`EvaluacionDesempeno`** (`evaluacion_desempenos`): `evaluacionId` y `desempenoId` (Cascade), único `(evaluacionId, desempenoId)`.
- `Salon.grado` (Int?, ya existía) define qué desempeños aplican.

## Contratos de `src/lib/server`
```ts
// cneb.ts — requireFeature(ctx, "notas"); lectura: profesor del curso o dirección; escritura: solo dirección
estructuraCurso(ctx, cursoId)            // curso, salón (nivel, grado|null), competencias → capacidades + desempeños del grado (con usos), áreas, puedeEditar
desempenosParaEvaluar(ctx, cursoId)      // { textoGrado|null, porCompetencia: { [competenciaId]: { id, descripcion, codigo }[] } }
validarDesempenosEvaluacion(ctx, cursoId, competenciaId, ids): Promise<string | null>
guardarDesempenosEvaluacion(db, tenantId, evaluacionId, ids)   // reemplaza los vínculos
fijarGradoSalon(ctx, { salonId, grado }): Resultado
crearCapacidad(ctx, { competenciaId, nombre, descripcion? }); editarCapacidad(ctx, id, …); eliminarCapacidad(ctx, id); moverCapacidad(ctx, id, "arriba"|"abajo")
crearDesempeno(ctx, { competenciaId, capacidadId?, descripcion, codigo? }); editarDesempeno(ctx, id, …); eliminarDesempeno(ctx, id); moverDesempeno(ctx, id, dir)
moverCompetencia(ctx, id, dir)
importarCneb(ctx, cursoId, area?): Resultado    // area: "matematica" | "comunicacion"; por defecto se detecta por el nombre del curso
// notas.ts (cambios): crearEvaluacion/editarEvaluacion aceptan desempenoIds?; grillaNotas → evaluaciones[].desempenoIds;
// calificacionesPeriodo → filas[].alumnos[].desempenos
// libreta.ts (cambio): datosLibreta → cursos[].competencias[].capacidades: string[] y desempenosEvaluados: string[]
```

## Rutas y UI
- `/notas` → pestaña **«Capacidades y desempeños»** (`?seccion=cneb`), componente `SeccionCneb.tsx`; acciones en
  `src/app/colegio/[slug]/notas/cneb-actions.ts`; subir/bajar con `BotonesOrden.tsx`; selector de competencia + desempeños en
  `CompetenciaYDesempenos.tsx` (diálogos «Nueva evaluación» y «Editar»).
- `/notas?seccion=periodo` → desplegable por alumno (`FilaCalificacion.tsx`).
- `/libreta` y `GET /api/libreta/[alumnoId]` → capacidades (y en la página, desempeños evaluados).

## Textos y UX
- Encabezado: «Capacidades y desempeños de {curso}» · «Salón 3.° B · 3.° de primaria. Cada competencia del Currículo Nacional tiene
  capacidades, y para cada grado hay desempeños esperados.»
- Sin grado: «Este salón no tiene grado.» + indicación según rol. Profesor: «Solo dirección edita las capacidades y los desempeños.
  Si falta alguno, pídeselo.»
- Diálogos con `DialogoAccion` (Base UI) y confirmaciones con `BotonConfirmar`; botones de orden con `aria-label` «Subir …»/«Bajar …».
- A 390 px las acciones de cada capacidad y desempeño bajan debajo del texto.

## Errores y casos borde
- Sin grado: «Primero indica el grado del salón: los desempeños dependen del nivel y del grado.»
- Curso sin área reconocible: «Elige el área del CNEB que corresponde a este curso.» (el diálogo obliga a elegirla).
- Nivel sin catálogo (inicial): «El catálogo incluido aún no tiene desempeños de inicial.»
- Desempeño de otra competencia, otro grado u otro colegio: «Algún desempeño no es de esta competencia o del grado del salón.»
- Desempeños sin competencia: «Elige la competencia antes de marcar desempeños.»
- Dos importaciones simultáneas del mismo curso podrían duplicar filas (no hay índice único en el esquema); la segunda importación
  posterior sí es idempotente.
- Cambiar el grado del salón no borra los desempeños del grado anterior: dejan de mostrarse y los vínculos con evaluaciones se conservan.

## Pruebas
- unit: `tests/unit/cneb-catalogo.test.ts` (integridad del catálogo: competencias y capacidades oficiales, todos los grados, capacidad
  válida, sin repetidos; detección de área; plantilla y códigos; plan de importación vacío, parcial y repetido; reordenar).
- integración: `tests/integracion/cneb-desempenos.test.ts` (grado: solo dirección y válido; importar solo dirección, idempotente; área
  obligatoria si no se detecta; aislamiento entre colegios; profesor no edita; dirección crea y reordena; profesor ajeno y dirección no
  crean evaluaciones; desempeños de otra competencia, sin competencia o de otro colegio se rechazan; editar conserva/quita;
  calificación del periodo y libreta con desempeños evaluados y capacidades).
- e2e: `tests/e2e/cneb-desempenos.test.ts` (dirección indica el grado e importa el CNEB, reimportar no duplica; la profesora marca
  desempeños al crear una evaluación y los ve en la calificación del periodo; la libreta muestra capacidades y desempeños evaluados).
  Crea su propio salón, curso y alumno en Nuevo Horizonte y los borra al terminar.

## Datos demo
`prisma/seed-cneb.ts` (`sembrarCneb(prisma)`, llamado desde `prisma/seed.ts`; specs/35): todos los salones de Nuevo Horizonte
tienen grado; catálogo importado en Matemática y Comunicación de primaria y secundaria; en las demás áreas (e inicial), las
competencias del CNEB del área; «Práctica: fracciones» (Matemática 3.° B) con 2 desempeños y «Lectura: «El zorro y el cóndor»»
(Comunicación 3.° B) con 3, en el bimestre vigente (las notas las pone `seed-notas.ts`).

## Pendientes
- Revisar los textos de los desempeños con el CNEB oficial; agregar inicial y otras áreas (Ciencia y Tecnología, Personal Social…).
- ¿Calificación por desempeño? Hoy solo se califica por evaluación y competencia (decisión: no por ahora).
- Mostrar los desempeños evaluados también en `/notas` de la familia y en reportes.
- Índice único (competencia, nivel, grado, código) si se quiere blindar la importación concurrente (requiere migración).
