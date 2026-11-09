# 42 — Nudito: currículo, áreas de los cursos y validación de temas

> Estado: implementado (Dev A, catálogo en borrador PENDIENTE de revisión docente) · Plan: Khipu Pro · Última actualización: 2026-11-04 (Claude Code, Dev A) · Responsable: Dev A

## Objetivo
Dar a Nudito (specs/41) un catálogo curricular **verificable** de temas por área, nivel y grado, alineado al CNEB (specs/30), y
decidir de forma **determinista** (sin IA) qué tema puede practicar cada alumno.

## Alcance y honestidad del catálogo
- **No es el currículo oficial completo.** Es una primera selección de temas escrita por el equipo, cada uno anclado a un
  desempeño real de `src/lib/cneb/*.json`. Todos los temas tienen `origen: "cneb"`, `version: 1` y `revisado: null`
  (**pendiente de revisión pedagógica por un docente**); los repasos (idea, ejemplo, error frecuente) son propios.
- Cobertura de la primera versión (150 temas):

| Área | P1 | P2 | P3 | P4 | P5 | P6 | S1 | S2 | Total |
|---|---|---|---|---|---|---|---|---|---|
| Matemática | 5 | 5 | 7 | 7 | 7 | 7 | 6 | 6 | 50 |
| Comunicación | 5 | 5 | 7 | 7 | 7 | 7 | 6 | 6 | 50 |
| Ciencia y Tecnología | 5 | 5 | 7 | 7 | 7 | 7 | 6 | 6 | 50 |

- Matemática: competencias 23 (cantidad), 24 (regularidad, equivalencia y cambio) y 26 (forma: solo longitud, perímetro y
  área). **Sin temas de la competencia 25** (datos y probabilidad): no hay generador todavía.
- Comunicación: competencias 8 (lee) y 9 (escribe). **Sin la competencia 7** (oral).
- Ciencia y Tecnología: competencia 21 (explica el mundo físico) y dos temas de la 20 (indaga). Sin la 22 (diseña).
- Faltan secundaria 3.°–5.° y el resto de áreas.

## Responsabilidades (Dev A)
- Esquema y migración `20261114090000_nudito_tutor` (paso 0, hecho).
- Catálogo global en código: `src/lib/nudito/catalogo/{matematica,comunicacion,ciencia-tecnologia}.json` (arreglos de
  `Tema`) + `catalogo/index.ts` (carga validada con `esquemaTema` al primer uso, índice invertido por raíz de palabra,
  consultas por área/nivel/grado, prerrequisitos transitivos, detección de ciclos, búsqueda determinista).
- `catalogo/claves.ts`: claves de tema por fuente (`CLAVES_POR_FUENTE`) para que specs/43 etiquete ítems, lecturas y
  consignas con `temaClave`. La prueba de integridad exige que esté sincronizado con los JSON.
- Temas propios del colegio (`nudito_temas_colegio`, clave «col:<id>») y su CRUD.
- Área CNEB de cada curso (`cursos.area_cneb`): relleno, cálculo al crear o renombrar, selector manual de dirección.
- `validarTema` («Otro tema») y seed `prisma/seed-nudito-tutor.ts`.

## Fuentes de ejercicios (acuerdo con Dev B, specs/43)
| Área | `fuente` | IDs |
|---|---|---|
| Matemática | `{ tipo: "generador", generadorId }` | `mat.operaciones`, `mat.fracciones`, `mat.proporcionalidad`, `mat.porcentajes`, `mat.ecuaciones` (también igualdades y valor desconocido de primaria), `mat.geometria` (longitud, perímetro, área), `mat.patrones` |
| Ciencia y Tecnología | `{ tipo: "banco", bancoId: "cyt.banco" }` | un solo banco; cada ítem lleva su `temaClave` |
| Comunicación | `{ tipo: "lecturas", coleccionId }` | `com.lecturas` (competencia 8; tipos con `lectura`) y `com.escritura` (competencia 9: producción con `escritura_rubrica`; ortografía y gramática con `opcion_multiple`/`texto_corto`) |

`FUENTES_CONOCIDAS` (`catalogo/index.ts`) es la lista cerrada; un tema del colegio con otra fuente se rechaza.

## Reglas de negocio
- **Área del curso**: `cursos.area_cneb` = clave de `CATALOGO_CNEB` (las 15 áreas, no solo las de Nudito).
  1. La migración rellenó por el prefijo de los desempeños importados (`MAT-`, `COM-`, `CYT-`; gana el más frecuente).
  2. `rellenarAreasCursos` (alias `detectarYGuardarAreas`) completa los cursos **sin área** con `detectarArea(nombre, nivel)`.
     Script: `pnpm nudito:areas [--colegio <slug>]`. Idempotente.
  3. `crearCurso`/`editarCurso` (Gestión, specs/10) y la carga masiva de salones y cursos (specs/36) guardan el área
     calculada por el nombre; al renombrar se recalcula **salvo** `area_cneb_manual = true`.
  4. Dirección fija el área con el selector «Área CNEB» de Gestión → Salones (`fijarAreaCurso`, alias `asignarAreaCurso`,
     `manual = true`, auditado). «Automática» (`area = null`) vuelve al cálculo por nombre. Sin cambios no se escribe ni audita.
  5. `importarCneb` (specs/30) fija el área importada.
