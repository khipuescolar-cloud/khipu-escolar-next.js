# Guía de despliegue (piloto)

> **Dominio por confirmar.** `<dominio>` es el dominio definitivo de Khipu Escolar, que aún no está confirmado: no lo inventes ni lo reemplaces por uno supuesto. Sustitúyelo cuando se contrate.

Paso a paso para publicar Khipu Escolar con Supabase cloud + Vercel. No pegues secretos en este archivo ni en el repositorio: se cargan solo en los paneles de cada servicio. Las variables están listadas en `.env.example`.

Los pasos marcados **(externo)** requieren cuentas o decisiones del equipo (dominio, región, cuentas de pago).

## 1. Supabase cloud

1. Crea un proyecto en supabase.com. Región sugerida: **São Paulo (`sa-east-1`)** (menor latencia desde Perú) **(externo: confirmar región)**.
2. En *Project Settings → Database → Connection string* copia dos cadenas (reemplaza la contraseña por la del proyecto):
   - **Pooler (transaction, puerto 6543)** → `DATABASE_URL` en Vercel (runtime). Agrega `?pgbouncer=true` si el cliente lo pide.
   - **Conexión directa o session pooler (puerto 5432)** → solo para migrar desde tu equipo o CI.
3. Migraciones (desde tu máquina, apuntando temporalmente `DATABASE_URL` a la cadena 5432):
   ```bash
   pnpm db:deploy        # prisma migrate deploy; nunca uses migrate dev/reset en producción
   ```
4. Datos demo: `pnpm db:seed` es **opcional y solo para una demo**. No lo corras en el ambiente real (crea usuarios con contraseña conocida).
5. Claves: *Project Settings → API* → `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` (esta última solo en servidor, nunca `NEXT_PUBLIC_`).
6. *Authentication → URL Configuration*:
   - **Site URL**: `https://<dominio>` **(externo: dominio definitivo)**.
   - **Redirect URLs**: `https://<dominio>/**` y el comodín de subdominios `https://*.<dominio>/**`.
7. *Authentication → SMTP Settings*: configura un SMTP propio para los correos de Auth (invitación, recuperación). En el piloto puede ser la misma cuenta de Gmail de la sección 4; luego Amazon SES **(externo)**. Sin SMTP propio Supabase limita muy fuerte los envíos.

## 2. Vercel

1. Importa el repositorio; *Root Directory*: `khipu-escolar`. Framework: Next.js. Gestor: pnpm.
2. Variables de entorno (Production):

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | cadena pooler 6543 |
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | del paso 1.5 |
   | `APP_BASE_DOMAIN` | `<dominio>` (sin protocolo ni puerto) |
   | `APP_PROTOCOL` | `https` |
   | `COOKIE_DOMAIN` | `.<dominio>` (con punto: comparte sesión entre subdominios) |
   | `APP_SECRET` | 32+ caracteres aleatorios (`openssl rand -base64 48`) |
   | `CRON_SECRET` | aleatorio largo (`openssl rand -hex 32`) |
   | `SMTP_*`, `EMAIL_*` | sección 4 |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | sección 6 |
   | `STORAGE_PROVIDER` y claves | secciones 5 y 5b |

3. Dominios: agrega `<dominio>` y el **comodín `*.<dominio>`** (Vercel exige delegar los nameservers a Vercel para emitir certificados comodín) **(externo: dominio)**.
4. Despliega. Cada colegio vive en `https://<slug>.<dominio>`.

> **Cliente de Prisma en el build:** `pnpm build` corre `prisma generate && next build`. Vercel reutiliza la caché de dependencias y, si nada cambió, pnpm no ejecuta `postinstall`; como `src/generated/prisma` no está en git, sin este paso el build falla con «Can't resolve '@/generated/prisma/client'». `prisma generate` no necesita conexión a la base.

## 3. Crons

`vercel.json` programa (compatible con el plan **Hobby**, que solo permite una ejecución al día):

- `/api/cron/avisos` a las 12:00 UTC (7:00 a. m. de Lima).
- `/api/cron/exportaciones` a las 9:00 UTC (4:00 a. m. de Lima).

No dependen de ellos el uso normal: los avisos se envían al momento (`after()` + `procesarCola()` tras pasar lista, la portería, etc.) y las exportaciones se preparan al momento de pedirlas (`after()` + `procesarExportaciones()`). El cron es el **respaldo** que recoge reintentos, avisos que pasaron el tope diario y exportaciones que quedaron pendientes.

