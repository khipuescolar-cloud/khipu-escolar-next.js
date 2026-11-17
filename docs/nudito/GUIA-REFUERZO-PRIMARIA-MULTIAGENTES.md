# Nudito: guía de refuerzo de primaria y orquestación Codex

Fecha: 2026-11-14. Estado: planificación aprobada para preparar una futura ejecución; este documento no ejecuta ni publica cambios.

## 1. Objetivo y referencia aprobada

Convertir los contenidos existentes de primaria en clases de refuerzo comprensibles, visuales, escolares e inclusivas para alumnos que prefieren o necesitan escuchar. Referencia de experiencia aprobada por Carlos: **La tecnología avanza con la ciencia**, clave `cyt.p5.ciencia-y-tecnologia`.

No basta con alargar resúmenes o copiar el vocabulario del piloto. Cada tema debe enseñar sus conceptos, explicarlos con ejemplos pertinentes y permitir comprobar lo aprendido. Conservar la identidad de Nudito y adaptar la profundidad al grado.

Referencias obligatorias antes de trabajar:

- `AGENTS.md` del workspace y de la aplicación.
- `specs/18-sistema-de-diseno.md`, `specs/41-nudito-tutor.md`, specs 42–44, 48–54 y `specs/50-nudito-banco-de-conocimiento.md`.
- `docs/orquestacion-de-modelos.md` y `docs/nudito/PROCESO-FICHAS.md`.
- Ficha piloto: `src/lib/nudito/conocimiento/banco/ciencia-tecnologia/primaria-5/fichas/avance-de-la-ciencia-y-la-tecnologia.json` (contiene varias fichas: identificar por clave).
- Componentes `Repaso.tsx`, `ConversacionNudito.tsx`, `TarjetaEjercicio.tsx`, `EntradaRespuesta.tsx`, `TextoAnimado.tsx`; servicios de sesiones, plan publicado y huellas.

El piloto es una referencia pedagógica y visual aprobada, pero su implementación tiene casos particulares y necesita generalización. No asumir que todos sus caminos ya fueron verificados en navegador.

## 2. Alcance y límites

Solo **primaria, grados 1 a 6**, en las tres áreas existentes: Matemática, Comunicación y Ciencia y Tecnología. Los cursos especializados se resuelven mediante las disciplinas y los cursos ya configurados; no inventar cursos nuevos.

Preparar una cobertura de todas las fichas existentes de esas 18 combinaciones. Priorizar primero las claves elegidas en los planes publicados disponibles para las pruebas locales y después el resto del banco de primaria. La visibilidad del alumno sigue limitada al plan publicado de su colegio, año, grado y curso; mejorar el banco no añade temas al plan.

El inventario inicial debe distinguir fichas activas, claves del plan, generadores históricos, lecciones publicadas que tienen prioridad sobre el banco y temas sin contenido. No anunciar cobertura total usando solamente el número de archivos. La spec 50 registraba 1,989 fichas de primaria el 2026-11-13; es una referencia histórica, **no un conteo verificado para la futura ejecución**.

Fuera de alcance: secundaria, rediseño de otras áreas de Khipu, modificaciones de matrículas/notas, cambios de contratos congelados, instalación de runtimes o proveedores de pago y despliegue en producción. No reconstruir la BD para probar esta tarea. Preservar todos los cambios preexistentes del usuario.

## 3. Normas pedagógicas y de escritura

### Secuencia de enseñanza

1. **Conectar:** indicar qué aprenderá el alumno y por qué puede servirle, con una situación reconocible.
2. **Invitar a pensar:** hacer una pregunta concreta y dar tiempo para imaginar, observar o comparar.
3. **Explicar:** enseñar el concepto y su función con palabras adecuadas al grado. Definir vocabulario nuevo con ejemplos.
4. **Mostrar:** acompañar la explicación con imágenes o recursos pertinentes y describir lo que aportan.
5. **Acompañar:** desarrollar al menos dos ejemplos distintos cuando el concepto lo permita; uno guiado y otro que invite a razonar.
6. **Aplicar:** presentar pasos concretos de razonamiento, con una acción y un ejemplo cuando sean necesarios.
7. **Comprobar:** mostrar directamente una pregunta interactiva con alternativas y retroalimentación, seguida de práctica.

No imponer cantidades de párrafos ni una duración idéntica a todos los temas. Respetar los límites del esquema vigente; si impiden una clase adecuada, el agente de arquitectura propone una extensión compatible antes de escribir lotes.

