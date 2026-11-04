# Nudito+ — estudio de viabilidad (tutor educativo con IA)

> **Borrador — pendiente de validación del equipo fundador y revisión legal. No es una oferta comercial.**
>
> Fecha: 2026-11-03 · Autor: Claude Code (a pedido del equipo) · Estado: para discusión, **no se desarrolla todavía**.

## 0. Resumen

- **Qué es:** un tutor con IA para el **alumno**, alineado al CNEB, que guía sin resolver las tareas. Producto futuro.
- **Quién paga:** el **colegio** (B2B). **No se vende a familias.** Falta decidir si es complemento de Khipu Pro o un
  tercer plan «Khipu Pro+» (sección 12).
- **Costo de IA:** con un modelo pequeño (p. ej. Claude Haiku 5.5) y caché, un alumno con uso medio (120 mensajes/mes)
  cuesta **≈ USD 0,06 (≈ S/ 0,22) al mes**. Con un modelo mediano (Sonnet 5.5) sube a **≈ USD 1,12 (≈ S/ 4,20)**.
  La IA no es el costo dominante si se usa un modelo pequeño. Lo caros son la moderación, el soporte y el cumplimiento legal.
- **Mayor riesgo:** protección de datos de menores (Ley 29733), transferencia internacional y conducta del modelo
  ante temas de riesgo. Hay que revisarlo con un abogado antes de cualquier piloto con alumnos reales.

### Nota sobre el «Nudito actual»

El pedido describe a Nudito como asistente para padres **sin IA**, incluido en Pro. Según el repositorio,
`specs/13-nudito.md` figura como **retirado el 2026-10-31**: se eliminaron la ruta `/nudito`, el widget y la clave
`nudito` de `FEATURES`, y solo se conserva la marca (la mascota). Hay que decidir si el asistente sin IA vuelve a Pro.
Esa decisión es independiente de Nudito+ y queda en «Decisiones pendientes».

## Relación con la implementación existente (specs/28 y specs/29)

El repositorio ya tiene un Nudito+ implementado con **proveedor de IA falso** (sin API key), en
`src/lib/server/nudito-plus/`. Usa otro modelo comercial: licencia por alumno, pagada por la familia con Yape.
**No se propone borrarlo.** Conviene reorientarlo cuando se decida construir.

| Pieza existente | Archivo | ¿Sirve al modelo nuevo? |
|---|---|---|
| Interfaz `ProveedorIA` intercambiable + proveedor falso determinista | `proveedor.ts`, `proveedor-falso.ts` | **Sí, tal cual.** Permite cambiar de proveedor sin tocar el resto y probar sin costo |
| Topes por alumno y mes (mensajes, tokens, USD) y límite de 20/min | `uso.ts`, `licencias.ts` (`limitesNudito`) | **Sí.** Falta agregar el tope **por institución** (sección 8) |
| Medición de costo (`costoEstimadoUsd`, `UsoNudito`) | `uso.ts` | **Sí.** Es la base para facturar o controlar la bolsa |
| Consentimiento de IA versionado y revocable (`ConsentimientoIa`) | `licencias.ts`, `familia.ts` | **Sí.** Sigue siendo necesario aunque pague el colegio (sección 2) |
| Lista blanca de sitios (`SitioPermitido`) y filtro de enlaces | `seguridad.ts`, `src/lib/nudito-plus.ts` | **Sí** |
| Filtros de entrada y salida (riesgo, jerga peruana, datos de terceros, «hazme la tarea») | `seguridad.ts` | **Sí, como primera barrera.** Hay que sumar la moderación del proveedor |
| La familia ve resúmenes y alertas, **nunca las conversaciones**; tampoco el colegio ni el super administrador | `familia.ts`, `resumenes.ts`, exportación | **Sí.** Se mantiene como regla de privacidad del alumno |
| Contexto CNEB del grado, sin datos de otros alumnos | `contexto.ts`, `prompt.ts` | **Sí** |
| Modo hijo (el apoderado abre el chat para un hijo sin cuenta) | `acceso.ts` | Sí, para primaria baja |
| Venta a familias, cola de pagos Yape, precio por defecto **S/ 20/mes** (`PagoNudito`, `nudito_plus:precio`, `nudito_plus:yape`) | `familia.ts`, `plataforma-nudito-plus.ts` | **Contradice el modelo nuevo.** Hay que desactivarlo, no borrarlo |
| `LicenciaNudito` creada por pago de la familia, «no necesita autorización del colegio» | `licencias.ts`, specs/28 | **Contradice.** La licencia debe nacer de un contrato del colegio (`origen = colegio`) y el colegio decide qué alumnos o grados |
| Módulo fijo por plan `pro` (`MODULOS_FIJOS_POR_PLAN`) | `src/lib/modulos.ts` | Depende de la decisión de la sección 12 |
| Landing «por alumno, Yape» | specs/25 | **Contradice.** Hay que corregirla cuando se decida |

