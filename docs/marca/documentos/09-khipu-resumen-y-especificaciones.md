# Khipu Escolar: resumen del proyecto y especificaciones

> Documento de contexto para agentes de código (Codex, Claude Code) y para el equipo. Actualizado el 22/10/2026.
> Junta lo conversado y decidido hasta hoy. Se marca qué está **DECIDIDO** y qué es **PROPUESTA** (pendiente de que Sebas lo apruebe).
> Si lo usas con Codex, puedes copiarlo a la raíz del repositorio como `AGENTS.md`.

---

## 1. Qué es Khipu

**Khipu Escolar** es una plataforma web **multitenant** para colegios y academias privadas del Perú (y después Latinoamérica). En un solo sistema conecta a **dirección, profesores, familias (apoderados) y alumnos**. Cada colegio es un cliente separado, con sus propios datos, su dirección web propia y su plan.

- **El problema:** los padres no saben al momento si su hijo llegó al colegio, y la comunicación entre el colegio y la casa va por grupos de WhatsApp, cuadernos de control y Excel. Las intranets que existen (por ejemplo, SieWeb) se ven antiguas.
- **La solución:** el profesor pasa lista → la familia recibe un aviso por correo al instante ("Mateo llegó al colegio a las 7:52 a. m.") → la familia puede justificar una falta o escribirle al tutor sin dar su número. Luego vienen las notas y un asistente con IA llamado **Nudito**.
- **El nombre:** el *khipu* era el sistema inca de cuerdas con nudos para llevar registros. Cada nudo es un dato, igual que cada asistencia, nota o tarea. **Nudito** es un nudo del khipu convertido en mascota.
- **Tagline:** «Cada día de tu hijo, bien anudado.»

## 2. Equipo

| Persona | Rol |
|---|---|
| **Sebastián (Sebas)** | Programador. Lidera la parte técnica (arquitectura, código, infraestructura). |
| **Jafet** | Investigación, diseño, marca, redes, marketing, video y ventas. Apoya a Sebas en lo que pida. |

Idioma del producto y del equipo: **español (Perú)**.

## 3. Qué existe hoy

| Archivo | Contenido |
|---|---|
| `docs/00-audio-contexto-sebas.txt` | Transcripción del audio original de Sebas con la idea |
| `docs/01-estudio-de-mercado.md` | Ranking de 14 sistemas académicos, con fuentes |
| `docs/03-nombre-de-marca.md` | Cómo se eligió el nombre y sus riesgos |
| `docs/04-identidad-visual.md` | Identidad visual: logo, colores, tipografía y tono |
| `docs/05-nudito-personaje.md` | Personaje Nudito: personalidad, estados y reglas |
| `docs/06-estrategia-de-venta.md` | Cliente ideal, piloto, precios (hipótesis) y plan de 90 días |
| `docs/07-plan-de-redes.md` | Plan de redes y contenido |
| `docs/08-plan-de-arranque.md` | Plan de las primeras 4 semanas |
| `docs/marca/` | SVG del logotipo, isotipo, ícono de app, favicon, Nudito y patrón, más `tokens.json` |
| `app/prototipo-login/index.html` | **Prototipo navegable** (HTML y JS, sin backend) del acceso multicolegio y del panel por rol |
| `docs/ESTADO.md` | Bitácora con las decisiones y los siguientes pasos |

**Todavía no existe:** el repositorio de código, la base de datos, el dominio, las cuentas de los servicios ni la evaluación técnica formal (`02-evaluacion-tecnica.md`).

---

## 4. Producto

### 4.1 Tipos de usuario (roles por colegio)

| Rol | Cómo obtiene su cuenta | Qué hace |
|---|---|---|
| `direccion` (admin del colegio) | La crea Khipu al dar de alta al colegio | Configura el colegio, crea usuarios académicos, ve reportes de todo el colegio |
| `profesor` | **Usuario académico** que le da el colegio (correo con el dominio del colegio o uno asignado) | Pasa lista, escribe a las familias, registra notas y tareas |
| `apoderado` (familia) | Invitación del colegio a su **correo personal** (Gmail, Hotmail, etc.) | Ve la asistencia y las notas de sus hijos, justifica faltas, escribe al tutor, usa a Nudito |
| `alumno` | (Más adelante) | Ve sus tareas; habla con Nudito bajo supervisión |

- **Un apoderado puede tener hijos en varios colegios.** Una sola cuenta ve a todos sus hijos y, al entrar, elige el colegio. Esto afecta el diseño multitenant: el usuario es global y la membresía es por tenant.
- Un profesor puede trabajar en dos colegios (es poco común, pero el modelo de membresías ya lo permite).