- **Cursos de Nudito del alumno** (`cursosNuditoDelAlumno` / `cursosNuditoDeAlumno` con `requireAlumnoVisible`): solo
  cursos de su salón con `area_cneb` en las áreas pedidas (⊆ `AREAS_NUDITO`), **una entrada por área** (gana el fijado a
  mano y luego el nombre más corto), en el orden de `AREAS_NUDITO`.
- **Tema**: cumple `esquemaTema`; `desempenoCodigo` existe en `src/lib/cneb/*.json` y es de su área, competencia, nivel y
  grado; prerrequisitos existentes, de la misma área, de grado igual o menor y sin ciclos; recursos solo de dominios en
  `SitioPermitido` (hoy todos vacíos); fuente de `FUENTES_CONOCIDAS`; repaso breve (idea y ejemplo ≤ 400 caracteres).
- **Temas del colegio**: CRUD solo de dirección en colegios con plan Pro (se exige el plan, no el interruptor: dirección
  puede prepararlos antes de encender Nudito); el profesor ve, en solo lectura, los temas activos de las áreas de sus
  cursos. Validación zod + prerrequisitos (globales o «col:») de grado ≤ + sin ciclos + fuente conocida. Todo auditado
  (`nudito_tema_colegio`). Desactivar no borra (el progreso guarda la clave). Un tema con fuente **`banco` nace inactivo**
  y solo se activa después de `revisarTemaColegio` (dirección marca revisados sus ítems: `revisado_por`/`revisado_at`);
  cambiar la fuente a otro banco borra la revisión y lo desactiva. El repaso de un tema del colegio usa su descripción.
- **Catálogo efectivo**: `catalogoDelColegio(db, {area, nivel})` = globales del nivel + activos del colegio.
  `temasParaAlumno(ctx, {area, nivel, grado, desbloqueados})` = los de su grado y anteriores (en secundaria también los
  de primaria) + los desbloqueados.
- **Validación de «Otro tema»** (`validarTema`, puro y determinista, sin IA). Orden de grados: primaria 1–6, secundaria 7–11.
  1. Texto vacío, de más de 200 caracteres, con correo, teléfono/DNI (7+ dígitos), URL, frases personales («me llamo»,
     «vivo en»…) o insultos → `no_reconocido` con un mensaje genérico (**nunca repite el texto**) y temas del grado.
  2. Diccionario `TERMINOS_AVANZADOS` (ecuaciones diferenciales, derivadas, integrales, límites, matrices, logaritmos,
     trigonometría, ecuaciones cuadráticas, ADN/genética, fotosíntesis antes de S2, mitosis, física cuántica,
     estequiometría, análisis sintáctico, métrica): si el alumno está por debajo del grado del término →
     `demasiado_avanzado`. `solicitado` es el tema real del catálogo si existe (fotosíntesis → `cyt.s2…`) o un **tema
     sintético** (clave `xxx.s5.avanzado-<slug>`, solo informativo, nunca se practica). La prueba de integridad verifica
     que ningún tema del catálogo por debajo de ese grado use esas frases.
  3. Búsqueda (`buscarTemas`) en los temas recibidos + los globales del área del otro nivel. Puntaje: nombre exacto 20,
     palabra clave exacta 6, frase clave contenida 4 por palabra, palabra útil por raíz 3 (4 si está en el nombre).
     Umbral 3; se consideran empatados los ≥ 85 % del mejor. Entre los empatados: uno del grado actual →
     `permitido/grado_actual`; uno alcanzable de grados anteriores → `permitido/grado_anterior`; varios → `ambiguo`
     (opciones del grado actual o, si no hay, de los anteriores, máx. 4, con pregunta); solo superiores: desbloqueado →
     `permitido/desbloqueado`, si no → `demasiado_avanzado` con el más cercano.
  4. Alternativas de `demasiado_avanzado` (máx. 3, todas ≤ grado del alumno): prerrequisitos alcanzables (el más cercano
     primero), mejores coincidencias de las búsquedas del término avanzado, temas del grado actual de la misma
     competencia (eje), y el resto del grado actual. Mensaje motivador: «¡Qué bien que te interese …! Es un tema que se
     aprende más adelante… te propongo practicar primero …». Nunca «no puedes».
  5. Sin coincidencias: nombre de un área del CNEB (`detectarArea`, «historia», «inglés»…) o tema/término de otra área
     de Nudito → `fuera_de_area` con `areaDetectada`.
  6. Si no, `no_reconocido` con sugerencias por similitud (prefijos de 4 letras) entre los alcanzables, o del grado actual.
  La IA, como mucho, propone claves del catálogo (`esquemaCandidatosTema`) que se vuelven a validar aquí.

