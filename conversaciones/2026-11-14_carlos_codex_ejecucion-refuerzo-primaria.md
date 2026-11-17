# Ejecución del refuerzo de Nudito para primaria

| Campo | Valor |
|---|---|
| Fecha | 2026-11-14 |
| Colaborador | Carlos |
| Agente y modelo | Codex GPT-6; tres subagentes Codex |
| Rama y commits | `dev`; sin commit de esta sesión |
| Specs afectadas | `specs/41-nudito-tutor.md`, `specs/50-nudito-banco-de-conocimiento.md` |

## Pedido del colaborador (textual)

# Prompt para una nueva conversación de Codex

Copiar el bloque completo en una nueva conversación abierta en el workspace StartUp. La ejecución comienza cuando Carlos lo envíe; este archivo por sí mismo no inicia agentes.

```text
Quiero que actúes como orquestador principal de Codex y ejecutes la mejora de Nudito para toda primaria usando multiagentes Codex. Esta solicitud autoriza delegación y trabajo en paralelo dentro del alcance descrito.

Proyecto: /home/carlos-calderon/Escritorio/StartUp/Asistente Virtual Academico (AVA)/khipu-escolar

Lee primero los AGENTS.md aplicables y después, completos:
- docs/nudito/GUIA-REFUERZO-PRIMARIA-MULTIAGENTES.md
- docs/orquestacion-de-modelos.md
- docs/nudito/PROCESO-FICHAS.md
- specs/41-nudito-tutor.md y specs/50-nudito-banco-de-conocimiento.md
Consulta también las specs que la guía exige para cada tarea.

El tema aprobado como referencia es «La tecnología avanza con la ciencia», clave cyt.p5.ciencia-y-tecnologia. Quiero esa calidad de explicación escolar, recursos visuales, ejemplos, preguntas, audio y transición suave en los demás temas, adaptada a cada curso y grado. No copies sus ejemplos ni sus imágenes en temas ajenos.

Alcance: fichas existentes de 1.º a 6.º de primaria en Matemática, Comunicación y Ciencia y Tecnología, incluidos los cursos especializados que ya dependan de esas áreas. Prioriza los temas escogidos en planes publicados y completa después el resto del banco de primaria. No trabajes secundaria. Haz inventario real antes de dar cantidades o afirmar cobertura.

Arranca con un plan breve y ejecuta. Inspecciona el estado de Git y preserva todos los cambios existentes; no asumas que el piloto está en un commit ni que los worktrees lo contienen. Prepara una base coherente para los agentes. No hagas resets ni limpiezas destructivas.

Usa los agentes disponibles con propiedad exclusiva de archivos y worktrees cuando puedan existir conflictos. Ajusta la concurrencia al límite real. Puedes rotar roles entre arquitectura, autor por lote y revisor independiente mientras tú integras. Da a cada agente una lista exacta de claves, alcance, criterios y límite de lote. Los agentes de contenido no modifican componentes/esquemas compartidos.

Antes de producir fichas en masa, generaliza las particularidades del piloto: comprobación condicionada por nombre de tema, cierre de lupa/microscopio y recursos vinculados por posición. Diseña contenido por tema con compatibilidad para el banco existente y respeta contratos congelados. Inspecciona qué fuente tiene prioridad al mostrar el repaso, incluidas lecciones publicadas. No des por hecho que editar JSON cambia todo lo que ve el alumno.

Construye una muestra por cada una de las 18 combinaciones y revísala técnica, pedagógica y visualmente con audio antes de ampliar lotes. Usa las skills Impeccable/UI disponibles para la interfaz y la skill de imágenes cuando necesites generar ilustraciones; lee sus instrucciones. No generes recursos masivos antes de aprobar el patrón y considerar la cuota.

El audio debe explicar la tarea y leer las opciones reales. Las preguntas deben estar bien redactadas, sin introducir toda una invitación dentro de «¿Es verdad que…?». El texto debe revelar letras suavemente al ritmo de la voz, sin bucles, sin texto anterior, sin duplicaciones y respetando movimiento reducido. Conserva controles superiores, retroceso desde comprobación y regreso a teoría con recuperación del ejercicio pendiente.

Elige modelos según capacidad y costo disponible. Si Qwen u otros modelos locales ya instalados aportan algo concreto, puedes usarlos como herramientas auxiliares para clasificación, formato o borradores revisados. Verifica primero su disponibilidad. No son subagentes nativos Codex; no instales modelos, runtimes ni proveedores. No introduzcas API keys ni SDK de agentes en la aplicación. Si no aportan, omítelos. No uses modelos locales para dar por aprobado contenido destinado a niños.

Mantén un registro reanudable por clave y lote, con estados distintos para escritura, validación técnica, revisión pedagógica, aprobación editorial y visibilidad. Revisa respuestas, fuentes y adecuación al grado; no basta con JSON válido. Ejecuta las comprobaciones y recorridos de navegador indicados en la guía. Actualiza specs y bitácora en cada entrega integrada.

Al cambiar fichas revisadas, no sincronices huellas en masa ni anules filtros para que aparezcan. Prepara el informe editorial de cada lote y solicita la aprobación concreta necesaria antes de publicarlo; la aprobación de este plan o del piloto no aprueba automáticamente los contenidos nuevos. No escribas en producción ni despliegues sin mi autorización posterior.

Avanza de forma autónoma dentro de este alcance, informa avances concretos y evita pedir confirmaciones rutinarias. Si faltan créditos o una decisión imprescindible, guarda los lotes, evidencia y próximo paso para retomar, sin declarar terminada la cobertura pendiente. Entrega archivos, informe real de cobertura y verificación, pendientes y decisiones de modelos.
```
 ya estas en una nueva conversacion, comienza con el proyecto