### Voz de Nudito

- Español del Perú, cercano, jovial, escolar y entusiasta; tratar al alumno de tú. Evitar tono infantilizado en grados superiores.
- Una idea principal por momento. Oraciones que suenen naturales al leerlas en voz alta.
- Separar la invitación de la pregunta: «Empecemos pensando como científicas y científicos. ¿Es verdad que la ciencia busca conocer y explicar cómo funciona la naturaleza?».
- Evitar encabezados narrativos con dos puntos como «Atención:», «Recuerda:» o «La idea clave es esta:». Redactar la transición completa. Esta regla afecta a prosa didáctica, no a sintaxis JSON, notación matemática o URLs.
- No encerrar una introducción dentro de «¿Es verdad que…?». Nunca transformar preguntas de forma ciega.
- No cerrar con frases vagas como «cuenta la historia completa». Explicar una relación concreta mediante los elementos trabajados.
- Evitar «como puedes ver» como única explicación. Una persona que escucha debe recibir la información relevante.
- Mantener exactitud: por ejemplo, refrigerar retrasa el crecimiento de muchos microbios; no elimina todos. Verificar fuentes científicas y recalcular respuestas matemáticas.
- Incluir contextos peruanos variados, sin estereotipos ni datos personales reales.

### Adaptación por ciclos

| Grados | Forma de acompañar |
|---|---|
| 1–2 | Situaciones concretas, instrucciones cortas, objetos contables y apoyos visuales claros. Evitar que leer sea requisito para comprender una consigna oral. |
| 3–4 | Comparar, clasificar y explicar causas sencillas; introducir vocabulario de forma gradual y resolver ejemplos acompañados. |
| 5–6 | Relacionar causas y consecuencias, justificar respuestas y contrastar ejemplos; mantener precisión sin adelantar contenidos ajenos al grado. |

Comunicación debe conservar los textos necesarios para aprender lectura y escritura; el audio es un apoyo, no evidencia de dominio lector. No sustituir la habilidad evaluada por una distinta.

## 4. Recursos visuales

- Cada imagen debe explicar un objeto, proceso, relación o situación del tema. Si se pide imaginar una lupa, un microscopio o una escena, ofrecer un apoyo visual pertinente cuando aporte comprensión.
- Preferir diagramas SVG/HTML o recursos existentes para relaciones exactas, números y etiquetas. Usar generación de imágenes cuando aporte una ilustración real; leer la skill de imágenes antes de hacerlo.
- Conservar coherencia de estilo, edades y contexto. No reutilizar imágenes de ciencia en otros temas por posición en una lista.
- Registrar ruta, tema, propósito, texto alternativo, descripción oral, procedencia/licencia y prompt si se generó. Revisar visualmente exactitud y legibilidad antes de integrar.
- La descripción oral explica qué observar y cómo se relaciona con el concepto. No repetir únicamente el título del archivo.
- Optimizar peso y tamaño; reservar dimensiones y verificar móvil. No generar miles de imágenes antes de aprobar la muestra de estilo y estimar cuota/costo.
- Todos los recursos deben vincularse mediante datos del tema, nunca mediante índices fijos o condiciones por nombre de tema.

## 5. Audio, animación y navegación

- Conservar voz española disponible del navegador. No prometer voz femenina ni mostrar selector de voz en este alcance.
- Narrar idea, descripciones de imágenes, ejemplos, pasos, comprobación y ejercicios. Explicar qué hacer y leer todas las alternativas relevantes.
- Al empezar la reproducción mediante acción del usuario, avanzar automáticamente al finalizar cada explicación. Detener el avance para esperar la respuesta de la comprobación.
- Controles superiores agrupados: Anterior, Siguiente e Iniciar/Pausar/Reanudar. El último momento también permite retroceder.
- Comprobación visible como interacción directa: pregunta y alternativas; evitar tarjeta adicional con la misma información.
- Botón para repetir la pregunta y alternativas. Pausar/reanudar debe mantener una posición coherente del audio y del texto.
- Texto con el estilo de entrada suave por letras aprobado en práctica, acompañando la voz. Animar solo los fragmentos nuevos; conservar los ya mostrados.
- Preferir eventos de palabra/frase de la voz cuando estén disponibles; si se usa estimación temporal, documentar y comprobar el desfase. Un temporizador fijo no garantiza sincronización real entre dispositivos.
- Respetar movimiento reducido, navegación por teclado, foco visible, nombres accesibles y tamaño táctil. Evitar anuncios de lector de pantalla por cada letra que compitan con la narración.
- «Tengo una pregunta» permanece temporalmente oculto. «Volver a la teoría» carga el repaso aun al reanudar una sesión y permite regresar al ejercicio pendiente.

