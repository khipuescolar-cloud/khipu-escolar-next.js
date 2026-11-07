# 30 — Capacidades y desempeños del CNEB

> Estado: implementado · Plan: Khipu Pro (módulo `notas`; la libreta usa `libreta`) · Última actualización: 2026-10-30 (Claude Code, catálogo completo)

> Actualización PASO 1 (2026-11-07): ver [specs/47](47-registro-de-notas.md). Las competencias oficiales ahora llevan `codigoOficial = CNEB-01…CNEB-31`, origen, desactivación lógica y auditoría. La plantilla se siembra al crear un curso reconocido y se restaura sin duplicar por código. Dirección gestiona todas; un profesor requiere `gestionaCompetencias` y solo puede cambiar cursos que dicta. Los desempeños y el flujo histórico de importación siguen disponibles. La lista del catálogo usa programas MINEDU 2016–2017; su vigencia posterior y lecturas dudosas de Secundaria siguen por verificar en `src/lib/cneb/PENDIENTES.md`.

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
2. **Importar desde el CNEB** (dirección) → `/notas?curso=…&seccion=cneb` → «Importar desde el CNEB»: diálogo con el **área** (solo
   las áreas del nivel del salón; se sugiere por el nombre del curso con alias: «Matemática», «Lenguaje», «DPCC», «CCSS», «HGE», «EPT»,
   «Religión», «Psicomotriz», «Ciencia y Ambiente», «CTA», «Computación»…; en inicial «Educación Física» sugiere Psicomotriz). Crea las
   competencias, capacidades y desempeños del catálogo para el nivel y grado (o edad) del salón que falten. Toast «Importamos N
   competencias, N capacidades y N desempeños del CNEB.» o «Ya estaba todo importado. No se agregó nada.»; si alguna competencia no
   tiene desempeños en el catálogo para ese grado se agrega «… aún no tiene desempeños de {grado} en el catálogo: agrégalos a mano.».
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
- Emparejar competencias al importar: primero nombres iguales y luego abreviados, del más parecido al menos parecido (así «Construye su
  identidad» no toma la competencia 30 «Construye su identidad como persona humana…»).
- Código de los desempeños del catálogo: `MAT-C23-P3-01` (prefijo del área, **número oficial de la competencia en el CNEB**, I/P/S +
  grado o edad, número). Sirve para no duplicar y para buscarlos. (Hasta oct-2026 el código usaba la posición: `MAT-C1-P3-01`; esos
  desempeños antiguos, de redacción resumida, no se tocan al reimportar: dirección puede borrarlos.)
- Borrar una capacidad deja sus desempeños sin capacidad (SetNull). Borrar un desempeño lo quita de las evaluaciones (Cascade); las
  notas no cambian. Borrar una competencia sigue la regla de `specs/11` (no si tiene calificaciones en libreta) y arrastra capacidades
  y desempeños.
- Reordenar: subir/bajar intercambia con el vecino y renumera `orden` 0..n de la lista (competencias del curso, capacidades de la
  competencia, desempeños de la competencia en ese nivel y grado).
- Auditoría: `editar salon` (grado) y `crear cneb_importacion` (con área, grado y conteos).

## Catálogo CNEB incluido (`src/lib/cneb/`)
- Un JSON por área + `catalogo.ts` (tipos, `CATALOGO_CNEB`, `areasDelNivel`, `detectarArea(nombre, nivel?)`, `plantillaCneb`,
  `planearImportacion`, `reordenar`, `gradoValido`, `textoGrado`) + `PENDIENTES.md` (fuentes, método, vacíos y lecturas dudosas).
- Cada área: `area`, `nombre`, `prefijo`, `niveles`, `sinonimos` (nombres de curso normalizados; gana el más largo y se prefieren las
  áreas del nivel), `fuentes` (documento, URL de minedu.gob.pe, año, páginas) y `competencias`: `numero` (1–31 del CNEB), `nombre`,
  `niveles`, `capacidades` **por nivel** (inicial a veces lista menos) y `desempenos[nivel][grado] = string[]`.
- Áreas: Inicial — Personal Social (1, 16, 30), Psicomotriz (2), Comunicación (7, 8, 9, 6), Castellano como segunda lengua (10),
  Matemática (23, 26), Ciencia y Tecnología (20; alias «Descubrimiento del mundo», «Ciencia y Ambiente»). Primaria — Personal Social
  (1, 16, 17, 18, 19), Educación Física (2, 3, 4), Comunicación (7, 8, 9), Arte y Cultura (5, 6), Castellano como segunda lengua
  (10, 11, 12), Inglés (13, 14, 15), Matemática (23, 24, 26, 25), Ciencia y Tecnología (20, 21, 22), Educación Religiosa (30, 31).
  Secundaria — DPCC (1, 16), Ciencias Sociales (17, 18, 19), EPT (27), Educación Física, Comunicación, Arte y Cultura, Castellano
  como segunda lengua, Inglés, Matemática, Ciencia y Tecnología, Educación Religiosa. Transversales (28, 29) en los tres niveles, y
  «TIC (Computación)» (28) para cursos de cómputo.
