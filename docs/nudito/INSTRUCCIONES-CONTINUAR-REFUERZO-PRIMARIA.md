# Instrucciones para continuar el refuerzo de primaria

Actualizado: 2026-11-16. Este documento es el punto de reanudación para una conversación nueva. Carlos autorizó integración editorial local autónoma bajo la doble revisión descrita aquí; no autoriza producción ni despliegues.

## Objetivo y alcance

Completar el refuerzo de Nudito para las fichas existentes de 1.º a 6.º de primaria en Matemática, Comunicación y Ciencia y Tecnología, incluidos los cursos especializados que ya dependan de esas áreas. Son 18 combinaciones de área y grado. No trabajar secundaria.

El inventario actual contiene 1 989 fichas de primaria dentro de un banco válido de 2 238 fichas activas. Esa cantidad es inventario, no cobertura terminada. Antes de informar cifras, regenerar o verificar el inventario real según `docs/nudito/GUIA-REFUERZO-PRIMARIA-MULTIAGENTES.md`.

Referencias editoriales:

- `cyt.p5.ciencia-y-tecnologia`: patrón aprobado de calidad, incluido en la versión publicada 5 y con huella editorial local renovada el 2026-11-15.
- `cyt.p5.la-celula`: segunda referencia aprobada. Tiene cuatro ilustraciones nuevas de Gemini y huella editorial vigente en la BD local desde el 2026-11-15.

Carlos ya aprobó las dos referencias. Cuando vuelvan a cargarse los créditos de Codex, continuar las demás fichas de primaria por lotes controlados hasta completar todas las fichas existentes. Con el inventario actual quedan 1 987 por mejorar; verificar nuevamente la cifra al reanudar porque el banco puede cambiar. La ejecución no termina al completar una muestra, un área, un grado o los temas del plan publicado: termina cuando las 18 combinaciones y todas sus claves existentes alcancen la definición de terminado de este documento.

## Mandato de continuidad

- No detener la producción después de un lote satisfactorio ni pedir confirmaciones rutinarias. Integrar el lote, registrar sus estados y continuar con el siguiente mientras queden claves pendientes y haya cuota disponible.
- Priorizar primero las claves de planes publicados y después completar el resto del banco de primaria. La prioridad cambia el orden, no reduce el alcance.
- Trabajar en lotes suficientemente pequeños para poder revisar calidad y recuperar el trabajo, pero encadenarlos hasta alcanzar la cobertura completa.
- Los lotes nuevos se aprueban editorialmente de forma autónoma solo cuando un revisor distinto del autor y el orquestador confirman por clave la calidad pedagógica, factual, visual, oral, accesible y técnica. La aprobación autónoma habilita únicamente esas claves y nunca una sincronización masiva.
- Solo pausar si se agotan los créditos, falta una decisión realmente imprescindible, falla un servicio externo necesario o existe un riesgo que requiere autorización. Antes de pausar, guardar archivos, evidencia, estados por clave y el siguiente lote exacto para retomar.
- Nunca declarar «primaria terminada» por cantidad de JSON, por tener una muestra por combinación o porque el banco sea válido. Terminado significa calidad didáctica y técnica comprobada por cada clave.

## Al comenzar una conversación nueva

1. Leer los `AGENTS.md` aplicables del workspace y del proyecto.
2. Leer completos:
   - `docs/nudito/GUIA-REFUERZO-PRIMARIA-MULTIAGENTES.md`
   - `docs/orquestacion-de-modelos.md`
   - `docs/nudito/PROCESO-FICHAS.md`
   - `specs/41-nudito-tutor.md`
   - `specs/50-nudito-banco-de-conocimiento.md`
   - las specs adicionales exigidas por la guía para la tarea concreta.
3. Ejecutar `git status --short` y preservar todos los cambios existentes. No hacer `reset`, limpiezas destructivas ni asumir que una modificación previa está en un commit.
4. Revisar este archivo, `docs/nudito/estado-refuerzo-primaria.json` y el informe editorial de la ficha que se vaya a tocar.
5. Confirmar que las dos referencias aprobadas siguen vigentes y continuar con el siguiente lote prioritario de planes publicados.

## Procedimiento obligatorio para cada tema

