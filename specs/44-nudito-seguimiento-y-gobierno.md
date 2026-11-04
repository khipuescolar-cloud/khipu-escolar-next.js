# 44 — Nudito: seguimiento, gobierno institucional, privacidad y fin de las licencias familiares

> Estado: borrador (paso 0: esqueletos) · Plan: Khipu Pro · Última actualización: 2026-11-14 (Claude Code, paso 0) · Responsable: Dev D

## Objetivo
Que docentes y familias vean el **progreso formativo** de Nudito (specs/41) dentro de su alcance; que cada colegio encienda y
gobierne Nudito (límites, retención, fotos); y dejar **inerte**, sin borrar datos, el modelo de licencias familiares con Yape
(specs/28).

## Responsabilidades (Dev D)
- Progreso: `src/lib/server/nudito/progreso.ts` y páginas `/nudito/seguimiento` (docente y dirección) y el panel del apoderado.
- Interruptor institucional y configuración: `config-colegio.ts` + página de configuración de dirección.
- Acceso: adaptar `src/lib/server/nudito-plus/acceso.ts`: la licencia se reemplaza por configuración del colegio + grado y área
  habilitados; se mantienen el modo hijo y el consentimiento.
- Retención (`retencion.ts`) en el cron semanal `/api/cron/nudito-plus` (resúmenes + purga).
- Fotos privadas (`fotos.ts`).
- Licencias inertes, menú, plataforma, exportación y consentimiento v2.

## Roles y permisos (seguimiento)
| Rol | Ve | No ve |
|---|---|---|
| alumno | Su progreso | El de otros |
| apoderado | El progreso de sus hijos (`alumnoIdsVisibles`) | Conversaciones; otros alumnos |
| profesor | Alumnos de los cursos que dicta, **solo el área de ese curso**; el tutor ve todas las áreas de su salón | Conversaciones, textos libres del alumno |
| dirección | Todo el colegio (agregado) y la configuración | Conversaciones |
| super administrador | Consumo agregado por colegio; puede bloquear (`bloqueado_plataforma`) | Conversaciones |

## Reglas de negocio
- **Interruptor**, en orden: producto (`NUDITO_PLUS_DISPONIBLE`/`nuditoPlusDisponible()`, `src/lib/planes.ts`) → plan Pro →
  `bloqueado_plataforma` → `nudito_config_colegio.activo` (sin fila = apagado).
- **Licencias familiares inertes**: constante `NUDITO_LICENCIAS_FAMILIARES = false` (por agregar). Con ella apagada:
  `/nudito-plus/[alumnoId]/activar` y `reportarPago` → 404/403; el cron de avisos no llama a `procesarVencimientosNudito`; el
  panel de plataforma muestra licencias y pagos solo como «Histórico». Las tablas `licencias_nudito` y `pagos_nudito` y sus filas
  **se conservan** (y se siguen exportando). `acceso.ts` deja de exigir `licenciaVigente` (la firma se mantiene).
- **Consentimiento**: se exige `consentimientoVigente` (también con cuenta propia). Nueva finalidad (los docentes ven el progreso,
  fotos) → texto **v2** de `nudito_plus:consentimiento`: todas las familias vuelven a aceptar. `asentimiento_alumno_at` opcional
  para 14+ años.
- **Fotos**: solo con `permitir_fotos`; `Archivo` privado (`nudito_sesion_id`), tipo real por firma, máx. 5 MB, URL temporal de
  5 min; interpretación SIMULADA; con rostro → se descarta.
- **Retención** (`retencion_dias`, 30–730, por defecto 180): purga intentos, ejercicios, mensajes de sesión y fotos (también del
  proveedor); conserva dominios y eventos.
- **Tope del colegio**: suma de `usos_nudito.costo_estimado_usd` del mes contra `tope_costo_usd_mes`.
- **Exportación** (`src/lib/server/exportar.ts`): los modelos nuevos con `tenantId` se exportan solos. Propuesta: omitir sesiones,
  ejercicios, intentos, consumos y mensajes; exportar dominios, eventos y configuración. Decidir y documentar aquí.
- **Nudito no toca** notas, registro auxiliar, NSP ni libretas: un test de arquitectura verifica que `src/lib/server/nudito/**`
  no importa esos módulos.

## Contratos
```ts
// progreso.ts: progresoDeAlumno(ctx, { alumnoId, area? }), progresoDeCurso(ctx, { cursoId })
// config-colegio.ts: configNudito(ctx), guardarConfigNudito(ctx, entrada) (solo dirección, esquemaConfigNudito),
//   nuditoHabilitadoPara(ctx, { nivel, grado, area? })
// retencion.ts: purgarRetencion(ahora?) → { colegios, intentos, ejercicios, mensajes, fotos }
// fotos.ts: subirFoto(ctx, acceso, { sesionId, ejercicioId?, archivo }), urlFotoNudito(ctx, acceso, archivoId)
```

## Modelo de datos
`nudito_config_colegio` (1:1 con el colegio), `archivos.nudito_sesion_id`, `consentimientos_ia.asentimiento_alumno_at`; lectura de
`nudito_dominios`, `nudito_dominio_eventos`, `nudito_sesiones`, `usos_nudito`, `nudito_consumos_ia`.

## Pruebas
- integración: `nudito-progreso-alcance.test.ts`, `nudito-config-retencion.test.ts`, `nudito-fotos.test.ts`; actualizar
  `nudito-plus-interruptor` y `nudito-plus-licencias` (pago → 404). unit: test de arquitectura (sin imports de notas).

## Riesgos (para la revisión legal)
Ley 29733 y su reglamento (consentimiento de menores), transferencia internacional al proveedor de IA, términos de cada
proveedor para menores, fotos de menores, quién accede a una conversación ante un incidente de seguridad.

## Pendientes
- Todo lo de «Responsabilidades». Cambiar specs/28 a «inerte» de verdad al implementar el interruptor.
