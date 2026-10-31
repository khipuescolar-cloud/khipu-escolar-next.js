# 25 — Landing pública (sitio de Khipu Escolar)

> Estado: implementado · Plan: público (sin sesión) · Última actualización: 2026-10-30 (Claude Code, rama `feat/landing`: funciones al día con el producto, pastilla «Khipu Pro», tabla «Compare los planes», prueba gratis y marcha blanca, Nudito+ en piloto con sus garantías, sección de seguridad de vuelta; antes: dos planes, sin WhatsApp/SMS)

## Objetivo
Que un director o promotor que llega a la raíz del dominio entienda en un minuto qué hace Khipu Escolar, vea **todas las funciones reales** con capturas del producto, compare los planes del catálogo y **solicite una demo**. Es la primera página pública del proyecto.

## Roles y permisos
| Rol | Puede | No puede |
|---|---|---|
| Visitante (sin sesión) | Ver la landing y `/privacidad`; enviar «Solicita una demo» | Ver datos de colegios, personas o alumnos (la landing solo lee el catálogo comercial y el buzón de contacto) |
| Cualquier usuario con sesión | Lo mismo; «Ingresar» lo lleva a `/login` | — |

## Flujos
1. `http://<APP_BASE_DOMAIN>/` → `src/proxy.ts` ya no redirige a `/login`: sirve `src/app/(sitio)/page.tsx`. Los subdominios de colegio (`<slug>.` → `/colegio/<slug>/inicio`) y `admin.` (→ `/plataforma`) no cambian.
2. Encabezado fijo: `logotipo-escolar`, anclas (Funciones, Planes, Nudito+, Seguridad, Preguntas; «Cómo funciona» y «Para cada rol» quedan en el pie), «Ingresar» (→ `/login`) y «Solicitar demo» (→ `#demo`). En celular y tableta (< `lg`) las anclas y los dos botones van en un `Sheet` (`MenuMovil`).
3. Secciones, en orden: hero → problema y promesa → funciones (4 grupos) → cómo funciona (índigo, con `CuerdasKhipu`) → para cada rol (`Tabs`) → planes (tarjetas, prueba gratis/marcha blanca y «Compare los planes») → Nudito+ (`#nudito`, piloto) → seguridad y privacidad (`#seguridad`) → franja «Programa piloto 2026» → preguntas frecuentes (`Accordion`) → formulario `#demo` → pie.
4. «Quiero este plan» enlaza a `/?plan=<plan>#demo`: la página lee `searchParams.plan` (solo `base|pro`) y lo pasa como valor inicial de «Plan de interés».
5. Formulario: `solicitarDemoAction` (`src/app/(sitio)/actions.ts`) valida con `esquemaSolicitudDemo` para mostrar el error **junto a cada campo**, exige la casilla de consentimiento y llama a `crearSolicitudDemo(datos, ip)` (specs/26). La IP sale de `x-forwarded-for` (primera) o `x-real-ip` y solo se guarda como hash. Éxito: «Gracias, [nombre]. Te escribiremos en menos de 1 día hábil.» (también si era un bot, sin pistas).
6. `/privacidad`: qué datos del formulario se guardan y para qué; marcada «Borrador pendiente de revisión por un abogado».

