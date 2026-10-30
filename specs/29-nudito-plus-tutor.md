# 29 — Nudito+ (tutor IA por alumno)

> Estado: en construcción · Plan: Khipu Pro + licencia por alumno (`specs/28`) · Última actualización: 2026-10-31 (Claude Code)

## Objetivo
Tutor IA para el **alumno**, alineado al CNEB de su grado, que recomienda materiales solo de sitios permitidos. La
familia ve **reportes, alertas y resúmenes**, nunca las conversaciones. El proveedor de IA **aún no está elegido**: en
local se usa un proveedor falso (interfaz intercambiable, como `FileStorage`). Topes de uso y costo por alumno y mes.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| alumno (cuenta propia, desde `Tenant.gradoMinimoCuentaAlumno`) | Conversar con Nudito+ (`modo = alumno`) | Superar el tope mensual |
| apoderado | Abrir el «modo hijo» para un hijo sin cuenta propia (`modo = hijo`); ver alertas, resúmenes y uso | Leer las conversaciones |
| dirección / profesor | (por definir) nada por ahora | Leer las conversaciones |
| super administrador | Gestionar `SitioPermitido`, topes y costos | Leer conversaciones (salvo incidente, por definir) |

## Flujos
1. El alumno (o el apoderado en modo hijo) abre Nudito+; el servidor valida licencia y consentimiento vigentes (`specs/28`) y el tope del mes.
2. Cada mensaje se guarda en `NuditoMensaje`; las respuestas guardan `tokensEntrada`/`tokensSalida`; se acumula `UsoNudito` del mes.
3. El filtro de seguridad marca `bloqueado = true` y puede crear una `AlertaNudito` (`seguridad`, `animo`…).
4. Un proceso periódico genera `ResumenNudito` (semanal, por definir) para la familia.

## Reglas de negocio
- Conversaciones de Nudito+: `NuditoConversacion.alumnoId` **siempre** con valor (es nullable solo por filas antiguas del Nudito retirado). `membershipId` = quién escribe (cuenta del alumno, o la del apoderado en modo hijo).
- Contenido según CNEB del grado del alumno (`Salon.nivel/grado`, desempeños de `specs/30`).
- Materiales: solo URLs cuyo dominio (o subdominio) esté en `SitioPermitido` con `activo = true`.
- Topes y costos: `UsoNudito` por (alumno, mes «AAAA-MM» en hora de Lima). Al llegar al tope se corta y se crea `AlertaNudito` tipo `uso`.
- Avisos a la familia (alerta o resumen nuevo) con `TipoAviso.nudito` (ya en el enum).
- Nudito nunca da malas noticias; los textos de alertas para la familia son resúmenes, nunca la cita textual del alumno.
- Exportación del colegio (`specs/15`): hoy exporta todo modelo con `tenantId`, **incluidas** `nudito_mensajes` → ver pendientes.

## Modelo de datos
Migración `20261031130000_pro_completo_nudito_plus`.

- **`NuditoConversacion`** (existente, extendida): + `modo` (`ModoNudito`: `alumno | hijo`, def. `alumno`); índice `(tenantId, alumnoId, createdAt)`; relación `alertas`.
- **`NuditoMensaje`** (existente, extendida): + `tokensEntrada Int?`, `tokensSalida Int?`, `bloqueado Boolean` (def. false). `autor` sigue siendo `AutorNudito` (`usuario | nudito`).
- **`UsoNudito`** (`usos_nudito`, por colegio): `alumnoId`, `mes` (String «AAAA-MM», CHECK de formato), `mensajes`, `tokensEntrada`, `tokensSalida` (Int, def. 0), `costoEstimadoUsd` Decimal(10,4), `updatedAt`. Único `(alumnoId, mes)` → usar `upsert` con `increment`.
- **`AlertaNudito`** (`alertas_nudito`, por colegio): `alumnoId`, `tipo` (`TipoAlertaNudito`: `seguridad | animo | dificultad | uso`), `detalle`, `conversacionId?` (SetNull), `creadaAt` (columna `created_at`), `vistaAt?`.
- **`ResumenNudito`** (`resumenes_nudito`, por colegio): `alumnoId`, `desde`/`hasta` (Date), `texto`, `temas` (Json, def. `[]`; forma sugerida `[{ area, tema, mensajes }]`), `creadoAt` (columna `created_at`).
- **`SitioPermitido`** (`sitios_permitidos`, **global**, en `MODELOS_GLOBALES`): `dominio` (único, minúsculas, sin esquema ni «www.»), `nombre`, `descripcion?`, `activo` (def. true), `creadoPorId` (perfil del super administrador, sin FK), `createdAt`, `updatedAt`.
- **Configuración global** (`ConfigPlataforma`):
  - `nudito_plus:limites` → `{ "mensajesPorMes": 600, "tokensPorMes": 400000, "costoMaxUsdPorMes": 2.5 }` (por alumno; valores de ejemplo)
  - `nudito_plus:proveedor` → `{ "nombre": "falso", "modelo": null, "costoEntradaUsdPorMillon": 0, "costoSalidaUsdPorMillon": 0 }` (sin claves: las claves van en variables de entorno)

## Contratos de `src/lib/server`
```ts
// por definir: nudito-plus/ — proveedor (interfaz + falso), conversar(ctx, alumnoId, texto), registrarUso, crearAlerta, generarResumen
```

## Rutas y UI
- Por definir: `/nudito` (alumno o modo hijo), `/nudito/reportes` (apoderado).

## Textos y UX
- Fuente Nunito solo para Nudito. Por definir.

## Errores y casos borde
- Licencia vencida a mitad de conversación; tope alcanzado; proveedor caído (mensaje amable, sin cobrar uso).

## Pruebas
- Por definir (con el proveedor falso).

## Pendientes
- Elegir proveedor de IA y su política de datos de menores.
- Excluir `NuditoMensaje` (y quizá `NuditoConversacion`) de la exportación del colegio (`TABLAS_OMITIDAS` en `src/lib/server/exportar.ts`) para cumplir «la familia no ve las conversaciones».
- Retención de conversaciones (días) y acceso ante incidentes de seguridad.
