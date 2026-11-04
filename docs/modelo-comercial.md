# Khipu Escolar — Modelo comercial vigente

> Estado: **aprobado (modelo) · sin precios** · Última actualización: 2026-11-03
> Este es el único resumen vigente del modelo comercial. Si otro documento dice algo distinto, manda este. Los precios, horarios y tiempos de respuesta todavía no están aprobados: aparecen como «[precio por definir]» o «[por definir]».

## En una frase

Khipu Escolar se vende al colegio. El colegio paga un plan anual (Khipu Base o Khipu Pro), en cuotas mensuales, según cuántos alumnos activos tiene matriculados. Las familias, los docentes y el personal no pagan nada.

## Principios

1. **Paga el colegio.** No se cobran suscripciones a padres ni a alumnos.
2. **Dos planes de lanzamiento:** Khipu Base y Khipu Pro. Nudito+ es una línea futura y **hoy no se vende**.
3. **El precio depende de los alumnos matriculados activos.** No se cobran cuentas de docentes, administrativos ni apoderados.
4. **Contrato anual, pago mensual.** El rango de alumnos se revisa en la renovación.
5. **La implementación está incluida.**
6. **Primero un piloto gratuito.** El contrato empieza solo si el colegio acepta la propuesta al terminar.
7. **Nunca se borran datos por deuda** y nunca se suspenden las notificaciones críticas.

## Planes

| Funcionalidad | Khipu Base | Khipu Pro |
|---|:-:|:-:|
| Gestión institucional (alumnos, salones, cursos, docentes, personal, apoderados, carga masiva) | Sí | Sí |
| Control de ingreso y salida; portería con carnet QR | Sí | Sí |
| Asistencia por clase y tardanzas | Sí | Sí |
| Permisos y justificaciones | Sí | Sí |
| Comunicados | Sí | Sí |
| Mensajería familia–docente | Sí | Sí |
| Notificaciones internas y push (PWA instalable) | Sí | Sí |
| Correos importantes a las familias | Sí | Sí |
| Reportes de asistencia en PDF y Excel | Sí | Sí |
| Mesa de ayuda (soporte Khipu) y exportación de datos del colegio | Sí | Sí |
| Actividades y registro de notas | — | Sí |
| Competencias, capacidades, desempeños y criterios (CNEB) | — | Sí |
| Periodos académicos | — | Sí |
| Auditoría académica | — | Sí |
| Recuperaciones | — | Sí |
| Reportes académicos | — | Sí |
| Libretas | — | Sí |
| Nudito (asistente actual) | — | Sí |
| Nudito+ | No disponible | No disponible (futuro) |

**Khipu Base** = asistencia y comunicación. **Khipu Pro** = todo Base + gestión académica.

**Nudito+** queda como producto futuro. Aún no se decide si será un complemento de Pro o un plan aparte (Pro+). Mientras tanto no se ofrece, no se cotiza y no se promete en ventas ni en la landing.

## Rangos y precios

El precio mensual se fija por rango de **alumnos matriculados activos** al firmar el contrato.

| Rango (alumnos activos) | Khipu Base (mensual) | Khipu Pro (mensual) |
|---|---|---|
| 1 – 100 | [precio por definir] | [precio por definir] |
| 101 – 300 | [precio por definir] | [precio por definir] |
| 301 – 600 | [precio por definir] | [precio por definir] |
| 601 – 1.000 | [precio por definir] | [precio por definir] |
| Más de 1.000 | Cotización | Cotización |
| Multisede (cualquier tamaño) | Cotización | Cotización |

- Solo cuentan los alumnos en estado activo. Las cuentas de docentes, administrativos, portería, dirección y apoderados son ilimitadas y no se cobran.
- Si durante el año el colegio supera su rango, no se le cobra más en ese contrato. El rango se ajusta en la renovación.
- El panel de plataforma ya compara alumnos activos con alumnos contratados y avisa si se pasa (spec 20).

## Contratación

- **Duración:** anual.
- **Pago:** mensual, por transferencia bancaria.
- **Facturación:** manual (comprobante emitido por el equipo).
- **Sin cobros automáticos** ni pasarela de pagos.
- **Revisión del rango:** en cada renovación, según los alumnos activos del momento.
- **Registro interno:** la suscripción y los pagos se llevan a mano en el panel de plataforma (`/suscripciones`, spec 20).

## Implementación (incluida en el plan)