Regresiones que deben comprobarse expresamente: bucle de animación, texto viejo al cambiar ejercicio, espacio vacío sobre el texto, duplicación del enunciado, audio anterior que sigue sonando, botones inferiores o inaccesibles, pérdida de ejercicio al volver de teoría y contador de momentos incorrecto.

## 6. Preguntas y evaluación

- Cada pregunta debe estar alineada con la habilidad del tema, tener instrucciones comprensibles y una respuesta verificable.
- Verdadero/falso debe formularse naturalmente; separar contexto y pregunta. En conjuntos de afirmaciones, mostrar y narrar todas, no solo la primera.
- Opción múltiple: alternativas plausibles, sin pistas involuntarias; el audio enumera exactamente las opciones en el orden visible. No revelar la solución.
- Lecturas: narrar texto, preguntas y opciones cuando corresponda. Relacionar: explicar ambos grupos y cómo responder. Fracciones/números: explicar campos y unidades. Escritura: narrar consigna, criterios y extensión.
- Feedback: explicar por qué, acompañar el reintento y no limitarse a «bien/mal». Hacer escuchables instrucciones, pistas y retroalimentación que sean necesarias para continuar.
- No alterar IDs, claves, dificultad, respuestas o dominio por una corrección de estilo sin revisar su coherencia. Mantener al menos los ejercicios exigidos por el esquema.
- Los ejercicios guardados pueden contener enunciados anteriores. Definir compatibilidad de presentación sin modificar respuestas ni historial de intentos.

## 7. Arquitectura antes de escalar

La primera tarea técnica es identificar y eliminar, mediante un diseño revisado, las particularidades del piloto: comprobación condicionada por el nombre del tema en `ConversacionNudito`, cierre oral de lupa/microscopio en `Repaso` e ilustraciones asignadas por posición. No extender esas condiciones a cientos de temas.

Diseñar un formato de contenido versionado que relacione momentos, recursos, descripciones, comprobación y narración por tema, con fallback para fichas existentes. Revisar esquema, carga, prioridad de lecciones publicadas, serialización y empaquetado Next.js. Mantener las soluciones exclusivamente en servidor y respetar `src/lib/nudito/contratos.ts` congelado; si la solución requiere cambiarlo, registrar esa dependencia y solicitar la decisión correspondiente.

Solo el agente de arquitectura edita componentes/esquemas/servicios compartidos. Los autores de contenido escriben datos contra el formato acordado. Integrar primero esa base y una muestra representativa; después ampliar los lotes.

## 8. Orquestación de agentes

Codex principal coordina, asigna propiedad de archivos, revisa resultados e integra. Usar el límite real de concurrencia que ofrezca la sesión; no prometer agentes ilimitados. Si hay cuatro puestos, usar principal + hasta tres agentes simultáneos.

| Rol | Entrega y alcance |
|---|---|
| Arquitectura y experiencia | Generalización del piloto y compatibilidad, audio, navegación y animación. Archivos compartidos bajo propiedad exclusiva. |
| Autor por lote | 3–5 fichas en muestra inicial; luego 6–12 según complejidad y tamaño. Una combinación y lista exacta de claves/archivos por encargo. |
| Revisor pedagógico | Revisa contenido, respuestas y adecuación al grado de un lote que no escribió. Devuelve aprobado/cambios por clave y evidencia. |
| Integrador principal | Inventario, registro, validaciones, revisión de diferencias, resolución de conflictos y entrega. |

Los roles rotan: no requieren cuatro agentes secundarios simultáneos. Revisión y escritura pueden correr en paralelo sobre lotes distintos. Usar worktrees en `../khipu-wt/<rama>` para cambios concurrentes; establecer una base de trabajo que incluya el piloto del workspace actual sin perder modificaciones ajenas. No asumir que un worktree nuevo contiene cambios sin commit.

Cada encargo debe incluir objetivo, claves y archivos permitidos, referencias, criterios de aceptación, modelo, límite de lote, prohibiciones de tocar archivos ajenos y formato de informe. Detener nuevos encargos al acercarse a la cuota; guardar estado y entregas parciales, sin declarar completo lo pendiente.

## 9. Modelos y ahorro