## Reglas de negocio
- **No se inventa nada:** sin testimonios, logos de clientes, cifras de usuarios ni premios. Cada función descrita existe en su spec (04–17, 19, 23, 24). En su lugar va la franja «Programa piloto 2026: buscamos los primeros colegios».
- **Planes desde la BD:** `PlanCatalogo` + `PlanModulo` (solo `activo`, por `orden`). Cada tarjeta muestra nombre, descripción, precio (si `precioPorAlumno > 0`: «S/ X.XX por alumno al mes», más «Mínimo S/ Y al mes» si hay mínimo; si no, «Precio según tamaño del colegio»), «Todo lo de <anterior>, más:» con los módulos nuevos (o «Incluye:» en el primero) y «Quiero este plan». `soporte` y `avisos` no se listan como módulo del plan (la mesa de ayuda se anuncia para todos los planes; los avisos van dentro de asistencia). Si la BD no responde o el catálogo está vacío, se usan los planes de `FEATURES` (la landing no se cae).
- **Campo trampa** `sitio`: fuera de la vista (`absolute -left-[9999px]`), `aria-hidden`, `tabIndex={-1}`, `autoComplete="off"`.
- **Contacto del pie:** `mailto:` al buzón de soporte de la plataforma (`ConfigPlataforma` `soporte:correo`, specs/22) o, si no hay, al correo público fijo `CORREO_CONTACTO_KHIPU` = khipuescolar@gmail.com (2026-10-29). Nunca al remitente de los avisos ni a `SMTP_USER`.
- **Tema siempre claro:** `esRutaPublica(pathname, segmentos)` en `Proveedores.tsx` reconoce el sitio por su grupo de rutas (`useSelectedLayoutSegments()[0] === "(sitio)"`), **no** por `pathname === "/"`: en un subdominio de colegio el navegador también ve `/` (rewrite a `/inicio`) y forzaría el tema claro en el panel.
- **Voz:** «usted» al director en las secciones de venta (hero, planes, preguntas, formulario) y «tú» cuando se habla de la familia (pestaña Familias, mensaje de éxito que pide la spec).

## Decisiones
- **Titular (h1):** «Lo que pasa en el aula, le llega a la familia al toque.» (variante para directores: dice qué hace el producto). El lema «Cada día de tu hijo, bien anudado.» va en el `<title>`, en Open Graph y en el pie.
- **Aviso sobre la fintech:** no se incluye «Khipu Escolar no es Khipu, la plataforma de pagos». Nombrar a la fintech en nuestra propia página la asocia más; el manual pide separarse por contexto («Khipu» siempre con «Escolar», sin monedas ni pagos), y la página lo cumple.
- **Planes (2026-10-31):** solo **Khipu Base** y **Khipu Pro**, en dos tarjetas (`md:grid-cols-2`); Khipu Pro destacada. Se venden completos.
- **Planes (2026-10-30, `feat/landing`):** título «Dos planes completos, sin módulos sueltos». Debajo de las tarjetas, dos notas: «Pruébelo gratis una semana con Khipu Pro» y «Colegios del programa piloto: un mes de marcha blanca sin costo» (condiciones comerciales del plan maestro, no funciones del código). Luego la tabla **«Compare los planes»** (`ComparacionPlanes`, `data-testid="comparacion-planes"`): filas = unión de `modulos` de los planes del catálogo (mismo nombre público que las tarjetas), más «Mesa de ayuda, app instalable y trabajo sin conexión» (todos) y «Nudito+ (lo contrata cada familia, en piloto)» («Opcional» en Pro). Celdas con ícono + palabra («Incluido» / «No incluido»; en celular se ve «Sí» / «No» y el lector de pantalla oye la palabra completa). Precios: **no** se publican mientras el catálogo no los tenga (hoy `precio_por_alumno` vacío → «Precio según tamaño del colegio»); los S/ 3 / S/ 5 del plan maestro son referencia interna.
- **Nombres públicos de módulos** (`NOMBRE_PUBLICO` en `src/lib/landing-planes.ts`): asistencia «Asistencia al colegio y por curso, con aviso a la familia y reportes», horario «Horario semanal por salón», notas «Notas por competencias (CNEB)», tablero «Tablero de dirección», documentos «Documentos del colegio», reuniones «Reuniones con confirmación y acta».
- **Funciones (2026-10-30):** las que van solo en Khipu Pro llevan la pastilla índigo «Khipu Pro» (en el grupo Académico, una sola pastilla sobre el título del grupo). Día a día: asistencia al colegio con portería QR (la lista del tutor es el respaldo), asistencia por curso activable por nivel (a la familia solo faltas y tardanzas), justificaciones con bandeja «Por revisar» e historial, reportes en tabla/calendario y Excel/PDF, sin conexión. Comunicación: chat, comunicados, avisos por correo y en el celular (la familia elige), reuniones (Pro). Académico (Pro): notas CNEB con capacidades y desempeños, libreta PDF, tareas y agenda, documentos. Gestión: panel, horario, tablero (Pro), app instalable, mesa de ayuda. Las descripciones de los planes en `planes_catalogo` (editables en `/planes` de la plataforma) siguen siendo las de la migración; la landing no las cambia.
- **Nudito+** (2026-10-31): Nudito sigue como personaje de la marca (SVG oficial, burbuja de preguntas frecuentes), pero **no** se describe como incluido en un plan.
- **Nudito+ (2026-10-30, `feat/landing`):** sección propia `#nudito` después de los planes, tarjeta cochinilla con la pastilla maíz «Piloto · Próximamente para su colegio» y el título «Nudito+, un tutor con inteligencia artificial para cada alumno». Dice solo lo que hace hoy (specs/28–29): el alumno conversa; la familia ve resúmenes y alertas, no las conversaciones (tampoco el colegio ni el equipo Khipu); sigue el CNEB del grado; enlaces solo de sitios permitidos; guía sin dar la respuesta. Licencia mensual por alumno que paga la familia por Yape, solo en colegios con Khipu Pro, fuera de los planes. Sin capturas y **sin nombrar al proveedor de IA**. Se quitaron la captura `nudito.webp` y la mención a Nudito en la pestaña Familias, el pie, la descripción y la imagen Open Graph.
- **Canales:** el aviso llega «por correo y como notificación en el celular»; ya no se mencionan WhatsApp ni SMS como canales de Khipu. Los grupos de WhatsApp siguen nombrados solo como el problema actual de los colegios (sección del problema y «Un día en el colegio»).
- `metadataBase` = `urlRaiz("/")` en el layout raíz (URLs absolutas de Open Graph). En `next dev` Next usa igual `localhost` para las imágenes de archivo; en producción, el dominio real.

