# 41 — Nudito, tutor educativo de Khipu Pro (visión general y sesiones)

> Estado: en desarrollo (paso 0: contratos, esquema y esqueletos) · Plan: Khipu Pro (módulo fijo `nudito_plus`, hoy apagado por `NUDITO_PLUS_DISPONIBLE`) · Última actualización: 2026-11-14 (Claude Code, paso 0)

## Objetivo
**Nudito** es el tutor educativo con IA del plan **Khipu Pro**. Ayuda al **alumno** a practicar los temas de su grado en
**Matemática, Ciencia y Tecnología y Comunicación** (lista extensible, `AREAS_NUDITO`), con explicación breve, práctica
verificable, retroalimentación y progreso por habilidad. **No** es un producto aparte: reemplaza a «Nudito+» (specs/29) y
descarta las licencias por familia y el pago con Yape (specs/28, ahora inerte; ver specs/44).

Decisiones (2026-11-14):
- Nudito es parte de Khipu Pro; lo enciende **cada colegio** (interruptor institucional, specs/44). Sin licencias familiares.
- El currículo es **determinista**: catálogo de temas revisado (specs/42), ejercicios generados y corregidos por código o de un
  banco revisado (specs/43). La IA explica, da pistas y retroalimenta textos abiertos; **nunca** decide permisos, temas
  permitidos, matrículas, notas ni la corrección de ítems cerrados.
- Proveedor de IA intercambiable (Claude, GPT o Gemini) detrás de `ProveedorTutorIA`; **hoy solo existe el simulado** (no hay
  credenciales). Toda salida estructurada se valida con zod.
- Nudito **no toca** notas oficiales, registro auxiliar, NSP ni libretas. El progreso es formativo y se ve en specs/44.

## Reparto del trabajo
| Dev | Alcance | Spec |
|---|---|---|
| A | Esquema (paso 0), catálogo curricular, área de los cursos, validación de «Otro tema», seeds | specs/42 |
| B | Generadores, banco, lecturas, evaluadores y rúbricas, política de dominio (todo puro) | specs/43 |
| C | Servicio de sesiones, IA ampliada (simulada), seguridad y límites, interfaz con la mascota | esta spec |
| D | Progreso de docentes y familias, interruptor institucional, retención, fotos, adaptación de Nudito+ y licencias inertes | specs/44 |

`src/lib/nudito/contratos.ts` está **congelado**: se cambia solo por PR al responsable del paso 0. Las funciones del paso 0 lanzan
`Error("pendiente")` con `cause` = responsable y función (`src/lib/nudito/pendiente.ts`).

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| alumno con cuenta propia (`Alumno.cuentaId`) | Usar Nudito (`modo = alumno`) con los cursos de su salón de las áreas habilitadas | Cambiar su grado; ver a otros alumnos |
| apoderado | «Modo hijo» para un hijo **sin** cuenta propia (si el colegio lo permite); ver el progreso de sus hijos (specs/44) | Usar modo hijo con un hijo que tiene cuenta; leer conversaciones |
| profesor / dirección | Ver progreso agregado según su alcance (specs/44); dirección configura (specs/44) | Usar el tutor como alumno; leer conversaciones |
| super administrador | Bloquear Nudito en un colegio y configurar el proveedor | Leer conversaciones (el modo soporte no entra) |

Requisitos de uso: colegio Pro + `nudito_plus` disponible + `nudito_config_colegio.activo` (y no bloqueado) + nivel, grado y área
habilitados + consentimiento de IA vigente del apoderado (`consentimientoVigente`).

## Flujos
1. **Bienvenida** animada y personalizada (mascota en estado `saludo`, nombre del alumno). Si hay una sesión activa de menos de
   24 h: «¿Seguimos con <tema>?» (reanudar).
2. **Elegir curso**: solo cursos del salón del alumno con `cursos.area_cneb` en las áreas habilitadas (specs/42).
3. **Elegir tema**: temas del grado (recomendados primero) u **«Otro tema»** con validación determinista (`validarTema`, specs/42):
   grado actual o anteriores → permitido; superior solo si está desbloqueado por la política de dominio; demasiado avanzado →
   alternativas amables; ambiguo → pregunta para aclarar; no reconocido → sugerencias.
4. **Repaso breve**: idea + ejemplo revisados del tema; la IA puede ampliar si el alumno lo pide.
5. **Práctica**: ejercicios por tema y dificultad (specs/43). El alumno responde por opción, texto, número/fracción,
   procedimiento, pista (hasta 3, graduadas), pregunta libre o foto (si el colegio lo permite, specs/44).
6. **Retroalimentación** explicativa por intento (`correcto | parcial | incorrecto | incierto`, error típico detectado).
7. **Comprobación**: cuando la política lo pide, ejercicios de comprobación sin pistas.
8. **Resultados**: aciertos, pistas, tiempo y cambios de dominio con su motivo; el progreso queda guardado.