Cambio mínimo cuando toque construir: agregar `origen = colegio` a `LicenciaNudito` (ya admite `cortesia | prueba`),
crear licencias en lote por grado o salón desde el panel del colegio y ocultar el flujo de pago familiar detrás de un
interruptor de plataforma. El motor del tutor (specs/29) casi no cambia.

## 1. Objetivo educativo

Que el alumno **aprenda a resolver**, no que obtenga respuestas. Concretamente:

1. Explicar conceptos del grado con ejemplos cercanos (Perú, su edad), alineados a las competencias CNEB del curso.
2. Guiar paso a paso con preguntas (método socrático) y dar pistas graduadas, nunca la solución de una tarea asignada.
3. Proponer práctica breve (2–3 ejercicios) y verificar la respuesta del alumno con retroalimentación.
4. Dar al docente y a la familia una señal agregada de **qué temas cuestan**, sin exponer las conversaciones.

**No es:** un sustituto del docente, un buscador general, un generador de tareas ni un consejero emocional.

## 2. Público objetivo y edades

| Nivel (CNEB) | Grados | Edad típica | Propuesta |
|---|---|---|---|
| Primaria, ciclos III–IV | 1.°–4.° | 6–9 | **Fuera del MVP.** Como mucho, «modo hijo» con el apoderado al lado |
| Primaria, ciclo V | 5.°–6.° | 10–11 | MVP con cuenta propia, solo si el colegio lo habilita (`gradoMinimoCuentaAlumno`) |
| Secundaria, ciclos VI–VII | 1.°–5.° | 12–16 | **Público principal del MVP** |

**Consentimiento (Ley 29733 y su reglamento, a verificar con abogado):**

- La ley exige consentimiento previo, informado, expreso e inequívoco para tratar datos personales. El reglamento
  vigente (aprobado por D.S. 016-2024-JUS, que reemplazó al D.S. 003-2013-JUS; **artículo exacto a verificar**) pide
  el consentimiento de **padres o tutores** para tratar datos de **menores de 14 años**. Desde los 14 el menor puede
  consentir por sí mismo en ciertos casos, salvo excepciones.
- Recomendación prudente: **consentimiento del apoderado para todos los alumnos**, también los de 14 a 17. Así se cubre
  el uso de IA, que es una finalidad distinta de la gestión escolar. Para mayores de 14, sumar además el asentimiento
  del propio alumno. `ConsentimientoIa` ya guarda la versión y permite revocar.
- Aunque pague el colegio, el colegio es el **titular del banco de datos** de sus alumnos y Khipu actúa como
  **encargado del tratamiento**. Hace falta un contrato de encargo que incluya la finalidad «tutoría con IA» y la
  transferencia al proveedor de IA (sección 9).
- Términos de los proveedores para menores: hay que revisar si permiten productos para menores de 18 y con qué
  salvaguardas (**a verificar** en cada caso; Google, en particular, ha tenido cláusulas restrictivas en los términos
  de la API de Gemini sobre servicios dirigidos a menores de 18). Esto puede descartar a un proveedor.

## 3. Funcionalidades candidatas