## Modelo de datos
Solo lectura: `planes_catalogo`, `plan_modulos`, `config_plataforma` (`soporte:correo`). Escritura: `solicitudes_demo` vía `crearSolicitudDemo` (specs/26, no se modifica aquí).

## Contratos de `src/lib/server`
```ts
// src/lib/server/landing.ts (sin sesión, solo lectura)
leerCatalogoPublico(): Promise<FilaCatalogoPublico[]>
planesPublicos(): Promise<{ planes: PlanPublico[]; desdeCatalogo: boolean }>   // respaldo: planes del código
correoContactoPublico(): Promise<string>                                      // buzón de soporte o khipuescolar@gmail.com
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
- Bloques: hero **índigo** (CTA en maíz, tarjeta de aviso «Llegó» con ícono + palabra, `HiloKhipu`) → problema (tarjetas con borde superior cochinilla/maíz/turquesa y promesa en índigo) → funciones (chips por grupo y panel de color detrás de cada captura: día a día turquesa, comunicación cochinilla, académico índigo cielo, gestión maíz) → cómo funciona **índigo** (pasos numerados en 4 tonos) → roles (panel sólido por rol: dirección índigo, profesores turquesa, familias cochinilla) → planes sobre `superficie-2` (franja de color por plan; Khipu Pro destacada; tabla de comparación en blanco) → Nudito+ en tarjeta **cochinilla** → seguridad sobre turquesa suave → piloto **maíz** sólido → preguntas → demo **índigo** con el formulario en tarjeta blanca → pie con `HiloKhipu`.
- Sin sobretítulos encima de los títulos (2026-10-29): el título se sostiene solo y el color lo ponen los nudos. Problema y seguridad ya no son rejillas de tarjetas iguales: columnas con un nudo y una cuerda (problema) y lista a dos columnas con filetes (seguridad). `src/components/marca/HiloKhipu.tsx` queda en el pie.

### Movimiento (2026-10-29, GSAP + ScrollTrigger con `@gsap/react`)
- **Momento principal, el hero** (`_componentes/AvisosEnVivo.tsx`: `EscenaAvisos`, `TarjetaAviso`, `CuerdaAvisos`): cada 1,5 s llega un aviso de ejemplo (Llegó 7:52 a. m. → Tarea nueva → Comunicado → Libreta publicada; datos ficticios, ícono + palabra) y ata el siguiente nudo de la cuerda del hero, con su color. El aviso nuevo sube aclarándose y el anterior se hunde detrás. Se pausa fuera de la pantalla y en otra pestaña. Es `aria-hidden`: el texto del hero ya lo dice.
- La tarjeta de avisos va **debajo** de la laptop (solo monta sobre su base), para no tapar la captura.
- **«Un día en el colegio»** (`_componentes/DiaEnElColegio.tsx`, sección del problema): el scroll corre el reloj de 7:00 a. m. a 9:00 p. m. y cada aviso se enciende cuando el reloj lo alcanza. Con Khipu: llegó (7:52 a. m.), tarea nueva (10:15 a. m.), reunión (12:40 p. m.) y libreta (3:05 p. m.). Sin Khipu: llegada y tarea por el cuaderno (4:30 p. m.), reunión perdida en el grupo de WhatsApp (8:40 p. m.) y libreta días después. Es un ejemplo ilustrativo.
- **Cómo funciona** (`_componentes/PasosKhipu.tsx`): los 4 pasos son nudos de una cuerda en maíz que se dibuja con el scroll (horizontal en escritorio, vertical en el celular).
- **Funciones:** sin barra de atajos (se quitó el 2026-10-29: se veía mal, sobre todo en el celular).
- **Para cada rol** (`_componentes/PestanasRoles.tsx`): pestañas propias (tablist accesible con flechas, Inicio y Fin) con el rol y a quién va dirigido. Los tres paneles comparten la celda de la rejilla (los inactivos con `inert` e invisibles), así el bloque no cambia de tamaño al cambiar de pestaña.
- **Preguntas frecuentes:** fondo índigo cielo suave, cada pregunta en su tarjeta con un ícono de color y borde del mismo tono al abrirse. Nudito invita a preguntar (burbuja cochinilla, Nunito) con el botón «Hacer otra pregunta» (→ #demo).
- **Formulario de demo:** tres bloques numerados (Sobre usted · Su colegio · ¿Cómo le contactamos?) con ejemplos en cada campo; el consentimiento y el envío van separados por un filete.
- **Pie** (`_componentes/PieSitio.tsx`): fondo `tinta` con la cuerda del khipu arriba; cierre con el lema (sin botones: la demo está justo arriba); columnas El producto, Empieza y Khipu Escolar (correo de contacto, Privacidad, Programa piloto 2026); «Hecho en el Perú para los colegios del Perú».
- **Seguridad:** se quitó el 2026-10-29 y **volvió el 2026-10-30** (`#seguridad`, fondo turquesa suave, lista a dos columnas con filetes y título «Los datos de sus alumnos, cuidados»). Solo garantías que el código cumple: datos de cada colegio separados y cada persona ve lo suyo (specs/01), RLS cerrada, auditoría y consentimiento de las familias (specs/15), modo soporte de solo lectura con motivo y vencimiento, sin chats ni notas y auditado (specs/16), exportación de los datos del colegio.
- Detalles: los botones se hunden a 0,96 al presionar; precios y horas con `tabular-nums`; selección de texto en maíz y cursor de texto en índigo cielo; los planes suben 4 px al pasar el cursor.
- **Sin JS o con «reducir movimiento»** (`gsap.matchMedia`): el HTML ya trae el estado final y la página se ve completa y quieta (primer aviso, cuerdas anudadas, día completo). Nada se oculta antes de que cargue el JS.

