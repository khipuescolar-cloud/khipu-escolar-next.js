# 35 — Datos demo (un colegio piloto) y datos de prueba

> Estado: implementado · Plan: Khipu Pro · Última actualización: 2026-10-30 (Claude Code, rama `feat/comunicados-nivel`)

## Objetivo
Que la BD **local** tenga un solo colegio de prueba, **I.E.P. Nuevo Horizonte** (`nuevohorizonte`, Khipu Pro), con datos realistas
y abundantes para hacer QA manual entrando con cualquier rol, y que los tests automáticos no dependan de otros colegios demo.
Solo para desarrollo: nunca se corre en producción (el seed se niega con `NODE_ENV=production`).

## Comandos
- `pnpm db:seed` — borra Nuevo Horizonte (cascade, y los antiguos `losolivos` / `academiaeuler` si existen) y lo vuelve a crear. Idempotente. ~20 s.
- `pnpm db:reconstruir` — `scripts/datos-piloto/reconstruir.ts`: **solo con BD y Auth en 127.0.0.1/localhost** (si no, se niega).
  Borra **todos** los colegios (cascade, y sus archivos locales en `.uploads/<tenantId>`; los archivos de un proveedor en la nube
  no se tocan), todos los usuarios de Supabase Auth y perfiles que no estén en `admins_plataforma`, y los intentos de ingreso;
  luego corre el seed y escribe el archivo de credenciales. No usa `prisma migrate reset` (migraciones y tablas de plataforma intactas).
- `pnpm db:credenciales` — `scripts/datos-piloto/credenciales.ts --salida <ruta>`: genera desde la BD un Markdown con todas las
  cuentas por rol y pruebas sugeridas. Por defecto `../../credenciales-pruebas.md` (carpeta `StartUp/`, **fuera del repo**).

## Qué crea el seed (Nuevo Horizonte)
Contraseña de todas las cuentas: `demo123`. Fechas relativas a hoy (Lima), en días hábiles (sin fines de semana ni feriados
nacionales, `src/lib/dias-habiles.ts`) y dentro de los bimestres (las semanas entre bimestres son vacaciones). Azar con semilla:
los nombres y datos salen iguales en cada corrida.

| Área | Módulo | Contenido |
|---|---|---|
| Colegio y personas | `seed-colegio.ts` | Pro, escala literal, asistencia por curso en primaria y secundaria, cuenta de alumno desde 5.°. Dirección (Carmen Torres), secretaría y psicóloga (administrativo), portería. 26 profesores (tutores; especialistas de Educación Física e Inglés en primaria; en secundaria docentes por área en varios salones). 17 salones: Inicial 3, 4 y 5 años; 1.°–6.° A de primaria más 3.° B (Lucía) y 5.° B; 1.°–5.° A Sec. más 1.° B Sec. 139 cursos por áreas del CNEB. 171 alumnos (8–12 por salón), ~210 apoderados (hermanos que comparten familia; ~1 de cada 12 familias con consentimiento pendiente y alguna con consentimiento retirado), carnets QR para todos, ~90 cuentas de alumno (5.° y 6.° de primaria y secundaria), 4 bimestres (los terminados, cerrados; libretas del I y II publicadas). |
| Competencias | `seed-cneb.ts` | Catálogo CNEB importado (competencias, capacidades y desempeños) en Matemática y Comunicación de primaria y secundaria; competencias del área en los demás cursos e inicial; dos evaluaciones de 3.° B con desempeños marcados. |
| Notas | `seed-notas.ts` | Calificación de periodo de los bimestres cerrados, 2 evaluaciones por curso en el último cerrado y en el vigente (Educación Física e Inglés de primaria y EPT van atrasados en el vigente), algunas observaciones; Diego (3.° B) con C en Matemática. |
| Asistencia | `seed-asistencia.ts` | 60 días hábiles (unos 3 meses) de ingreso al colegio (llegó, tarde, falta, aviso; un alumno por salón falta seguido y otro llega tarde), listas de curso de esos mismos 60 días **según el horario** (solo los días en que el curso tiene bloque en `bloques_horario`, una lista por curso y día, con la hora de inicio de su primer periodo; si el alumno ingresó al colegio después de esa hora, «tarde» a su hora de ingreso) con casos «ingresó pero faltó» (solo en clases posteriores a su ingreso), llegadas de hoy por portería en secundaria (menos 5.° A Sec.), justificaciones pendientes, aceptadas y rechazadas (con y sin comentario) y el historial de avisos por correo. Mateo y Valentina (3.° B) tienen una falta reciente con justificación pendiente y una antigua revisada. |
| Comunicación | `seed-comunicacion.ts` | Tareas vencidas, de esta semana y próximas por curso; agenda (feriados reales, reunión, simulacro, exámenes por salón); 13 comunicados con sus avisos: todo el colegio, por salón, por nivel («Primaria»; «Inicial y primaria», de secretaría) y por grado («3.° grado de primaria»; «5.° grado de secundaria», de secretaría) (specs/09); 13 chats familia ↔ profesor (Pedro y algunas familias con mensajes sin leer; **Lucía sin mensajes sin leer**, los e2e cuentan exactos); textos del colegio; 2 conversaciones de mesa de ayuda. |
| Documentos | `seed-documentos.ts` | Carpetas y 7 PDF (specs/31). |
| Reuniones | `seed-reuniones.ts` | Pasada con acta, próximas con respuestas mixtas (Rosa sin responder), individual y asamblea (specs/32). |
| Nudito | `seed-nudito-plus-tutor.ts`, `seed-nudito-plus.ts`, `seed-nudito-tutor.ts` | Nudito activo en Nuevo Horizonte (config del colegio), áreas CNEB de los cursos rellenadas, dos temas propios de ejemplo; consentimiento de IA v2 de Lucas (5.° A, cuenta propia; Julia) y de Mateo (3.° B, modo hijo de Rosa); conversaciones antiguas de Lucas, alerta y resumen de Mateo; configuración de plataforma y lista blanca. Con `NUDITO_LICENCIAS_FAMILIARES = false` **no** se crean licencias ni pagos (histórico, specs/28). |
| Horario | `seed-horario.ts` | Horas sugeridas por nivel y el horario semanal de cada salón con sus cursos, sin cruces de profesores (specs/34). Se siembra **antes** de la asistencia (las listas de curso lo siguen; `clasesDelDia`). |