| Prioridad | Función | Nota |
|---|---|---|
| **MVP** | Chat de tutoría por curso con el contexto CNEB del grado | Ya existe con el proveedor falso |
| **MVP** | Guía sin resolver (pistas graduadas, detecta «hazme la tarea») | Ya existe en el prompt y el filtro |
| **MVP** | Práctica breve generada y corregida por el tutor | Nuevo; solo texto |
| **MVP** | Topes por alumno y por institución, con alerta al 80 % | El tope por alumno ya existe; falta el institucional |
| **MVP** | Resumen semanal de temas para la familia y alertas de seguridad | Ya existe (cron semanal) |
| **MVP** | Panel del colegio: activar por grado o salón, ver el uso agregado | Nuevo (hoy solo hay panel de plataforma) |
| Después | Vista del docente: temas difíciles por salón (agregado, sin conversaciones) | Muy valioso para vender; requiere diseño de privacidad |
| Después | Material del docente como fuente (RAG sobre `documentos`, specs/31) | Mejora la precisión; sube los tokens |
| Después | Pausar Nudito+ durante exámenes (por salón y horario) | Lo pide la regla 4 de la evaluación del modelo de negocio |
| Después | Imágenes (foto del ejercicio), voz | Caro y más riesgoso; no antes de medir |
| Después | Plan de estudio personalizado o repaso espaciado | Necesita historial y evaluación pedagógica |

## 4. Supervisión parental y docente

- **Familia:** autoriza o revoca (`ConsentimientoIa`) y ve el uso del mes, los temas trabajados, las alertas de ánimo,
  dificultad y seguridad (redactadas como resumen, sin citar al alumno), y el resumen semanal. **No ve las
  conversaciones** (regla actual que se mantiene).
- **Docente (después del MVP):** solo indicadores agregados por salón y tema («8 alumnos preguntaron por fracciones
  equivalentes»). Nunca el texto ni el nombre del alumno en temas sensibles.
- **Dirección:** activa o desactiva el servicio, elige los grados, fija topes y horarios, y ve el consumo de la bolsa
  y los costos.
- **Incidentes de seguridad:** una alerta `seguridad` va a la familia y, si el colegio lo acepta en su protocolo, al
  tutor del salón o a psicología. **Pendiente:** definir quién puede leer una conversación ante un incidente grave,
  con qué registro y por cuánto tiempo (hoy nadie puede). Debe decidirse con la revisión legal.
- Todo acceso queda en la auditoría (`auditar()` y `auditoria_plataforma`).

## 5. Seguridad y moderación

| Riesgo | Medida |
|---|---|
| **Prompt injection** («olvida tus reglas», texto pegado de internet, instrucciones dentro de un documento del docente) | Prompt de sistema fijo e inmutable; los datos del alumno y de los documentos van marcados como **datos, no instrucciones**; sin herramientas con efectos (el tutor no escribe en la BD ni navega); filtro de salida independiente del modelo; pruebas de red-team antes del piloto |
| **Contenido inapropiado** (sexual, violento, drogas, odio) | Filtro propio por palabras (ya existe) + moderación del proveedor + filtro de salida que reemplaza respuestas no aptas; tono para su edad |
| **Autolesión, abuso, violencia o acoso** | **No bloquear y callar:** responder con calidez, recomendar hablar con un adulto de confianza, dar Línea 100 y Línea 113 (opción 5) (ya en `seguridad.ts`; **números a verificar** antes del piloto), crear una alerta inmediata a la familia y al contacto del colegio. Nudito no hace consejería. Protocolo de derivación a un humano escrito con el colegio |
| **Que haga las tareas** | El contexto incluye las tareas de los próximos 14 días; si el pedido coincide con una tarea, se activa `GUIA_SIN_RESOLVER`; pistas graduadas; nunca da el resultado final de un ejercicio asignado; ensayos: solo esquema y retroalimentación, no redacción |
| **Datos de otros alumnos** | El contexto nunca trae datos de otros; el filtro de entrada bloquea preguntas por datos de terceros (ya existe) |
| **Enlaces peligrosos** | Solo dominios de `SitioPermitido` (ya existe) |
| **Alucinaciones** | Temperatura baja o estilo conservador, invitar a verificar con el docente, revisión pedagógica de una muestra en el piloto |
| **Abuso de costo** (bots, uso masivo) | 20 mensajes/min (ya existe), tope diario, tope mensual por alumno y bolsa institucional |

## 6. Proveedores de IA

Precios por **millón de tokens (MTok)**, en USD, tarifa estándar y sin impuestos. **Consulta: 2026-11-03.**