## Reglas de negocio
- La sesión, los ejercicios, los intentos y el dominio se escriben con `ctx.db` (aislamiento por colegio).
- `responder` guarda intento + dominio + evento en **una transacción**; `(ejercicio, número)` único evita el doble envío.
- La solución, las pistas y la explicación de un ejercicio (`nudito_ejercicios.solucion`) **nunca** se envían al cliente.
- La IA recibe contexto mínimo (tema, ejercicio público, últimos turnos); el texto del alumno va marcado como **datos**.
- Salida de IA inválida → un reintento → texto determinista (repaso o pista revisada) o `incierto`.
- Límites: por minuto (como Nudito+), sesiones y minutos por día, tope mensual por alumno (`UsoNudito`) y por colegio.
- Nudito nunca da malas noticias ni opina de notas.

## Qué es SIMULADO hoy (documentar en la UI de plataforma y en cada registro: `nudito_consumos_ia.simulado = true`)
- Proveedor de IA (no hay credenciales): explicar, pista, pregunta libre, rúbrica de escritura e interpretación de fotos.
- Rúbrica de escritura: heurística formativa (`evaluarRubricaSimulada`, specs/43).
- Interpretación de imágenes: respuesta fija o «no se lee, escríbelo».
- Moderación: solo los filtros por palabras de `src/lib/server/nudito-plus/seguridad.ts`.
- Costo estimado: precios de `nudito_plus:proveedor` (hoy 0).
- Adaptadores Claude/GPT/Gemini: interfaz lista, sin implementación activa.

## Modelo de datos
Migración `20261114090000_nudito_tutor` (aditiva). Tablas: `nudito_config_colegio`, `nudito_temas_colegio`, `nudito_sesiones`,
`nudito_ejercicios`, `nudito_intentos`, `nudito_dominios`, `nudito_dominio_eventos`, `nudito_consumos_ia`; columnas nuevas
`cursos.area_cneb` / `area_cneb_manual`, `nudito_mensajes.sesion_id`, `archivos.nudito_sesion_id`,
`consentimientos_ia.asentimiento_alumno_at`. CHECKs de rangos (dificultad 1–5, grado 1–6, puntaje 0–1, retención 30–730 días) y
RLS cerrado. Se reutilizan `NuditoConversacion`/`NuditoMensaje` (pregunta libre), `UsoNudito`, `AlertaNudito`,
`ResumenNudito`, `ConsentimientoIa` y `SitioPermitido`.

## Contratos
```ts
// src/lib/nudito/contratos.ts (puro, congelado): AREAS_NUDITO, Tema/esquemaTema, ValidacionTema/ValidarTema,
//   EjercicioPublico, Solucion, EjercicioConSolucion (+ esquemas), Respuesta/EnvioRespuesta, Evaluacion,
//   Generador, Evaluador, EvaluadorAbierto, Rubrica, PoliticaDominio, EstadoDominioTema, EvidenciaPractica, DecisionDominio,
//   ProveedorTutorIA (+ esquemas de salida), ConfigNudito, AccesoNudito, ApiNudito (EntradaApi/SalidaApi).
// src/lib/server/nudito/sesiones.ts (C): iniciarSesion, elegirCurso, elegirTema, pedirRepaso, siguienteEjercicio,
//   responder, pedirPista, preguntar, finalizar — (ctx, acceso, entrada)
// src/lib/server/nudito/ia/proveedor.ts (C): obtenerProveedorTutor(), proveedorSimulado(), registrarConsumo(db, datos)
// src/lib/server/nudito/seguridad.ts (C): verificarLimites(ctx, acceso, operacion), comoDatosDelAlumno(texto),
//   pistaRevelaRespuesta(pista, ejercicio)
```

## Rutas y UI
- `/nudito` (alumno; apoderado en modo hijo): flujo conversacional con la mascota (`NuditoMascota`, `estado.ts`), accesible
  y con «reducir movimiento». `/nudito-plus/chat` redirigirá aquí (pendiente, C).

## Textos y UX
- Aviso: «Soy Nudito, un asistente con IA. Te ayudo a practicar; no reemplazo a tu profesor. Puedo equivocarme.»
- Tema muy avanzado: tono amable, nunca «no puedes»: «Ese tema viene más adelante. ¿Practicamos primero <alternativa>?»

## Errores y casos borde
- Salón sin grado o nivel inicial/academia → aviso amable, sin práctica.
- Curso sin área → no aparece; dirección ve el aviso (specs/42).
- IA caída o salida inválida → texto revisado; nunca se bloquea la práctica de ítems cerrados.

## Pruebas
- unit: `tests/unit/nudito-contratos-fixtures.test.ts` (fixtures de `tests/fixtures/nudito/` cumplen los contratos; esqueletos
  lanzan «pendiente»; `contratos.ts` solo importa zod).
- integración (C): `tests/integracion/nudito-sesiones.test.ts`. e2e (C): `tests/e2e/nudito-tutor.test.ts`.

## Pendientes
- Implementar los esqueletos (A–D) e integrar: B → A → D → C → e2e conjunto.
- Bitácora de conversación de cada desarrollador.
- Elegir proveedor real (revisión legal de menores; specs/44).
