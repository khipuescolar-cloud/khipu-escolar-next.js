# 36 — Carga masiva: salones y cursos, y familias

> Estado: implementado · Plan: Khipu Base (gestión) · Última actualización: 2026-10-30 (Claude Code, rama `feat/carga-masiva`)

## Objetivo
Que el equipo Khipu junto con dirección o secretaría carguen un colegio entero (~1 000 alumnos, ~40 salones, ~2 000 vínculos de familia) en una tarde, desde un CSV o un Excel, en lugar de crear salones, cursos e invitaciones de familias uno por uno.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Dirección | Cargar salones y cursos (`exigirGestion`) y familias | — |
| Administrativo | Cargar familias (`exigirAlumnosFamilias`) | Salones y cursos (403; no ve la pestaña) |
| Profesor, portería, familias | — | Nada (403) |
| Super administrador en modo soporte | Ver la vista previa | Confirmar (`Modo soporte: solo lectura.`) |

## Flujos
1. **Gestión → Carga masiva** (`/gestion/carga-masiva?tipo=salones|familias`; también desde «Cargar desde archivo» en Grados y salones y en Familias, y en la tarjeta del hub).
2. **Plantilla:** «Plantilla Excel» (.xlsx con hojas «Datos» —columnas de DNI y celular en formato Texto— e «Instrucciones») o «Plantilla CSV», generadas en `GET /api/carga-masiva/plantilla?tipo=…&formato=csv|xlsx`. Filas de ejemplo ficticias.
3. **Subir** CSV (coma o punto y coma, con o sin BOM) o XLSX (hoja «Datos» o la primera que no sea de instrucciones); máx. 3 MB. `.xls` antiguo se rechaza con mensaje.
4. **Vista previa** (no escribe): conteos, notas, errores por línea (no se cargan) y avisos por línea (sí se cargan), y una tabla con qué pasa en cada fila (Nuevo · Se actualiza · Sin cambios, con ícono + palabra; primeras 500).
5. **Confirmar** («Confirmar y cargar N filas»): el servidor vuelve a leer y validar el archivo y aplica **solo las filas válidas**. Si no hay nada nuevo, el botón dice «No hay nada nuevo que cargar».
6. **Resultado:** mensaje, conteos, filas que no se cargaron y avisos. Corregir y volver a subir el archivo completo es seguro (idempotente).

### Salones y cursos (`nivel, grado, seccion, nombre, anio, tutor, curso, profesor`)
- Un curso por fila; las filas del mismo salón (año + nivel + grado + sección) se juntan. Alternativa: **cursos como columnas** (toda columna desconocida es un curso; celda = DNI o correo del profesor, «x» = sin profesor, vacía = el salón no lo tiene). Se ignoran columnas de apoyo (`nro`, `observaciones`, `*_nombre`…). La vista previa lista los cursos leídos como columnas.
- `nivel`: inicial, primaria, secundaria, academia (acepta «Sec.», «Prim.»). `grado`: número (inicial = edad; acepta «3.°», «4 años»); obligatorio salvo academia. `anio` opcional (año actual del colegio). `nombre` opcional: si falta, «3 años A», «3.° B», «1.° A Sec.», «2.° A Acad.».
- **Salón existente** (activo, mismo año): se busca por nivel + grado + sección; si no, por nombre. Si coincide más de uno, error. Mismo nombre en otro nivel, o un nombre nuevo que ya usa otro salón del año: error (el CSV de alumnos busca por nombre). Nunca se renombra ni se borra nada.
- **Tutor y profesor** por DNI o correo entre los profesores del colegio (activos o invitados). No encontrado, desactivado, DNI ambiguo o texto que no es DNI ni correo → **aviso**, el salón/curso queda sin asignar y se cuenta en «Profesores no encontrados». Celda vacía no quita un tutor/profesor ya asignado.
- **Re-subir:** salones y cursos existentes no se duplican (curso = mismo nombre sin tildes ni mayúsculas en el salón); cambia el tutor o el profesor si el archivo trae otro.