| Proveedor / modelo | Entrada | Salida | Entrada en caché (lectura) | Fuente | Estado |
|---|---|---|---|---|---|
| Anthropic **Claude Haiku 5.5** (prompts ≤ 100K) | 0,10 | 0,50 | 0,01 (escritura 0,125) | claude.com/pricing | Confirmado |
| Anthropic **Claude Sonnet 5.5** | 2,00 | 10,00 | 0,10 en la web (escritura 2,50) | claude.com/pricing | Lectura de caché **a verificar** (otra fuente oficial indica 0,20) |
| Google **Gemini 3.1 Flash-Lite** | 0,25 | 1,50 | 0,025 (+ almacenamiento por hora) | aistudio.google.com/docs/pricing | Confirmado |
| Google **Gemini 3.8 Flash** | 0,75 → **1,50 desde 2027-01-01** | 3,75 → **7,50** | 0,075 → 0,15 | aistudio.google.com/docs/pricing | Confirmado; **duplica precio en 2027** |
| OpenAI **GPT-5.4 nano** | 0,20 | 1,25 | 0,02 | costbench.com, pricepertoken.com (terceros) | **A verificar**: openai.com/api/pricing devolvió 403; una fuente lo marca como obsoleto |
| OpenAI **GPT-5.4 mini** | 0,75 | 4,50 | 0,075 | costbench.com, mem0.ai (terceros) | **A verificar** |

Todos ofrecen procesamiento por lotes con 50 % de descuento. Sirve para los resúmenes semanales, no para el chat.

**Criterios de elección, además del precio:**

1. **Política para menores** y términos de uso (puede descartar a un proveedor, ver sección 2). **A verificar.**
2. **No entrenar con datos:** en las API pagadas, los tres declaran no usar los datos para entrenar por defecto.
   Confirmado para Gemini de pago; Anthropic y OpenAI **a verificar** en sus términos vigentes. **El nivel gratuito de
   Gemini sí usa los datos para mejorar productos:** prohibido para Nudito+.
3. **Retención** de los registros en el proveedor (p. ej. ~30 días para monitoreo de abuso) y disponibilidad de
   retención cero. **A verificar** por proveedor.
4. Calidad en español peruano y en razonamiento matemático escolar: medir con un set propio de 100–200 preguntas CNEB
   antes de elegir.
5. Moderación incluida y región de procesamiento.

**Recomendación tentativa:** un modelo pequeño por defecto (Haiku 5.5 o Gemini 3.1 Flash-Lite) y un modelo mediano
solo para casos escalados (p. ej. ≤ 10 % de los mensajes: problemas de varios pasos). La interfaz `ProveedorIA` ya lo
permite. Decidir con el set de evaluación, no por precio.

## 7. Costos por interacción

**Supuestos (explícitos, para revisar con datos del piloto):**

- 1 interacción = 1 mensaje del alumno + 1 respuesta.
- Prompt de sistema + contexto CNEB y tareas: **2 500 tokens**, cacheable. Tasa de acierto de caché: **70 %**
  (los fallos pagan la escritura de caché). El prefijo debe superar el mínimo cacheable del modelo (**a verificar**).
- Historial reciente sin caché + mensaje nuevo: **1 600 tokens** de entrada.
- Respuesta: **250 tokens** (tope `max_tokens` ≈ 400).
- El español usa ~20–30 % más tokens que el inglés; ya está considerado en las cifras.
- **+20 %** de margen por moderación, reintentos y resúmenes.
- Tipo de cambio supuesto: **S/ 3,75 por USD** (**a verificar** al momento de decidir).
- Uso por alumno activo/mes: **bajo 40**, **medio 120**, **alto 300** mensajes (300 = tope actual de specs/29).

**Costo por interacción (USD, incluye +20 %):**

| Modelo | USD / interacción | USD por 1 000 interacciones |
|---|---|---|
| Claude Haiku 5.5 | 0,00048 | 0,48 |
| GPT-5.4 nano (a verificar) | 0,00098 | 0,98 |
| Gemini 3.1 Flash-Lite | 0,0012 | 1,21 |
| GPT-5.4 mini (a verificar) | 0,0036 | 3,62 |
| Gemini 3.8 Flash (precio 2027) | 0,0068 | 6,79 |
| Claude Sonnet 5.5 | 0,0093 | 9,30 |
| **Mixto 90 % Haiku + 10 % Sonnet** | 0,00136 | 1,36 |