> Necesito que termines todo lo que respecta a primaria con las modificaciones que hemos realizado

## Decisiones

- Se preservó el árbol `dev` con cambios previos del piloto y los worktrees existentes; no hubo reset ni limpieza.
- Inventario por scripts; Codex para arquitectura y análisis; Ollama instalado pero omitido por no aportar a esta fase. No se consultó una cuota visible de Codex ni se atribuyó un porcentaje.
- No se modificaron huellas, filtros, BD ni producción. La aprobación editorial del refuerzo queda pendiente.
- No se produjo contenido en masa: el formato común y la verificación de la muestra aún están pendientes.

## Cambios realizados

- `docs/nudito/estado-refuerzo-primaria.json`: registro reanudable de 1 989 claves y cinco estados separados.
- `docs/nudito/muestra-refuerzo-primaria.md`: candidatos por combinación y alertas; pendiente de cierre del agente.
- Componentes Nudito: correcciones de narración V/F, cierre fijo y fin de revelado del texto.
- Specs 41 y 50: contrato vigente, inventario y pendientes.

## Validación

- Inventario local: 1 989 fichas/18 combinaciones; 108 claves en 16 combinaciones con plan publicado; 0 lecciones publicadas para estas fichas; 1 989 huellas vigentes.
- `pnpm typecheck`, ESLint de componentes afectados y `git diff --check`: pasaron en el subagente de arquitectura.
- `pnpm nudito:validar-banco`: pasó (2 238 fichas activas, incluida secundaria; 27 034 ejercicios). `pnpm lint`: pasó con dos advertencias preexistentes en pruebas de carga. `pnpm typecheck`: pasó. `pnpm test`: 173 archivos y 1 331 pruebas aprobadas.
- `pnpm e2e tests/e2e/nudito-tutor.test.ts`: 4 fallos; se interrumpió después de esos fallos (6 no ejecutadas). Matemática quedó en «Nudito está pensando…» al esperar el repaso; Ciencia, Comunicación y el filtro de plan no llegaron al selector de curso. Trazas en `test-results/`. Causa aún sin aislar.

## Pendientes y preguntas abiertas

- Diagnosticar y corregir los 4 fallos E2E antes de ampliar.
- Implementar ruta versionada de clase guiada por clave con comprobación validada en servidor, sin cambiar `contratos.ts` y con prioridad de lección publicada.
- Producir y revisar técnica, pedagógica, visual y oralmente 18 muestras antes de ampliar lotes; después abordar 108 temas priorizados y banco restante.
- Pedir aprobación editorial concreta por lote antes de actualizar huellas y publicar; despliegue requiere autorización posterior.

