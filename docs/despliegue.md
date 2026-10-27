# Guía de despliegue (piloto)

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
   - **Site URL**: `https://khipuescolar.pe` **(externo: dominio definitivo)**.
   - **Redirect URLs**: `https://khipuescolar.pe/**` y el comodín de subdominios `https://*.khipuescolar.pe/**`.
7. *Authentication → SMTP Settings*: configura un SMTP propio para los correos de Auth (invitación, recuperación). En el piloto puede ser la misma cuenta de Gmail de la sección 4; luego Amazon SES **(externo)**. Sin SMTP propio Supabase limita muy fuerte los envíos.

## 2. Vercel

1. Importa el repositorio; *Root Directory*: `khipu-escolar`. Framework: Next.js. Gestor: pnpm.
2. Variables de entorno (Production):

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | cadena pooler 6543 |
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | del paso 1.5 |
   | `APP_BASE_DOMAIN` | `khipuescolar.pe` (sin protocolo ni puerto) |
   | `APP_PROTOCOL` | `https` |
   | `COOKIE_DOMAIN` | `.khipuescolar.pe` (con punto: comparte sesión entre subdominios) |
   | `APP_SECRET` | 32+ caracteres aleatorios (`openssl rand -base64 48`) |
   | `CRON_SECRET` | aleatorio largo (`openssl rand -hex 32`) |
   | `SMTP_*`, `EMAIL_*` | sección 4 |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | sección 6 |
   | `STORAGE_PROVIDER` y claves | secciones 5 y 5b |

3. Dominios: agrega `khipuescolar.pe` y el **comodín `*.khipuescolar.pe`** (Vercel exige delegar los nameservers a Vercel para emitir certificados comodín) **(externo: dominio)**.
4. Despliega. Cada colegio vive en `https://<slug>.khipuescolar.pe`.

## 3. Crons

`vercel.json` programa:

- `/api/cron/avisos` cada minuto (cola de avisos).
- `/api/cron/exportaciones` cada 5 minutos (exportaciones de datos del colegio).

Autenticación: con `CRON_SECRET` definido en Vercel, Vercel envía `Authorization: Bearer <CRON_SECRET>` en cada invocación. Las rutas comparan el secreto en tiempo constante y responden 401 si falta o no coincide (sin `CRON_SECRET` siempre 401). Los crons por minuto requieren plan Pro de Vercel; en Hobby solo hay ejecución diaria: usa un disparador externo (p. ej. un cron que llame con `curl -H "Authorization: Bearer $CRON_SECRET"`) si no hay Pro.

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
2. Crea credenciales SMTP de SES y cambia: `SMTP_HOST=email-smtp.<región>.amazonaws.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`, `SMTP_USER/SMTP_PASS` de SES, `EMAIL_FROM_ADDRESS=avisos@khipuescolar.pe`, `EMAIL_DAILY_LIMIT` según la cuota aprobada.
3. Configura un tópico SNS para eventos (entregado/rebote/apertura) y pon su ARN en `SES_SNS_TOPIC_ARN`.
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

Pon la clave pública en `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, la privada en `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT=mailto:soporte@khipuescolar.pe`. No cambies las claves luego: invalidarías las suscripciones existentes.

## 6b. WhatsApp y SMS (opcional, con costo por mensaje)

Apagados por defecto: sin estas variables nada se envía ni se encola (la pantalla *Configuración → Canales de pago* muestra «Falta configurar en el servidor»). Detalle y costos en `specs/06-avisos-notificaciones.md`.

- **WhatsApp (Meta Cloud API)**: cuenta Meta Business verificada, número dedicado y las plantillas `khipu_*` aprobadas. Variables: `WHATSAPP_TOKEN` (token permanente de usuario del sistema), `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_VERSION` (por ejemplo `v21.0`), `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (texto que tú inventas) y `WHATSAPP_APP_SECRET`. En Meta, registra el webhook `https://<dominio>/api/webhooks/whatsapp` con ese verify token y suscríbete a los eventos de mensajes. Tope: `WHATSAPP_DAILY_LIMIT`.
- **SMS (Twilio)**: `SMS_PROVEEDOR=twilio`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` (número o remitente habilitado para Perú). Tope: `SMS_DAILY_LIMIT`.
- Luego cada colegio los activa en *Configuración → Canales de pago* y cada familia o docente los elige en sus preferencias.

## 7. Super administrador

Con `DATABASE_URL` (5432) y las claves de Supabase en tu `.env` local apuntando al proyecto cloud:

```bash
pnpm khipu:crear-superadmin --email <correo> --nombres <nombres> --apellidos <apellidos> [--documento <dni>]
```

El usuario recibe el correo de invitación/recuperación para definir su contraseña. Luego revierte tu `.env` local.

## 8. Checklist de lanzamiento

- [ ] Proyecto Supabase creado, `pnpm db:deploy` sin errores, **sin** seed demo.
- [ ] Site URL y Redirect URLs (incluido `*.khipuescolar.pe`) configuradas; SMTP de Auth probado con una recuperación de contraseña.
- [ ] Variables en Vercel completas; `APP_BASE_DOMAIN`, `APP_PROTOCOL=https`, `COOKIE_DOMAIN` correctos.
- [ ] Dominio y comodín con certificado válido.
- [ ] `CRON_SECRET` definido y crons visibles en Vercel (*Settings → Cron Jobs*); una invocación manual responde 200.
- [ ] Correo de prueba recibido (bandeja, no spam); `EMAIL_DAILY_LIMIT` acorde al proveedor.
- [ ] Almacenamiento: subir y ver un archivo de prueba.
- [ ] VAPID configurado; push de prueba recibido.
- [ ] (Opcional) WhatsApp/SMS: variables del §6b, webhook verificado en Meta y un mensaje de prueba entregado.
- [ ] Super administrador creado; ingreso a `/plataforma` y creación de un colegio de prueba.
- [ ] Revisión legal (términos, privacidad, menores de edad) **(externo)**.
- [ ] Logotipo e isotipo oficiales de la marca **(externo)**.
- [ ] Copias de seguridad de Supabase habilitadas y `lint/typecheck/test` en verde en la rama desplegada.