1. **Localizar la fuente efectiva:** identificar la clave, la ficha del banco, el tema del plan y cualquier lección publicada que tenga prioridad sobre el JSON.
2. **Diagnosticar la ficha actual:** comprobar teoría, ejemplos, ejercicios, respuesta correcta, pistas, retroalimentación, adecuación al grado y errores científicos, matemáticos o lingüísticos.
3. **Diseñar la clase guiada:** escribir introducción e idea principal, situación visual, dos ejemplos diferentes, método o pasos y comprobación. Mantener el primer momento sin imagen.
4. **Preparar recursos:** decidir qué imágenes aportan comprensión; generarlas con Gemini/Antigravity, inspeccionarlas y convertirlas a WebP. No aceptar dibujos ambiguos, flechas cortadas, rótulos incrustados ni imágenes científicamente incorrectas.
5. **Alinear accesibilidad y audio:** escribir `alt`, descripción visible y narración después de ver el recurso final. El audio debe orientar, explicar la imagen y leer las opciones reales sin duplicaciones ni contadores.
6. **Integrar sin casos particulares:** enlazar recursos por ID, respetar `claseGuiada` v1 y evitar condicionales por nombre, índices o posiciones.
7. **Revisar contenido:** comprobar fuentes, respuesta, dificultad, vocabulario, ejemplos y retroalimentaciones. JSON válido no equivale a contenido aprobado.
8. **Validar técnicamente:** ejecutar pruebas dirigidas, banco, typecheck, lint, `git diff --check`, HTTP de recursos y recorridos de navegador con audio, móvil y movimiento reducido.
9. **Registrar el resultado:** actualizar estado por clave, spec, informe editorial, evidencia y bitácora. Diferenciar escrito, validado, revisado, aprobado y visible.
10. **Aprobar editorialmente:** un agente que no escribió el lote revisa cada clave y entrega `aprobada` o cambios concretos. El orquestador comprueba la evidencia y decide de forma autónoma; no necesita pedir confirmación rutinaria a Carlos.
11. **Integrar la aprobación local:** renovar únicamente las huellas de las claves aprobadas, una por una y con auditoría; nunca usar una sincronización masiva. Esto no publica ni despliega en producción.
12. **Verificar como alumno:** para cada clave aprobada confirmar, en este orden:
    - está en la selección editable si corresponde;
    - está en la última versión publicada del plan;
    - tiene estado `revisado` o `publicado`;
    - la huella guardada coincide con la ficha actual;
    - la fuente efectiva es la esperada;
    - aparece realmente para un alumno del grado y curso correspondiente.
13. **Continuar:** marcar la clave como terminada solo después de todas las comprobaciones aplicables y pasar al siguiente lote sin abandonar la cobertura restante.

Si el profesor ve una clave y el alumno no, no asumir que falta en el plan. Comparar selección editable, foto publicada, estado editorial y huella actual. El incidente del 2026-11-15 ocurrió porque `cyt.p5.ciencia-y-tecnologia` estaba seleccionado y publicado, pero una huella vencida hacía que el filtro del alumno lo ocultara.

## Qué debe mostrar y decir cada ficha

La clase guiada debe enseñar, no limitarse a leer fragmentos del banco.

1. **Momento inicial:** contiene una bienvenida breve y la idea principal, con suficiente explicación para comprender el tema. No lleva imagen.
2. **Situación o mapa visual:** desde el segundo momento puede aparecer el primer recurso. La voz orienta de forma natural, por ejemplo: «Observemos esta situación…», anuncia de qué se hablará y describe lo importante para una persona que no ve la pantalla.
3. **Dos ejemplos distintos:** cada ejemplo desarrolla una aplicación concreta y adecuada al grado. El título visible y la narración se complementan; no repetir «Ejemplo 2: … Pasamos al segundo ejemplo llamado…».
4. **Método o pasos:** explicar cómo razonar y no solo cuál es la respuesta. Cada imagen se vincula por `recursoRef`, nunca por su posición en una lista.
5. **Comprobación:** formular una pregunta directa y bien redactada. Evitar introducir toda una invitación dentro de «¿Es verdad que…?». El audio anuncia la tarea, lee la pregunta y lee las opciones reales en el mismo orden visible.
6. **Práctica:** conservar retroceso desde la comprobación, regreso a teoría y recuperación del ejercicio pendiente.

Reglas de comunicación y accesibilidad:

- No pronunciar «parte N de M» en ningún momento.
- Para la idea central usar orientación natural como «Como idea principal de este tema…» cuando ayude a quien escucha sin ver.
- Nombrar el título o propósito antes de describir una imagen, pero no repetir literalmente el título en la siguiente oración.
- La descripción oral debe coincidir exactamente con la imagen y explicar su relación con la idea.
- El texto debe revelarse suavemente al ritmo de la voz, letra por letra, sin texto anterior, duplicaciones ni bucles.
- Respetar `prefers-reduced-motion`.
- Conservar controles superiores y navegación accesible.
- Adaptar vocabulario, extensión, ejemplos y dificultad al área y grado. No copiar ejemplos ni imágenes del piloto en temas ajenos.

## Contrato técnico que debe preservarse

- Usar `claseGuiada` versión 1 con momentos, recursos identificados y comprobación.
- No introducir condicionales por nombre de tema ni dependencias de índices o posiciones.
- Mantener compatibilidad con el banco existente y los contratos congelados.
- La fuente efectiva de una lección publicada puede tener prioridad sobre el JSON del banco. Verificar siempre qué fuente muestra el alumno; editar una ficha no garantiza que cambie una lección publicada.
- Mantener las soluciones protegidas en el servidor y respetar las reglas de visibilidad por huella editorial.
- Los agentes o autores de contenido no deben modificar componentes, esquemas o contratos compartidos.

## Flujo de imágenes con Gemini y Antigravity

Gemini se usa para ilustraciones; Codex integra código, contenido, accesibilidad y pruebas. No añadir SDK, API key ni proveedor a la aplicación.

Flujo que ya funcionó:

```bash
agy --model gemini-4-argon-low --effort low --mode accept-edits \
  --print-timeout 240s --print="PROMPT DETALLADO"
```

El prompt debe decir «Usa el generador de imágenes de Gemini» y pedir exactamente una imagen. No escribir `jetski` en el prompt: Antigravity puede interpretarlo como un comando del sistema. No usar `antigravity chat`.

Antigravity delega la creación a su generador de imágenes y suele guardar el JPEG en `~/.gemini/antigravity-cli/brain/<conversacion>/`. Si termina antes de copiarlo, localizar el JPEG más reciente o continuar la conversación de Antigravity; no regenerar a ciegas.

El esquema de Nudito admite SVG, PNG y WebP, no JPEG. Convertir el artefacto sin redibujarlo:

```bash
ffmpeg -hide_banner -loglevel error -y -i entrada.jpg \
  -c:v libwebp -quality 86 -compression_level 6 salida.webp
```

Criterios visuales:

- relación 4:3; 1200 × 896 es válida para la muestra actual;
- ilustración escolar cálida, clara y adecuada para primaria;
- precisión científica o matemática y objetos reconocibles;
- sin texto, títulos, etiquetas, flechas ni marcas de agua incrustadas;
- una idea visual principal, buena jerarquía y lectura en móvil;
- consistencia dentro de la misma ficha, sin reutilizar imágenes en temas ajenos;
- generar primero una muestra, revisarla y recién después completar el conjunto para cuidar la cuota.
- ejecutar una sola conversación de imagen a la vez; inspeccionar e integrar el resultado antes de pedir la siguiente;
- si la conversación termina sin imprimir la ruta, buscar el JPEG de esa misma conversación en `~/.gemini/antigravity-cli/brain/` antes de regenerar;
- si Gemini no está disponible, usar el generador de imágenes más económico que Claude tenga realmente disponible, también de uno en uno. Para diagramas exactos preferir SVG generado como código. Nunca presentar como imagen generada un recurso que el modelo de texto no puede producir.

La descripción accesible y la narración se escriben después de inspeccionar la imagen final, no antes.

## Uso responsable de modelos y agentes

- Claude actúa como orquestador principal. Prefiere agentes Codex para código, contenido final e integración mientras la cuota de Codex esté disponible; limita la concurrencia y asigna claves y archivos exactos.
- Si Codex devuelve un límite de 5 horas o semanal, Claude cambia automáticamente los lotes pendientes a subagentes Sonnet. No espera una confirmación rutinaria de Carlos y no mezcla dos autores en el mismo archivo.
- Sonnet puede escribir y revisar lotes de primaria; un autor no aprueba su propio lote. Usar scripts para inventario, formato y verificaciones mecánicas.
- Usar Antigravity/Gemini para imágenes.
- Un modelo local ya instalado puede ayudar a clasificar o dar formato, pero nunca aprobar contenido destinado a niños. No instalar runtimes ni modelos.
- En esta sesión no estuvieron disponibles las variables de contexto de Herdr (`HERDR_ENV`, workspace, tab y pane). Por eso no se debe afirmar que se abrieron agentes visibles. En una sesión que sí tenga `HERDR_ENV=1`, leer primero `herdr --skill` y usar el CLI de Herdr; de lo contrario, trabajar sin simular esa visibilidad.