## Continuación de la sesión — 2026-11-14

- Se implementó `claseGuiada` v1 compatible en fichas y lecciones, con recursos por ID, contenido público sin solución y validación de comprobación en servidor. El piloto pasó a ese formato.
- Se escribieron 18 muestras, una por combinación de primaria. Se crearon 18 SVG específicos bajo `public/nudito/diagramas/`. Las muestras siguen sin aprobación editorial y con huella pendiente de nueva revisión.
- Se corrigieron una pregunta ambigua de hábitat y ejercicios de día/noche, energía y partículas tras revisión independiente. El informe de revisión final de las 18 muestras sigue en curso.
- El test E2E anterior dependía de fichas cuya huella venció al editarlas; se adapta a claves visibles sin relajar el filtro. Su resultado final sigue pendiente.
- La cobertura de clase guiada continúa siendo 18 muestras más el piloto, no las 1 989 fichas; no se declara terminada primaria.

## Incidencia del servidor local

### Pedidos del colaborador (textual)

> por que no puedo levantar el servidor?

> no me deja ingresar, puedes dejarlo listo ?

### Diagnóstico y solución

- Una previsualización temporal había dejado `next dev --port 3011` activo y retenía `.next/dev/lock`, lo que impedía iniciar otra instancia del mismo proyecto.
- Se cerraron exclusivamente los procesos temporales de Next.js en 3011. El bloqueo se liberó de forma normal, sin borrar archivos manualmente.
- Se inició `pnpm dev` en el puerto normal 3000.
- Verificación HTTP: `lvh.me:3000` y la pantalla de ingreso respondieron 200; `nuevohorizonte.lvh.me:3000` redirigió correctamente al ingreso del colegio; `admin.lvh.me:3000` redirigió al ingreso administrativo.

## Muestra solicitada: La célula, unidad de los seres vivos

### Pedido del colaborador (textual)

> si, pero para que saber que vas entendiendo mejor te voy a dejar de tarea que me hagan lo mismo que tenemos en ese tema de prueba que te mencione; pero ahora para este tema del mismo grado y cursos: "7. La célula, unidad de los seres vivos" ; si haces bien esto entonces comprobare que me comprendiste a la perfeccion y podras seguir con los otros temas de todos los cursos y grados de primaria

### Decisiones

- Se trabajó únicamente la clave exacta `cyt.p5.la-celula`, Ciencia y Tecnología de 5.º de primaria.
- El piloto `cyt.p5.ciencia-y-tecnologia` se usó como patrón de profundidad, flujo, audio y comprobación; no se copiaron sus ejemplos ni recursos.
- Se eligieron diagramas SVG propios porque las relaciones celulares y sus rótulos requieren precisión. No se usó generación raster ni modelos locales.
- La ficha queda oculta tras cambiar su huella hasta la aprobación editorial explícita de Carlos; no se actualizó la BD ni se relajó el filtro.

### Cambios

- `la-celula.json`: teoría reescrita, dos ejemplos desarrollados, tres pasos, once momentos, cuatro recursos y comprobación en servidor; precisión corregida para células especializadas.
- `public/nudito/diagramas/ciencia-tecnologia/`: cuatro SVG específicos de la ficha.
- `Repaso.tsx`: las alternativas largas crecen en móvil y no superponen texto.
- Specs 41 y 50, registro reanudable, informe editorial y tres capturas de evidencia actualizados.

### Validación

- Navegador 1280×800 y 390×844: sin desborde ni imágenes rotas; alternativas completas en móvil.
- Audio del navegador simulado: idea, pregunta y opciones narradas; avance continuo sin bucle; movimiento reducido comprobado.
- `pnpm nudito:validar-banco`: 2 238 fichas activas y 27 034 ejercicios válidos. ESLint del componente, typecheck y `git diff --check`: pasaron. Pruebas dirigidas de banco y sesiones: 25/25 aprobadas.

