# 22 — Equipo Khipu, anuncios y configuración de la plataforma

> Estado: implementado · Plan: Interno (plataforma) · Última actualización: 2026-10-28 (Claude, subagente p4-plataforma-config)

## Objetivo
Tres módulos del panel de super administración (specs/16): **Equipo Khipu** (quién tiene acceso), **Anuncios** (mensajes del equipo a los colegios) y **Configuración** (feriados que corren los plazos, horario de Nudito y datos de solo lectura de la plataforma).

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Super administrador activo | Todo lo de esta spec | Desactivarse a sí mismo; dejar la plataforma sin ningún admin activo; ver chats, notas o datos de alumnos |
| Dirección y personal del colegio | Ver y cerrar los anuncios que les corresponden | Crearlos ni editarlos |
| Familias y alumnos | Ver anuncios de audiencia «Todos» | — |

## Flujos
1. **Equipo:** «Agregar miembro» (correo, nombres, apellidos, documento opcional) → cuenta nueva con contraseña inicial = documento, o sin documento un enlace de recuperación por correo; siempre `debeCambiarPassword = true`. Cuenta existente: conserva su contraseña. Desactivar/reactivar con confirmación.
2. **Anuncios:** «Nuevo anuncio» (Sheet con vista previa en vivo) → aparece en la lista con estado Programado/Vigente/Terminado → los colegios lo ven como franja bajo la barra superior mientras esté vigente; cada persona puede cerrarlo (se recuerda por id en `localStorage`).
3. **Feriados:** «Agregar día no laborable» (todo el país, una región o un colegio) → corre un día hábil los plazos de justificación en los colegios que correspondan. Quitar con confirmación.
4. **Horario de Nudito:** el super administrador elige hora de inicio y fin (horas enteras, hora de Lima); el widget lo recibe del servidor.

## Reglas de negocio
- Toda acción de estos módulos exige `requireAdminPlataforma()` y se registra en `auditoria_plataforma` (`equipo_agregar|desactivar|reactivar`, `anuncio_crear|editar|eliminar`, `feriado_agregar|quitar`, `config_horario_nudito`).
- Nunca se muestra una contraseña en pantalla. Solo el script de consola (`khipu:crear-superadmin` sin `--documento`) imprime una temporal, una sola vez.
- No se puede desactivar a uno mismo ni al último admin activo (`motivoNoDesactivar`).
- Anuncio: título 3–120, mensaje 3–600, `hasta` posterior a `desde`, fechas en hora de Lima (UTC−5 fijo). Niveles con ícono + palabra: Información (neutro), Novedad (turquesa), Mantenimiento (ámbar `tarde`), Urgente (rojo `falta`). Audiencia: Dirección → solo `direccion`; Personal → dirección, profesores, administrativos y portería; Todos → también familias y alumnos. `planes` vacío = todos los planes. Los urgentes se ordenan primero.
- En **modo soporte** no se muestran anuncios.
- Feriados aplicables a un colegio = extras de todo el país (`region` y `tenantId` nulos) + los de su región (`Tenant.ciudad` igual a `region` sin tildes, mayúsculas ni espacios sobrantes) + los propios del colegio. Se aplican al vencimiento de las justificaciones (`expiracionJustificacion`, `ultimoDiaJustificacion`, `textoPlazoJustificacion`), tanto al crear el token del aviso como al listar faltas y al abrir una falta para justificar. Caché de 30 s por colegio, que se vacía al agregar o quitar.
- Horario de Nudito en `ConfigPlataforma` clave `nudito:horario` = `{ "inicio": "07:00", "fin": "17:00" }`. Si falta o no es válido (fin ≤ inicio), vale 7–17.
- «Datos de la plataforma» (solo lectura): dominio base, proveedor de almacenamiento, topes diarios de correo/WhatsApp/SMS y si WhatsApp/SMS están activos. Nunca claves ni tokens.

## Modelo de datos
`AdminPlataforma` + `Profile` (equipo), `AnuncioPlataforma`, `FeriadoExtra`, `ConfigPlataforma` (ya migrados; ver specs/19 si existe).