Para un respaldo más frecuente sin pagar Pro, usa un disparador externo gratuito (p. ej. [cron-job.org](https://cron-job.org)):

- `GET https://<dominio>/api/cron/avisos` cada 1–5 minutos.
- `GET https://<dominio>/api/cron/exportaciones` cada 5–15 minutos.
- Encabezado `Authorization: Bearer <CRON_SECRET>` (el secreto va solo en ese servicio y en Vercel).

Con el plan **Pro** de Vercel puedes volver a `* * * * *` y `*/5 * * * *` en `vercel.json`.

### En producción: `/api/cron/avisos` cada 1–5 minutos (obligatorio)

La prueba de estrés (`docs/pruebas-de-estres.md`) mostró que un llamado a `procesarCola` envía como máximo `PRESUPUESTO_MS` (240 s) × `EMAIL_RATE_PER_SECOND`; lo que sobra, los reintentos y lo diferido por el tope diario esperan al siguiente disparo. Con el cron diario de Hobby eso puede ser **un día**. Además, el **control de ingreso automático** (specs/05: «aún no llega» a las 8:00 y falta a las 9:00) lo dispara este mismo cron: con un cron diario esos avisos no salen a tiempo. Antes del piloto con familias reales, el cron de avisos debe correr **cada 1–5 min** con una de estas opciones:

**A. Vercel Pro** (cambia solo la línea de avisos en `vercel.json`; **no lo hagas en Hobby**: Vercel rechaza el despliegue si un cron corre más de una vez al día):

```json
{ "path": "/api/cron/avisos", "schedule": "*/2 * * * *" }
```

**B. Supabase `pg_cron` + `pg_net`** (sirve con Vercel Hobby; *Database → Extensions*: activa `pg_cron` y `pg_net`). Guarda el secreto en Vault y prográmalo desde el *SQL Editor* **(externo: proyecto Supabase de producción)**:

```sql
select vault.create_secret('<CRON_SECRET>', 'khipu_cron_secret');

select cron.schedule(
  'khipu-avisos',
  '*/2 * * * *',
  $$
  select net.http_get(
    url := 'https://<dominio>/api/cron/avisos',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'khipu_cron_secret')
    ),
    timeout_milliseconds := 300000
  );
  $$
);
-- Ver ejecuciones: select * from cron.job_run_details order by start_time desc limit 20;
-- Quitar: select cron.unschedule('khipu-avisos');
```

`net.http_get` no espera la respuesta dentro de la transacción (la guarda en `net._http_response`); un llamado que se solape con el anterior no duplica envíos (reserva atómica y un worker por colegio, specs/06). En la base **local** no lo programes (el cron local no conoce la URL pública).

**C. Disparador externo** (cron-job.org u otro, arriba): misma URL y encabezado.

Comprueba en el monitoreo del panel de plataforma (specs/21) que el cron `avisos` registra ejecuciones cada pocos minutos.

Autenticación: con `CRON_SECRET` definido en Vercel, Vercel envía `Authorization: Bearer <CRON_SECRET>` en cada invocación. Las rutas comparan el secreto en tiempo constante y responden 401 si falta o no coincide (sin `CRON_SECRET` siempre 401).

## 4. Correo

### Piloto con Gmail

1. En la cuenta de Gmail del piloto activa la **verificación en 2 pasos**.
2. Crea una **contraseña de aplicación** (Cuenta de Google → Seguridad → Contraseñas de aplicaciones). Es de 16 caracteres; guárdala solo en Vercel.
3. Variables:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=<cuenta@gmail.com>
   SMTP_PASS=<contraseña de aplicación>
   EMAIL_FROM_ADDRESS=<cuenta@gmail.com>   # igual a la cuenta; Gmail reescribe otros remitentes
   EMAIL_DAILY_LIMIT=450
   ```
4. Riesgos: Gmail limita a ~**500 correos/día** (el límite de 450 deja margen); los envíos desde una cuenta personal tienden a caer en **spam** (sin dominio propio autenticado con SPF/DKIM/DMARC) y Google puede suspender la cuenta por volumen. Solo para pilotos pequeños.

### Migración a Amazon SES

1. Verifica el dominio en SES (DKIM, SPF, DMARC) y pide salir del *sandbox* **(externo)**.
2. Crea credenciales SMTP de SES y cambia: `SMTP_HOST=email-smtp.<región>.amazonaws.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`, `SMTP_USER/SMTP_PASS` de SES, `EMAIL_FROM_ADDRESS=avisos@<dominio>` (obligatorio: en producción, sin esta variable los correos fallan con un error claro y se reintentan; no hay remitente de respaldo), y los límites según la cuota que muestre *SES → Account dashboard* **(externo)**:

   | Cuenta SES | `EMAIL_RATE_PER_SECOND` | `EMAIL_DAILY_LIMIT` |
   |---|---|---|
   | *Sandbox* (solo destinatarios verificados; no sirve para familias) | `1` | `200` |
   | Producción (cuota inicial típica: 14/s y 50 000/día) | `14` (o la tasa real aprobada) | `50000` menos un margen, p. ej. `45000` |

   `EMAIL_RATE_PER_SECOND` es **por colegio** (un worker por colegio): con varios colegios enviando a la vez, súmalos o baja el valor para no pasar la tasa de la cuenta (SES responde *Throttling* y el aviso se reintenta). `EMAIL_DAILY_LIMIT` es global (ventana de 24 h).
   Con usuario SMTP el transporte usa **pool** (`pool: true`, 3 conexiones, 100 correos por conexión): no paga un handshake TLS + AUTH por correo. Se puede ajustar con `SMTP_POOL`, `SMTP_MAX_CONNECTIONS` y `SMTP_MAX_MESSAGES` (specs/06).
3. Configura un tópico SNS para eventos (entregado/rebote/apertura) y pon su ARN en `SES_SNS_TOPIC_ARN` (obligatorio en producción: sin él el webhook rechaza todos los eventos).
4. Usa el mismo SMTP en *Supabase Auth → SMTP Settings*.

## 5. Almacenamiento de archivos

### Cloudinary (piloto)

En el panel de Cloudinary copia *Cloud name*, *API Key* y *API Secret*:

```
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=<cloud name>
CLOUDINARY_API_KEY=<api key>
CLOUDINARY_API_SECRET=<api secret>
```

### 5b. Amazon S3 (migración)

`STORAGE_PROVIDER=s3` y las variables `S3_*` (bucket, región y credenciales de un usuario IAM con permisos solo sobre ese bucket; bucket privado). Los nombres exactos están en `.env.example` y en `specs/` del módulo de archivos.

## 6. Notificaciones push (VAPID)

```bash
pnpm exec web-push generate-vapid-keys
```

Pon la clave pública en `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, la privada en `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT=mailto:soporte@<dominio>` (obligatorio en producción: sin él, Web Push falla con un error claro; en local se usa `mailto:soporte@example.invalid`). No cambies las claves luego: invalidarías las suscripciones existentes.

## 6c. App instalable y tiendas (opcional)

La app se instala desde el navegador sin tiendas (specs/24, página `/instalar`; requiere HTTPS). Para publicarla en Google Play como TWA o evaluar App Store sigue `docs/app-tiendas.md` y define `ANDROID_PACKAGE_NAME` y `ANDROID_SHA256_FINGERPRINTS` en Vercel.

## 7. Super administrador

Con `DATABASE_URL` (5432) y las claves de Supabase en tu `.env` local apuntando al proyecto cloud:

```bash
pnpm khipu:crear-superadmin --email <correo> --nombres <nombres> --apellidos <apellidos> [--documento <dni>]
```

El usuario recibe el correo de invitación/recuperación para definir su contraseña. Luego revierte tu `.env` local.

## 8. Checklist de lanzamiento

- [ ] Proyecto Supabase creado, `pnpm db:deploy` sin errores, **sin** seed demo.
- [ ] Site URL y Redirect URLs (incluido `*.<dominio>`) configuradas; SMTP de Auth probado con una recuperación de contraseña.
- [ ] Variables en Vercel completas; `APP_BASE_DOMAIN`, `APP_PROTOCOL=https`, `COOKIE_DOMAIN` correctos.
- [ ] Dominio y comodín con certificado válido.
- [ ] `CRON_SECRET` definido y crons visibles en Vercel (*Settings → Cron Jobs*); una invocación manual responde 200.
- [ ] Correo de prueba recibido (bandeja, no spam); `EMAIL_DAILY_LIMIT` acorde al proveedor.
- [ ] Almacenamiento: subir y ver un archivo de prueba.
- [ ] VAPID configurado; push de prueba recibido.
- [ ] Super administrador creado; ingreso a `/plataforma` y creación de un colegio de prueba.
- [ ] Revisión legal (términos, privacidad, menores de edad) **(externo)**.
- [ ] Logotipo e isotipo oficiales de la marca **(externo)**.
- [ ] Copias de seguridad de Supabase habilitadas y `lint/typecheck/test` en verde en la rama desplegada.

## Probar con los servicios reales desde tu equipo (antes de Vercel)

`pnpm dev:nube` (`scripts/dev-nube.mjs`) levanta la app en `http://lvh.me:3100` usando las claves de `.env.nube` (Supabase cloud, Cloudinary, Gmail) y solo cambia el dominio a `lvh.me:3100` con `http`. Compila en `.next-nube/`, así que convive con `pnpm dev` (Supabase local en Docker, puerto 3000).

- Panel del super administrador: `http://admin.lvh.me:3100`. Colegios: `http://<slug>.lvh.me:3100`.
- **Escribe en la base real y envía correos reales por Gmail**: no cargues datos de prueba ni correos inventados (rebotan y dañan la reputación de la cuenta).
- Los enlaces de los correos (bienvenida, justificar) apuntan a `lvh.me:3100`: solo funcionan en este equipo hasta que se configure el dominio.


## Almacenamiento directo W1

Para carga directa configure `STORAGE_PROVIDER=s3`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID` y `S3_SECRET_ACCESS_KEY`; `S3_ENDPOINT` permite Supabase Storage o R2 compatible. Configure el bucket como privado y CORS para `PUT` desde el dominio del colegio. Antes de producción verifique en el proveedor URL PUT con Content-Length firmado, tamaño máximo de 25 MB, egreso facturado, almacenamiento facturado y objetos huérfanos.
