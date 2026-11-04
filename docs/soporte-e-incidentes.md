# Khipu Escolar — Soporte e incidentes (procedimiento propuesto)

> Estado: **propuesta** · Última actualización: 2026-11-03
> Horarios, tiempos de respuesta y plazos legales **no están aprobados**: aparecen como «[por definir]» o «a validar con abogado». Este documento no fija ningún SLA comprometido con colegios.
> Modelo comercial: `docs/modelo-comercial.md`. Mesa de ayuda: `specs/23-mesa-de-ayuda.md`. Monitoreo: `specs/21-operacion-de-plataforma.md`. Privacidad: `specs/15-privacidad-auditoria-exportacion.md`.

## 1. Dos modalidades de soporte

| | A · Emergencia técnica | B · Soporte funcional |
|---|---|---|
| Para qué | Caída total, indisponibilidad generalizada, fallos graves de inicio de sesión, incidentes de seguridad, errores que impiden operaciones esenciales | Dudas de docentes, registro de notas, consultas administrativas, capacitación, dificultades de uso, problemas no críticos |
| Horario | 24/7 | [por definir] |
| Tiempo de primera respuesta | [por definir] | [por definir] |
| Canal | Mesa de ayuda con prioridad «Urgente» + canal de guardia [por definir: teléfono o WhatsApp del equipo] | Mesa de ayuda (`/soporte` en el colegio) |
| Severidades | S1 y S2 | S3 y S4 |

Regla: si el colegio no sabe qué modalidad usar, escribe por la mesa de ayuda y el equipo clasifica. Ante la duda entre dos severidades, se elige la más alta y se baja después.

## 2. Detectar

| Fuente | Qué detecta | Existe hoy |
|---|---|---|
| Panel `/monitoreo` (spec 21) | Cola de avisos, avisos con error, tope diario de correo (aviso desde 80 %), rebotes y quejas, última ejecución de cada cron (al día ≤ 10 min, atrasado, nunca), exportaciones, accesos de soporte | Sí, pero hay que mirarlo: no envía alertas |
| Webhook SES (spec 06) | Rebotes y quejas de correo; desactiva avisos de esa familia y alerta a la dirección | Sí |
| Mesa de ayuda (spec 23) | Reportes del colegio, con prioridad y captura; correo al buzón del equipo | Sí |
| Monitor externo de disponibilidad (ping a la landing, al login y a una ruta de salud) | Caída total, errores 5xx, lentitud | **No** |
| Alertas automáticas al equipo (correo/teléfono) cuando el cron se atrasa, la cola crece o sube la tasa de error | Fallos silenciosos | **No** |
| Registro de errores de la aplicación (servicio de seguimiento de errores) | Excepciones en servidor y navegador | **No** (solo consola / logs del hosting) |
| Alertas del proveedor (hosting, Supabase, SES, Cloudinary) | Incidentes de terceros | Parcial: depende de suscribirse a sus páginas de estado |
| Revisión de accesos (auditoría de plataforma y del colegio, `LoginIntento`) | Accesos sospechosos, fuerza bruta | Datos sí; alertas no |

Rutina mínima propuesta mientras no haya alertas automáticas: revisar `/monitoreo` y `/mesa-ayuda` al inicio de la jornada escolar ([hora por definir], antes del ingreso) y al mediodía.

## 3. Clasificar

| Severidad | Definición | Ejemplos escolares | Modalidad |
|---|---|---|---|
| **S1 · Crítica** | Servicio caído o inutilizable para uno o varios colegios, o incidente de seguridad/datos confirmado o probable | La plataforma no carga para nadie · nadie puede iniciar sesión · portería no registra ingresos a las 7:30 en un colegio entero · fuga o exposición de datos de alumnos o familias (un apoderado ve datos de otro colegio o de otro alumno) · cuenta de dirección o super administrador comprometida · borrado o corrupción masiva de datos | A |
| **S2 · Alta** | Una función esencial falla para un colegio o un grupo grande, sin alternativa razonable | No salen los avisos de falta o tardanza a las familias (cola detenida, cron atrasado, SES bloqueado) · la lista de asistencia no se guarda en varios salones · el escáner QR falla en hora de ingreso pero se puede registrar a mano · login falla para todos los apoderados de un colegio · notas no se guardan durante el cierre de periodo | A |
| **S3 · Media** | Una función falla para una persona o un caso, o hay alternativa | Un docente no ve uno de sus cursos · un reporte PDF o Excel sale con un error · una libreta se genera con formato incorrecto · un apoderado no recibe push en su celular · la carga masiva rechaza un archivo válido | B |
| **S4 · Baja** | Duda, consulta, pedido de capacitación o mejora | «¿Cómo registro una justificación?» · «¿Cómo cambio el horario de un salón?» · pedido de una nueva columna en un reporte · error de texto | B |

