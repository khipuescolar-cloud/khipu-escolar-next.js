# 25 — Landing pública (sitio de Khipu Escolar)

> Estado: implementado · Plan: público (sin sesión) · Última actualización: 2026-10-28 (Claude Code, rama `feat/p5-landing`)

## Objetivo
Que un director o promotor que llega a la raíz del dominio entienda en un minuto qué hace Khipu Escolar, vea **todas las funciones reales** con capturas del producto, compare los planes del catálogo y **solicite una demo**. Es la primera página pública del proyecto.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Visitante (sin sesión) | Ver la landing y `/privacidad`; enviar «Solicita una demo» | Ver datos de colegios, personas o alumnos (la landing solo lee el catálogo comercial y el buzón de contacto) |
| Cualquier usuario con sesión | Lo mismo; «Ingresar» lo lleva a `/login` | — |

## Flujos
1. `http://<APP_BASE_DOMAIN>/` → `src/proxy.ts` ya no redirige a `/login`: sirve `src/app/(sitio)/page.tsx`. Los subdominios de colegio (`<slug>.` → `/colegio/<slug>/inicio`) y `admin.` (→ `/plataforma`) no cambian.
2. Encabezado fijo: `logotipo-escolar`, anclas (Funciones, Cómo funciona, Planes, Seguridad, Preguntas), «Ingresar» (→ `/login`) y «Solicitar demo» (→ `#demo`). En celular y tableta (< `lg`) las anclas y los dos botones van en un `Sheet` (`MenuMovil`).
3. Secciones, en orden: hero → problema y promesa → funciones (4 grupos) → Nudito → cómo funciona (índigo, con `CuerdasKhipu`) → para cada rol (`Tabs`) → planes → seguridad y privacidad → franja «Programa piloto 2026» → preguntas frecuentes (`Accordion`) → formulario `#demo` → pie.
4. «Quiero este plan» enlaza a `/?plan=<plan>#demo`: la página lee `searchParams.plan` (solo `basico|fase2|promax`) y lo pasa como valor inicial de «Plan de interés».
5. Formulario: `solicitarDemoAction` (`src/app/(sitio)/actions.ts`) valida con `esquemaSolicitudDemo` para mostrar el error **junto a cada campo**, exige la casilla de consentimiento y llama a `crearSolicitudDemo(datos, ip)` (specs/26). La IP sale de `x-forwarded-for` (primera) o `x-real-ip` y solo se guarda como hash. Éxito: «Gracias, [nombre]. Te escribiremos en menos de 1 día hábil.» (también si era un bot, sin pistas).
6. `/privacidad`: qué datos del formulario se guardan y para qué; marcada «Borrador pendiente de revisión por un abogado».

## Reglas de negocio
- **No se inventa nada:** sin testimonios, logos de clientes, cifras de usuarios ni premios. Cada función descrita existe en su spec (04–17, 19, 23, 24). En su lugar va la franja «Programa piloto 2026: buscamos los primeros colegios».
- **Planes desde la BD:** `PlanCatalogo` + `PlanModulo` (solo `activo`, por `orden`). Cada tarjeta muestra nombre, descripción, precio (si `precioPorAlumno > 0`: «S/ X.XX por alumno al mes», más «Mínimo S/ Y al mes» si hay mínimo; si no, «Precio según tamaño del colegio»), «Todo lo de <anterior>, más:» con los módulos nuevos (o «Incluye:» en el primero) y «Quiero este plan». `soporte` y `avisos` no se listan como módulo del plan (la mesa de ayuda se anuncia para todos los planes; los avisos van dentro de asistencia). Si la BD no responde o el catálogo está vacío, se usan los planes de `FEATURES` (la landing no se cae).
- **Campo trampa** `sitio`: fuera de la vista (`absolute -left-[9999px]`), `aria-hidden`, `tabIndex={-1}`, `autoComplete="off"`.
- **Contacto del pie:** `mailto:` al buzón de soporte de la plataforma (`ConfigPlataforma` `soporte:correo`, specs/22) o, si no hay, a `EMAIL_FROM_ADDRESS`. Nunca a `SMTP_USER` (puede ser una cuenta personal).
- **Tema siempre claro:** `esRutaPublica(pathname, segmentos)` en `Proveedores.tsx` reconoce el sitio por su grupo de rutas (`useSelectedLayoutSegments()[0] === "(sitio)"`), **no** por `pathname === "/"`: en un subdominio de colegio el navegador también ve `/` (rewrite a `/inicio`) y forzaría el tema claro en el panel.
- **Voz:** «usted» al director en las secciones de venta (hero, planes, preguntas, formulario) y «tú» cuando se habla de la familia (pestaña Familias, mensaje de éxito que pide la spec).