`prisma/seed.ts` solo orquesta: borra, crea el super administrador `admin@khipuescolar.demo` y llama a los módulos en orden.
Orden: colegio → responsable → CNEB → notas → **horario** → asistencia → comunicación → documentos → reuniones → Nudito+.
Un módulo nuevo se agrega con **una línea al final** de `main()` (o antes de quien dependa de él).

Cuentas fijas (la documentación y los e2e las usan): `direccion@`, `lucia.garcia@` (tutora 3.° B), `pedro.salas@` (tutor 5.° A,
Ciencia y Tecnología en 3.° B, 5.° B y 6.° A), `porteria@`, `lucas.huaman@` (alumno 5.° A) — todas `@nuevohorizonte.demo`;
`rosa.quispe@gmail.com` (madre de Mateo, 3.° B, sin cuenta, y de Sofía, 1.° A Sec., con cuenta `sofia.quispe@nuevohorizonte.demo`);
`familia.huaman@`, `familia.rios@`, `familia.flores@`, `familia.mendoza@` (`@familia.demo`).

## Tests
- Unit: `tests/unit/seed-asistencia-sigue-horario.test.ts` (`clasesDelDia`: qué cursos y a qué hora tuvo cada salón según su horario).
- Integración: cada archivo crea y borra sus propios colegios (`tests/integracion/ayudantes/colegio-prueba.ts`); no dependen del seed.
- e2e: usan Nuevo Horizonte del seed. Lo que el seed ya no trae (colegio Khipu Base, academia con escala vigesimal, una
  apoderada con hijos en dos colegios) lo crea cada archivo en `beforeAll` y lo borra en `afterAll` con
  `tests/e2e/ayudantes/colegio-temporal.ts` (BD + usuarios de Auth). Fechas relativas a hoy con `tests/e2e/ayudantes/datos-demo.ts`.
- Los e2e limpian lo que crean (asistencia de hoy de 3.° B con sus avisos y justificaciones, mensajes, comunicados, tareas…).
  Igual, tras una corrida completa conviene `pnpm db:reconstruir` para volver a los datos limpios.

## Temarios de Nudito (2026-11-09, specs/48–49)
- `prisma/seed-plan-anual.ts` y `pnpm db:demo-plan-anual` crean temarios de las tres áreas con temas del catálogo global. Lucas de 5.° A ve Matemática, Comunicación y Ciencia y Tecnología sin que haga falta publicar lecciones.
- Un grupo con al menos dos docentes queda en revisión con la aceptación de uno; el otro figura pendiente. 3.° de primaria · Matemática queda sin temario para probar la elaboración desde cero.
- La dirección solo consulta. Los profesores del grupo eligen y aceptan el temario.