### OmniRoute como respaldo

OmniRoute 3.8.53 está instalado globalmente en el equipo y su almacenamiento local fue inicializado en `~/.omniroute`. No forma parte de Khipu Escolar y no se deben añadir sus claves, SDK ni configuración al repositorio.

- El servidor solo debe escuchar en loopback. Inicio seguro verificado:

  ```bash
  cd /home/carlos-calderon/Escritorio/StartUp
  OMNIROUTE_SERVER_HOST=127.0.0.1 omniroute serve --daemon --no-open --no-tray
  ```

- Ejecutar OmniRoute desde un directorio neutral, nunca desde `khipu-escolar`: el CLI carga automáticamente el `.env` del directorio actual y no debe recibir variables privadas de la aplicación.
- Verificar con `omniroute health --output json` y `ss -ltnp 'sport = :20128'`; la dirección debe ser `127.0.0.1:20128`, nunca `0.0.0.0:20128` sin autenticación.
- Al 2026-11-15 no hay proveedores configurados. OmniRoute no aporta créditos por sí mismo: requiere un proveedor gratuito, OAuth, una suscripción o una API key.
- No importar cookies web, tokens de sesión ni credenciales de Antigravity de manera automática. Preferir OAuth oficial o API keys revocables y revisar las condiciones del proveedor.
- GLM, Kimi, Qwen, DeepSeek o MiniMax pueden apoyar clasificación, primeros borradores, transformaciones mecánicas y formato. No pueden aprobar contenido para niños, renovar huellas ni sustituir la revisión factual, pedagógica, visual y editorial.
- No redirigir la configuración normal de Codex. Para probar un modelo, usar un lanzamiento aislado de OmniRoute y conservar Codex como integrador y revisor final.
- No afirmar que existe conmutación automática hasta conectar y probar al menos un proveedor compatible con herramientas, contexto largo y edición de archivos.

## Validación mínima por clave

Ejecutar las comprobaciones más pequeñas durante la edición y, antes de entregar el lote:

```bash
pnpm nudito:validar-banco
pnpm typecheck
```

Además:

- pruebas unitarias dirigidas de clase guiada, recursos, audio y texto animado;
- lint de los archivos afectados;
- comprobación de diferencias del banco;
- HTTP 200 para la vista y cada recurso;
- recorrido de navegador en escritorio y móvil;
- reproducción de audio completa, comprobación, retroceso y regreso al ejercicio;
- prueba con movimiento reducido;
- revisión técnica, pedagógica, factual y visual independiente antes de escalar.

## Estados editoriales y publicación

Registrar por clave y lote estados separados para:

- escritura;
- validación técnica;
- revisión pedagógica;
- aprobación editorial;
- visibilidad para el alumno.

Actualizar `docs/nudito/estado-refuerzo-primaria.json`, la spec correspondiente, el informe editorial y la bitácora de conversación en cada entrega integrada.

No sincronizar huellas en masa, no anular filtros de visibilidad, no escribir en producción y no desplegar. Cada ficha o lote nuevo necesita informe editorial, revisión independiente y aprobación autónoma registrada por clave. Aprobar el patrón o un piloto no aprueba automáticamente otros contenidos.

## Definición de terminado

Una clave solo cuenta como terminada cuando:

- la clase guiada cumple el patrón didáctico y de accesibilidad;
- teoría, ejemplos, ejercicios, respuestas, pistas y retroalimentación fueron revisados;
- imágenes y descripciones fueron inspeccionadas visualmente;
- audio y navegación fueron recorridos en navegador;
- las validaciones técnicas están aprobadas;
- sus cinco estados están registrados;
- si la revisión independiente y el orquestador la aprobaron, su huella individual está vigente y la visibilidad del alumno fue comprobada;
- si aún no fue aprobada, queda claramente marcada como pendiente editorial, sin fingir visibilidad.

La cobertura global solo termina cuando no queda ninguna de las 1 989 claves actuales —o del inventario real más reciente— en estado `existente_sin_refuerzo`, escrito sin validar, pendiente de revisión pedagógica no atendida o sin informe editorial. Las aprobaciones pendientes no autorizan huellas, pero tampoco justifican abandonar la preparación del resto del banco.

