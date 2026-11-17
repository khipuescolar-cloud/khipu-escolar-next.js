# 50 — Banco de conocimiento de Nudito

> Estado: 33 temarios propuestos (3839 temas); fichas completas en las 18 combinaciones de primaria y Matemática/Comunicación de 1.° de secundaria · Plan: Khipu Pro · Última actualización: 2026-11-13 (Claude + Codex)

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
- Fichas publicables: `conocimiento/banco/<area>/<nivel>-<grado>/fichas/*.json`. El esquema acepta las tres áreas, primaria 1–6 y secundaria 1–5; verifica coherencia entre clave, grado, competencia y códigos de desempeño. Los campos docentes y los doce ejercicios mínimos siguen siendo obligatorios. Un ejercicio puede llevar `lectura` opcional; la práctica la muestra antes del enunciado. Una ficha puede incluir recursos SVG/diagramas opcionales para el repaso.
- El catálogo combina propuesta, fichas y catálogo histórico sin cambiar las claves; las fichas enriquecen la propuesta, y las claves históricas siguen disponibles.

## Reglas de negocio y contratos
- `temasDeConBanco(area, nivel, grado)` carga la propuesta completa, el catálogo histórico y las fichas perezosamente por combinación; `temaPorClaveConBanco(clave)` conserva la búsqueda de claves históricas y propuestas. Los temas propuestos e históricos siguen en el catálogo aunque no tengan ficha; las fichas aportan contenido de práctica. El cargador usa `fs.readFile` desde `src/` en el servidor. `outputFileTracingIncludes` en `next.config.ts` incluye `src/lib/nudito/conocimiento/banco/**/*.json` en los trazados de todas las rutas del servidor para que Next build y Vercel empaqueten estos archivos; esta opción no agrega los JSON al bundle del cliente.
- El temario muestra todas las entradas de `temario-propuesto.json` y del catálogo histórico de la combinación, filtradas por disciplina del curso; las agrupa por competencia y bloque. Los temas sin ficha ni generador muestran «Práctica en preparación». El filtro es instantáneo y los temas elegidos quedan bloqueados. La acción del servidor valida área, nivel y grado.
- Las fichas usan `mat.banco`, `com.banco` o `cyt.banco` según el área. Los ejercicios y las respuestas quedan en el servidor; solo el enunciado y la lectura opcional se envían al alumno.
- `pnpm nudito:validar-banco` valida **todos** los `temario-propuesto.json` (100–180 temas, claves únicas, cobertura de todos los desempeños del grado, desempeños de la competencia correcta, prerrequisitos sin ciclos) y que ningún nombre de tema se repita entre grados del mismo curso (si un tema vuelve en otro grado, su nombre dice el alcance). En las combinaciones con fichas exige además 100–180 temas por combinación, pertenencia de cada ficha al temario, cobertura de todos los desempeños del grado, prerrequisitos existentes y sin ciclos, opciones correctas únicas, respuestas aritméticas verificables, dificultades 1–3, pistas distintas, opciones de una misma pregunta no idénticas (se compara el texto exacto: mayúsculas y tildes cuentan, porque hay temas de ortografía y mayúsculas) y ausencia de tres enunciados con la misma plantilla numérica, ni 6 o más enunciados (o primeras pistas) casi iguales en una ficha (mismo cuerpo con otro contexto: «En el aula / En la mesa…»); tampoco 3 o más primeras pistas con prefijo de contexto («En el aula: …») ni con la forma «Mira los X en el Y»; también detecta posibles datos personales.

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

## Avance de fichas (2026-11-13)
Fichas completas en las 18 combinaciones de primaria: 1 989 fichas (Matemática 739, Comunicación 620, Ciencia y Tecnología 630). También están completas Matemática 1.° de secundaria (142 fichas) y Comunicación 1.° de secundaria (107 fichas). Proceso: lotes de 12 fichas por escritor, validación por lote, fusión por script y revisión por muestreo del supervisor. Las primeras versiones de Matemática 1.° y 2.° de primaria (hechas con plantilla) se descartaron y reescribieron; el validador ahora rechaza esa firma. La detección de datos personales examina el texto didáctico de la ficha, sin confundir respuestas numéricas de ocho cifras ni sus variantes de escritura con documentos de identidad.

## Regla de orden de trabajo (Carlos, 2026-11-11)
1. **Primaria completa primero** (6 grados × Matemática, Comunicación y Ciencia y Tecnología). Primera reunión con el cliente: lunes 2026-11-16.
2. **Secundaria grado por grado:** terminar 1.° de secundaria en los 3 cursos antes de pasar a 2.°, luego 3.°, 4.° y 5.°.
3. Cada combinación se integra a `dev` solo cuando todas sus fichas validan y se revisó una muestra a mano.
Proceso, herramientas, estado y límites de cuota: `docs/nudito/PROCESO-FICHAS.md` (traspaso para nuevas conversaciones).

