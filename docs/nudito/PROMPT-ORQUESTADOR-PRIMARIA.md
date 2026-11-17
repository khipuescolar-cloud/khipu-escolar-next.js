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