## Contratos
```ts
// src/lib/nudito/catalogo/index.ts (puro): temasGlobales(), temasDe(area, nivel, grado?), temaPorClave(clave),
//   buscarTemas(texto, temas) → { tema, puntaje }[], temasParecidos, prerrequisitosDe(clave), cicloDePrerrequisitos,
//   clavesPorFuente(fuenteId), FUENTES_CONOCIDAS, fuenteConocida, idDeFuente, posicionGrado, posicionTema
// src/lib/nudito/catalogo/claves.ts (puro): CLAVES_POR_FUENTE
// src/lib/nudito/validar-tema.ts (puro): validarTema: ValidarTema, TERMINOS_AVANZADOS, textoNoProcesable
// src/lib/server/nudito/catalogo.ts: catalogoDelColegio(db, { area, nivel }), temasParaAlumno(ctx, filtro),
//   listarTemasColegio(ctx, { area? }), crearTemaColegio(ctx, entrada), editarTemaColegio(ctx, id, entrada),
//   revisarTemaColegio(ctx, id), activarTemaColegio(ctx, id), desactivarTemaColegio(ctx, id)
// src/lib/server/nudito/areas-cursos.ts: areaDeCurso(nombre, nivel), rellenarAreasCursos(tenantId?) (= detectarYGuardarAreas),
//   fijarAreaCurso(ctx, { cursoId, area }) (= asignarAreaCurso), cursosNuditoDelAlumno(db, alumnoId, areas),
//   cursosNuditoDeAlumno(ctx, alumnoId, areas?)
```

## Modelo de datos
`cursos.area_cneb`, `cursos.area_cneb_manual` (índice `(tenant_id, area_cneb)`, CHECK de formato), `nudito_temas_colegio`.
Seed: `prisma/seed-nudito-tutor.ts` activa `nudito_config_colegio` de Nuevo Horizonte, rellena áreas de cursos y crea
2 temas del colegio (Matemática 5.° activo; Ciencia 4.° con banco, inactivo hasta su revisión).

## Pruebas
- unit: `nudito-catalogo-integridad.test.ts` (esquema, cobertura, claves, nombres, prerrequisitos y ciclos, códigos
  CNEB, fuentes, `claves.ts` sincronizado, repasos, recursos, términos avanzados), `nudito-validar-tema.test.ts`.
- integración: `nudito-areas-cursos.test.ts` (relleno idempotente, manual no se pisa, crear/renombrar, solo cursos del
  salón del alumno, otro colegio nada), `nudito-catalogo-colegio.test.ts` (CRUD, banco revisado, permisos, plan, aislamiento).

## Pendientes
- **Revisión pedagógica docente** de los 150 temas y repasos (hoy `revisado: null`); algunos temas comparten desempeño.
- Secundaria 3.°–5.°, competencia 25 de Matemática (requiere generador), oral (7) y diseño tecnológico (22).
- Recursos: ninguno todavía (solo se aceptarán dominios de `SitioPermitido`).
- `demasiado_avanzado.solicitado` exige un `Tema` completo en el contrato congelado: para términos fuera del catálogo se usa
  un tema sintético; conviene que el contrato admita `Pick<Tema, "nombre" | "area">` en una próxima versión.
- La UI de temas del colegio (pantalla de dirección) queda para Dev D/C; el servidor ya está.
- El nombre suelto «Ciencia» no es sinónimo CNEB (`detectarArea`): esos cursos necesitan el selector manual.

## Uso actual en el tutor (specs/49, 2026-11-08)
El catálogo global y los temas del colegio siguen sirviendo para planificar y generar ejercicios. `validarTema` y `temasParaAlumno` permanecen como funciones históricas y pruebas puras, pero `/nudito` ya no ofrece «Otro tema» ni selecciona temas por texto libre. La lista del alumno sale de la foto de la última versión publicada del plan anual de su grupo curricular y se intersecta con lecciones publicadas del mismo grado y área. Todos esos temas están disponibles desde el inicio.

## Piloto de banco de conocimiento (specs/50, 2026-11-09)
Matemática de 3.° primaria tiene 239 fichas en el banco, incluidas las siete claves existentes. El catálogo anterior permanece para el resto de grados y áreas. Las consultas del servidor usan `temasDeConBanco` y `temaPorClaveConBanco` para incorporar el banco con carga diferida. Los desempeños oficiales estructurados están en `conocimiento/cneb/matematica.json`. El contenido sigue sin revisión docente (`revisado: null`).