| Incluido | No incluido (se evalúa aparte) |
|---|---|
| Configuración del colegio: niveles, grados, salones, horarios, roles y módulos | Migración de datos históricos de años anteriores |
| Importación de los datos del año vigente (alumnos, apoderados, docentes, cursos) | Integraciones con otros sistemas |
| Capacitación a dirección, administrativos, docentes y portería | Desarrollos a medida |
| Activación de los módulos del plan contratado | |

## Piloto

**Condiciones**

- 1 a 2 colegios.
- 6 a 8 semanas.
- Gratis. Sin cobros automáticos ni compromiso de compra.
- Primero se trabaja con **datos ficticios**. Los datos reales entran solo después de validar seguridad, documentación y requisitos legales (contrato de encargo de tratamiento, política de privacidad y consentimiento revisados por un abogado).

**Cierre del piloto**

1. Khipu presenta los resultados medidos.
2. Khipu entrega una propuesta comercial (plan, rango y precio).
3. El colegio decide.
4. Solo si el colegio acepta por escrito empieza el contrato anual. Si no acepta, se le ofrece la exportación de sus datos y no se cobra nada.

**Checklist de métricas de uso** (desde el panel de plataforma y los registros del sistema)

- [ ] Días hábiles con asistencia registrada / días hábiles del piloto.
- [ ] Porcentaje de salones que pasan lista cada día.
- [ ] Ingresos registrados en portería por día y hora pico.
- [ ] Tardanzas, faltas y justificaciones registradas y resueltas.
- [ ] Avisos enviados por canal (correo, push) y tasa de apertura (meta del sistema: 70 %).
- [ ] Apoderados con cuenta activa / apoderados invitados.
- [ ] Comunicados publicados y leídos.
- [ ] Conversaciones familia–docente y tiempo medio de respuesta del docente.
- [ ] Docentes y administrativos que ingresan al menos una vez por semana.
- [ ] (Pro) Notas registradas, periodos cerrados y libretas publicadas.
- [ ] Reportes de asistencia y académicos descargados.
- [ ] Consultas en la mesa de ayuda: cantidad, categoría, tiempo de primera respuesta y valoración.

**Checklist de registro de problemas**

- [ ] Cada problema queda como conversación en la mesa de ayuda o en el registro de incidentes (`docs/soporte-e-incidentes.md`).
- [ ] Severidad asignada (S1–S4), causa y solución anotadas.
- [ ] Revisión semanal con el colegio de los problemas abiertos.

**Checklist de feedback**

- [ ] Docentes: facilidad para pasar lista y registrar notas; tiempo que les ahorra o les quita; qué les falta.
- [ ] Administrativos: carga masiva, justificaciones, reportes; qué tareas siguen haciendo fuera de Khipu.
- [ ] Portería: velocidad del escaneo en hora pico; funcionamiento sin conexión.
- [ ] Apoderados: utilidad de los avisos de llegada y falta; claridad de los comunicados; facilidad de la mensajería.
- [ ] Dirección: valor percibido, disposición a pagar y plan que elegiría.
- [ ] Encuesta corta al inicio y al final del piloto; una entrevista con dirección al cierre.

## Impagos

1. Recordatorios progresivos (por ejemplo: aviso previo al vencimiento, aviso el día del vencimiento, avisos posteriores). Los días exactos están [por definir].
2. Antes de restringir cualquier función, **una persona del equipo revisa el caso** y habla con el responsable del colegio.
3. Si se restringe, se limita a funciones no críticas [alcance por definir].
4. **Nunca se borran datos por deuda.**
5. **Nunca se suspenden notificaciones críticas** (ingreso, salida, faltas y avisos de seguridad a las familias).
6. El colegio siempre puede pedir la exportación de sus datos.

## Fin del contrato y exportación

- Propuesta: el colegio tiene **60 días** después de terminado el contrato para exportar sus datos (sujeto a revisión legal).
- No hay borrado automático. El borrado se hace solo por pedido o acuerdo, con el script controlado del equipo (spec 15).
- La exportación ya existe: ZIP con todas las tablas del colegio y sus archivos, pedido por dirección (spec 15).

## Soporte