### Familias (`alumno_codigo, alumno_dni, apoderado_dni, tipo_documento, nombres, apellidos, correo, celular, parentesco`)
- Una fila por apoderado y por hijo. Alumno por `alumno_codigo` y/o `alumno_dni` (debe ser del colegio y estar activo; si vienen ambos deben ser el mismo alumno). Hermanos = mismo correo y documento en varias filas → **una sola cuenta**, una membresía, un vínculo por hijo y **una** bienvenida.
- Apoderado: documento DNI de 8 dígitos (los de 5–7 dígitos se completan con ceros: Excel los quita; queda un aviso) o CE/pasaporte de 8–12; nombres y apellidos (≤ 80), correo válido, celular opcional, parentesco obligatorio (≤ 30, se guarda en minúsculas).
- **Cuenta:** si el correo no existe en Khipu se crea el usuario de Auth con el **documento como contraseña inicial** (`email_confirm`, sin correo de Supabase), el perfil con `debeCambiarPassword = true`, teléfono y documento. Si ya existía (otro colegio, o personal del mismo colegio), se reutiliza: no cambia su contraseña ni sus nombres; solo se completan teléfono y documento vacíos (aviso si su documento registrado es otro).
- **Membresía** `apoderado` en estado **`invitada`** (pasa a `activa` en su primer ingreso, `activarInvitaciones`); si ya era familia del colegio, se reutiliza (aviso si está desactivada).
- **Vínculos** `apoderados_alumnos`: nuevos con el parentesco; si la familia ya tenía un consentimiento vigente, el vínculo lo hereda (igual que `vincularApoderado`). **No se crea ningún consentimiento:** la familia lo acepta al entrar (spec 10/15); hasta entonces no recibe avisos. Re-subir actualiza el parentesco.
- **Bienvenida:** plantilla `bienvenida` (rol «Familia», usuario = correo, «Tu contraseña inicial es tu número de DNI…» o «Entra con la contraseña que ya usas…»; nunca el número) encolada en `avisos` con `apoderadoId`, solo para quien entra nuevo al colegio. La acción dispara `procesarCola()` con `after()`: sale al ritmo de `EMAIL_RATE_PER_SECOND` y con el tope diario (spec 06), un solo worker por colegio. Re-subir no reenvía.
- **Reenviar invitación** (Familias) a una familia de la carga masiva que aún no entra (`invitada` + `debeCambiarPassword` + documento): vuelve a encolar la bienvenida en vez de pedir un enlace de Supabase.
- Errores de fila: alumno no encontrado (o de otro colegio), retirado, código y DNI de alumnos distintos, varios alumnos con el mismo código/DNI, correo de la cuenta de un **alumno** del colegio, documento que ya es de **otra familia del colegio con otro correo**, en el archivo: correo con dos documentos, documento con dos correos, familia+alumno repetidos. Si Auth falla al crear una cuenta, esas filas pasan a «no se cargaron» y el resto sigue (`ok: false`).

### Alumnos: documento y tamaño
- `Alumno.numeroDocumento` (`alumnos.numero_documento`, opcional, índice `(tenant_id, numero_documento)`; migración `20261105093000_alumnos_numero_documento`): «DNI del alumno (opcional)» en alta y edición (único en el colegio, 8–12 letras/números; sin el campo, editar lo conserva) y columna opcional `documento` (o `dni`) del CSV de alumnos (completa ceros; repetidos → error).
- El CSV de alumnos admite **1 500 filas** y 2 MB (antes 500 y 1 MB): un colegio de 1 000 alumnos cabe en un archivo.

## Reglas de negocio
- Todo con `ctx.db` (tenant inyectado); los perfiles (globales) se buscan por correo con `db`. El colegio sale del Host (`contextoDeAccion`).
- Sin N+1: búsquedas `in` por lotes de 1 000 (`enLotes`, por debajo del límite de 32 767 parámetros de Postgres), altas con `createMany` (salones, cursos, membresías, vínculos, avisos) y cambios con un `updateMany` por tutor/profesor/parentesco. Auth: 6 cuentas a la vez.
- Auditoría en un solo `INSERT` por lote (`auditarVarios`): `crear salon|curso|membresia|apoderado_alumno`, `editar salon|curso|apoderado_alumno` (con `campos`), y un resumen `crear · carga_masiva` con el tipo y los conteos. Nunca se audita el documento.
- La página declara `maxDuration = 300` (las acciones de servidor heredan el límite de la página).