**Costo de IA por alumno activo al mes:**

| Modelo | Bajo (40) USD / S/ | Medio (120) USD / S/ | Alto (300) USD / S/ |
|---|---|---|---|
| Claude Haiku 5.5 | 0,02 / 0,07 | 0,06 / 0,22 | 0,14 / 0,54 |
| Gemini 3.1 Flash-Lite | 0,05 / 0,18 | 0,15 / 0,54 | 0,36 / 1,36 |
| Mixto 90/10 | 0,05 / 0,20 | 0,16 / 0,61 | 0,41 / 1,53 |
| Gemini 3.8 Flash (2027) | 0,27 / 1,02 | 0,82 / 3,06 | 2,04 / 7,64 |
| Claude Sonnet 5.5 | 0,37 / 1,40 | 1,12 / 4,19 | 2,79 / 10,46 |

**Ejemplo institucional:** colegio de 400 alumnos, 50 % activos (200), uso medio:
Haiku ≈ USD 12/mes (S/ 44); mixto ≈ USD 33/mes (S/ 122); Sonnet ≈ USD 224/mes (S/ 838).

**Costos no incluidos y probablemente mayores que la IA:** revisión humana de alertas y muestras, soporte al colegio,
asesoría legal y de protección de datos, set de evaluación y red-team, y la infraestructura (Vercel y Supabase ya
pagados por Base y Pro). El tope actual `costoMaxUsdPorMes = 1,5` por alumno es holgado para Haiku y queda corto
para Sonnet con uso alto.

## 8. Límites de uso por institución

| Límite | Valor inicial propuesto (hipótesis) | Estado |
|---|---|---|
| Por minuto, por cuenta | 20 mensajes | Existe |
| Por día, por alumno | 40 mensajes | Nuevo |
| Por mes, por alumno | 300 mensajes / 300 000 tokens / USD 1,5 | Existe (global; pasarlo a configuración por colegio) |
| Largo del mensaje del alumno | 800 caracteres | Existe |
| Largo de la respuesta | ≈ 400 tokens | Nuevo (en el proveedor real) |
| **Bolsa mensual del colegio** | interacciones contratadas; aviso a dirección al 80 % y al 100 % | Nuevo |
| Al agotar la bolsa | Opción del colegio: pausar, pasar a solo modelo pequeño, o comprar recarga | Nuevo |
| Horario | Configurable por colegio (p. ej. 6:00–22:00) y pausa en exámenes | Nuevo |
| Alumnos habilitados | Por grado o salón, elegidos por el colegio | Nuevo |

## 9. Riesgos de privacidad

| Riesgo | Mitigación |
|---|---|
| **Transferencia internacional (flujo transfronterizo)**: los proveedores procesan fuera del Perú | Informarlo en el consentimiento y en el contrato con el colegio; verificar los requisitos del reglamento sobre nivel adecuado de protección y comunicación a la Autoridad Nacional de Protección de Datos Personales (**a verificar**); preferir proveedores con acuerdo de tratamiento de datos (DPA) |
| **Enviar datos identificables al proveedor** | **No enviar** nombre, DNI, correo, colegio, salón ni notas individuales. El contexto lleva grado, curso, competencias y tareas genéricas; el alumno se identifica con un seudónimo interno. El filtro de salida ya oculta correos y celulares; agregar el **enmascarado en la entrada** (nombres propios, teléfonos, direcciones) antes de enviar |
| **Retención** en Khipu | Fijar un plazo (p. ej. conversaciones 90 días, metadatos de temas 1 año escolar) y borrado automático; derechos ARCO. Hoy está pendiente (specs/29) |
| **Retención en el proveedor** | Elegir la opción de retención mínima o cero si está disponible (**a verificar**) |
| **Entrenamiento con datos** | Solo API de pago con «no entrenar» contractual; **nunca** niveles gratuitos |
| **Acceso interno** | Nadie lee conversaciones (regla actual); un acceso ante incidentes solo con protocolo, auditoría y plazo |
| **Exportación del colegio** | Seguir excluyendo las tablas de Nudito+ (`TABLAS_NUDITO_PLUS_PRIVADAS`) |
| **Registro del banco de datos y documento de seguridad** | Revisar con el abogado las obligaciones del colegio (titular) y de Khipu (encargado) |