## Pendientes
- Revisión manual de las fichas de primaria de Comunicación y Ciencia y Tecnología (aceptadas sin muestreo el 2026-11-12). Avisos de los escritores: dificultad 3 floja o pistas telegráficas en `cyt-p2` (materiales según propiedades), `cyt-p3` (huesos/relieve), `cyt-p4` (tecnología), `cyt-p5` (reproducción vegetativa) y `com-p3` (afiche, poema, historieta); datos científicos sin contrastar con fuentes.
- Revisión docente de los 33 temarios (ver «decisiones dudosas» en cada `.md`).
- Completar Ciencia y Tecnología de 1.° de secundaria antes de pasar a 2.°, y luego las 12 combinaciones restantes, grado por grado, con el mismo proceso que Matemática 3.°: lotes por bloque, validador y revisión por muestreo. Mientras una combinación no tenga fichas, el profesor ve el catálogo anterior.
- Revisar pedagógicamente las 129 fichas nuevas de Matemática 3.° tras su validación técnica y mantener su contenido alineado con el temario aprobado.
- Validar pedagógicamente explicaciones, ejercicios, lecturas, pistas y progresión antes de publicar cada combinación.

## Prueba de clase guiada (2026-11-14)

Planificación para extender la experiencia aprobada a primaria: `docs/nudito/GUIA-REFUERZO-PRIMARIA-MULTIAGENTES.md`. El prompt de arranque está en `docs/nudito/PROMPT-ORQUESTADOR-PRIMARIA.md`. Estos documentos preparan una ejecución futura; no certifican cobertura nueva ni aprobación editorial de los lotes.

Al modificar una ficha piloto ya revisada, su estado puede seguir siendo `revisado` aunque la huella haya vencido. Para ofrecerla al alumno debe coincidir la huella de la revisión con la ficha actual (specs/52 y 54). La selección y publicación del temario por sí solas no actualizan esa revisión. Tras una revisión pedagógica explícita, se debe volver a guardar la huella actual de la ficha aprobada; nunca se deben sincronizar automáticamente las fichas vencidas, porque eso aprobaría cambios sin revisión.

En desarrollo, la huella relee las fichas desde el disco en cada comprobación. Así una edición guardada no se compara con una copia anterior del proceso y no oculta temporalmente el tema. En producción las fichas permanecen en caché, pues solo cambian con un despliegue.
El tema «La tecnología avanza con la ciencia» de Ciencia y Tecnología de 5.° presenta una lección guiada en momentos: idea central con tono escolar y entusiasta, diagrama con descripción, tres momentos por ejemplo, pasos individuales y una pregunta interactiva antes de practicar. Los textos del piloto siguen el patrón «conectar, invitar a pensar, acompañar, cerrar» de specs/41; sus ejercicios preservan enunciados evaluables, pistas progresivas y retroalimentación explicativa. Al terminar los pasos, se muestra directamente la pregunta interactiva y sus alternativas, sin tarjeta de texto duplicada. El modo de reproducción continua revela el texto al ritmo de la voz, avanza automáticamente entre momentos y puede pausarse o reanudarse desde la barra de progreso; los controles manuales, incluido «Anterior» en la comprobación, siguen disponibles. Las frases narradas evitan rótulos con dos puntos y usan pausas de oración naturales. Incluye ilustraciones originales de una lupa y tejido, un microscopio y células, y charqui frente a refrigeradora, con texto alternativo. La narración usa la voz predeterminada disponible en el navegador, sin un selector de voz que no pueda asegurar una alternativa real. La ficha aclara que refrigerar retrasa el crecimiento de muchos microbios pero no los elimina, y que herramientas tecnológicas también permiten nuevos descubrimientos. El control de comprensión de esta prueba es específico de este tema; las demás fichas no cambian su flujo.

## Inventario del refuerzo de primaria (2026-11-14)

El inventario local verificó 1 989 claves únicas con ficha: Matemática 739 (119, 118, 129, 124, 119, 130 por grado), Comunicación 620 (105, 101, 105, 103, 105, 101) y Ciencia y Tecnología 630 (102, 101, 101, 113, 103, 110). Coinciden con los temarios de las 18 combinaciones; esto certifica existencia de fichas, no calidad de clase guiada. La BD local contiene 16 combinaciones con plan publicado y 108 claves seleccionadas únicas; Matemática 3.° y Ciencia y Tecnología 3.° no tienen plan publicado local. Ninguna ficha primaria tiene lección publicada que sustituya su repaso. Al levantar el inventario, las 1 989 huellas curriculares estaban vigentes y las 108 claves seleccionadas pasaban el filtro de plan, estado y huella, sujeto a asignación de alumno y curso. Las fichas modificadas después de ese conteo tienen huella vencida hasta nueva aprobación editorial. El registro por clave y estados separados está en `docs/nudito/estado-refuerzo-primaria.json`.

## Formato `claseGuiada` v1 (2026-11-14)

Campo opcional por ficha y por lección publicada: `version: 1`, `momentos` (ID, tipo, título, narración y `recursoRef` opcional), `recursos` (ID, ruta local bajo `/nudito/`, alt y descripción) y `comprobacion` (pregunta, opciones con ID, respuesta correcta, mensaje correcto y pista). El esquema verifica IDs únicos, referencias existentes y respuesta incluida entre opciones. Las ilustraciones se enlazan por ID, no por posición. Las fichas antiguas siguen cargando sin este campo; en la sesión, una lección publicada tiene prioridad aun si no declara clase guiada.