## Estado exacto al 2026-11-16

Fuente de verdad: `docs/nudito/estado-refuerzo-primaria.json` (1 989 claves de primaria). Verificar con el script de inventario antes de citar cifras.

- **17 claves terminadas, aprobadas e integradas localmente:** las 2 referencias (`cyt.p5.ciencia-y-tecnologia`, `cyt.p5.la-celula`) y los lotes `primaria-p1-publicado-lote-01` (10 claves) y `primaria-p1-publicado-lote-02` (5 claves), todas con huella individual vigente y visibilidad comprobada. Informes: `informe-editorial-primaria-p1-lote-01.md` y `-lote-02.md`.
- **15 borradores** de `muestra-18-2026-11-14`: escritos con `claseGuiada` v1 pero NO terminados; no cuentan como cobertura y no son visibles hasta pasar revisión independiente, imágenes y aprobación.
- **1 957 claves** restantes en `existente_sin_refuerzo` (78 ya visibles por plan publicado con su contenido antiguo). Queda por hacer todo el trabajo de ellas.
- Los 2 lotes de primero (Comunicación y Ciencia y Tecnología de 1.º) son el patrón vigente para primaria baja: 2–3 recursos visuales distintos y 5–8 momentos con recurso por clave.
- Imágenes: el flujo `agy` descrito arriba funcionó en el lote 02 (diez imágenes, una conversación cada una). Si falla por certificado o autenticación, no lo eludas: pasa al respaldo indicado y registra el bloqueo.
- Vista local de revisión: `http://lvh.me:3000/refuerzo-preview-temporal` (el selector muestra solo las claves del lote en curso).
- Siguiente lote exacto: el siguiente grupo de claves de planes publicados de primaria, empezando por las 15 muestras en borrador y luego el resto de `prioridadPlanPublicado`, en lotes de unas 5–10 claves.

## Texto para pegar en la conversación siguiente

```text
Eres el orquestador principal (Claude). Continúa y termina el refuerzo didáctico de toda primaria en /home/carlos-calderon/Escritorio/StartUp/Asistente Virtual Academico (AVA)/khipu-escolar. Trabaja de forma autónoma: Carlos no aprobará lote por lote.

1. Lee todos los AGENTS.md aplicables y, completo, docs/nudito/INSTRUCCIONES-CONTINUAR-REFUERZO-PRIMARIA.md y los documentos que cita. Corre git status y preserva todos los cambios existentes (hay muchos sin commitear); sin resets ni limpiezas.
2. Estado: 17 claves terminadas (2 referencias + lotes p1 01 y 02), 15 borradores y ~1 957 pendientes. Replica la calidad pedagógica, visual, oral y accesible de las terminadas con claseGuiada v1, sin copiar ejemplos ni imágenes entre temas.
3. Orquestación: delega la escritura e integración a agentes Codex mientras haya cuota; si Codex devuelve límite de 5 h o semanal, pasa los lotes pendientes a subagentes Sonnet sin preguntar. Un autor nunca aprueba su propio lote: cada clave la revisa un agente distinto (técnico, pedagógico, factual, visual). Limita la concurrencia, un archivo por autor.
4. Imágenes: Gemini vía `agy` exactamente como en el documento, una imagen por conversación, inspeccionada antes de pedir la siguiente. Si Gemini no está disponible, usa el generador de imágenes más barato que tengas, también de una en una, o SVG como código para diagramas exactos.
5. Aprobación autónoma: solo cuando el revisor independiente y tú confirmen por clave todas las dimensiones. Renueva únicamente las huellas de esas claves, nunca en masa ni anulando filtros; verifica plan publicado, huella vigente y visibilidad real del alumno.
6. En cada lote integrado: actualiza estado-refuerzo-primaria.json, specs/50, informe editorial y la bitácora en conversaciones/, y corre pnpm nudito:validar-banco, pnpm typecheck y las pruebas dirigidas.
7. No te detengas tras un lote, grado o área; encadena lotes hasta cubrir las 18 combinaciones. Pausa solo si se agotan los créditos, falla un servicio imprescindible o hay riesgo que requiera autorización; entonces deja estado reanudable y el siguiente lote exacto. No declares terminada la cobertura pendiente. No publiques en producción, no despliegues, no toques secundaria.
```
