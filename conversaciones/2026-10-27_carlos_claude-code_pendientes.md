# 2026-10-27 · carlos · Claude Code · Resolver todos los pendientes (orquestación con subagentes)

- **Colaborador:** carlos
- **Agente:** Claude Code (Opus 5.5) como orquestador + 11 subagentes Claude (Opus para seguridad/permisos, Sonnet para el resto) en worktrees
- **Ramas:** `feat/p2-*` (7) y `feat/p3-*` (4) → integradas en `main` y borradas
- **Migraciones:** `20261027180000_pendientes_v2`, `20261027210000_canales_whatsapp_sms` (las aplicó el orquestador antes de lanzar subagentes)
- **Specs afectadas:** 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18

## Pedido del colaborador (textual)

> Si borralos , si ya no lo estamos usando y ya no lo necesitamos , no hay problema con borrarlos no? y porfavor ve resolviendo todos los pendientes que tengamos , quiero que por a hora trabajes de manera autonoma resolviendo cada problema que tengas y que lances multiagentes para que solucioones todos, si necesitas lazar 50 miltiagentes no hay problema pr que la finalidad es que termines con todo lo pendiente que tuvimos

## Decisiones

- Se borraron los 15 worktrees antiguos tras verificar que estaban limpios e integrados.
- Los cambios de esquema los hizo el orquestador en una migración por oleada; los subagentes tenían prohibido tocar el esquema y los paquetes (instalados antes: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `sharp`, shadcn `chart`/`recharts`).
- **Modo soporte:** solo lectura real (escrituras y SQL de escritura bloqueados), sin acceso a mensajes, notas, libreta, Nudito ni exportaciones; avisa a la dirección; permitido en colegios suspendidos.
- **Rol alumno:** ve solo lo suyo (asistencia, notas, libreta publicada, tareas, agenda, comunicados); sin chat ni Nudito (protección de menores); la cuenta exige consentimiento vigente de un apoderado.
- **Administrativo:** comunicados, agenda, alumnos y familias, avisos (lectura).
- **WhatsApp/SMS:** implementados y apagados por defecto; requieren cuentas reales.
- Las páginas con `loading.tsx` responden 200 al denegar (la página 403 se muestra igual y no se filtran datos); las APIs siguen en 403. Documentado en spec 03.
- Integración: se corrigió un hueco entre ramas (exportación accesible en modo soporte) bloqueándola en todas las entradas.

## Cambios (resumen)

- Oleada 1: plataforma (último ingreso real, gráficos 30 días, acceso de soporte, compensación), exportación asíncrona + S3 + limpieza de archivos, académico (cierre por curso, publicar libreta con aviso, observaciones, CSV, logo WEBP/SVG), comunicación (adjuntos, push y enlace directo, avisos al instante, preferencias del personal), día a día (calendario mensual, pasar lista y portería sin conexión, carnets PDF, plazo de justificación, avisos en el inicio), gestión (archivar salones, administrativo, buscador de familias, restablecer contraseña), calidad/despliegue (34 pantallas de carga, `docs/despliegue.md`, `vercel.json`, Gmail en `.env.example`).
- Oleada 2: rol alumno y Nudito (nombres ajenos, enlaces por hijo, historial por hijo), soporte y seguridad, archivos y robustez (borrado en cascada del proveedor, exportación en flujo, adjuntos en agenda, reintentos acotados, correo de restablecer), canales WhatsApp/SMS.

## Validación

- `pnpm lint`, `pnpm typecheck`: limpios.
- `pnpm test`: 51 archivos, 470 pruebas OK.
- `pnpm e2e`: 43/43 OK (un `ERR_NETWORK_CHANGED` transitorio se repitió y pasó).

## Pendientes (requieren al colaborador o terceros)