Las muestras editadas quedan con huella curricular vencida hasta revisión pedagógica y aprobación editorial explícita por clave. El filtro de visibilidad las oculta mientras tanto; las pruebas de integración usan una ficha no modificada para comprobar el flujo sin alterar huellas ni relajar el filtro.

## Muestra editorial: `cyt.p5.la-celula` (2026-11-14)

«La célula, unidad de los seres vivos» tiene una clase guiada completa basada en el patrón aprobado del piloto: once momentos antes de la comprobación, dos ejemplos desarrollados, tres pasos de razonamiento y cuatro ilustraciones generadas vinculadas por ID. La explicación distingue organismos unicelulares y pluricelulares, y evita afirmar que todas las células especializadas se reproducen o viven como organismos independientes. Tras las observaciones de Carlos, cada narración introduce su función con frases naturales («Como idea principal…», «Observemos esta situación…»), sin repetir el título ni leer contadores de partes. La idea principal permanece sola en el primer momento; el mapa celular aparece únicamente en el segundo. Desde el segundo momento, cada explicación tiene apoyo visual resoluble y un pie descriptivo. La voz anuncia el título, explica la imagen relacionada y enumera las tres alternativas reales de la comprobación. Siguiendo el patrón visual del piloto, los SVG esquemáticos se sustituyeron por PNG sin texto ni flechas incrustadas: mapa de célula, levadura, hoja de papa y cóndor; Ana observando levadura; Ana observando una hoja; y gemación de la levadura.

La revisión factual usa el Programa curricular de Primaria, el glosario de células del National Human Genome Research Institute y la introducción de biología celular de NCBI Bookshelf. La versión accesible pasó el validador del banco, typecheck, lint y pruebas unitarias de orientación oral, recursos y ausencia de palabras duplicadas; los cuatro WebP generados responden 200 en el servidor local. Carlos aprobó expresamente esta segunda versión el 2026-11-15. La huella se renovó de forma individual y auditada en la BD local; esta edición no comprende otras fichas ni producción.

El 2026-11-15 se incorporaron cuatro ilustraciones generadas con Antigravity/Gemini para `mapa-seres-vivos`, `levadura`, `hoja` y `procesos-celula`, en formato WebP y sin texto ni flechas incrustadas. Se corrigieron dos formulaciones científicas en la idea central y en la práctica: la hoja se describe como parte de la planta y la piedra se compara por su composición mineral, sin usar «solo los seres vivos tienen células» como regla absoluta. La versión fue aprobada por Carlos y constituye el segundo tema actualizado junto con `cyt.p5.ciencia-y-tecnologia`; su aprobación no autoriza automáticamente los demás temas de primaria.

La continuación autorizada tiene como objetivo terminal mejorar las 1 989 fichas existentes de primaria, no solo las muestras ni las claves de planes publicados. Los lotes se encadenan mientras haya capacidad: esperar una aprobación no impide preparar otros lotes, aunque ninguna huella puede renovarse sin aprobación editorial concreta. Una clave solo cuenta como terminada después de revisión didáctica, factual, visual, auditiva y técnica, registro de estados y, cuando fue aprobada, comprobación de su huella y visibilidad real para el alumno. La selección editable del profesor no prueba esa visibilidad: debe verificarse también la foto publicada del plan y la vigencia de la huella.

OmniRoute puede usarse fuera de la aplicación como respaldo de orquestación para modelos alternativos, sin introducir SDK, claves ni proveedores en Khipu Escolar. Los modelos alternativos pueden preparar borradores o tareas mecánicas, pero no aprueban contenido infantil ni estados editoriales; Codex y la revisión editorial conservan esas responsabilidades.

## Lote publicado de 1.º de primaria — 2026-11-15

El lote `primaria-p1-publicado-lote-01` añade o amplía clases guiadas v1 para diez claves ya elegidas en planes publicados: las cinco prioridades de Matemática de 1.º y tres de Comunicación y dos de Ciencia y Tecnología. Cada clase contiene introducción sin imagen, situación visual, dos ejemplos, pasos de razonamiento, recursos por ID y comprobación. Matemática usa SVG exactos; Comunicación y Ciencia usan WebP generados mediante Antigravity/Gemini e inspeccionados, con un SVG adicional para la clasificación exacta por color.

El banco continúa válido con 2 238 fichas activas y 27 034 ejercicios. Las diez claves tienen huella vencida por la edición y no son visibles al alumno hasta recorrido auditivo/navegador, aprobación editorial expresa y renovación individual. El informe es `docs/nudito/informe-editorial-primaria-p1-lote-01.md`; el registro por clave vive en `docs/nudito/estado-refuerzo-primaria.json`. Las otras cinco prioridades publicadas de 1.º permanecen como siguiente lote exacto; no se declara terminado el grado ni la cobertura de primaria.

La ruta temporal de revisión abre por defecto `com.p1.de-que-tratara`, una clave del lote, y declara el número de recursos visuales distintos del tema. La clase presenta un solo recurso por momento y permite recorrerlos con «Siguiente»; no debe confundirse esta secuencia con la cantidad total de imágenes de la ficha.