### 4.2 Planes (DECIDIDO el orden; los precios son HIPÓTESIS)

| Plan | Incluye | Precio hipótesis (por alumno al mes) |
|---|---|---|
| **Básico** | Asistencia con aviso por correo a la familia (llegó, llegó tarde, no llegó o hubo un problema), justificar faltas, chat entre la familia y el profesor o tutor, comunicados | S/ 3–5 |
| **Fase 2 / «Familia»** | Básico + notas y libretas visibles para las familias, tareas y agenda | S/ 5–8 |
| **Pro Max** | Fase 2 + **Nudito**: asistente IA conectado a las tareas que recuerda, agenda, supervisa, responde a las familias con datos reales y muestra reportes | S/ 9–12 |

- Los precios se validan con 10 entrevistas a colegios (hasta el 22/11/2026). Se propone un mínimo mensual (por ejemplo, S/ 300).
- **Piloto:** 8 semanas gratis para 2 «colegios fundadores», con 50 % de descuento en 2027 si se quedan y garantía de salida (se devuelven y se borran los datos).
- El acceso a cada función depende del plan del tenant. **El bloqueo se valida en el servidor**, no solo en la interfaz.

### 4.3 Flujos clave del MVP (plan Básico)

1. **Login:** correo + contraseña.
   - Si el dominio del correo pertenece a un colegio → se resuelve ese tenant y se redirige a `https://<slug>.khipuescolar.pe` (dominio por confirmar).
   - Si es un correo personal → se busca la cuenta de apoderado. Si tiene varios colegios, elige a cuál entrar.
   - Incluye recuperar la contraseña y un límite de intentos fallidos.
2. **Pasar lista (profesor):** elige el salón y el curso → marca a cada alumno como `llego` / `tarde` / `falta`, con la hora → «Guardar y avisar a los padres».
3. **Aviso a la familia:** un correo transaccional por alumno, firmado por el colegio. Siempre lleva un ícono y una palabra, nunca solo color. Si es una falta, incluye el botón **«Justificar falta»** (enlace con un token de un solo uso).
4. **Justificar falta (apoderado):** un formulario corto (motivo y adjunto opcional). El profesor o tutor lo ve en el panel.
5. **Chat familia ↔ profesor:** mensajes dentro de la plataforma, **sin exponer números de teléfono**, con aviso por correo cuando hay un mensaje nuevo.
6. **Panel de dirección:** asistencia del día, avisos enviados, gestión de profesores, salones y alumnos, y configuración (hora de envío de los avisos, logo, dominio).

**Fuera del MVP:** notas, tareas, Nudito, la app móvil nativa, WhatsApp/SMS y los pagos de pensiones.

### 4.4 Reglas de producto (DECIDIDO)

- **Los avisos van por correo y no por WhatsApp**: la API de WhatsApp cobra por cada mensaje. Plan B si los padres no abren los correos: SMS, WhatsApp o notificaciones push. **Meta del piloto: 70 % de apertura.**
- El aviso de falta o de un problema **lo firma el colegio**, en tono serio, sin emojis. **Nudito nunca da malas noticias.**
- Textos de ejemplo:
  - «Mateo llegó al colegio a las 7:52 a. m.»
  - «Lucía llegó tarde hoy (8:15 a. m.). Si tienes dudas, escríbele a su tutora.»
  - «Mateo no llegó hoy a la 1.ª hora. Si ya lo sabías, puedes justificar la falta.»
- Con las familias se usa «tú». Una idea por mensaje. Nada de tecnicismos.

### 4.5 Nudito (plan Pro Max, después del MVP)

- Es un widget flotante (abajo a la derecha) que se abre en una burbuja de chat. Se recomienda animarlo con Rive o Lottie, y debe respetar `prefers-reduced-motion`.
- **Responde solo con los datos reales del tenant** (tareas, fechas, asistencia, notas, documentos del colegio como el reglamento o el calendario), al estilo RAG. **Nunca cruza datos entre colegios ni entre familias.**
- **Nunca** inventa datos, compara alumnos, usa la culpa ni las rachas, guarda secretos con un menor ni da malas noticias. Si no sabe algo o detecta un riesgo, **deriva a un adulto del colegio**.
- Siempre aclara que es una IA: «Soy un asistente con IA. Si no sé algo, te paso con una persona del colegio.»
- El apoderado puede revisar las conversaciones de Nudito con su hijo (referencia: Khanmigo).

---

## 5. Especificación técnica

### 5.1 Stack