## Contratos de `src/lib/server`
```ts
// plataforma-equipo.ts
provisionarSuperadmin(entrada, modo: "web" | "consola"): Promise<{ userId; cuentaNueva; contrasenaTemporal?; enlaceEnviado }>
listarEquipo(admin); agregarMiembro(admin, entrada); cambiarActivoMiembro(admin, adminId, activo); motivoNoDesactivar({ esYo, otrosActivos })
// plataforma-anuncios.ts
listarAnuncios(admin); crearAnuncio(admin, e); editarAnuncio(admin, id, e); eliminarAnuncio(admin, id)
anunciosVigentes(ctx: { rol; soporte?; tenant: { plan } }, ahora?): Promise<{ id; titulo; cuerpo; nivel }[]>
// plataforma-configuracion.ts
feriadosDelAnio(admin, anio); agregarFeriado(admin, e); quitarFeriado(admin, id)
feriadosAplicables(tenantId, desde, hasta): Promise<string[]>   // AAAA-MM-DD, caché corta
horarioNudito(); guardarHorarioNudito(admin, { inicio, fin }); datosPlataforma()
// src/lib/anuncios-plataforma.ts (puro): anuncioAplica, estadoAnuncio, instanteDeLima, localDeLima
// src/lib/dias-habiles.ts: feriadosNacionalesConNombre(anio); src/lib/nudito/estado.ts: horarioDesdeConfig(valor)
```

## Rutas y UI
- `/equipo`: tabla (nombre, correo, estado con ícono + palabra, último ingreso, alta), «Agregar miembro» (Dialog) y Desactivar/Reactivar (`BotonConfirmar`).
- `/anuncios`: tabla con nivel, audiencia y planes, vigencia y estado; «Nuevo anuncio» y «Editar» (Sheet con vista previa), «Eliminar» con confirmación.
- `/configuracion`: feriados por año (nacionales fijos de solo lectura + extras), horario de Nudito, datos de la plataforma.
- Colegios: `src/components/AnunciosPlataforma.tsx` dentro de `avisoSuperior` en `src/app/colegio/[slug]/layout.tsx`, junto al banner de soporte; el cierre se guarda en `localStorage` (`khipu:anuncios-cerrados`, con try/catch).

## Textos y UX
- Franja: «**Mantenimiento · Título.** Mensaje». Botón de cierre con `aria-label` «Cerrar anuncio: …».
- Equipo: «Listo. Le enviamos un enlace al correo para crear su contraseña.» / «…Su contraseña inicial es su número de documento…».
- Errores: «No puedes desactivarte a ti mismo.», «La plataforma debe tener al menos un super administrador activo.»

## Errores y casos borde
- Correo ya existente como cuenta común: se promueve y conserva su contraseña. Si el envío del enlace falla, la cuenta queda creada (el admin puede reenviarlo con «¿Olvidaste tu contraseña?»).
- Región sin coincidencia con ningún colegio: el feriado no corre ningún plazo.
- `localStorage` bloqueado: el anuncio se cierra solo durante la visita.

## Pruebas
- unit: `tests/unit/anuncios-feriados-horario.test.ts` (audiencia, plan, vigencia, hora de Lima, feriados con nombre, extra corre el plazo, horario, regla de desactivación).
- integración: `tests/integracion/plataforma-equipo-anuncios-configuracion.test.ts` (alta con documento y auditoría, sin contraseña expuesta, no desactivarse, anuncios por vigencia/rol/plan/soporte, CRUD, feriados nacional/regional/propio, un feriado corre el vencimiento, horario).
- e2e: `tests/e2e/plataforma-anuncios-equipo-configuracion.test.ts` (equipo y configuración visibles; publicar un anuncio; la dirección lo ve y lo cierra; sigue cerrado al recargar).

## Pendientes
- El horario de Nudito es global; por colegio quedaría para después.
- Anuncios: sin programación recurrente ni estadísticas de lectura.