Carlos aprobó `com.p1.de-que-tratara` y, después de revisar el resto del selector, las otras nueve claves del lote el 2026-11-16. Las diez huellas se renovaron individualmente en la BD local; para cada clave se verificaron estado revisado, versión publicada 1 del plan correspondiente, fuente efectiva, filtro editorial y alumnos elegibles. La aprobación no alcanza a los borradores ni al resto de primaria.

## Lote publicado de 1.º de primaria 02 — 2026-11-16

Las clases de `com.p1.datos-del-texto`, `com.p1.personajes`, `cyt.p1.objetos-tecnologicos`, `cyt.p1.el-suelo` y `cyt.p1.seres-vivos-necesidades` quedaron escritas con 54 momentos en total. El texto y el esquema validan. Tras descartar un subcomando incorrecto, se recuperó el flujo aprobado de `agy` con el subagente `image-generator`: las diez ilustraciones únicas se solicitaron secuencialmente, se inspeccionaron y se integraron como WebP de 1200 × 896. Las cinco clases forman parte de la vista editorial temporal, pero conservan huella vencida y no cuentan como terminadas hasta recibir aprobación expresa, renovar cada huella autorizada y verificar su visibilidad real. El estado reanudable está en `docs/nudito/informe-editorial-primaria-p1-lote-02.md`.

Carlos aprobó expresamente las cinco claves el 2026-11-16. Sus huellas se renovaron mediante cinco transacciones condicionales y cinco auditorías independientes `curriculum_revision_local_codex`. Después se verificaron la versión publicada 1, el estado `revisado`, la igualdad de huella, el filtro editorial positivo, la fuente efectiva `ficha_banco` y diez alumnos locales elegibles por área. La integración es exclusivamente local y no publica ni despliega en producción.

Desde esta aprobación, Carlos autoriza que los lotes posteriores de refuerzo de primaria se revisen e integren localmente de forma autónoma cuando un agente revisor distinto del autor y el orquestador confirmen todos los criterios pedagógicos, factuales, visuales, orales, accesibles y técnicos. La autonomía no permite sincronizar huellas en masa, omitir evidencia, modificar producción ni desplegar. Cada huella se renueva individualmente después de verificar la clave y se comprueba su visibilidad real; cualquier duda material o bloqueo queda registrado sin fingir terminación.

Durante la revisión del lote 02, la vista temporal abre por defecto `com.p1.datos-del-texto` y limita el selector a las cinco claves del lote. Las demás clases permanecen intactas en el banco y solo se ocultan de este selector editorial. Esta preferencia no publica contenido ni modifica la selección del alumno.

## Lotes 03 a 11 de primaria (Matemática y Comunicación de planes publicados) — 2026-11-16

Claude orquestó, con Codex sin cuota hasta las 5:02, autores y revisores Sonnet. Se escribió `claseGuiada` v1 para 60 claves de 2.º a 6.º que están en planes publicados: 27 de Matemática (lotes 04 a 07) y 33 de Comunicación (lotes 03, 08, 09, 10 y 11). Los lotes 04 y 03 elevaron además borradores de la muestra de 18 combinaciones. Cada clave pasó revisión independiente (otro agente, 1 a 3 rondas) antes de renovar su huella; la huella se renovó clave por clave con `scripts/curriculum/renovar-huellas-locales.ts` (solo BD local, condicional y con auditoría `curriculum_revision_local_claude`).

Los recursos son diagramas SVG como código (`public/nudito/diagramas/{matematica,comunicacion}/`, viewBox 640×480, texto ≥ 26 px) porque la cuota de imágenes de Gemini se agotó. Solo `com.p2.informacion-en-partes` tiene además una ilustración de Gemini. Quedan nueve ilustraciones de Gemini del lote 03 por añadir como recursos extra por id.

Criterios que los revisores aplicaron y que los autores deben cumplir: el recurso de la situación y de los ejemplos guiados no revela la respuesta ni la regla que el ejemplo deduce (SVG «pregunta» con la incógnita oculta); cada `recursoRef` corresponde exactamente a lo narrado; sin aludir a «el dibujo» en momentos sin recurso; letra de la respuesta correcta variada y opciones de longitud pareja; en Comunicación el texto a leer visible; casos de noticias marcados como imaginarios.

Pendiente: recorrido en navegador y audio real (voz de «equis», «la letra n», nombres propios, tildes), ilustraciones de Gemini, 30 SVG del lote 08 sin render independiente, Ciencia y Tecnología de planes publicados (28 claves, necesita Gemini), 5 borradores de Ciencia y Tecnología de la muestra y el resto del banco (≈1 900 claves).

## Ciencia y Tecnología de planes publicados, generador local de imágenes y correcciones de la app — 2026-11-16