Mapeo con la mesa de ayuda actual: prioridad «Urgente» ≈ S1, «Alta» ≈ S2, «Normal» ≈ S3, «Baja» ≈ S4. La prioridad que elige el colegio es una sugerencia: el equipo la corrige al clasificar (el cambio queda como mensaje de sistema y en la auditoría `mesa_prioridad`).

## 4. Escalar

**Roles** (en un equipo pequeño una persona puede tener varios, pero en cada incidente S1/S2 deben quedar nombrados):

| Rol | Responsabilidad |
|---|---|
| Guardia de turno | Recibe alertas y reportes fuera de horario; confirma, clasifica y abre el incidente |
| Responsable del incidente | Coordina, decide y lleva la línea de tiempo; no tiene que ser quien arregla |
| Técnico | Diagnostica y corrige |
| Comunicación | Habla con el responsable del colegio (spec 20, contacto principal) |
| Responsable de privacidad | Obligatorio si hay datos personales involucrados; decide notificaciones legales con el abogado |

**Guardia:** rotación semanal [por definir], con un titular y un respaldo. Fuera de horario, solo se atiende modalidad A.

**Escalamiento:**
1. Guardia confirma el problema ([tiempo por definir]).
2. Si es S1, avisa de inmediato al resto del equipo por el canal interno [por definir].
3. Si en [tiempo por definir] no hay avance, se suma el respaldo.
4. Si la causa es de un proveedor (hosting, Supabase, SES, Cloudinary), se abre caso con el proveedor y se sigue su página de estado.
5. Si hay datos personales, entra el responsable de privacidad (sección 8).

**Canales:**
- Colegio → Khipu: mesa de ayuda (`/soporte`); para S1/S2 fuera de horario, canal de guardia [por definir].
- Khipu → colegio: mesa de ayuda, correo al contacto principal y, si el incidente es de varios colegios, un aviso general [mecanismo por definir; hoy no existe un banner de estado de plataforma para colegios].
- Interno: canal del equipo [por definir].

## 5. Atender

1. **Abrir registro.** Toda S1/S2 tiene una conversación en la mesa de ayuda (si la reportó el colegio) y un registro interno de incidente con hora de inicio. Las notas internas de la mesa de ayuda sirven para la línea de tiempo (el colegio no las ve).
2. **Contener antes de arreglar.** Ejemplos: reprocesar la cola desde `/monitoreo` («Procesar la cola ahora», «Reintentar» por colegio); pedir al colegio el modo manual (lista en papel, registro manual en portería) mientras se corrige; revertir el último despliegue; cerrar sesiones o desactivar una membresía comprometida (`/usuarios`, spec 21).
3. **Diagnosticar** con el acceso de soporte de solo lectura (spec 16): con motivo, duración de 30–120 min, aviso automático a la dirección y auditoría. No permite ver chats, notas ni libretas; no se debe pedir al colegio su contraseña.
4. **Corregir y verificar** con el colegio que la función volvió (por ejemplo: un ingreso de prueba en portería).
5. **Recuperar lo pendiente:** reenviar avisos no enviados, revisar si el control de ingreso automático marcó faltas incorrectas durante la caída y corregirlas con el colegio.

Regla de privacidad en la atención: no pedir ni copiar datos personales de alumnos en la mesa de ayuda si no es necesario (el aviso ya está en `/soporte`).

## 6. Comunicar al colegio

| Momento | S1 | S2 | S3/S4 |
|---|---|---|---|
| Acuse de recibo | Inmediato [plazo por definir] | [por definir] | Respuesta de la mesa de ayuda |
| Actualizaciones | Cada [por definir] aunque no haya novedad | Cada [por definir] | Al cambiar el estado |
| Cierre | Mensaje de resolución + resumen escrito | Mensaje de resolución | Mensaje de resolución |
| Post-mortem para el colegio | Sí, resumen sin detalles internos sensibles | Si el colegio lo pide | No |

Plantilla breve de comunicación:
> «Estamos atendiendo un problema que afecta a [función]. Empezó a las [hora]. Mientras tanto puedes [alternativa manual]. Te escribiremos de nuevo a las [hora] o antes si se resuelve.»

Si el colegio debe avisar a sus familias, Khipu le propone un texto, pero el comunicado lo firma y lo envía el colegio.

## 7. Cerrar y post-mortem

- El incidente se cierra cuando la función está restablecida, verificada con el colegio y lo pendiente se recuperó.
- En la mesa de ayuda: «Resuelto»; se cierra solo tras 7 días sin actividad (ya implementado).
- **Post-mortem obligatorio para S1 y para toda S2 que se repita**, dentro de [plazo por definir], sin culpas:
  1. Resumen y colegios afectados.
  2. Línea de tiempo (detección, respuesta, contención, resolución).
  3. Impacto (cuántos usuarios, qué se dejó de hacer, avisos perdidos).
  4. Causa raíz.
  5. Qué funcionó y qué no.
  6. Acciones con responsable y fecha (código, pruebas, monitoreo, documentación).