- Decisiones: ¿pasar lista pide confirmación antes de avisar? ¿el plazo de justificación aplica también con sesión? ¿revocar el consentimiento apaga la cuenta del alumno y desde qué edad hay cuenta de alumno? (abogado)
- Cuentas/credenciales: dominio, Supabase cloud, Gmail (contraseña de aplicación), Cloudinary/S3, Meta WhatsApp Business + plantillas, Twilio, Vercel (crons por minuto requieren plan Pro).
- Legal: consentimiento, política de privacidad, banco de datos.
- Marca: SVG oficiales. Nudito con LLM: solo con aprobación explícita.

## Continuación: aviso de presentes y plazo de 15 días hábiles

> al momento de pasar lista y cerrar la lista los alumnos que estuvieron presente les debe de llegar una notificacion a sus apoderados; el plaso para poder justificar una falta es de 15 dias habiles

> okey ahora como lo estas trabajando ? se que los servicios lo tienes de manera local  como el supabase pero yo ya tengo la cuenta creaday tambien del caludinary, dime o dame la lista de key que necesitas para dartelos

- Migración `20261027230000_plazo_dias_habiles`: `Tenant.plazoJustificacionDiasHabiles` (15) reemplaza a las horas; todos los colegios en `modoAvisos = todos`.
- Se eliminó el modo «solo excepciones» y el resumen de llegadas: al guardar la lista se avisa a las familias de presentes (una llegada por alumno y día, por costo y tope de Gmail), tardanzas, faltas y problemas; la cola se procesa al instante con `after()`.
- Plazo: 15 días hábiles desde la falta (lunes a viernes sin feriados nacionales del Perú, Semana Santa calculada), fin del día en Lima; aplica al enlace del correo y a la justificación con sesión; configurable 1–30.
- Claves de nube: se pidió al colaborador crear `.env.nube` (ignorado por git) en vez de pegarlas en el chat. Pendiente: migrar su Supabase con su confirmación.
- Validación: 486 pruebas y 43 e2e en verde (un `ERR_NETWORK_CHANGED` transitorio, repetido y en verde).
- Pendiente: feriados regionales o días no laborables por colegio (la lógica acepta `feriadosExtra`).

## Continuación (2026-10-28): conexión a la nube y super administrador real

> ya  agregue claudinary y el gmail tambien, puedes verificar porfavor

> antes de pasar a eso, quiero preguntarte por unas carpetas que tenemos  como el src y en .venv que esta a la par de la carpeta donde nosotros estamos trabajando

> si no te sirve puedes eliminarlo

> okey vamos a crear el usuario superAdmin el cual es el principal

> khipuescolar@gmail.com este seria el correo y los nombres y apellidos serian Khipu Escolar

- Claves en `khipu-escolar/.env.nube` (ignorado por git, permisos 600). Verificado sin mostrar valores: Supabase (pooler 6543 y 5432; la conexión directa es solo IPv6 y no se usa), Cloudinary (plan Free) y Gmail (contraseña de aplicación; la normal fue rechazada por Google). Secretos internos (`APP_SECRET`, `CRON_SECRET`, VAPID, token del webhook de WhatsApp) generados localmente. Se recomendó cambiar la contraseña normal de Gmail porque apareció en el chat.
- Decisiones del colaborador: proyecto de Supabase en Virginia (`us-east-1`) y base limpia (sin colegios demo).
- Nube: 11 migraciones aplicadas; 37 tablas con RLS forzado y sin permisos para `anon`/`authenticated`.
- Super administrador real `khipuescolar@gmail.com` (Khipu Escolar) creado con contraseña temporal guardada en un archivo privado del equipo del colaborador ([REDACTADO]); `debeCambiarPassword = true`; inicio de sesión en Supabase Auth verificado.
- Se borraron `Asistente Virtual Academico (AVA)/src` (caché `.pyc` de un orquestador Python antiguo) y `.venv` (vacío), y se actualizó el `AGENTS.md` raíz.
- Pendiente: dominio + despliegue en Vercel (variables de `.env.nube`), configurar en Supabase Auth la Site URL y las redirect URLs del dominio, y el SMTP de Auth con Gmail.