- **Lotes 12 a 16** (Ciencia y Tecnología de planes publicados: 2.º y 3.º, 4.º, 5.º en dos partes y 6.º; 33 claves más los 5 borradores de la muestra elevados): `claseGuiada` v1 con recursos que combinan ilustraciones generadas y diagramas SVG. Cada clave pasó revisión independiente (1 o 2 rondas) antes de renovar su huella individual (`scripts/curriculum/renovar-huellas-locales.ts`, solo BD local, auditoría `curriculum_revision_local_claude`). La ilustración se usa para escenas, seres vivos y fenómenos cotidianos; los esquemas con partes (célula, partículas, capas) se hacen en SVG porque los modelos de imagen no las dibujan con exactitud.
- **Ilustraciones del lote 03 de Comunicación:** las 9 pendientes se generaron con el generador local e integraron como recursos extra (momento `recurso` nuevo por imagen). Dos se rehicieron por la revisión visual (huerto escolar; chasqui como varón).
- **Generador local de imágenes (herramienta de producción de contenido, no parte de la aplicación):** ComfyUI + Z-Image Turbo (Alibaba, Apache-2.0) cuantizado GGUF Q5_K_S, codificador de texto Qwen3-4B fp8 y VAE `ae`, instalados en `~/comfyui-khipu` (fuera del repositorio; servidor solo en `127.0.0.1:8188`; script `gen.py`: una imagen por llamada, 1200 × 896 WebP, estilo escolar cálido sin texto). Se usa de una imagen a la vez y cada imagen se inspecciona antes de integrarla; los archivos se nombran `<id>-zimage-v1.webp`. Procedencia y semilla de cada una están en el informe de su lote.
- **Correcciones de la app** (QA de navegador, `docs/nudito/qa-navegador-*.md`): en modo hijo la acción `elegirCurso`/`elegirTema` devolvía 403 porque `temasPublicadosDelAlumno` exigía rol de profesor, dirección o alumno; ahora, solo si `acceso.modo === "hijo"` (calculado por el servidor tras comprobar que el hijo es del apoderado, sin cuenta propia y con consentimiento vigente), exige únicamente la función `nudito_plus` y mantiene `requireAlumnoVisible`. La narración se parte con `partirEnFrases` (no corta tras numeración, «p. m.», «S/.», decimales ni comillas de cierre); el título que termina en «?» ya no recibe un punto; el mensaje de acierto quita una apertura repetida («Correcto.», «Muy bien.») porque la pantalla ya antepone «¡Correcto!» (`sinAperturaRedundante`). Pruebas en `tests/unit/nudito-clase-guiada.test.ts` y `tests/integracion/temario-nudito.test.ts`.
- **Datos de prueba:** `scripts/nudito-consentimiento-prueba.ts` siembra (solo BD local) el consentimiento de IA de unas familias demo para poder probar 1.º, 2.º, 4.º y 6.º. Los alumnos de 1.º a 4.º no tienen cuenta propia en el colegio demo (`gradoMinimoCuentaAlumno: 5`): se prueban desde el apoderado en modo hijo (`/nudito?alumno=<id>`).
- **Pendiente:** audio real y recorrido completo de las clases (QA automatizado solo espía el texto de la voz), unos 1 880 temas fuera de planes publicados, observaciones de contenido del QA (imágenes repetidas en varios momentos de una clase, posible sesgo de posición de la respuesta en dos claves de 1.º y 2.º), revisión humana de las ilustraciones del generador local por coherencia de estilo con las de Gemini.

### Lotes 17 a 25 (2026-11-16, sesión de la mañana): 51 claves más

- **Alcance:** lotes 17–20 y 22–25 de Matemática (una clave por grado de 1.º a 6.º, solo SVG como código en `public/nudito/diagramas/matematica/`) y lote 21 de Ciencia y Tecnología 2.º (12 ilustraciones Z-Image locales). Solo cambia `claseGuiada` (formato v1), salvo ediciones puntuales de errores factuales autorizadas y documentadas en los informes: ficha `armar-figuras` 2.º (`ejemplos[0].desarrollo`, e06 y su pista 3), e08 de `mat.p5.barras-desde-tabla`, e06 de `mat.p4.barras-escala-10`, e01/e04 de `mat.p5.clases-de-angulos`, `erroresFrecuentes[0]` de `mat.p5.comparar-ordenar-decimales`, e12 de animales diurnos/nocturnos y e05 de agua dulce/salada (CyT 2.º).
- **Proceso:** autor Sonnet por lote → revisor independiente distinto (1.ª ronda) → correcciones → 2.ª ronda → huella renovada por clave con `scripts/curriculum/renovar-huellas-locales.ts`. Informes: `docs/nudito/informe-editorial-primaria-lote-17..25.md`, revisiones `docs/nudito/revision-lote-17..25.md`. Ninguna clave se renovó sin aprobación independiente; ninguna edición posterior a la huella (las huellas se verificaron `(ya vigente)` tras reescrituras de los autores).
- **Estado:** 161 claves terminadas con huella vigente (110 + 51); ninguna de estas 51 está en un plan publicado (`visibilidadAlumno: no_fuera_de_plan_publicado_huella_vigente`). Quedan 1 828 en `existente_sin_refuerzo` (Matemática 660, Comunicación 582, Ciencia y Tecnología 586).
- **Defectos recurrentes de revisión (ya en las instrucciones de los autores):** opciones de longitud dispar o respuesta correcta la más larga; pistas que entregan la operación; imágenes de situación con valor o regla revelados; alt/descripción que no coinciden con el dibujo; contraste del ámbar `#C98F1E` (texto informativo debe ser `#8A5A00`, 5,24:1); letras sueltas leídas como palabras por la voz.
- **Pendientes menores registrados:** `mat.p4.barras-escala-10` `paso-3` dice «Así quedó el gráfico de los juegos» sin imagen; `calendario-mes-completo.svg` título y ecuación algo pegados; ejercicios existentes sin editar (no bloquean): `mat.p4.cancelativa-igualdad` e07 de enunciado confuso, `mat.p2.caras-y-puntas` e12 pista 2 poco clara, título «hasta 20» de `mat.p3.colecciones-equivalentes` con e11 que suma 27; audio real sin comprobar.