## 10. Viabilidad comercial

**A favor:**

- El costo de IA con un modelo pequeño es bajo (céntimos por alumno al mes): margen alto si el uso se controla.
- Diferencia a Khipu de un sistema de gestión común y da a Nudito un papel visible.
- Usa datos que solo Khipu tiene (CNEB, tareas, competencias de Pro): difícil de igualar con un chatbot genérico.
- Vender al colegio evita el cobro a familias: sin Yape manual, sin pagos de bajo monto ni boletas por familia, sin
  conflicto con la relación B2B.

**En contra o por validar:**

- Disposición a pagar de los colegios **desconocida**. Muchos ya ven la IA como algo gratis (ChatGPT, Gemini).
- Temor de los colegios a la «trampa» y a la responsabilidad ante un incidente con un menor.
- Costos fijos de cumplimiento (legal, moderación humana) que pesan más con pocos colegios.
- Dependencia de precios del proveedor (ejemplo: Gemini Flash duplica su precio el 2027-01-01).
- Primero hay que vender Base y Pro (piloto VES feb-2027). Nudito+ no debe retrasarlo.

**Conclusión tentativa:** viable técnicamente y en costo de IA; **sin validar comercial ni legalmente**. Corresponde un
piloto acotado y gratuito con 1–2 colegios después de la revisión legal, no desarrollo grande.

## 11. Modelo de precio institucional

**No se fija precio.** Opciones y rangos de costo para decidir después del piloto.

| Opción | Cómo funciona | Pros | Contras |
|---|---|---|---|
| **A. Por alumno activo/mes** | Se cobra solo por alumnos que usaron Nudito+ en el mes | Justo; crece con el uso real; encaja con el precio por alumno de Base/Pro | Ingreso variable; el colegio no sabe cuánto pagará |
| **B. Bolsa de interacciones** | El colegio compra N interacciones al mes o al año; recarga opcional | Costo predecible para ambos; controla el riesgo de consumo | Hay que explicar qué es una «interacción»; posible sobra o falta |
| **C. Por alumno habilitado con tope** | Precio por alumno habilitado; cada uno con tope mensual | Simple de vender y facturar | Paga alumnos que no lo usan; puede verse caro |
| **D. Mixta** | Mínimo mensual por colegio + por alumno activo, con tope por alumno | Cubre costos fijos y escala | Más compleja |

**Márgenes de ejemplo (HIPÓTESIS, no precios):**

Costo total supuesto por alumno activo/mes, uso alto y modelo mixto: IA S/ 1,53 + operación (moderación, soporte,
legal prorrateado) **S/ 0,50 supuesto** ≈ **S/ 2,00**.

| Precio hipotético por alumno activo/mes | Margen bruto aproximado (uso alto) | Margen con uso medio (costo ≈ S/ 1,10) |
|---|---|---|
| S/ 3 | ≈ 33 % | ≈ 63 % |
| S/ 5 | ≈ 60 % | ≈ 78 % |
| S/ 8 | ≈ 75 % | ≈ 86 % |

Con Sonnet como modelo principal el costo de IA por alumno con uso alto (S/ 10,46) haría inviable cualquiera de esos
rangos. Hay que mantener el modelo pequeño por defecto y el tope. El precio definitivo debe compararse con la pensión
del colegio y con lo que cobran Base y Pro (`docs/evaluacion-modelo-de-negocio.md`).

## 12. Complemento de Pro vs. «Khipu Pro+» independiente