## Modelo de datos
`salones`, `cursos`, `memberships`, `profiles`, `apoderados_alumnos`, `consentimientos` (solo lectura), `alumnos` (+ `numero_documento`), `avisos`, `auditoria`.

## Contratos de `src/lib/server`
```ts
// carga-masiva.ts
previsualizarSalones(ctx, tabla): Promise<VistaCarga>          // exigirGestion
importarSalones(ctx, tabla): Promise<ResultadoCarga>             // exigirGestion; no en modo soporte
previsualizarFamilias(ctx, tabla): Promise<VistaCarga>         // exigirAlumnosFamilias
importarFamilias(ctx, tabla, { crearUsuario? }): Promise<ResultadoCarga> // crearUsuario inyectable en pruebas; quien llama dispara procesarCola()
// carga-masiva-archivo.ts
leerArchivoCarga(file): Promise<Tabla>   // CSV/XLSX, 3 MB
plantillaXlsx(tipo, anio): Promise<Buffer>
// cuentas.ts
payloadBienvenida(datos)                 // compartido por encolarBienvenida y la carga de familias
```
Puros en `src/lib/carga-masiva/`: `tabla.ts` (CSV → tabla, `normalizarDocumento`, `referenciaPersona`, `enLotes`), `salones.ts` (`leerArchivoSalones`, `nombreSalonSugerido`), `familias.ts` (`leerArchivoFamilias`), `plantillas.ts` (`plantillaCarga`, `plantillaCsv`). Límites: 2 000 filas de salones, 3 000 de familias.

## Rutas y UI
- `/gestion/carga-masiva` (dirección: pestañas «Salones y cursos» y «Familias»; administrativo: solo Familias) con `CargaMasiva.tsx` (cliente: elige archivo → `previsualizarCargaAction` → `importarCargaAction`).
- `GET /api/carga-masiva/plantilla` (mismos roles que cada tipo).
- Navegación de gestión: pestaña «Carga masiva» y tarjeta en el hub.

## Errores y casos borde
Ver arriba. Archivo vacío, sin encabezado, sin columnas obligatorias (mensaje con las columnas esperadas), más filas que el máximo (se procesan las primeras y se reporta la línea del corte).

## Pruebas
- unit: `tests/unit/carga-masiva-archivos.test.ts` (16: encabezados, CSV, DNI con ceros, formatos de salones y cursos en columnas, conflictos por línea, familias y hermanos, límites, plantillas legibles), `tests/unit/importar-alumnos.test.ts` (documento y 1 500 filas).
- integración: `tests/integracion/carga-masiva.test.ts` (14: vista previa sin escribir, alta de salones/cursos con tutor y profesor, re-subida sin duplicar y con cambios, salones existentes, 403 por rol, modo soporte, familias con cuenta por DNI + membresía invitada + vínculos sin consentimiento + una bienvenida sin el DNI, herencia de consentimiento, re-subida sin duplicar ni reenviar, conflictos de documento y cuenta de alumno, reenviar bienvenida, falla de Auth parcial, aislamiento entre colegios, **rendimiento**: 40 salones + 1 000 alumnos + 2 000 filas de familias (~1 330 cuentas) en ~4 s con Auth simulado; vista previa repetida ~0,25 s).
- e2e: `tests/e2e/carga-masiva.test.ts` (dirección descarga la plantilla, carga un salón con cursos y una familia con dos hijos en el colegio demo, la bienvenida llega a Mailpit sin el DNI, re-subir no carga nada; el administrativo solo ve Familias). Borra todo lo que crea.

## Pendientes
- Con Auth real, crear cuentas es el paso lento: GoTrue local ~48 cuentas/s con 6 a la vez (≈ 30 s para 1 300 familias nuevas). En producción medirlo en el primer colegio; si se acerca a `maxDuration`, dividir el archivo por nivel.
- El CSV de alumnos sigue siendo «todo o nada» (sin vista previa ni actualización por código).

## Integración con la malla anual
Al terminar una carga de salones, los salones nuevos heredan los cursos de la malla existente para su año, nivel y grado; los cursos del archivo con el mismo nombre se enlazan en lugar de duplicarse. La vista previa sigue describiendo el archivo y el resultado avisa los cursos adicionales creados por la malla.