### Lotes 26 a 45 (2026-11-16, tarde)

- **Alcance (según `docs/nudito/estado-refuerzo-primaria.json`, 118 claves):** Matemática de 1.º a 6.º con SVG como código (94 claves: lotes 26–33 y 38–45); Ciencia y Tecnología de 3.º–4.º (lote 34, 6 claves) y 5.º–6.º (lote 35, 6 claves: 3 de 5.º y 3 de 6.º) con ilustraciones Z-Image local y Gemini `agy` según el informe de cada lote; Comunicación de 1.º–3.º (lotes 36–37, 12 claves) con ilustraciones Z-Image local y Gemini `agy`. No hay claves de Ciencia y Tecnología de 2.º en este rango.
- **Proceso:** autor Sonnet → revisor independiente distinto del autor → correcciones → segunda ronda acotada a los defectos de la primera → huella renovada clave a clave con `scripts/curriculum/renovar-huellas-locales.ts` (solo BD local, condicional, con auditoría). Ninguna huella se sincronizó en masa. Informes: `docs/nudito/informe-editorial-primaria-lote-26..45.md`; revisiones: `docs/nudito/revision-lote-26..45.md`.
- **Estado tras esta tanda (recuentos de `estado-refuerzo-primaria.json`):**
  - Claves con `escritura` `clase_guiada_v1_integrada`: 267 (149 antes, +118); con `validacionTecnica` aprobada y huella vigente: 279 en total, sumando `clase_guiada_v1_completa` (10), `clase_guiada_piloto_aprobada` (1) y `clase_guiada_v4_imagenes_generadas_completa` (1).
  - Pendientes `existente_sin_refuerzo`: 1 710 de 1 989 fichas (Ciencia y Tecnología 574, Comunicación 570, Matemática 566).
  - Las 169 claves de los lotes 17–45 tienen `visibilidadAlumno: no_fuera_de_plan_publicado_huella_vigente`; ninguna está en plan publicado, así que no cambia lo que ve el alumno.
  - Validación del banco tras los lotes: `pnpm nudito:validar-banco` válido (2 238 fichas, 27 034 ejercicios) y `pnpm typecheck` sin errores.
- **Ediciones puntuales de ejercicios existentes** (id, dificultad y respuesta correcta se conservan salvo donde se indica; detalle en los `## Correcciones` de cada informe):
  - Lote 26: `mat.p2` e08 (pista 2 reescrita) y e03 (distractores alargados).
  - Lote 29: `mat.p2.comparar-datos` e01, e05 y e06 (el gráfico ASCII pasa a datos escritos, mismas respuestas) y `mat.p4.completar-la-unidad` (acepta 1/3, 1/4 y 2/5 como equivalentes).
  - Lote 34: `cyt.p3.actividades-segun-la-epoca` e10 («Puno/septiembre» → «Cusco/octubre»); `cyt.p3.agrupar-seres-vivos` e02 (respuesta principal «pasan tiempo en el agua») y e05; `cyt.p3.ajustes-para-mejorar` e07 y e10.
  - Lote 35: `cyt.p5.agua-dulce-salada` e10 (enunciado y pistas sobre glaciares) y `cyt.p6.alimentos-transgenicos` e06 (sin el año de la moratoria).
  - Lote 37: `com.p3.adjetivaciones-al-leer` e07 y e12 («por la noticia» → «al ver a su nieto») y `ejemplos[2].respuesta`; `com.p3.adjetivaciones-para-caracterizar` e10 (pista 3).
  - Lote 38: `mat.p3` e04 (opción a «046» → «506») y `mat.p6` e11 (retroalimentación sobre el largo de 7 m).
  - Lote 40: corrección de `erroresFrecuentes[0]` de `mat.p2` (30 y 100 decenas) y e08 de la ficha de votos.
  - Lote 41: `mat.p1.contar-hacia-atras` e01, e04 y e09 (singular, pista 2, retroalimentación) y `mat.p6.construir-triangulos-cuadrilateros` e11 (opciones de longitud).
  - Lote 42: `mat.p1.contar-hasta-50` e12 (pista 3).
  - Lote 45: `mat.p2` e07 cambia la respuesta de «jueves» a «viernes» (martes 12 más 3 días); es la única respuesta cambiada de la tanda.
  - Nota: varias ediciones son de claridad, no de error factual. Conviene confirmar que todas caen dentro de la autorización de «error factual» del brief.
