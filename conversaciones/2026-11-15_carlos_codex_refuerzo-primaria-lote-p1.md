# Continuación del refuerzo de primaria y control de créditos

| Campo | Valor |
|---|---|
| Fecha | 2026-11-15 |
| Colaborador | Carlos (dueño del producto) |
| Agente y modelo | Codex · GPT-6.1 |
| Rama y commits | rama actual · sin commit en esta sesión |
| Specs afectadas | `specs/50-nudito-banco-de-conocimiento.md` |

## Pedidos del colaborador (textual)

> Continúa y termina el refuerzo didáctico de toda primaria en el proyecto /home/carlos-calderon/Escritorio/StartUp/Asistente Virtual Academico (AVA)/khipu-escolar. Lee primero todos los AGENTS.md aplicables y después, completo, docs/nudito/INSTRUCCIONES-CONTINUAR-REFUERZO-PRIMARIA.md junto con los documentos que allí se indican. Revisa git status y preserva todos los cambios existentes; no hagas resets ni limpiezas. Ya existen dos referencias aprobadas: cyt.p5.ciencia-y-tecnologia y cyt.p5.la-celula. Aplica su calidad pedagógica, visual, oral y accesible a todas las fichas existentes de las 18 combinaciones de primaria, sin copiar ejemplos ni imágenes entre temas. Prioriza planes publicados y luego completa el resto. No te detengas al terminar una muestra, lote, grado o área: integra, registra y continúa con el siguiente lote hasta que todas las claves cumplan la definición de terminado. No pidas confirmaciones rutinarias. Usa Gemini/Antigravity para imágenes y Codex para código e integración, cuidando la cuota. Valida cada clave y prepara informes editoriales; puedes continuar produciendo otros lotes mientras esperas aprobación, pero renueva únicamente las huellas aprobadas expresamente. Después de cada aprobación verifica plan publicado, huella vigente y visibilidad real del alumno para evitar que el profesor vea un tema que el alumno no ve. Si se agotan los créditos, deja estado reanudable por clave y el siguiente lote exacto; no declares terminada la cobertura pendiente. No publiques en producción ni despliegues.

> acabo de restaurar los límites semanales y de 5h, pero antes de seguir con la tarea me puede decir en qué te has estado acabando los créditos porque en menos de 30 minutos ya no tenia nada de créditos de 5h. Que hiciste ?

> ahora que sea restablecido los créditos trata de no consumirlos tan rápido para poder minimizar los costos

> viendo que te has acabado todos los créditos de Gémini quiero saber cuántas fichas has acabado??

> y por qué tantos créditos tanto de gpt codex y de jennina él estás consumiendo si al final no estás terminando ninguna ficha

> puedes encargarte de terminar las fichas que faltan porfavor

## Decisiones

- Se reconoció que tres subagentes Codex con historial completo y turnos pequeños sucesivos multiplicaron innecesariamente el consumo de la ventana de cinco horas.
- Desde la restauración se continuó con un solo agente principal, sin paralelismo Codex, agrupando las verificaciones mecánicas por lote.
- Gemini se reservó para imágenes. Al informar cuota agotada, no se intentó eludir el límite ni usar un proveedor de pago; se cerraron solo las claves con recursos ya disponibles.
- No se renovó ninguna huella porque Carlos aún no aprobó estas claves.
- El recorrido real se intentó con un único navegador y quedó bloqueado porque este rechazó el acceso a la vista previa local. No se intentó eludir la restricción con otra superficie de navegador.

## Cambios realizados

- Diez claves publicadas de 1.º recibieron clase guiada completa o ampliada; ver `docs/nudito/informe-editorial-primaria-p1-lote-01.md`.
- Se añadieron recursos SVG exactos de Matemática y clasificación, y WebP de Gemini para escenas de Comunicación y Ciencia.
- Se corrigieron problemas puntuales de igualdad, patrón, uso de mayúscula y precisión científica.
- Se actualizó el estado reanudable por clave y la spec 50.

## Validación

- Inventario: 1 989 claves únicas, 18 combinaciones, 0 duplicadas.
- Banco: 2 238 fichas activas y 27 034 ejercicios válidos.
- Tests: 175 archivos y 1 336 pruebas aprobadas.
- TypeScript: aprobado.
- Recursos: inspección visual realizada; navegador y audio todavía pendientes.

## Pendientes y preguntas abiertas

- Habilitar el acceso del navegador a `http://lvh.me:3000/refuerzo-preview-temporal`; recorrer las diez claves en navegador, audio, móvil y movimiento reducido; luego solicitar aprobación editorial por clave.
- No renovar huellas antes de esa aprobación.
- Siguiente lote exacto: `com.p1.datos-del-texto`, `com.p1.personajes`, `cyt.p1.objetos-tecnologicos`, `cyt.p1.el-suelo`, `cyt.p1.seres-vivos-necesidades`.
- Gemini agotó temporalmente su cuota; reanudar las ilustraciones tras el reinicio indicado por el proveedor.
- La cobertura restante de primaria continúa pendiente y no se declara terminada.
