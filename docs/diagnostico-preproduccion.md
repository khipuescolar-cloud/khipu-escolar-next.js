# Diagnóstico para preproducción (2026-11-03)

> Auditoría del código en `dev` (HEAD `3acbb57`, antes de la consolidación) contra el modelo aprobado
> (`docs/modelo-comercial.md`). Las acciones marcadas «hecho» se implementaron en local en esta sesión; las marcadas
> «decisión» esperan validación del equipo fundador.

## Matriz

| # | Requisito | Estado encontrado | Diferencia | Acción | Riesgo | Prioridad |
|---|---|---|---|---|---|---|
| 1 | Planes Base y Pro con identificadores coherentes | Enum `Plan = base \| pro` desde la migración `20261031100000_planes_base_pro` | Solo restos cosméticos en nombres de tests y documentos de marca | Ninguna migración necesaria; aviso «histórico» en docs de marca | Bajo | Baja |
| 2 | Base: gestión, asistencia, portería, justificaciones, comunicación, reportes | Implementado; `horario` también está en Base | Faltaban permisos, salida y la bandeja interna en Base | Hecho: permisos, salida, bandeja en Base | Medio | Alta |
| 3 | Pro: académico completo | Implementado (notas, competencias, capacidades/desempeños, criterios, periodos, auditoría, recuperación, libretas, tablero) + tareas, agenda, documentos, reuniones | «Indicadores» = criterios (no hay entidad aparte) | Decisión: confirmar que criterios cubren indicadores | Bajo | Baja |
| 4 | «Nudito actual» dentro de Pro | **No existe**: retirado el 2026-10-31 (commit `3a1f876`) | El requisito asume que existe | Decisión: restaurarlo desde git o quitarlo de la definición de Pro | Alto | Alta |
| 5 | Nudito+ no disponible ni vendido a familias | Implementado como licencia por alumno pagada por la familia (Yape, S/ 20), visible en menú, landing y cron | Contradice el modelo | Hecho: interruptor `NUDITO_PLUS_DISPONIBLE = false`, landing sin Nudito+, cron inerte; código y datos intactos | Alto | Alta |
| 6 | Sin precios publicados | Landing sin precio salvo el S/ 20 de Nudito+; el catálogo publicaría al instante cualquier precio cargado | Riesgo de publicar tarifas provisionales | Hecho: `PUBLICAR_PRECIOS = false` | Medio | Alta |
| 7 | Rangos 1–100…>1.000 | El catálogo admite un precio por alumno + mínimo mensual | No modela rangos | Decisión: modelar rangos cuando haya precios | Bajo | Media |
| 8 | Piloto 6–8 semanas gratis | Landing ofrecía «una semana» / «un mes de marcha blanca» | Duración distinta | Hecho: textos de piloto | Medio | Alta |
| 9 | Impagos con revisión humana, sin cortar avisos críticos | Suspensión manual que corta todo (login, portería, avisos de falta); sin recordatorios | Corta avisos críticos | Hecho: advertencia en el panel. Pendiente: recordatorios y modo «restringido» | Medio | Media |
| 10 | Dominio no inventado | `khipuescolar.pe` fijo en fallbacks de correo/push y textos de UI | Dominio no confirmado | Hecho: fallbacks neutros; docs con `<dominio>` | Medio | Media |
| 11 | Tardanza y permiso no generan NSP | Tardanza OK; permisos no existían (falta automática 09:00 → NSP) | Faltaba el permiso | Hecho: `PermisoAsistencia` excluye falta automática y NSP | Alto | Alta |
| 12 | Retiro anticipado autorizado | Genera falta y NSP (caso 12 de specs/37, decisión anterior) | Choca con «permisos autorizados no generan NSP» | Decisión | Alto | Alta |
| 13 | Ingreso **y salida** | Solo llegada | Faltaba salida | Hecho: salida QR/manual idempotente | Medio | Alta |
| 14 | Justificación 15 días calendario revisada por el tutor | Plazo OK; revisa tutor **o dirección** | Dirección también aprueba | Decisión: ¿solo el tutor? | Bajo | Media |
| 15 | Aviso a docentes al aprobar justificación | Solo correo, ignoraba preferencias | Sin push ni bandeja | Hecho: correo + push + bandeja con preferencias; texto neutro | Medio | Media |
| 16 | Notificaciones internas y push para lo habitual | Bandeja solo para notas (Pro) | Tareas, agenda, mensajes, comunicados no llegaban | Hecho: bandeja general | Medio | Alta |
| 17 | Correo solo para lo importante | Correo por tarea, evaluación programada, mensaje y todo comunicado; también por cada llegada | Correos rutinarios | Hecho: tarea/agenda/mensaje solo push+bandeja; comunicado con casilla «Importante». **Decisión:** correo de llegada diaria | Alto (costo, fatiga) | Alta |
| 18 | Sin duplicados | Corrección de nota mandaba 2 push | Duplicado | Hecho | Medio | Media |
| 19 | Copias (CC) a apoderados | No hay CC/BCC; un correo por destinatario; specs/06 no tiene regla de copias | Ninguna | — | Bajo | — |
| 20 | Resumen diario retirado | Ya no se invoca; quedaban tabla, columna, plantillas y un texto de UI | Restos | Hecho: limpieza de código y specs; tabla y columna se conservan (procedimiento de retiro en specs/38) | Bajo | Media |
| 21 | Reportes por alumno, sección, grado y periodo; PDF y Excel/CSV | Sin grado ni CSV | Faltaban | Hecho | Medio | Media |
| 22 | Cron eficiente | Vencimientos NSP: N+1 y tope de 2.000 sin orden | Vencidos podían no aplicarse | Hecho | Medio/Alto | Alta |
| 23 | Auditoría de notas | Borrar una evaluación publicada borraba notas e historial en cascada | Pérdida de auditoría | Hecho: bloqueo + FK RESTRICT | Alto | Alta |
| 24 | Recuperación solo por el docente del curso | El tutor podía decidir en cursos ajenos | Contradecía specs/37 | Hecho | Alto | Alta |
| 25 | Libreta publicada conserva su versión | Congelada; DELETE no bloqueado; emisión sin transacción | Riesgo de pérdida | Hecho: bloqueo de DELETE y emisión idempotente | Alto | Alta |
| 26 | Política de rectificación | La aprobación de dirección crea y publica la v2 al instante; v1 invisible; quien pide puede aprobar; evidencia opcional | El requisito original separaba autorización y emisión | **Decisión** (opciones A–D en specs/37) | Alto | Alta |
| 27 | Calificación del periodo visible antes de publicar libreta | La familia la ve en vivo | Posible fuga de resultados no oficiales | Decisión | Medio | Alta |
| 28 | Consecuencia por nivel | Una escala por colegio | Colegios con literal y vigesimal | Decisión | Medio | Media |
| 29 | Aislamiento entre colegios | `dbTenant`, RLS cerrado, route handlers protegidos | **Crítico:** una dirección podía tomar cuentas de otro colegio (perfil global + reinicio al DNI) | Hecho: bloqueo en alta, edición y reinicio | Crítico | P0 |
| 30 | Redirecciones seguras | `/\evil.example` escapaba en callback y cambio de contraseña | Redirección abierta | Hecho | Medio | Alta |
| 31 | Modo soporte sin datos sensibles | Veía adjuntos de salud y carnets QR | Exceso de acceso | Hecho | Medio | Alta |
| 32 | Cabeceras de seguridad | Ninguna | Clickjacking | Hecho (sin CSP completa) | Medio | Media |
| 33 | Contraseña inicial = DNI; super admin sin MFA | Vigente | Riesgo alto antes de datos reales | Propuesta: contraseña aleatoria + enlace; MFA TOTP | Alto | Alta |
| 34 | Respaldos | Solo backups diarios del plan Supabase (no verificados) | Sin restauración probada | Propuesta en `docs/respaldos-y-exportacion.md` | Alto | Alta |
| 35 | Exportación institucional | ZIP JSON por tabla, solo dirección o super admin; un colegio suspendido no puede exportar; el ZIP excede límites de Cloudinary/Vercel con archivos | Incompleta para fin de contrato | Propuesta en `docs/respaldos-y-exportacion.md` | Medio | Alta |
| 36 | Límites de Vercel | Cuerpo máx. 4,5 MB vs adjuntos de 10 MB; funciones en `iad1` con BD en São Paulo | No documentados | Propuesta: subida directa a almacenamiento y región `gru1` (requiere autorización de despliegue) | Medio | Alta |
| 37 | Monitoreo y soporte 24/7 | `/monitoreo` interno sin alertas, sin seguimiento de errores ni monitor externo | Insuficiente para 24/7 | Propuesta en `docs/soporte-e-incidentes.md` | Medio | Media |
| 38 | Ley 29733 | Consentimiento versionado; sin texto legal, banco de datos, contrato de encargo ni retención | Pendiente legal | Revisión profesional | Alto | P0 antes de datos reales |

## Documentos de esta consolidación
- `docs/modelo-comercial.md` — modelo vigente (reemplaza a `docs/evaluacion-modelo-de-negocio.md`).
- `docs/infraestructura-y-costos.md` — carga y costos por tamaño de colegio.
- `docs/respaldos-y-exportacion.md` — respaldos operativos y exportación institucional.
- `docs/soporte-e-incidentes.md` — emergencia 24/7 y soporte funcional.
- `docs/terminos-del-servicio-borrador.md` — borrador funcional, no legal.
- `docs/nudito-plus-viabilidad.md` — estudio de Nudito+ (sin código).