- **Textos oficiales**: nombres y números de las 31 competencias según el CNEB (RM 281-2016-MINEDU); capacidades y desempeños
  transcritos de los Programas Curriculares de Inicial, Primaria y Secundaria (MINEDU 2016–2017), incluidos sus «Ejemplo: …».
  Inicial y Primaria se extrajeron del PDF con texto y se verificó que cada desempeño aparece literal; Secundaria (PDF escaneado) se
  transcribió de la imagen y se contrastó con OCR. Los programas no ligan desempeños a capacidades: se importan sin capacidad.
- Inicial: solo ciclo II (3, 4 y 5 años). Sin desempeños por definición del programa: «Escribe…» a los 3 años; Castellano como
  segunda lengua, TIC y «Gestiona su aprendizaje» antes de 5 años; Inglés lee/escribe en 1.° y 2.° de primaria. Lo demás que falte
  está en `PENDIENTES.md`.
- Para actualizar el catálogo: regenerar los JSON desde los PDF oficiales con el mismo método y correr `tests/unit/cneb-catalogo.test.ts`.

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
- Área que no es del nivel (p. ej. DPCC en primaria): «El área … no tiene competencias en primaria según el CNEB. Elige otra área.»
- Academia: «El CNEB no se usa en academia.»
- Desempeño de otra competencia, otro grado u otro colegio: «Algún desempeño no es de esta competencia o del grado del salón.»
- Desempeños sin competencia: «Elige la competencia antes de marcar desempeños.»
- Dos importaciones simultáneas del mismo curso podrían duplicar filas (no hay índice único en el esquema); la segunda importación
  posterior sí es idempotente.
- Cambiar el grado del salón no borra los desempeños del grado anterior: dejan de mostrarse y los vínculos con evaluaciones se conservan.

## Pruebas
- unit: `tests/unit/cneb-catalogo.test.ts` (integridad del catálogo: las 31 competencias con número y nombre únicos y coherentes entre
  áreas; capacidades oficiales por nivel (número según el CNEB); áreas por nivel; desempeños de grados válidos, sin repetir ni restos
  del PDF; primaria completa; detección de área con alias y nivel; plantilla, códigos e inicial por edad; plan de importación vacío,
  parcial, repetido y competencia 1 vs 30; reordenar).
- integración: `tests/integracion/cneb-desempenos.test.ts` (grado: solo dirección y válido; importar solo dirección, idempotente; área
  obligatoria si no se detecta; aislamiento entre colegios; profesor no edita; dirección crea y reordena; profesor ajeno y dirección no
  crean evaluaciones; desempeños de otra competencia, sin competencia o de otro colegio se rechazan; editar conserva/quita;
  calificación del periodo y libreta con desempeños evaluados y capacidades; importar las 11 áreas de un salón de secundaria por nombre
  de curso (DPCC, CCSS, EPT, Religión…) con conteos iguales al catálogo, idempotente y en menos de 15 s; inicial por edad (Psicomotriz,
  Personal Social, «Educación Física» → Psicomotriz) y área de otro nivel rechazada).
- e2e: `tests/e2e/cneb-desempenos.test.ts` (dirección indica el grado e importa el CNEB, reimportar no duplica; la profesora marca
  desempeños al crear una evaluación y los ve en la calificación del periodo; la libreta muestra capacidades y desempeños evaluados).
  Crea su propio salón, curso y alumno en Nuevo Horizonte y los borra al terminar.

## Datos demo
`prisma/seed-cneb.ts` (`sembrarCneb(prisma)`, llamado desde `prisma/seed.ts`; specs/35): todos los salones de Nuevo Horizonte
tienen grado; catálogo importado en todos los cursos cuya área se reconoce (inicial, primaria y secundaria); en cursos sin área
reconocible, las competencias de una lista de respaldo; «Práctica: fracciones» (Matemática 3.° B) con 2 desempeños y «Lectura: «El zorro y el cóndor»»
(Comunicación 3.° B) con 3, en el bimestre vigente (las notas las pone `seed-notas.ts`).

## Pendientes
- Vacíos y lecturas dudosas del catálogo: `src/lib/cneb/PENDIENTES.md`. Ciclo I de inicial (0–2 años) no incluido.
- ¿Calificación por desempeño? Hoy solo se califica por evaluación y competencia (decisión: no por ahora).
- Mostrar los desempeños evaluados también en `/notas` de la familia y en reportes.
- Índice único (competencia, nivel, grado, código) si se quiere blindar la importación concurrente (requiere migración).