### Capturas reales
- `public/landing/*.webp` (≤ 200 KB cada una; medidas y `alt` en `_componentes/capturas.ts`): `pasar-lista`, `familia-asistencia`, `chat`, `notas`, `direccion-inicio`, `porteria`, `carnets`, `mesa-ayuda`. Escritorio 1366 × 854; celular 390 px a 2× (780 × 1688). Tema claro.
- Se regeneran con `E2E_PORT=<puerto> pnpm exec tsx scripts/capturas-landing.ts` (app corriendo y BD con seed; `CAPTURAS_SOLO=chat,notas` para algunas). El script entra con las cuentas demo, reemplaza cualquier correo visible por «correo oculto», crea una conversación de chat y una consulta de mesa de ayuda **de ejemplo** y las borra al terminar.
- Hero: laptop (pasar lista) + celular (calendario de la familia) con `priority`; el resto con carga diferida.

## Textos y UX
- Hero sin sobretítulo; «Hecho para colegios del Perú» va primero en la lista de garantías; subtítulo = la promesa de marca; CTA «Solicitar demo» y «Ver funciones».
- Problema (3 puntos): la familia no se entera a tiempo; el profesor avisa uno por uno (30 alumnos = 30 mensajes); la información está dispersa (WhatsApp, cuadernos, Excel).
- Preguntas frecuentes (8): instalar, módulos sueltos (no: dos planes completos), ¿avisos por WhatsApp? (no: correo y notificación, la familia elige), cuánto tarda, celulares baratos, sin internet, datos de los alumnos, ¿puedo probarlo? (demo, una semana gratis con Khipu Pro, piloto con un mes de marcha blanca).
- Para cada rol: dirección (reportes en tabla/calendario y Excel/PDF, horario, carnets y avisos, y con Khipu Pro tablero, notas, libreta y reuniones), profesores («Por revisar», «Mi horario»), familias (horario del hijo; con Khipu Pro notas, tareas y libreta).
- Cómo funciona: el colegio se registra con Khipu → carga profesores y alumnos (CSV) → el profesor pasa lista → la familia recibe el aviso.
- Estados de error del formulario junto al campo; error general con `Alerta`; éxito con ícono + texto y foco en el mensaje.
- Accesibilidad: un solo `h1`; títulos en orden (h2 por sección, h3/h4 dentro); foco visible global; controles ≥ 44 px; íconos decorativos `aria-hidden`; el movimiento de «Movimiento» respeta `prefers-reduced-motion` (y las animaciones de `Accordion`/`Sheet` también, por la regla global).
- Responsive verificado sin scroll horizontal en 375, 390, 768, 1024, 1366 y 1440 px.