| Capa | Elección | Estado |
|---|---|---|
| Frontend | **React + Next.js** (App Router), TypeScript | DECIDIDO (Sebas) |
| Backend, fase de prueba (1–2 colegios) | **Supabase**: Postgres, Auth y Storage | DECIDIDO (Sebas) |
| Backend al crecer | **Go**, cuando Supabase se quede corto o cueste más (Sebas mencionó unos 20 USD al mes por más CPU y RAM) | DECIDIDO como dirección futura |
| Hosting del frontend | **Vercel** | Lo propuso Sebas el 22/10 |
| Código | **GitHub** | Lo propuso Sebas el 22/10 |
| Correo transaccional | **Brevo** (API transaccional) | Lo propuso Sebas el 22/10 |
| Arquitectura | **Multitenant**: cada colegio es un tenant | DECIDIDO |

**PROPUESTA para no complicar la migración a Go:** la lógica de negocio va en *server actions* y *route handlers* de Next.js, o en funciones de Postgres, detrás de una capa `lib/server/*` con contratos claros. No se llama a Supabase directamente desde los componentes del cliente para escribir datos. Así, cambiar después a una API en Go solo toca esa capa.

### 5.2 Multitenancy (PROPUESTA)

- **Una sola base de datos compartida**, con `tenant_id` en todas las tablas de negocio y **Row Level Security (RLS)** de Postgres en todas ellas.
- **Cómo se resuelve el tenant:**
  1. Por **subdominio**: `<slug>.khipuescolar.pe`, con un `middleware.ts` de Next.js que lee el host.
  2. En el login, por **dominio del correo** (`tenants.email_domains[]`).
  3. Para los apoderados, por **membresía** (pueden ser varias): se elige al entrar.
- **El tenant activo** viaja en la sesión, por ejemplo como claim personalizado en el JWT de Supabase o en una cookie firmada, y **las políticas RLS validan la membresía en `memberships`**. Nunca se confía en un `tenant_id` que mande el cliente.
- **Roles:** por membresía (`direccion`, `profesor`, `apoderado`, `alumno`), no globales.

### 5.3 Modelo de datos inicial (PROPUESTA, para que Sebas lo ajuste)

```
tenants(id, slug, nombre, ciudad, plan[basico|fase2|promax], email_domains text[], logo_url,
        hora_envio_avisos, zona_horaria default 'America/Lima', estado, created_at)
profiles(id = auth.users.id, nombre, apellidos, telefono?, created_at)          -- usuario global
memberships(id, tenant_id, user_id, rol[direccion|profesor|apoderado|alumno], estado, created_at)
salones(id, tenant_id, nombre "3.° B", nivel[inicial|primaria|secundaria|academia], anio)
cursos(id, tenant_id, salon_id, nombre "Matemática", profesor_id -> memberships)
alumnos(id, tenant_id, salon_id, nombres, apellidos, codigo?, estado)           -- el menor NO necesita cuenta
apoderados_alumnos(id, tenant_id, apoderado_id -> memberships, alumno_id, parentesco,
                   recibe_avisos bool, consentimiento_id)
asistencias(id, tenant_id, alumno_id, curso_id?, fecha, hora, estado[llego|tarde|falta|problema],
            nota?, registrado_por, created_at)  unique(alumno_id, fecha, curso_id)
justificaciones(id, tenant_id, asistencia_id, apoderado_id, motivo, adjunto_path?, estado, created_at)
avisos(id, tenant_id, asistencia_id, destinatario_email, plantilla, brevo_message_id,
       estado[pendiente|enviado|entregado|abierto|rebotado|error], enviado_at, abierto_at)
conversaciones(id, tenant_id, alumno_id, profesor_id, apoderado_id, created_at)
mensajes(id, tenant_id, conversacion_id, autor_id, cuerpo, leido_at, created_at)
consentimientos(id, tenant_id, apoderado_id, version_texto, aceptado_at, ip?, revocado_at?)
auditoria(id, tenant_id, actor_id, accion, entidad, entidad_id, created_at)      -- quién vio o cambió qué
-- Fase 2: evaluaciones, notas · Pro Max: tareas, documentos_colegio, nudito_conversaciones
```

### 5.4 Correo con Brevo (importante)

