# 50 — Banco de conocimiento de Nudito

> Estado: piloto técnico pendiente de revisión pedagógica · Plan: Khipu Pro · Última actualización: 2026-11-09 (Codex)

## Objetivo
Ofrecer al profesor todos los temas del grado y curso para elegir el temario, y dar a Nudito contenido y ejercicios verificables para enseñar sin LLM. Este piloto cubre Matemática de 3.° de primaria; no autoriza aún el escalado automático a otros grados.

## Fuentes
- [Programa curricular de Educación Primaria, MINEDU (2016)](https://repositorio.minedu.gob.pe/handle/20.500.12799/4549): competencias 23–26, capacidades y desempeños de tercer grado. Los textos fieles y códigos estables se guardan en `conocimiento/cneb/matematica.json`; se contrastaron con `src/lib/cneb/matematica.json`.
- [Cuaderno de trabajo Matemática 3, MINEDU](https://repositorio.minedu.gob.pe/handle/20.500.12799/7863): referencia para situaciones de práctica de las cuatro competencias.
- [Programa curricular de Educación Secundaria, MINEDU](https://repositorio.minedu.gob.pe/handle/20.500.12799/4550): fuente localizada para el escalado; no se incorporó en este piloto.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Profesor del grupo | Ver catálogo y escoger temas | Publicar sin aceptación del resto |
| Dirección | Ver el temario y catálogo | Editar o aceptar |
| Alumno | Practicar temas de la última versión aceptada | Elegir temas fuera del plan |

## Desglose y esquema
Una ficha de `conocimiento/banco/matematica/primaria-3/*.json` corresponde a una práctica seleccionable. Se desglosan desempeños en operaciones, contextos, lectura de representaciones y comprobación. El nombre de la ficha es una propuesta didáctica; el MINEDU publica desempeños, no una lista de 239 temas. `esquemaFicha` exige identidad, vínculo curricular, bloque, prerrequisitos, idea central, pasos, dos ejemplos, errores y correcciones, vocabulario, 12 ejercicios con respuesta y tres pistas, fuentes, versión y `revisado: null`.

| Competencia | Fichas |
|---|---:|
| 23 Cantidad | 100 |
| 24 Regularidad, equivalencia y cambio | 50 |
| 25 Gestión de datos e incertidumbre | 40 |
| 26 Forma, movimiento y localización | 49 |
| **Total** | **239** |

Las siete claves de Matemática 3.° existentes se conservan. La ficha histórica `mat.p3.fracciones-parte-todo` es una transición desde reparto en partes iguales; la mención explícita de fracciones no aparece en los desempeños de cantidad de tercer grado, por lo que requiere decisión docente antes de publicación institucional.

## Reglas de negocio y contratos
- El banco se importa solo en servidor mediante `temasDeConBanco(area, nivel, grado)` y `temaPorClaveConBanco(clave)`. Se carga por primera vez al pedir Matemática de primaria 3.° y se memoriza por proceso. Para otros grados y áreas se usa el catálogo existente.
- El temario muestra el catálogo entero de entrada, agrupado por competencia y bloque, con filtro instantáneo opcional. Los elegidos quedan bloqueados. El servidor valida área, nivel, grado y máximo de 300 claves por envío.
- El identificador `mat.banco` corresponde solo a las fichas globales; los temas propios del colegio no pueden declararlo como fuente.
- `ejercicioDelBanco` selecciona ejercicios deterministas por semilla y evita repetir un ítem mientras haya otros del nivel de dificultad. Las respuestas quedan en el servidor. El evaluador existente normaliza números y texto flexible.
- Cuando no hay lección publicada, `pedirRepaso` usa la ficha del banco. La lección publicada tiene prioridad.
- `pnpm nudito:validar-banco` valida esquema, claves y nombres únicos, desempeño, prerrequisitos sin ciclos, transcripción CNEB, 12 ejercicios, operaciones recalculadas, opciones, verdadero/falso y patrones de datos personales. El mismo validador corre en test unitario.

## Modelo de datos
No hay migración. Las claves estables se guardan en `plan_anual_temas`, `nudito_sesiones` y `nudito_dominios` como hasta ahora. El contenido del banco vive en JSON versionado.

## Rutas y UI
`/nudito/temario/[id]`: 239 temas de Matemática 3.° sin búsqueda ni paginación; bloques plegables con conteo «elegidos / total» y «Elegir todo el bloque». El filtro se ejecuta en el cliente, sin recarga.

## Errores y casos borde
- Una clave ajena al grado o al área se rechaza en la acción, aunque se envíe manualmente.
- Si faltan fichas o falla el esquema, la carga del banco falla de forma visible; no se ofrecen ejercicios sin respuesta.
- Los otros grados mantienen los generadores y el catálogo existentes.

## Pruebas
Unit: `nudito-banco-conocimiento.test.ts`. E2E: `plan-anual-nudito.test.ts` verifica conteo y ancho móvil. Gates: lint, typecheck, test, validador y dos e2e solicitados.

## Pendientes
- Revisión docente ficha por ficha: precisión curricular, progresión, variedad real y calidad de distractores. Las 239 fichas son un borrador técnico y varias prácticas de cálculo comparten una misma destreza; el número no certifica 239 aprendizajes independientes.
- Profundizar las prácticas de simetría, ubicación, capacidad, comparación de superficie, encuesta y probabilidad. El piloto ya incluye ejemplos de esos contenidos, pero aún no cubre toda su profundidad en el CNEB.
- Validar prerrequisitos transitivos y ampliar la variación de ejercicios para sesiones repetidas; cada ficha tiene 12 ítems.
- Escalar solo tras revisión: 3 áreas × (6 grados de primaria + 5 de secundaria) = 33 combinaciones. A 200–300 temas por combinación serían 6 600–9 900 fichas. Extraer primero desempeños oficiales de Comunicación, Ciencia y Tecnología y secundaria; crear fichas y revisión docente por grado. El PDF de secundaria del repositorio MINEDU tiene capa de texto y es la fuente candidata.