- **Pendientes menores** (de `docs/nudito/revision-lote-26..45.md`, no bloquean salvo lo indicado):
  - Lote 26: e06 («5.° escalón») y e09 (símbolos ★ ● ▲) se leerán mal en audio.
  - Lote 27: `<title>` internos de `calculo-mental-descomposicion` con números largos; descripciones de `bibliotecas-*` y `alcancias-*` con «UM, C, D y U» (letras sueltas para la voz); e04 casi gemelo de la comprobación.
  - Lote 28: piezas de 1 y 3 no a escala (rotuladas, no engañan); e05 con enunciado forzado.
  - Lote 33: `situacion` adelanta el primer paso («a ocho le faltan dos»); en el contraejemplo, el total 15 también sirve.
  - Lote 34: mancha bajo el pato en `agrupar-estanque-cuatro` y aleta de la ballena descrita «bajo el agua» (se ve junto al agua); el recurso `absorcion-pared-solucion` debía trasladar los puntos y no duplicarlos (Correcciones dice corregido; comprobar).
  - Lote 35: `limon` con parche rosado sobre el borde del vaso; la comprobación introduce «mar/acantilado» que no aparece en la tabla.
  - Lote 37: `ejemplo-1-razona` dice «gris y gordito» pero la descripción de `gato-ill` no menciona «gordito».
  - Lote 39: e01 de `mat.p3.comparar-capacidades`: la opción correcta (62) es mucho más larga que las demás (41–45); la revisión deja la decisión al orquestador.
  - Lote 40: `comprobacion.pregunta` lee una lista de nueve palabras al oído; `ejemplo-2-razona` y `paso-3` explican 370 cm con métodos distintos.
- **Limitación de Codex:** el sandbox de Codex falló con `bwrap: setting up uid map: Permission denied`. AppArmor restringe los user namespaces sin privilegios. El arreglo sería `sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0`, pero requiere decisión de Carlos; no se saltó el sandbox. Mientras tanto, los autores y revisores de esta tanda son Sonnet.

## Lint mecánico de clase guiada

- `pnpm exec tsx scripts/nudito-lint-clase-guiada.ts <clave...>` o `--lote-json <archivo.json>` (arreglo de claves o mapa lote→claves). Carga las fichas de `src/lib/nudito/conocimiento/banco/**/fichas`.
- Imprime una línea por hallazgo (`E` error, `A` aviso, `i` informativo) con clave, id de momento/recurso y regla; luego la tabla clave→letra correcta (para auditar que no se repita en lotes consecutivos), el conteo por regla y «N errores, M avisos». Código de salida 1 si hay errores.
- Estructura: 10 momentos (aviso), primer momento sin recurso, `recursoRef` existentes, recursos usados, `src` existentes en `public/`; alt ≤200, descripción ≤500 (aviso >300).
- Narración y título: sin dígitos (se admite el rótulo «Ejemplo N»/«Paso N»), sin «parte N de M», título no repetido literal, sin «dibujo/imagen/tarjeta…» en momentos sin recurso, aviso por letras sueltas usadas como variable (c, p, n, m, x).
- Comprobación: respuesta única, ≥3 opciones con ids a–d, diferencia de longitud ≤3 (aviso 4–5, error >5), correcta no más larga por >3, pista sin la respuesta literal.
- SVG: viewBox 640×480, `<title>`, sin espacios en `<tspan>`, `font-size` ≥26, contraste ≥4,5 contra #FCF0D6 (≥3 si ≥24 px negrita; rellenos más claros que el fondo se omiten), texto a ≥12 px del borde (ancho estimado 0,55·tamaño) y avisa de #C98F1E/#0F7C7A (usar #8A5A00/#0C706E).
- Ficha (informativo): ejercicios cuya correcta es la más larga por >8 caracteres.
- Prueba: `tests/unit/nudito-lint-clase-guiada.test.ts` (fixtures propios, no toca el banco).

## Lotes 46 a 57 (2026-11-16, noche)

- **Alcance:** 53 claves de primaria. Matemática con SVG (todas). Comunicación de 1.º a 3.º y Ciencia y Tecnología de 3.º a 6.º con ilustraciones Z-Image local (ComfyUI). Gemini agotó su cuota durante la tanda.
- **Quién hizo qué:** Codex hizo los lotes 51 y 52 y parte de los lotes 50 y 53, y se detuvo por el límite de uso de la cuenta ChatGPT (7 de 8 procesos). Sonnet completó el resto.
- **Proceso:** autor → revisor independiente con lint mecánico (`scripts/nudito-lint-clase-guiada.ts`) → correcciones del autor → segunda ronda acotada a los defectos de la primera → huella renovada clave a clave con `scripts/curriculum/renovar-huellas-locales.ts`.
- **Incidente de orden:** `mat.p4.justificar-comparaciones` (lote 57) recibió huella renovada antes de su revisión por error del orquestador. Después fue revisada, corregida y aprobada. La huella final es la de la versión aprobada. Regla reforzada: renovar solo tras la aprobación.
- **Recuentos reales (`docs/nudito/estado-refuerzo-primaria.json`, tras la tanda):**
  - `clase_guiada_v1_integrada`: 320 (267 antes, +53). Terminadas en total: 332 (320 + `clase_guiada_v1_completa` 10 + `clase_guiada_piloto_aprobada` 1 + `clase_guiada_v4_imagenes_generadas_completa` 1).
  - Pendientes `existente_sin_refuerzo`: 1 657 de 1 989 fichas (Ciencia y Tecnología 568, Comunicación 564, Matemática 525).
  - Las 53 claves quedan con `visibilidadAlumno: no_fuera_de_plan_publicado_huella_vigente`, `huellaVigente: si` y `siguienteAccion: verificar_audio_y_recorrido_navegador`. Ninguna está en plan publicado, así que no cambia lo que ve el alumno.
  - Validación: `nudito:validar-banco` válido (2 238 fichas, 27 034 ejercicios); lint de las claves con 0 errores; `tsc --noEmit` sin errores.