### Pendiente

- Carlos debe revisar el informe y las capturas y aprobar expresamente `cyt.p5.la-celula` antes de guardar su nueva huella local.

## Aprobación editorial de la muestra

### Pedido del colaborador (textual)

> si, lo autorizo

### Resultado

- La autorización se aplicó exclusivamente a `cyt.p5.la-celula` en la base de datos local; no se modificaron otras huellas ni producción.
- Se calculó la huella desde el temario y la ficha actuales, se mantuvo el estado `revisado` y se registró al administrador local como revisor.
- La actualización y la entrada `curriculum_estado_editorial` quedaron dentro de una transacción con la huella anterior, la nueva, el alcance de una sola clave y la autorización editorial.
- La comprobación posterior confirmó igualdad entre huella guardada y actual, visibilidad positiva por estado y huella, e inclusión en la versión 5 de un plan publicado de Ciencia y Tecnología de 5.º de primaria.
- El panel editorial normal no podía renovar esta ficha porque los índices heredados del banco todavía carecen de relaciones `tema_desempenos_oficiales` verificadas (0 de 3 839 temas en la base local). La aprobación explícita se registró de forma individual y auditable; queda pendiente poblar esos metadatos globales antes de usar el flujo ordinario del panel para lotes futuros.

## Segunda revisión de accesibilidad y recursos visuales

### Pedido del colaborador (textual)

> uhmmm...
> no me convence tiene que tener mas texto explicativo, debe tener imagenes que relacionen lo que se esta diciendo, ademas que tiene que decir como una breve introduccion, si le pertenece a la ide principal el texto en vez de solo hablar  "LaLa célulacélula eses lala unidadunidad básicabásica dede todostodos loslos seresseres vivos:vivos: algunosalgunos tienentienen unauna solasola yy otros,otros, millones.millones. CadaCada célulacélula puedepuede nutrirse,nutrirse, relacionarserelacionarse concon susu entornoentorno yy reproducirse.reproducirse." pdria decir : "Como idea principal para este tema de la celula; sabemos que .... La celula es launidad basica de todos ...." y de igual manera en "Observa esta situación" aqui en vez de mencionar solo el texto debe decir "Observamos esta situacion; Ana tiene un microscopio y observa una gota de agua de la laguna ....". No se si me deje entender pero para una persona con discapacidad ceguera, solo mencionar el texto sin mencionar el titulo o mencionar sobre lo que esta hablando, tambien es dificil. tienes que hacerlo mas amigable y mostrar las imagenes tambien.

### Diagnóstico y cambios

- `TextoAnimado` contenía una copia visual y otra `sr-only` de cada palabra; al copiar o extraer el texto se producía exactamente la duplicación «LaLa célulacélula». Se dejó una sola copia y se añadió una prueba de regresión.
- La interfaz ignoraba `recursoRef` en momentos de tipo idea y paso, y no mostraba la narración escrita en una pantalla de recurso. Ahora cualquier momento puede presentar su imagen, el recurso muestra también su explicación y cada figura incluye un pie visible.
- La voz anuncia número de parte, título y explicación. Cuando existe una imagen, narra también su descripción. La comprobación anuncia que es la parte final antes de leer la pregunta y las opciones.
- Las once narraciones de `cyt.p5.la-celula` se ampliaron con introducciones naturales y contexto: idea principal, situación observada, explicación, conclusión y pasos. Todos los momentos tienen apoyo visual vinculado por ID.
- Validaciones aprobadas: banco completo (2 238 fichas y 27 034 ejercicios), typecheck, ESLint, pruebas unitarias dirigidas y HTTP 200 para los cuatro SVG.
- Se dejó la vista local `http://lvh.me:3000/refuerzo-preview-temporal/celula` para que Carlos revise esta versión sin publicarla ni renovar su huella.
- Como el contenido volvió a cambiar después de la primera aprobación, su huella está nuevamente vencida. No se sincronizó ni se aprobó automáticamente; queda pendiente la revisión visual y auditiva de Carlos.

## Tercera revisión de estructura e ilustración

### Pedido del colaborador (textual)