| Criterio | **Complemento de Pro** (add-on contratable) | **Khipu Pro+** (tercer plan) |
|---|---|---|
| Simplicidad del catálogo | Mantiene 2 planes; Nudito+ es una línea más del contrato | 3 planes; más fácil de comunicar como «el plan con IA» |
| Flexibilidad | El colegio activa solo ciertos grados y una bolsa a medida | Todo o nada; difícil cobrar por uso real |
| Coherencia con el costo | El cobro sigue al uso (alumno activo o bolsa) | El precio fijo por alumno absorbe el riesgo de consumo |
| Venta | Permite una prueba gratuita sin cambiar de plan | Ancla de precio alta; ayuda a vender Pro por contraste |
| Implementación | Encaja con lo existente: `LicenciaNudito` por alumno + `origen = colegio` + bolsa | Requiere un plan nuevo en `FEATURES`/`plan_modulos` y recalibrar la landing |
| Riesgo | Puede verse como un «extra» caro y quedar sin adopción | Si la IA no convence, arrastra al plan entero; obliga a definir qué más trae Pro+ |
| Colegios Base | Excluidos (Nudito+ necesita datos de Pro) | Igual |

**Recomendación tentativa:** **complemento de Pro**, cobrado por alumno activo o con bolsa (opciones A, B o D),
mientras no haya datos de uso. Volver a evaluar «Pro+» si el piloto muestra que casi todos los colegios Pro lo
contratan, porque entonces un plan único simplifica la venta.

## Decisiones pendientes

1. ¿Complemento de Pro o «Khipu Pro+»? (sección 12)
2. ¿Vuelve el Nudito asistente **sin IA** a Pro? (hoy `specs/13` figura como retirado)
3. Qué hacer con el flujo familiar con Yape de specs/28: desactivarlo detrás de un interruptor (recomendado) y ajustar
   la landing (specs/25), que hoy anuncia «por alumno, Yape».
4. Grados del MVP (propuesta: 5.° primaria a 5.° secundaria) y si hay consentimiento del apoderado para todos.
5. Proveedor y modelo (después del set de evaluación y de revisar los términos para menores).
6. Plazos de retención de conversaciones y protocolo de acceso ante incidentes.
7. Quién recibe las alertas de seguridad en el colegio (tutor, psicología, dirección).
8. Unidad de cobro (alumno activo, bolsa o mixta) y comportamiento al agotar la bolsa.

## Próximos pasos

1. **Revisión legal** (antes de tocar datos reales): Ley 29733 y reglamento vigente (menores de 14, flujo
   transfronterizo, encargo del tratamiento), texto del consentimiento v2, contrato colegio–Khipu, términos de uso de
   cada proveedor para menores y normativa de colegios privados e INDECOPI.
2. **Set de evaluación** de 100–200 preguntas CNEB (matemática, comunicación, ciencia; primaria alta y secundaria),
   incluyendo intentos de trampa, prompt injection y mensajes de riesgo. Correrlo contra 2–3 proveedores con la
   interfaz `ProveedorIA`, sin datos de alumnos.
3. **Verificar precios** marcados «a verificar» (OpenAI, lectura de caché de Sonnet, tipo de cambio) y los términos
   de retención y entrenamiento.
4. **Entrevistas** con 5–8 colegios: interés, miedo a la trampa, quién decide, rango de precio aceptable, bolsa vs.
   por alumno.
5. **Piloto gratuito** (después del lanzamiento de Base y Pro y de la revisión legal): 1–2 colegios Pro, 2–3 salones
   de secundaria, 6–8 semanas, modelo pequeño, topes estrictos y medición de costo real por alumno, uso, alertas y
   satisfacción docente.
6. Con los datos del piloto: fijar el modelo de precio, actualizar specs/28 y specs/29 (modelo institucional) y abrir
   una spec para el panel del colegio y la bolsa.

---

Fuentes de precios (consulta 2026-11-03):
[Anthropic — claude.com/pricing](https://claude.com/pricing) ·
[Google — Gemini API pricing](https://aistudio.google.com/docs/pricing) ·
[OpenAI — openai.com/api/pricing](https://openai.com/api/pricing/) (no accesible: 403) ·
[CostBench — OpenAI API](https://www.costbench.com/software/llm-api-providers/openai-api/) ·
[Price Per Token — GPT-5.4 nano](https://pricepertoken.com/pricing-page/model/openai-gpt-5.4-nano) ·
[mem0 — OpenAI API pricing](https://mem0.ai/library/llms-and-models/openai-api-pricing)
