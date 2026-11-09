# 50 — Banco de conocimiento de Nudito

> Estado: infraestructura generalizada para 33 combinaciones; contenidos en elaboración · Plan: Khipu Pro · Última actualización: 2026-11-09 (Codex)

## Objetivo
Ofrecer al profesor todos los temas del grado y curso para elegir el temario, y dar a Nudito contenido y ejercicios verificables para enseñar sin LLM. La infraestructura cubre Matemática, Comunicación y Ciencia y Tecnología de 1.° a 6.° de primaria y 1.° a 5.° de secundaria (33 combinaciones). Cada temario y sus fichas requieren elaboración y revisión por separado.

## Fuentes
- [Programa curricular de Educación Primaria, MINEDU (2016)](https://repositorio.minedu.gob.pe/handle/20.500.12799/4549): competencias 23–26, capacidades y desempeños de tercer grado. Los textos fieles y códigos estables se guardan en `conocimiento/cneb/matematica.json`; se contrastaron con `src/lib/cneb/matematica.json`.
- [Cuaderno de trabajo Matemática 3, MINEDU](https://repositorio.minedu.gob.pe/handle/20.500.12799/7863): referencia para situaciones de práctica de las cuatro competencias.
- [Programa curricular de Educación Secundaria, MINEDU](https://repositorio.minedu.gob.pe/handle/20.500.12799/4550): fuente localizada para el escalado; se incorporan los desempeños ya transcritos en `src/lib/cneb/*.json`, sin OCR adicional.

## Propuesta curricular de Matemática 3.° de primaria
La revisión del supervisor rechazó las 239 fichas anteriores por repetición de habilidades y vacíos curriculares. El dueño aprobó el [temario de 129 temas](../docs/nudito/temario-mat-3-primaria.md) y su [JSON estructurado](../src/lib/nudito/conocimiento/banco/matematica/primaria-3/temario-propuesto.json). Las 129 fichas nuevas viven en `primaria-3/fichas/`; los JSON anteriores fueron retirados. El validador y el cargador leen únicamente `fichas/*.json`; un temario sin fichas no se publica.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Profesor del grupo | Ver catálogo y escoger temas | Publicar sin aceptación del resto |
| Dirección | Ver el temario y catálogo | Editar o aceptar |
| Alumno | Practicar temas de la última versión aceptada | Elegir temas fuera del plan |

## Estructura, códigos y esquema
- Desempeños oficiales: `conocimiento/cneb/<area>.json` para las tres áreas. Cada competencia conserva capacidades y desempeños de primaria y añade `secundaria`. Los códigos son `<MAT|COM|CYT>-C<número>-<P|S><grado>-<índice de dos dígitos>`; la numeración de Matemática primaria permanece estable.
- Temarios: `conocimiento/banco/<area>/<nivel>-<grado>/temario-propuesto.json`. Cada tema tiene clave, competencia, capacidad, bloque, desempeño de origen, prerrequisitos y orden anual.
- Fichas publicables: `conocimiento/banco/<area>/<nivel>-<grado>/fichas/*.json`. El esquema acepta las tres áreas, primaria 1–6 y secundaria 1–5; verifica coherencia entre clave, grado, competencia y códigos de desempeño. Los campos docentes y los doce ejercicios mínimos siguen siendo obligatorios. Un ejercicio puede llevar `lectura` opcional; la práctica la muestra antes del enunciado.
- No existe respaldo a archivos de fichas heredados: al faltar `fichas/` de una combinación, el catálogo existente de esa área y grado sigue disponible. Matemática 3.° usa exclusivamente las 129 fichas nuevas.

## Reglas de negocio y contratos
- `temasDeConBanco(area, nivel, grado)` y `temaPorClaveConBanco(clave)` cargan fichas perezosamente en el servidor por combinación. Si una combinación no tiene fichas, se conserva el catálogo actual. Un tema de un temario propuesto sin ficha no entra en el catálogo. El cargador usa `fs.readFile` desde `src/` en el servidor. `outputFileTracingIncludes` en `next.config.ts` incluye `src/lib/nudito/conocimiento/banco/**/*.json` en los trazados de todas las rutas del servidor para que Next build y Vercel empaqueten estos archivos; esta opción no agrega los JSON al bundle del cliente.
- El temario muestra todos los temas disponibles de la combinación, agrupados por competencia y bloque, con filtro instantáneo opcional; los elegidos quedan bloqueados. La acción del servidor valida área, nivel y grado.
- Las fichas usan `mat.banco`, `com.banco` o `cyt.banco` según el área. Los ejercicios y las respuestas quedan en el servidor; solo el enunciado y la lectura opcional se envían al alumno.
- `pnpm nudito:validar-banco` recorre las combinaciones con fichas nuevas. Exige 100–180 temas por combinación, pertenencia de cada ficha al temario, cobertura de todos los desempeños del grado, prerrequisitos existentes y sin ciclos, opciones correctas únicas, respuestas aritméticas verificables, dificultades 1–3, pistas distintas y ausencia de tres enunciados con la misma plantilla numérica; también detecta posibles datos personales.

## Modelo de datos
No hay migración. Las claves estables se guardan en `plan_anual_temas`, `nudito_sesiones` y `nudito_dominios` como hasta ahora. El contenido del banco vive en JSON versionado.

## Rutas y UI
`/nudito/temario/[id]`: muestra las fichas de la combinación de área, nivel y grado del plan, sin búsqueda obligatoria ni paginación; bloques plegables con conteo «elegidos / total» y «Elegir todo el bloque». El filtro se ejecuta en el cliente, sin recarga.

## Errores y casos borde
- Una clave ajena al grado o al área se rechaza en la acción, aunque se envíe manualmente.
- Si una combinación no tiene fichas, usa el catálogo anterior. Si existe una ficha inválida, la carga falla de forma visible; no se ofrecen ejercicios sin respuesta.
- Los grados sin fichas nuevas mantienen los generadores y el catálogo existentes.

## Pruebas
Unit: `nudito-banco-conocimiento.test.ts`. E2E: `plan-anual-nudito.test.ts` verifica conteo y ancho móvil. Gates: lint, typecheck, test, validador y dos e2e solicitados. Playwright resuelve los subdominios de `lvh.me` a 127.0.0.1 para el entorno local.

## Pendientes
- Completar y revisar los temarios y fichas de las 33 combinaciones. La infraestructura no convierte un temario propuesto en contenido publicable.
- Revisar pedagógicamente las 129 fichas nuevas de Matemática 3.° tras su validación técnica y mantener su contenido alineado con el temario aprobado.
- Validar pedagógicamente explicaciones, ejercicios, lecturas, pistas y progresión antes de publicar cada combinación.