- **Ediciones de ejercicios por error factual** (de los `## Correcciones` de `docs/nudito/informe-editorial-primaria-lote-46..57.md`; id, dificultad y respuesta intactos en todas):
  - Lote 47: `mat.p1.contar-hasta-10` e01–e12 (enunciado con una marca por objeto, pistas y retroalimentación); `mat.p4.desplazamientos-cuadricula` e07, e09, e11 y e12 (convención «(columna, fila)» explícita; e07 fija «3 abajo»).
  - Lote 48: `com.p1.agrupar-palabras` e01, e07 y e12 (el enunciado o la pista entregaban la respuesta; retroalimentación «Piña» y «Llama»); `com.p2.antonimos` e04 (opción d «tapar poco» → «pintar»); `com.p1.como-son-lugares-y-objetos` e12 (opción c corregida).
  - Lote 49: `cyt.p3.alimentos-procesados` e10 (quitadas del enunciado las opciones «azúcar o fibra», que entregaban la respuesta); `cyt.p6.areas-naturales-protegidas` e03 y e11 («ha» → «hectáreas»); `cyt.p6.antenas-de-telefonia` e03 (retroalimentación).
  - Lote 50: `mat.p1.explicar-como-crece` e10 (opciones 30/27/27, la correcta ya no es la más larga); `mat.p6.desigualdades-signos` e06 (retroalimentación «Es falso: 7 no es menor que 7», la anterior era confusa).
  - Lote 53: `mat.p2.posible-imposible` e01 (opciones 28/27/29, pista y retroalimentación); `mat.p5.justificar-resolucion` e09, e10 y e12 (solo opciones, longitudes parejas).
  - Lote 54: `mat.p6.medir-construir-angulos` e09 (retroalimentación: «30° es complementaria» → «30° es la lectura de la escala contraria»; error conceptual).
  - Lote 55: `mat.p6.patrones-aditivos` e10 (enunciado de la sucesión 4, 7, 10, __ con salto de 3).
  - Lote 57: `mat.p4.justificar-comparaciones` e05 (opciones 32/30/30, la correcta b ya no es la más larga); `mat.p5.problemas-proporcionalidad` e11 (pista 3).
- **Pendientes menores** (de `docs/nudito/revision-lote-46..57.md`; ninguno bloquea; no todos se reverificaron tras la segunda ronda):
  - Lote 46: descripción de `material-resuelto` de 302 caracteres (aviso de longitud) y figura trapezoidal de `errores` sin comentario sobre sus ángulos.
  - Lote 47: en Matemática 5.º, e09 y e11 usan siglos solo en romanos, que la voz puede leer mal; pistas de p1 con «(lápiz, la biblioteca)» que suenan a plantilla; «cuatrocientos ochenta y tres» y «cuatrocientos treinta y ocho» son difíciles de distinguir de oído en `ejemplo-1-guiado`, que no tiene recurso.
  - Lote 48: la niña y el hombre de la imagen `musica` no se mencionan en el texto (aceptable).
  - Lote 49: `despensa` más pictórica que el resto; «tres crías de distintos años» es opcional.
  - Lote 51: `mat.p2.explicar-patron-aditivo` e10 con longitudes de 22 a 26 caracteres (decisión del orquestador, no bloquea); el 3.er salto (+1) de `error-salto` queda sin cruz (aceptado).
  - Lote 52: el contraejemplo de `errores` no muestra un grupo compacto de comparación; en la narración «kilos» aparece sin «no masa» previo.
  - Lote 53: el total 144 se repite en la situación y en el ejemplo 1; `combis-pregunta` muestra 2 combis para 138 estudiantes; rótulos escalonados en `media-reparto-ventas-pregunta`; e05 con opciones de 9, 8 y 12 caracteres.
  - Lote 54: `mat.p4.encuestas-entrevistas` e03, pista 2 entrega la respuesta (ejercicio existente, no autorizado a editar).
  - Lote 57: `mat.p4.justificar-comparaciones` e01 y e09, redacción menor (e01 pregunta «¿Quién tiene más?» con opciones numéricas); no autorizado a editar.
- **Pendiente de la tanda completa:** audio real y recorrido de navegador de las 53 claves (`verificar_audio_y_recorrido_navegador`).
