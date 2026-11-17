# Muestra propuesta de refuerzo de primaria

Fecha: 2026-11-14. Estado: selección y lectura preliminar; **ninguna ficha nueva de esta muestra está escrita, revisada pedagógicamente ni aprobada editorialmente**. La selección usa `estado-refuerzo-primaria.json` y prioriza claves de planes publicados en la BD local. En Matemática y Ciencia y Tecnología de 3.º no había claves seleccionadas al inventariar; se eligió una ficha existente del banco.

| Área | Grado | Clave | Archivo en `src/lib/nudito/conocimiento/banco/` | Plan publicado | Patrón didáctico a probar |
|---|---:|---|---|---|---|
| Matemática | 1 | `mat.p1.suma-hasta-20` | `matematica/primaria-1/fichas/adicion-y-sustraccion-hasta-20.json` | Sí | Objetos contables, recta numérica y completar diez; narrar cada salto. |
| Matemática | 2 | `mat.p2.patrones-aditivos` | `matematica/primaria-2/fichas/patrones-aditivos.json` | Sí | Serie visible y sonora; explicar qué cambia y comprobar la regla. |
| Matemática | 3 | `mat.p3.grupos-iguales` | `matematica/primaria-3/fichas/c23-multiplicacion-division.json` | Sin selección local | Dibujar grupos iguales; leer la suma repetida y pedir justificación. |
| Matemática | 4 | `mat.p4.fracciones-equivalentes` | `matematica/primaria-4/fichas/c23-fracciones-comprension.json` | Sí | Comparar tiras de igual unidad superpuestas, con particiones diferentes. |
| Matemática | 5 | `mat.p5.numeros-decimales` | `matematica/primaria-5/fichas/numeros-decimales.json` | Sí | Barra en décimos; narrar la coma y la relación entre una parte y 0,1. |
| Matemática | 6 | `mat.p6.porcentajes` | `matematica/primaria-6/fichas/porcentajes.json` | Sí | Cuadrícula de cien y porcentajes usuales de una cantidad; explicar la base. |
| Comunicación | 1 | `com.p1.datos-del-texto` | `comunicacion/primaria-1/fichas/ubicar-informacion.json` | Sí | Leer un texto breve y señalar quién, qué y dónde sin sustituir lectura por escucha. |
| Comunicación | 2 | `com.p2.informacion-en-partes` | `comunicacion/primaria-2/fichas/ubicar-informacion.json` | Sí | Texto en tres tramos; localizar un dato y volver al fragmento pertinente. |
| Comunicación | 3 | `com.p3.informacion-explicita` | `comunicacion/primaria-3/fichas/ubicar-informacion.json` | Sí | Resaltar evidencia textual que sustenta una respuesta literal. |
| Comunicación | 4 | `com.p4.causa-y-efecto` | `comunicacion/primaria-4/fichas/inferencias.json` | Sí | Narrar el relato y mostrar relaciones causa → efecto con evidencia. |
| Comunicación | 5 | `com.p5.idea-principal` | `comunicacion/primaria-5/fichas/sentido-global.json` | Sí | Comparar idea principal con detalles; añadir un caso sin idea inicial explícita. |
| Comunicación | 6 | `com.p6.proposito-y-punto-de-vista` | `comunicacion/primaria-6/fichas/sentido-global.json` | Sí | Separar propósito del autor de su punto de vista y citar palabras del texto. |
| Ciencia y Tecnología | 1 | `cyt.p1.objetos-tecnologicos` | `ciencia-tecnologia/primaria-1/fichas/objetos-tecnologicos.json` | Sí | Objeto → necesidad → función, con ilustraciones del objeto y su uso. |
| Ciencia y Tecnología | 2 | `cyt.p2.dia-y-noche` | `ciencia-tecnologia/primaria-2/fichas/el-dia-la-noche-y-los-seres-vivos.json` | Sí | Modelo Sol–Tierra y animales diurnos/nocturnos; descripción oral espacial. |
| Ciencia y Tecnología | 3 | `cyt.p3.habitat` | `ciencia-tecnologia/primaria-3/fichas/el-habitat-de-los-seres-vivos.json` | Sin selección local | Escena de hábitat con alimento, agua y refugio; contrastar ambientes. |
| Ciencia y Tecnología | 4 | `cyt.p4.formas-energia` | `ciencia-tecnologia/primaria-4/fichas/energia-y-sus-formas.json` | Sí | Seguir transformaciones de energía en objetos cotidianos; evitar etiquetas sin explicación. |
| Ciencia y Tecnología | 5 | `cyt.p5.lupa-y-microscopio` | `ciencia-tecnologia/primaria-5/fichas/la-celula.json` | Sí | Microscopio rotulado y aumentos 10 × 40; describir qué revela cada lente. |
| Ciencia y Tecnología | 6 | `cyt.p6.temperatura-particulas` | `ciencia-tecnologia/primaria-6/fichas/calor-y-temperatura.json` | Sí | Dos recipientes con partículas representadas; distinguir modelo de observación directa. |

## Hallazgos preliminares

- Las 18 claves tienen ficha existente y al menos 12 ejercicios. Este conteo no certifica corrección de todos los ítems ni calidad pedagógica.
- Se revisaron las respuestas de las seis candidatas iniciales de Matemática y las seis iniciales de Comunicación; al priorizar planes se sustituyeron varias claves. Las respuestas de las sustitutas requieren revisión por ítem antes de escribir o aprobar el lote.
- En `com.p5.idea-principal`, los ejemplos y lecturas colocan la idea principal al inicio, aunque un ejercicio enseña que no siempre ocurre. La muestra debe incluir al menos un párrafo con la idea al final o implícita.
- En `cyt.p3.habitat`, un ejercicio atribuye a la contaminación costera la pérdida específica de «refugio» sin que el texto permita distinguirla de agua o alimento. Corregir la evidencia y la respuesta antes de integrar.
- En `cyt.p5.lupa-y-microscopio`, los cálculos de aumento inspeccionados (10 × 40 = 400, 10 × 10 = 100) son correctos. Revisar adecuación al grado y que la imagen ubique ocular, objetivo, platina y luz con precisión.
- En `cyt.p6.temperatura-particulas`, dejar claro que las partículas son un modelo explicativo y que el movimiento depende de la temperatura. Revisar cada afirmación científica con una fuente de divulgación científica fiable para el grado.
- La lectura oral debe incluir el texto fuente, la tarea y las alternativas reales en orden visible; conservar el texto a la vista para que Comunicación evalúe también lectura. Cada recurso visual necesita descripción oral de lo que aporta a la respuesta.
- La fuente MINEDU indicada en las fichas se intentó abrir el 2026-11-14; el repositorio devolvió una verificación Check Point. Los códigos de desempeño están transcritos en `src/lib/nudito/conocimiento/cneb/`, pero el contraste directo con el documento oficial sigue pendiente.

## Siguiente paso

Esperar el formato compatible de momentos y recursos de la arquitectura. Después escribir una ficha por combinación con propiedad exclusiva de archivo, validar respuestas y fuentes, revisar técnica y pedagógicamente, probar audio y visuales en navegador y registrar cada estado por clave. Mantener la aprobación editorial y visibilidad como estados separados.