- Las acciones de código siguen la norma del repositorio: spec actualizada y registro en `conversaciones/`.
- Revisión mensual de incidentes y de métricas de la mesa de ayuda (primera respuesta, valoración, categorías frecuentes).

## 8. Incidentes de seguridad y datos personales (Ley 29733)

**Roles legales.** El colegio es el **titular del banco de datos / responsable del tratamiento**; Khipu actúa como **encargado del tratamiento**. Esto debe quedar en el contrato (ver `docs/terminos-del-servicio-borrador.md`). En consecuencia, la obligación de comunicar a los titulares (familias) y a la autoridad recae principalmente en el colegio, con asistencia de Khipu, **salvo lo que el abogado determine** (a validar con abogado).

**Qué cuenta como incidente de datos:** acceso no autorizado, divulgación, pérdida, alteración o destrucción de datos personales de alumnos, familias o personal. Ejemplos: un usuario ve datos de otro colegio; un enlace de justificación o archivo privado expuesto públicamente; credenciales de un super administrador filtradas; una exportación ZIP descargada por quien no debía; un respaldo o `.env` publicado.

**Procedimiento:**
1. Tratar siempre como **S1**.
2. **Contener:** revocar accesos y sesiones, rotar claves y secretos, cerrar el acceso de soporte, retirar enlaces o archivos expuestos.
3. **Preservar evidencia:** auditoría del colegio y de plataforma, `LoginIntento`, registros del hosting y de Supabase. No borrar nada.
4. **Evaluar:** qué datos, de cuántas personas, de qué colegios, si hay menores de edad (siempre en este producto), si los datos eran sensibles (salud en justificaciones, por ejemplo).
5. **Notificar al colegio responsable sin demora** — plazo: [por definir; a validar con abogado].
6. **Apoyar al colegio** en la notificación a la **Autoridad Nacional de Protección de Datos Personales** (Ministerio de Justicia y Derechos Humanos) y a los titulares afectados — plazos y contenido: **a validar con abogado** (considerar el Reglamento de la Ley 29733 vigente).
7. Registrar el incidente (registro de incidentes de seguridad), aunque se concluya que no hubo afectación.
8. Post-mortem con medidas de seguridad nuevas.

## 9. Qué ya existe y qué falta

**Ya existe (specs 15, 16, 21, 23):**
- Mesa de ayuda colegio ↔ equipo con estados, prioridad (urgente a baja), categorías, capturas, notas internas, asignación, valoración 1–5, cierre automático a 7 días y auditoría.
- Indicador de espera (SLA visual) por horas hábiles aproximadas: normal ≤ 2 h, ámbar > 2 h, rojo > 8 h. **Es una referencia interna, no un compromiso con el colegio.**
- Correo al buzón del equipo al abrir una conversación; horario de atención configurable (por defecto «Lunes a viernes, 8:00 a. m. – 6:00 p. m.», pendiente de aprobar).
- Monitoreo de cola de avisos, cron, rebotes/quejas y exportaciones; reintento manual.
- Acceso de soporte de solo lectura, con motivo, vencimiento, aviso a la dirección y auditoría.
- Gestión de usuarios (recuperación de contraseña, desactivar membresías) y auditoría de plataforma.
- Exportación del colegio y borrado controlado por script.

**Falta:**
- [ ] Monitor externo de disponibilidad y una ruta de salud.
- [ ] Alertas automáticas al equipo (cron atrasado, cola creciendo, errores 5xx, tope de correo).
- [ ] Seguimiento de errores de la aplicación.
- [ ] Canal de emergencia 24/7 fuera de la aplicación (si la plataforma está caída, la mesa de ayuda también lo está).
- [ ] Severidades S1–S4 en la mesa de ayuda (hoy solo prioridad) y una marca de «incidente» que agrupe varias conversaciones de un mismo problema.
- [ ] Aviso de estado del servicio para todos los colegios (banner o página de estado).
- [ ] Registro de incidentes y plantilla de post-mortem.
- [ ] Rotación de guardia y lista de contactos.
- [ ] El SLA visual no descuenta feriados y no distingue modalidad A de B.
- [ ] Mesa de ayuda solo para dirección (y administrativo habilitado): definir cómo reportan docentes y portería (hoy, a través de la dirección).
- [ ] Procedimiento de respaldo y restauración probado (Supabase).
- [ ] Revisión legal de plazos de notificación y del contrato de encargo.

## Decisiones pendientes

- [ ] Horario de la modalidad B.
- [ ] Tiempos de acuse, actualización y resolución por severidad (no se publican hasta tener guardia real).
- [ ] Canal de guardia 24/7 y quién lo cubre.
- [ ] Si la modalidad A se ofrece igual en Base y Pro (hoy: sí, la mesa de ayuda está en ambos).
- [ ] Plazos legales de notificación de incidentes (abogado).