> bueno no me gusta cuando dice "parte 3 de 11" o cuando dice "parte 2 de 11"; eso no deberia decir para ninguna parte; ahora en la parte 1 solo debe estar la idea principal, aqui me pusiste la imagen tambien [Image #1] no deberia estar la imagen , por que la imagen aparece en la segunda parte [Image #2] ; otra cosa, quien hace las imagenes? por que capaz necesitamos usar mejores imagenes o levantar otro agente de IA para que genere las imagenes ya que se ven muy feas las imagenes; otra cosa es que tambien cuando pasan a los ejemplos dice "Ejemplo 2: mria una hoja de cerca, Pasamos al segundo ejemplo llamado Mira una hoja de cerca" te das cuenta de la inconsistencia del texto? es muy repetido , podriamos mejorar en esa parte porfavor

### Cambios y decisión visual

- La narración dejó de pronunciar «parte N de 11»; conserva el título porque orienta el contenido sin agregar un contador oral.
- Se retiró el mapa del primer momento. La introducción y la idea principal quedan solas; el mapa comienza en el segundo momento.
- Se eliminaron frases que repetían los títulos en los dos ejemplos, sus explicaciones, conclusiones y los tres pasos.
- Los cuatro SVG actuales habían sido dibujados mediante código por Codex, no por un modelo gráfico. Se generó con la skill de imágenes una sola propuesta raster de estilo educativo más elaborado para validar dirección antes de reemplazar recursos en masa. Todavía no se incorporó a la ficha.

## Comparación con las imágenes del piloto aprobado

### Pedido del colaborador (textual)

> bueno si me gusta como esta enseñando, pero lo que no me gusta son las imagenes, puedes revisar si para el tema de "La tecnología avanza con la ciencia" fueron creados de la misma forma; por que para ese tema si se ve bien las imagenes

### Hallazgo

- No fueron creadas de la misma forma. El piloto `cyt.p5.ciencia-y-tecnologia` usa tres PNG de 1254 × 1254 generados con la herramienta interna de imágenes: `lupa-y-tejido.png`, `microscopio-y-celulas.png` y `charqui-y-refrigeradora.png`.
- El piloto conserva además un solo SVG de código para el diagrama abstracto del ciclo entre ciencia y tecnología.
- `cyt.p5.la-celula` usa actualmente cuatro SVG dibujados mediante código. Son útiles como esquemas deterministas, pero carecen de personajes, contexto, profundidad y textura; esa diferencia de producción explica la menor calidad visual percibida.
- La dirección recomendada es repetir el patrón del piloto: imágenes generadas para escenas, observaciones y ejemplos; SVG únicamente cuando el recurso sea un diagrama abstracto que necesite relaciones o rótulos exactos.

## Sustitución de los SVG imprecisos

### Pedido del colaborador (textual)

> bueno lo que sucede es que los SVG que me entregas , no son precisas: [Image #1] no me puedes decir que esto es un condor, por que no se parecen en nada , ademas que las otras imagenes [Image #2]; ni se ven las flechas correctamente ; entonces tenemos ese problema; creo que con imagenes si podemos hacerlo

### Cambios

- Se dejó de intentar corregir los SVG de la ficha. No se borraron ni sobrescribieron: la clase ahora referencia cuatro PNG nuevos bajo `public/nudito/ilustraciones/`.
- La generación usó la herramienta integrada de imágenes, sin API externa: un mapa con célula, levadura, hoja de papa y cóndor; Ana observando levadura; Ana observando una hoja de papa; y una vista microscópica de gemación.
- Todas las instrucciones prohibieron texto, rótulos y flechas dentro de la imagen. La precisión verbal queda en título, pie y audio, donde puede revisarse sin depender del dibujo.
- Se descartó una primera propuesta de procesos porque mostraba una levadura demasiado parecida a una célula animal. La versión final se limitó a células ovaladas y etapas visibles de gemación.
- Archivos finales: `celula-seres-vivos-v2.png`, `levadura-microscopio-v2.png`, `hoja-microscopio-v2.png` y `levadura-gemacion-v2.png`.