Plan inicial: inventario y controles mecánicos con scripts; escritura/revisión pedagógica con agentes Codex de capacidad adecuada; modelos económicos solo para trabajo acotado y verificable. Consultar opciones reales de la sesión y cuotas disponibles, sin inventar porcentajes ni nombres de modelos.

Los documentos del proyecto registran Ollama y modelos Qwen locales. Eso no demuestra que sigan instalados o activos. Solo si existe una tarea útil, comprobar `command -v ollama` y `ollama list`; no descargar modelos ni instalar servicios. Qwen puede clasificar, revisar formato o preparar borradores internos, con inspección posterior. Nunca dar por correcto contenido educativo final por haber pasado por un modelo local.

La selección de un modelo Ollama no equivale a crear un subagente nativo de Codex. Si se usa, será una herramienta local acotada invocada por el orquestador. No introducir runtime local, SDK de agentes o API keys en Khipu. Omitir modelos locales si scripts y Codex resuelven mejor la tarea. Registrar el motivo.

## 10. Fases y criterios de salida

1. **Auditoría inicial:** estado de Git, inventario por clave/área/grado/origen y lista de planes publicados relevantes. Exportar solo metadatos curriculares sin datos de estudiantes. Identificar pendientes pedagógicos de spec 50.
2. **Base compartida:** aprobar diseño técnico e implementar generalización compatible del piloto. Validar audio y transiciones antes de escribir en masa.
3. **Muestra:** una ficha por cada una de las 18 combinaciones, priorizando temas elegidos. Cada muestra pasa revisión pedagógica, factual y visual con audio. Resolver un patrón antes de multiplicarlo.
4. **Producción por lotes:** completar primero temas seleccionados y luego el banco restante de primaria; revisión por clave, validación por lote e integración ordenada. No usar sustituciones globales para redactar pedagogía.
5. **Revisión de combinación:** validar cobertura, respuestas, recursos y ausencia de regresiones; registrar pendientes y evidencias.
6. **Revisión editorial y disponibilidad:** comprobar huella de cada ficha modificada. Una ficha cambiada debe revisarse de nuevo; nunca copiar automáticamente todas las huellas para mantener visibilidad. Preparar informe de antes/después y solicitar aprobación editorial explícita al publicar lotes. La aprobación del piloto no aprueba automáticamente toda primaria.
7. **Entrega:** informe de cobertura real, cambios, pruebas, muestras visuales, decisiones de modelos y pendientes de aprobación. Despliegue productivo es una acción posterior.

En cada lote: `pnpm nudito:validar-banco`, lint de archivos afectados, `pnpm typecheck`, comprobaciones de respuestas y `git diff --check`. Al integrar la base compartida: pruebas relevantes de sesiones, currículo y UI; suite requerida por AGENTS antes de la entrega. E2E/navegador con móvil y escritorio para teoría → comprobación → práctica → siguiente → volver a teoría → retomar, pausa/reanudación, audio y movimiento reducido. Escuchar contenido real; el validador JSON no demuestra calidad pedagógica ni sincronización de voz.

Mantener separados los estados **escrito**, **validado técnicamente**, **revisado pedagógicamente**, **aprobado editorialmente** y **visible al alumno**. Ninguno implica automáticamente al siguiente.

## 11. Registro reanudable y entrega por agente

Crear durante la futura ejecución un registro versionado por tema con: clave, área, grado, origen, archivo, prioridad del plan, lote, agente/modelo, estado, referencias consultadas, recursos, revisión, verificaciones, problemas y siguiente acción. No incluir alumnos ni credenciales.

Informe obligatorio del agente: archivos cambiados, claves terminadas, conceptos enseñados, preguntas/soluciones comprobadas, recursos creados, comandos y resultados, riesgos, cambios pedidos y estado del lote. Solo el integrador modifica el registro global; los agentes entregan informes separados para evitar conflictos.

Antes de agotar créditos, guardar un punto de reanudación: qué está integrado, qué sigue en cada worktree, qué falla, qué requiere revisión y el próximo lote. No lanzar nuevos procesos desatendidos para eludir límites.

## 12. Resultado aceptable

Un tema se considera terminado cuando enseña con claridad y profundidad apropiada, sus imágenes aportan información, puede comprenderse escuchando las instrucciones pertinentes, las preguntas coinciden con el audio y las alternativas, y el flujo completo funciona sin las regresiones listadas. El informe final debe identificar por clave cualquier excepción. Nunca declarar «toda primaria lista» cuando queden claves sin revisar.