## Errores y casos borde
- Demasiados envíos desde la misma IP (3 por hora) → `Alerta` con el mensaje de `crearSolicitudDemo`; lo escrito se conserva.
- Error inesperado al guardar → «No pudimos enviar tus datos. Inténtalo de nuevo en unos minutos.» (se registra en el log).
- `?plan=` con un valor que no es un plan → se ignora.
- BD caída → planes del código y contacto = khipuescolar@gmail.com.

## Pruebas
- unit: `tests/unit/landing-planes.test.ts` (nombres públicos de horario, notas CNEB, tablero y reuniones, sin Nudito+; activos y orden, «todo lo de Khipu Base» y módulos nuevos de Khipu Pro, plan que no contiene al anterior, precio en soles o «Precio según tamaño del colegio», respaldo del código).
- e2e: `tests/e2e/landing-publica.test.ts` (h1, secciones —incluidas `nudito` y `seguridad`— y planes iguales al catálogo; tabla «Compare los planes» con horario en los dos y notas solo en Pro; Nudito+ marcado «Piloto», con Yape y «la familia ve reportes, no conversaciones»; modo soporte en seguridad; ninguna mención a avisos por WhatsApp o SMS; «Quiero este plan» preselecciona y «Ingresar» lleva a `/login`; el formulario valida junto a los campos, pide consentimiento, guarda la solicitud y el campo trampa no guarda nada; los subdominios de colegio y `admin.` siguen yendo a su login/inicio; `/privacidad` marcada como borrador). Usa un `x-forwarded-for` distinto por prueba para no chocar con el límite por IP.

## Pendientes
- **Legal:** texto de `/privacidad` revisado por un abogado (y la política general de la plataforma).
- **Producción:** detrás de un proxy que no reescriba `x-forwarded-for`, un bot podría variar la IP; en Vercel la cabecera la pone la plataforma.
- Regenerar las capturas en horario escolar (las actuales muestran horas de madrugada, p. ej. «3:43 a. m.»).
- Fuentes Sora/Inter en la imagen Open Graph (hoy usa la fuente por defecto de `next/og`).
- Cuando haya precios en el catálogo, revisar el texto de las tarjetas con ventas.
- Actualizar desde `/planes` (plataforma) las descripciones de `planes_catalogo`: la de Khipu Pro no nombra documentos, reuniones ni tablero, y la de Base no nombra el horario.
- Capturas de las funciones nuevas (horario, reportes en calendario, tablero, reuniones) con `scripts/capturas-landing.ts`.