| Modalidad | Qué cubre | Horario | Tiempo de respuesta |
|---|---|---|---|
| A · Emergencia técnica | Caída total, indisponibilidad generalizada, fallos graves de inicio de sesión, incidentes de seguridad, errores que impiden operaciones esenciales (por ejemplo, portería o asistencia) | 24/7 | [por definir] |
| B · Soporte funcional | Dudas de docentes, registro de notas, consultas administrativas, capacitación, dificultades de uso, problemas no críticos | [por definir] | [por definir] |

Detalle del procedimiento en `docs/soporte-e-incidentes.md`.

## Qué reemplaza o deja obsoleto de `docs/evaluacion-modelo-de-negocio.md`

Ese documento (30/10/2026) fue una evaluación previa. Lo siguiente **ya no vale**:

| Propuesta antigua | Ahora |
|---|---|
| Modelo B2B2C: la familia como segundo cliente que paga | Solo paga el colegio. Sin suscripciones a padres |
| Nudito+ vendido a familias por estudiante, con cobro por Yape y descuento por hermano (reglas 1–8 de Nudito+) | Nudito+ es futuro, sin decidir si es complemento de Pro o plan Pro+; no disponible |
| Precio por alumno activo al mes con mínimo mensual | Precio fijo mensual por **rango** de alumnos activos |
| Implementación como pago único opcional | Implementación incluida; solo las migraciones históricas se evalúan aparte |
| Extras de WhatsApp y SMS por paquete | Canales retirados (2026-10-31); avisos solo por correo y push |
| Contrato anual, mensual o ambos (decisión abierta) | Contrato anual, pago mensual |
| Piloto «sin costo o con descuento a cambio de testimonios» | Piloto gratis de 6–8 semanas con 1–2 colegios y cierre con propuesta |
| Suscripción familiar, pasarela, cobro recurrente y comprobantes para familias (cambios imprescindibles 1–7) | Fuera del alcance comercial actual |
| Entregable 8: decisiones comerciales de Nudito+ (unidad de cobro, comisión al colegio, nombre) | Postergadas hasta que se defina Nudito+ |
| Fase 3 del roadmap como «Nudito+ para familias» | Nudito+ se redefinirá como producto institucional futuro |
| Tablero completo, agenda/reuniones y documentos como diferenciadores de Pro | Pro se define por la lista de este documento; esos módulos no forman parte del argumento comercial de lanzamiento |

Sigue siendo útil de ese documento: el análisis del estado del código, los costos recurrentes a medir, las preguntas para validar con colegios y la lista de pendientes legales del lado institucional.

**Documentos que hay que alinear con este modelo** (no se modificaron aquí): `specs/25-landing-publica.md` y la landing (hoy anuncia Nudito+ como licencia mensual que paga la familia por Yape), `specs/28-licencias-nudito-plus.md` y `specs/29-nudito-plus-tutor.md` (Nudito+ con pago familiar), `specs/03` y `specs/19` (catálogo de planes) y `specs/26` (opciones del formulario de demo).

## Decisiones pendientes

**Comerciales**
- [ ] Precio mensual de Base y Pro para cada rango.
- [ ] Cómo se cotiza más de 1.000 alumnos y multisede.
- [ ] Qué pasa si el colegio crece de rango a mitad de año (hoy: se ajusta en la renovación).
- [ ] Meses de cobro: 12 cuotas o solo los del año escolar.
- [ ] Moneda e IGV en los precios publicados.
- [ ] Condiciones de cambio de plan (Base → Pro) durante el contrato.
- [ ] Formato de Nudito+: complemento de Pro o plan Pro+, y cuándo.
- [ ] Colegios del piloto, fechas y responsable del seguimiento.

**Operativas**
- [ ] Horario del soporte funcional (modalidad B).
- [ ] Tiempos de respuesta de ambas modalidades.
- [ ] Canal de contacto para emergencias fuera de horario (teléfono de guardia u otro).
- [ ] Calendario de recordatorios de impago y alcance de una restricción.
- [ ] Proceso de facturación manual (quién emite, plazos, comprobante electrónico SUNAT).

**Legales** (con abogado)
- [ ] Términos del servicio (borrador en `docs/terminos-del-servicio-borrador.md`).
- [ ] Contrato de encargo de tratamiento de datos (colegio responsable, Khipu encargado).
- [ ] Plazo de 60 días para exportar tras el fin del contrato.
- [ ] Política de privacidad, consentimiento e inscripción del banco de datos.
- [ ] Plazos de notificación de incidentes de seguridad a la Autoridad Nacional de Protección de Datos Personales.