## Decisiones
- **Titular (h1):** «Lo que pasa en el aula, le llega a la familia al toque.» (variante para directores: dice qué hace el producto). El lema «Cada día de tu hijo, bien anudado.» va en el `<title>`, en Open Graph y en el pie.
- **Aviso sobre la fintech:** no se incluye «Khipu Escolar no es Khipu, la plataforma de pagos». Nombrar a la fintech en nuestra propia página la asocia más; el manual pide separarse por contexto («Khipu» siempre con «Escolar», sin monedas ni pagos), y la página lo cumple.
- **Nudito** se presenta como función del plan Pro Max (manual §6: en ventas, Nudito es función, no protagonista), con su SVG oficial y sus reglas: nunca da malas noticias, no inventa ni compara, se presenta como asistente y no habla con alumnos.
- `metadataBase` = `urlRaiz("/")` en el layout raíz (URLs absolutas de Open Graph). En `next dev` Next usa igual `localhost` para las imágenes de archivo; en producción, el dominio real.

## Modelo de datos
Solo lectura: `planes_catalogo`, `plan_modulos`, `config_plataforma` (`soporte:correo`). Escritura: `solicitudes_demo` vía `crearSolicitudDemo` (specs/26, no se modifica aquí).

## Contratos de `src/lib/server`
```ts
// src/lib/server/landing.ts (sin sesión, solo lectura)
leerCatalogoPublico(): Promise<FilaCatalogoPublico[]>
planesPublicos(): Promise<{ planes: PlanPublico[]; desdeCatalogo: boolean }>   // respaldo: planes del código
correoContactoPublico(): Promise<string | null>                               // buzón de soporte o remitente
// src/lib/landing-planes.ts (puro)
armarPlanesPublicos(filas): PlanPublico[]   // activos, por orden, incluyeA/nuevos, precio en PEN o SIN_PRECIO
catalogoDeCodigo(): FilaCatalogoPublico[]
// src/app/(sitio)/actions.ts
solicitarDemoAction(previo, formData): Promise<EstadoFormularioDemo>   // ok | error (por campo o general)
```

## Rutas y UI
- `/` (público): `src/app/(sitio)/page.tsx` (Server Component). Solo llevan JS el formulario (`FormularioDemo`), el menú móvil (`MenuMovil`) y las pestañas (`PestanasRoles`); el `Accordion` es de Base UI.
- `/privacidad` (público): `src/app/(sitio)/privacidad/page.tsx`.
- Layout propio `src/app/(sitio)/layout.tsx` (no usa el de `(publico)`): enlace «Saltar al contenido», encabezado fijo y pie (logotipo, lema, Ingresar, Instalar la app → `/instalar` de specs/24, Privacidad, Contacto, «© 2026 Khipu Escolar · Perú»).
- SEO: título «Khipu Escolar · Cada día de tu hijo, bien anudado.», descripción, canónica, Open Graph y Twitter; imagen generada `src/app/(sitio)/opengraph-image.tsx` (`next/og`: índigo, logotipo blanco oficial, lema y cuerdas con nudos); `src/app/robots.ts` y `src/app/sitemap.ts` (solo `/` y `/instalar`); `lang="es-PE"` del layout raíz.
- Marcos de dispositivo en CSS (`_componentes/Dispositivos.tsx`: `Laptop`, `Celular`, `Ventana`), sin sombras.

### Color (rediseño 2026-10-28: uso intenso de la paleta)
- Tonos en `_componentes/tonos.ts` (`TONOS`, `BOTON_MAIZ`): indigo, indigo-cielo, turquesa, cochinilla y maíz; clases literales. Blanco sobre los sólidos; sobre maíz siempre `sobre-maiz`; maíz nunca como texto sobre claro (sí sobre índigo: «al toque.», «La promesa:»).
- Bloques: hero **índigo** (CTA en maíz, tarjeta de aviso «Llegó» con ícono + palabra, `HiloKhipu`) → problema (tarjetas con borde superior cochinilla/maíz/turquesa y promesa en índigo) → funciones (chips por grupo y panel de color detrás de cada captura: día a día turquesa, comunicación cochinilla, académico índigo cielo, gestión maíz) → Nudito en tarjeta **cochinilla** → cómo funciona **índigo** (pasos numerados en 4 tonos) → roles (panel sólido por rol: dirección índigo, profesores turquesa, familias cochinilla) → planes sobre `superficie-2` (franja de color por plan; Pro Max en índigo con «El más completo» en maíz) → seguridad sobre turquesa suave → piloto **maíz** sólido → preguntas → demo **índigo** con el formulario en tarjeta blanca → pie con `HiloKhipu`.
- Sin sobretítulos encima de los títulos (2026-10-29): el título se sostiene solo y el color lo ponen los nudos. Problema y seguridad ya no son rejillas de tarjetas iguales: columnas con un nudo y una cuerda (problema) y lista a dos columnas con filetes (seguridad). `src/components/marca/HiloKhipu.tsx` queda en el pie.

