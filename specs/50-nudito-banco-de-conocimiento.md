# 50 — Banco de conocimiento de Nudito

> Estado: 33 temarios propuestos (3839 temas); fichas completas solo en Matemática 3.° primaria · Plan: Khipu Pro · Última actualización: 2026-11-09 (Claude + Codex)

## Objetivo
Ofrecer al profesor todos los temas del grado y curso para elegir el temario, y dar a Nudito contenido y ejercicios verificables para enseñar sin LLM. La infraestructura cubre Matemática, Comunicación y Ciencia y Tecnología de 1.° a 6.° de primaria y 1.° a 5.° de secundaria (33 combinaciones). Cada temario y sus fichas requieren elaboración y revisión por separado.

## Fuentes
- [Programa curricular de Educación Primaria, MINEDU (2016)](https://repositorio.minedu.gob.pe/handle/20.500.12799/4549): competencias 23–26, capacidades y desempeños de tercer grado. Los textos fieles y códigos estables se guardan en `conocimiento/cneb/matematica.json`; se contrastaron con `src/lib/cneb/matematica.json`.
- [Cuaderno de trabajo Matemática 3, MINEDU](https://repositorio.minedu.gob.pe/handle/20.500.12799/7863): referencia para situaciones de práctica de las cuatro competencias.
- [Programa curricular de Educación Secundaria, MINEDU](https://repositorio.minedu.gob.pe/handle/20.500.12799/4550): fuente localizada para el escalado; se incorporan los desempeños ya transcritos en `src/lib/cneb/*.json`, sin OCR adicional.

## Propuesta curricular de Matemática 3.° de primaria
La revisión del supervisor rechazó las 239 fichas anteriores por repetición de habilidades y vacíos curriculares. El dueño aprobó el [temario de 129 temas](../docs/nudito/temario-mat-3-primaria.md) y su [JSON estructurado](../src/lib/nudito/conocimiento/banco/matematica/primaria-3/temario-propuesto.json). Las 129 fichas nuevas viven en `primaria-3/fichas/`; las demás entradas propuestas quedan seleccionables mientras se prepara su práctica.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Profesor del grupo | Ver catálogo y escoger temas | Publicar sin aceptación del resto |
| Dirección | Ver el temario y catálogo | Editar o aceptar |
| Alumno | Practicar temas con ficha o generador del catálogo histórico que estén en la última versión aceptada; ver los demás como «Pronto» | Elegir temas fuera del plan o abrir prácticas aún inexistentes |

## Estructura, códigos y esquema
- Desempeños oficiales: `conocimiento/cneb/<area>.json` para las tres áreas. Cada competencia conserva capacidades y desempeños de primaria y añade `secundaria`. Los códigos son `<MAT|COM|CYT>-C<número>-<P|S><grado>-<índice de dos dígitos>`; la numeración de Matemática primaria permanece estable.
- Temarios: `conocimiento/banco/<area>/<nivel>-<grado>/temario-propuesto.json`. Cada tema tiene clave, competencia, capacidad, bloque, desempeño de origen, prerrequisitos y orden anual.
- Fichas publicables: `conocimiento/banco/<area>/<nivel>-<grado>/fichas/*.json`. El esquema acepta las tres áreas, primaria 1–6 y secundaria 1–5; verifica coherencia entre clave, grado, competencia y códigos de desempeño. Los campos docentes y los doce ejercicios mínimos siguen siendo obligatorios. Un ejercicio puede llevar `lectura` opcional; la práctica la muestra antes del enunciado.
- El catálogo combina propuesta, fichas y catálogo histórico sin cambiar las claves; las fichas enriquecen la propuesta, y las claves históricas siguen disponibles.

## Reglas de negocio y contratos
- `temasDeConBanco(area, nivel, grado)` carga la propuesta completa, el catálogo histórico y las fichas perezosamente por combinación; `temaPorClaveConBanco(clave)` conserva la búsqueda de claves históricas y propuestas. Los temas propuestos e históricos siguen en el catálogo aunque no tengan ficha; las fichas aportan contenido de práctica. El cargador usa `fs.readFile` desde `src/` en el servidor. `outputFileTracingIncludes` en `next.config.ts` incluye `src/lib/nudito/conocimiento/banco/**/*.json` en los trazados de todas las rutas del servidor para que Next build y Vercel empaqueten estos archivos; esta opción no agrega los JSON al bundle del cliente.
- El temario muestra todas las entradas de `temario-propuesto.json` y del catálogo histórico de la combinación, filtradas por disciplina del curso; las agrupa por competencia y bloque. Los temas sin ficha ni generador muestran «Práctica en preparación». El filtro es instantáneo y los temas elegidos quedan bloqueados. La acción del servidor valida área, nivel y grado.
- Las fichas usan `mat.banco`, `com.banco` o `cyt.banco` según el área. Los ejercicios y las respuestas quedan en el servidor; solo el enunciado y la lectura opcional se envían al alumno.
- `pnpm nudito:validar-banco` valida **todos** los `temario-propuesto.json` (100–180 temas, claves únicas, cobertura de todos los desempeños del grado, desempeños de la competencia correcta, prerrequisitos sin ciclos) y que ningún nombre de tema se repita entre grados del mismo curso (si un tema vuelve en otro grado, su nombre dice el alcance). En las combinaciones con fichas exige además 100–180 temas por combinación, pertenencia de cada ficha al temario, cobertura de todos los desempeños del grado, prerrequisitos existentes y sin ciclos, opciones correctas únicas, respuestas aritméticas verificables, dificultades 1–3, pistas distintas y ausencia de tres enunciados con la misma plantilla numérica, ni 6 o más enunciados (o primeras pistas) casi iguales en una ficha (mismo cuerpo con otro contexto: «En el aula / En la mesa…»); tampoco 3 o más primeras pistas con prefijo de contexto («En el aula: …») ni con la forma «Mira los X en el Y»; también detecta posibles datos personales.

## Modelo de datos
No hay migración. Las claves estables se guardan en `plan_anual_temas`, `nudito_sesiones` y `nudito_dominios` como hasta ahora. El contenido del banco vive en JSON versionado.

## Rutas y UI
`/nudito/temario/[id]`: muestra las fichas de la combinación de área, nivel y grado del plan, sin búsqueda obligatoria ni paginación; bloques plegables con el nombre oficial de la competencia y conteo «n de total elegidos» y «Elegir todo el bloque». El filtro se ejecuta en el cliente, sin recarga.

## Errores y casos borde
- Una clave ajena al grado o al área se rechaza en la acción, aunque se envíe manualmente.
- Si un tema no tiene ficha ni generador histórico, se muestra como «Pronto» y la acción de práctica lo rechaza de forma controlada. Una ficha inválida detiene la carga; no se ofrecen ejercicios sin respuesta.
- Los grados sin fichas nuevas mantienen los generadores y el catálogo existentes.

## Pruebas
Unit: `nudito-banco-conocimiento.test.ts`. E2E: `plan-anual-nudito.test.ts` verifica conteo y ancho móvil. Gates: lint, typecheck, test, validador y dos e2e solicitados. Playwright resuelve los subdominios de `lvh.me` a 127.0.0.1 para el entorno local.

## Temarios propuestos (2026-11-09)
Cada tema (y cada ficha) lleva `disciplina` (`src/lib/nudito/conocimiento/disciplinas.ts`): permite cursos propios del colegio como Química o Álgebra (specs/51). El validador exige un valor válido y que la ficha coincida con su tema.

Los 33 temarios existen como `banco/<area>/<nivel>-<grado>/temario-propuesto.json` con su vista legible en `docs/nudito/temario-<mat|com|cyt>-<grado>-<nivel>.md` (resumen por competencia, bloques, cobertura de desempeños, fuentes realmente consultadas y decisiones dudosas para revisión docente). Matemática 1 365 temas, Comunicación 1 139, Ciencia y Tecnología 1 335 (≈ 100–147 por grado; sin relleno). Los temas que el CNEB no nombra literalmente pero traen los textos MINEDU (p. ej. razonamiento verbal, química en 4.° sec., logaritmos en 5.° sec.) están marcados como dudosos en cada `.md`.

Ejercicios de opción múltiple: el orden de las opciones está mezclado (la correcta no es siempre la primera) y las explicaciones nombran la opción por su texto, no por letra (la pantalla no muestra letras). Texto corto del banco: modo `literal` (specs/43).

## Pendientes
- Revisión docente de los 33 temarios (ver «decisiones dudosas» en cada `.md`).
- Escribir las fichas de las 32 combinaciones restantes (≈ 3 700 fichas), grado por grado, con el mismo proceso que Mat. 3.°: lotes por bloque, validador y revisión por muestreo. Mientras una combinación no tenga fichas, el profesor ve el catálogo anterior.
- Revisar pedagógicamente las 129 fichas nuevas de Matemática 3.° tras su validación técnica y mantener su contenido alineado con el temario aprobado.
- Validar pedagógicamente explicaciones, ejercicios, lecturas, pistas y progresión antes de publicar cada combinación.