- **No se puede enviar desde una dirección `@gmail.com` a través de Brevo**: Brevo no puede autenticar dominios de correo gratuitos. Hace falta un **dominio propio** (por ejemplo, `khipuescolar.pe`) con DKIM y DMARC configurados en el DNS. Fuentes: [Suped](https://www.suped.com/learn/dmarc/how-to-set-up-dmarc-dkim-spf-for-brevo), [comunidad de Brevo](https://community.brevo.com/t/email-being-sent-with-t-sender-sib-com/783).
  - **El Gmail del proyecto sirve para registrar las cuentas** (GitHub, Vercel, Supabase, Brevo), **no como remitente de los avisos**.
- **Remitente propuesto:** `avisos@khipuescolar.pe` con el nombre del colegio como nombre visible («I.E.P. Nuevo Horizonte»). Más adelante se puede usar un subdominio por colegio.
- **Límite del plan gratis de Brevo:** según reseñas de 2026, **300 correos al día** (no lo confirmamos en la web oficial). Fuentes: [dreamlit.ai](https://dreamlit.ai/blog/brevo-review), [TechRadar](https://www.techradar.com/pro/software-services/brevo-review).
  - **Un solo colegio de 300 alumnos ya llena ese cupo con un aviso diario.** Para el piloto, se puede pagar el plan Starter (desde unos 9 USD al mes, según esas mismas reseñas) o avisar al instante solo las tardanzas y las faltas y mandar un resumen de las llegadas. **Decisión pendiente de Sebas y Jafet.**
- Hay que guardar el `message_id` y los **webhooks de Brevo** (entregado, abierto, rebotado) en `avisos`, para medir la meta del 70 % de apertura.
- Los correos de **Supabase Auth** (recuperar contraseña, invitaciones) también se deben configurar con el **SMTP de Brevo**, porque el SMTP que trae Supabase por defecto es solo para pruebas y tiene límites.

### 5.5 Seguridad y privacidad (Ley 29733, datos de menores)

- **Privacidad desde el diseño:** se piden solo los datos necesarios. Los menores no necesitan cuenta para el plan Básico.
- **Consentimiento de los padres** registrado y versionado (tabla `consentimientos`) antes de mandar avisos o subir fotos.
- **Permisos por rol con RLS:**
  - El profesor ve solo sus salones.
  - El apoderado ve solo a sus hijos.
  - La dirección ve solo su colegio.
  - Ningún colegio ve a otro.
- **Auditoría** de quién vio o cambió los datos de un alumno.
- **Salida del colegio:** exportar sus datos y borrarlos (es la garantía del piloto).
- **Nunca** se usan caras ni datos de alumnos reales en marketing sin consentimiento firmado.
- El **límite de intentos de login** y la recuperación de contraseña se hacen en el servidor (Supabase Auth tiene *rate limits* configurables).
- **Pendiente con un abogado:** el texto del consentimiento, la política de privacidad, el contrato con el colegio (quién es el titular y quién el encargado de los datos) y si hay que **inscribir el banco de datos** ante la autoridad peruana de protección de datos.
- **Región de los datos:** se elige al crear el proyecto de Supabase. Hay que decidirla y explicarla a los colegios (pendiente).

### 5.6 Infraestructura y cuentas (en creación, 22/10/2026)

| Servicio | Para qué | Notas |
|---|---|---|
| Gmail del proyecto | Dueño de las cuentas | Activar la verificación en 2 pasos y guardar las claves en un gestor |
| Dominio (`khipuescolar.pe` o similar) | Web, subdominios por colegio y remitente de correos | **Hace falta antes de usar Brevo en serio.** Comprobar que esté libre |
| GitHub | Repositorio del código | Sebas como administrador y Jafet como colaborador |
| Vercel | Hosting de Next.js y dominios | El plan gratuito *Hobby* es para uso no comercial según sus términos; para vender, revisar el plan Pro |
| Supabase | Base de datos, Auth y Storage | Proyecto de desarrollo y, más adelante, uno de producción |
| Brevo | Correo transaccional | Autenticar el dominio (DKIM y DMARC) |

Variables de entorno previstas: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (**solo en el servidor**), `BREVO_API_KEY`, `BREVO_WEBHOOK_SECRET`, `APP_BASE_DOMAIN=khipuescolar.pe`. **Nunca se suben claves al repositorio.**

### 5.7 Prototipo de referencia

`app/prototipo-login/index.html` muestra el flujo esperado:
- Detección del colegio por el dominio del correo.
- Pantalla de «Entrando a…» con la dirección del tenant.
- Selector de colegio para el apoderado que tiene hijos en dos colegios.
- Panel de mosaicos por rol.
- Funciones bloqueadas con 🔒 según el plan.
- Pasar lista con la vista previa del correo.
- Nudito solo en el plan Pro Max.

Cuentas de ejemplo (contraseña `demo123`): `lucia.garcia@nuevohorizonte.demo` (profesora, Pro Max), `jorge.ramos@academiaeuler.demo` (profesor, Fase 2), `direccion@losolivos.demo` (dirección, Básico) y `rosa.quispe@gmail.com` (apoderada con hijos en 2 colegios).

---

## 6. Marca y diseño (para la interfaz)

- **Nombre público:** «Khipu Escolar». «Khipu» casi nunca va solo.
  - **Riesgo:** ya existe *Khipu*, una fintech chilena de pagos (khipu.com) que opera en el Perú. Por eso no hay monedas ni nada de pagos en la marca, y hay que revisar el registro en Indecopi (clases 9, 41 y 42).
- **Logotipo:** la palabra «khipu» dibujada con trazo de cuerda redondeado; el punto de la i es un nudo amarillo. **Isotipo:** una K de cuerda con nudos en las puntas. Los archivos están en `docs/marca/`.
- **Tipografía:** Sora (títulos), Inter (texto) y Nunito (solo Nudito). Se cargan con `next/font/google`.
- **Íconos:** Lucide, de línea, con trazo de 2 px.
- **Avisos:** el estado nunca se comunica solo con color; siempre lleva un ícono y una palabra.
- **Tokens** (también en `docs/marca/tokens.json`, con tema oscuro):

```css
:root{
  --indigo:#1E2A78; --indigo-cielo:#3A4BB5; --cochinilla:#A8325E; --turquesa:#0F7C7A; --maiz:#F2B84B;
  --fondo:#FAF7F2; --superficie:#FFFFFF; --superficie-2:#F3F0EA; --tinta:#1B1F2A; --pizarra:#5B6170; --arena:#E4E1DA;
  --acento:#1E2A78; --sobre-acento:#FFFFFF;
  --estado-llego:#166534; --estado-llego-fondo:#E8F5EC;
  --estado-tarde:#9A4A07; --estado-tarde-fondo:#FDF2E3;
  --estado-falta:#B91C1C; --estado-falta-fondo:#FBEAEA;
  --radio-md:10px; --radio-lg:14px; --radio-pildora:999px;
}
/* maiz NUNCA como texto sobre blanco (1.8:1). Todo par de texto revisado ≥ 4.5:1 (WCAG AA). */
```

---

## 7. Mercado (resumen)

- **Referentes:** PowerSchool (tiene un asistente IA para padres, PowerBuddy), ClassDojo (chat simple), ParentSquare (aviso automático de faltas), Google Classroom (resumen a los padres por correo) y Toddle (planes por niveles).
- **Competencia en el Perú:** SieWeb (unos 300 colegios según una nota de 2019–2020). También Blended, Phidias y SIGEP. Ninguno publica sus precios.
- **Diferencial:** avisos al instante, un diseño moderno y **Nudito**: no encontramos un asistente IA para padres en Latinoamérica.
- **Cliente ideal:** un colegio privado de Lima con 150 a 800 alumnos que hoy usa WhatsApp y Excel. Firma el promotor.
- **Calendario:** los colegios eligen su sistema para el año siguiente entre noviembre y febrero.

## 8. Decisiones tomadas

| Fecha | Decisión |
|---|---|
| 21/10/2026 | Avisos por correo, no por WhatsApp (por costo) |
| 21/10/2026 | Next.js + Supabase para el piloto; Go cuando crezca |
| 21/10/2026 | Arquitectura multitenant |
| 21/10/2026 | Planes: Básico → Fase 2 → Pro Max |
| 22/10/2026 | Nombre: **Khipu** (Khipu Escolar) + asistente **Nudito** |
| 22/10/2026 | Identidad visual: K de cuerda, índigo, Sora + Inter |
| 22/10/2026 | Servicios: Gmail del proyecto, Brevo, GitHub, Vercel y Supabase (Sebas) |

## 9. Pendientes y preguntas abiertas

1. **Dominio** para la web y para los correos (sin él no hay avisos confiables por Brevo).
2. **Volumen de correo** frente al límite gratis de Brevo: ¿plan pago o enviar solo las excepciones y un resumen?
3. Región de Supabase y el texto legal (consentimiento, privacidad, contrato), revisado por un abogado.
4. Registro de la marca en Indecopi (por el riesgo con la fintech Khipu).
5. 10 entrevistas a colegios para validar los precios y el alcance del MVP (hasta el 22/11/2026).
6. La evaluación técnica formal (`02-evaluacion-tecnica.md`) y cuándo pasar a Go.

## 10. Glosario

- **Tenant:** un colegio o una academia dentro del sistema.
- **Usuario académico:** la cuenta que el colegio le da al profesor.
- **Apoderado:** el padre, la madre o el tutor legal.
- **Aviso:** el correo automático de asistencia a la familia.
- **Nudito:** el asistente IA del plan Pro Max.
- **RLS:** Row Level Security de Postgres, que filtra las filas según quién consulta.