### Movimiento (2026-10-29, GSAP + ScrollTrigger con `@gsap/react`)
- **Momento principal, el hero** (`_componentes/AvisosEnVivo.tsx`: `EscenaAvisos`, `TarjetaAviso`, `CuerdaAvisos`): cada 3,4 s llega un aviso de ejemplo (Llegó 7:52 a. m. → Tarea nueva → Comunicado → Libreta publicada; datos ficticios, ícono + palabra) y ata el siguiente nudo de la cuerda del hero, con su color. El aviso nuevo sube aclarándose y el anterior se hunde detrás. Se pausa fuera de la pantalla y en otra pestaña. Es `aria-hidden`: el texto del hero ya lo dice.
- **«Un día en el colegio»** (`_componentes/DiaEnElColegio.tsx`, sección del problema): el scroll corre el reloj de 7:00 a. m. a 5:00 p. m. Con Khipu el nudo se ata a las 7:52 a. m.; sin Khipu, a las 4:30 p. m. («8 h 38 min después»). Es un ejemplo ilustrativo.
- **Cómo funciona** (`_componentes/PasosKhipu.tsx`): los 4 pasos son nudos de una cuerda en maíz que se dibuja con el scroll (horizontal en escritorio, vertical en el celular).
- **Funciones** (`_componentes/NavFunciones.tsx`): los atajos por grupo quedan fijos bajo el encabezado y marcan el grupo que se está leyendo (`aria-current="location"`).
- Detalles: los botones se hunden a 0,96 al presionar; precios y horas con `tabular-nums`; selección de texto en maíz y cursor de texto en índigo cielo; los planes suben 4 px al pasar el cursor.
- **Sin JS o con «reducir movimiento»** (`gsap.matchMedia`): el HTML ya trae el estado final y la página se ve completa y quieta (primer aviso, cuerdas anudadas, día completo). Nada se oculta antes de que cargue el JS.

### Capturas reales
- `public/landing/*.webp` (≤ 200 KB cada una; medidas y `alt` en `_componentes/capturas.ts`): `pasar-lista`, `familia-asistencia`, `chat`, `notas`, `direccion-inicio`, `nudito`, `porteria`, `carnets`, `mesa-ayuda`. Escritorio 1366 × 854; celular 390 px a 2× (780 × 1688). Tema claro.
- Se regeneran con `E2E_PORT=<puerto> pnpm exec tsx scripts/capturas-landing.ts` (app corriendo y BD con seed; `CAPTURAS_SOLO=chat,notas` para algunas). El script entra con las cuentas demo, reemplaza cualquier correo visible por «correo oculto», crea una conversación de chat y una consulta de mesa de ayuda **de ejemplo** y las borra al terminar.
- Hero: laptop (pasar lista) + celular (calendario de la familia) con `priority`; el resto con carga diferida.

## Textos y UX
- Hero sin sobretítulo; «Hecho para colegios del Perú» va primero en la lista de garantías; subtítulo = la promesa de marca; CTA «Solicitar demo» y «Ver funciones».
- Problema (3 puntos): la familia no se entera a tiempo; el profesor avisa uno por uno (30 alumnos = 30 mensajes); la información está dispersa (WhatsApp, cuadernos, Excel).
- Cómo funciona: el colegio se registra con Khipu → carga profesores y alumnos (CSV) → el profesor pasa lista → la familia recibe el aviso.
- Estados de error del formulario junto al campo; error general con `Alerta`; éxito con ícono + texto y foco en el mensaje.
- Accesibilidad: un solo `h1`; títulos en orden (h2 por sección, h3/h4 dentro); foco visible global; controles ≥ 44 px; íconos decorativos `aria-hidden`; el movimiento de «Movimiento» respeta `prefers-reduced-motion` (y las animaciones de `Accordion`/`Sheet` también, por la regla global).
- Responsive verificado sin scroll horizontal en 375, 390, 768, 1024, 1366 y 1440 px.

## Errores y casos borde
- Demasiados envíos desde la misma IP (3 por hora) → `Alerta` con el mensaje de `crearSolicitudDemo`; lo escrito se conserva.
- Error inesperado al guardar → «No pudimos enviar tus datos. Inténtalo de nuevo en unos minutos.» (se registra en el log).
- `?plan=` con un valor que no es un plan → se ignora.
- BD caída → planes del código y contacto = remitente.

## Pruebas
- unit: `tests/unit/landing-planes.test.ts` (activos y orden, «todo lo de X» y módulos nuevos, plan que no contiene al anterior, precio en soles o «Precio según tamaño del colegio», respaldo del código).
- e2e: `tests/e2e/landing-publica.test.ts` (h1, secciones y planes iguales al catálogo; «Quiero este plan» preselecciona y «Ingresar» lleva a `/login`; el formulario valida junto a los campos, pide consentimiento, guarda la solicitud y el campo trampa no guarda nada; los subdominios de colegio y `admin.` siguen yendo a su login/inicio; `/privacidad` marcada como borrador). Usa un `x-forwarded-for` distinto por prueba para no chocar con el límite por IP.

## Pendientes
- **Legal:** texto de `/privacidad` revisado por un abogado (y la política general de la plataforma).
- **Producción:** detrás de un proxy que no reescriba `x-forwarded-for`, un bot podría variar la IP; en Vercel la cabecera la pone la plataforma.
- Regenerar las capturas en horario escolar (las actuales muestran horas de madrugada, p. ej. «3:43 a. m.»).
- Fuentes Sora/Inter en la imagen Open Graph (hoy usa la fuente por defecto de `next/og`).
- Cuando haya precios en el catálogo, revisar el texto de las tarjetas con ventas.
