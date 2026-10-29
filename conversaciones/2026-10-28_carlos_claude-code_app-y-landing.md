# 2026-10-28 · carlos · Claude Code · App instalable, landing y solicitudes de demo

- **Colaborador:** carlos
- **Agente:** Claude Code (Opus 5.5) como orquestador + 3 subagentes (Opus: PWA y landing; Sonnet: solicitudes)
- **Ramas:** `feat/p5-pwa`, `feat/p5-landing`, `feat/p5-solicitudes` → integradas en `main` y borradas
- **Migración:** `20261028180000_solicitudes_demo` (modelo global `SolicitudDemo`), aplicada en local; **pendiente en Supabase cloud** (requiere confirmación)
- **Specs:** 24 (app instalable), 25 (landing pública), 26 (solicitudes de demo); notas en 01, 04, 16 y 18

## Pedido del colaborador (textual)

> okey necesito que vayas avanzando con algo mas , no se si sepas pero necesito que este sistema tambien sea descargable como si fuera un app, entonces vamos creando eso mismo y tambien quiero que crees la primera landing del proyecto, ahi mostraras todas las funcionalidades, si necesitas capturas tu mismo puedes hacerlo , si quieres ejemplo tu mismo puedes trabajarlo; despliega multiagentes para que todo esto se trabaje y lo dejo todo en tus manos, ire a descansar

## Decisiones

- App: PWA completa (manifiesto con íconos maskable, accesos directos y capturas; instalación guiada en Android/escritorio e instrucciones en iOS; `/instalar`; `/sin-conexion`; aviso de nueva versión; áreas seguras). Tiendas: TWA para Google Play documentado (`docs/app-tiendas.md`, `/.well-known/assetlinks.json` por variables); App Store con advertencias. La app instalada desde el dominio principal abre en `/login` (`?origen=app`).
- Landing en la raíz con su propio grupo `(sitio)`, siempre en tema claro (detectada por grupo de rutas, no por `pathname === "/"`, que afectaba al inicio de los colegios). H1 «Lo que pasa en el aula, le llega a la familia al toque.»; lema en título y OG. Sin testimonios, logos ni cifras inventadas: franja «Programa piloto 2026». Planes leídos del catálogo. Capturas reales de los colegios demo (`scripts/capturas-landing.ts`). `/privacidad` como borrador para abogado.
- Solicitudes de demo: formulario con campo trampa y límite por IP (hash); aviso por correo al buzón del equipo sin datos de contacto; módulo «Solicitudes de demo» con estados, notas, asignación, CSV, borrado y «Crear colegio con estos datos».

## Validación

- `pnpm lint`, `pnpm typecheck`: limpios. `pnpm test`: 67 archivos, 598 pruebas. `pnpm e2e`: 61/61 (2 fallos de red de la máquina —`ERR_NAME_NOT_RESOLVED`, `ERR_NETWORK_CHANGED`— repetidos y en verde).

## Pendientes

- Confirmar y aplicar la migración `solicitudes_demo` en Supabase cloud.
- Retomar las capturas de la landing en horario escolar (las actuales muestran horas de madrugada).
- Revisión legal de `/privacidad`; cuentas de Google Play/Apple para publicar; probar la instalación en celulares reales con HTTPS.

## Seguimiento (mismo día)

> si confirmo que suban las migraciones, sobre las capturas de la landing no hay problema con la hora y sobre las revision legal lo revisaremos despues cuando todo el sistema ya este terminado , si me gustaria publicarlo en las tiendas pero ns como hariamos para migrar todo el sistema, por medio de reactNative con Expo ? o con que hariamos?

> okey creo que eso de apps vamos a hacerlo despues cuando todo el sistetma este implementado

- Migración `20261028180000_solicitudes_demo` aplicada en Supabase cloud (con confirmación); base al día.
- Capturas de la landing: se quedan como están. Revisión legal: al terminar el sistema.
- Apps en tiendas: **no** reescribir en React Native/Expo. Plan: Android con TWA (Bubblewrap) e iOS con Capacitor + push nativo, cámara QR y Face ID (regla 4.2 de Apple). **Postergado** hasta que el sistema esté completo; requiere dominio HTTPS, cuentas de Play/Apple y Mac o compilación en la nube.

## Rediseño de la landing con la paleta

> /ui-ux-pro-max vamos a mejorar la landing que tenemos, porfavor mejora el diseño y usa mucho la matriz de colores que tenemos

- Cada sección con un tono de la marca (detalle en specs/25 · «Color»): hero, cómo funciona y demo en índigo; Nudito en cochinilla; piloto en maíz; seguridad en turquesa suave; paneles de color por grupo de funciones, rol y plan.
- Nuevos: `src/app/(sitio)/_componentes/tonos.ts`, `src/components/marca/HiloKhipu.tsx`. Cambiados: `page.tsx`, `layout.tsx`, `PestanasRoles.tsx`.
- Contraste revisado (blanco sobre sólidos ≥ 5:1; tinta sobre maíz). Textos, ids y pruebas sin cambios. lint, typecheck y e2e de landing + solicitudes: 6/6.

## Vercel: crons del plan Hobby

> okey me gusta, si lo  quiero conectar a vercel, no habria problema con la forma de arrancar el modo nube y el modo local?

> [imagen: Vercel «Hobby accounts are limited to daily cron jobs. This cron expression (* * * * *) would run more than once per day»] no entiendo por q me aparece esto , que sucede?

- Repositorio subido a GitHub (`khipuescolar-cloud/khipu-escolar-next.js`, privado) tras revisar que el historial no tiene secretos.
- `vercel.json`: crons diarios (avisos 12:00 UTC, exportaciones 9:00 UTC) para que el plan Hobby acepte el despliegue.
- Las exportaciones ahora se procesan al momento con `after()` (dirección y panel de plataforma); los avisos ya lo hacían. El cron queda como respaldo.
- Docs: `docs/despliegue.md` §3 (disparador externo tipo cron-job.org o Vercel Pro), specs/06 y specs/15.
- Pendiente: dominio propio con comodín para los subdominios de colegios.
- Deploy en Vercel falló en `postinstall` (`prisma generate`: «Cannot resolve environment variable: DATABASE_URL»). `prisma.config.ts` usa ahora `process.env.DATABASE_URL` en vez de `env()`: generate no necesita la base; migrate/status siguen exigiéndola.

## Skills de diseño y movimiento en la landing (2026-10-29)

> una consulta tienes una skill que se llama impecable , transitions.dev , las skill oficiales de GSAP ,  make interface feel beter? y si no la tienes lo puedes descargar porfavor

> /impeccable porfavor usa estas skills para poder mejorar mucho mas y muchisimo mas la landing del sistema de Khipu

- Skills instaladas en `~/.claude/skills` (fuera del repo) desde sus repos oficiales: impeccable (pbakaus), gsap-* (greensock), transitions-dev/-polish/-ui-generation (jakubantalik) y make-interfaces-feel-better (jakubkrehel).
- Dependencias nuevas: `gsap` 3.13.0 y `@gsap/react` 2.1.2.
- Hero con avisos en vivo que atan nudos en la cuerda; «Un día en el colegio» movido por el scroll (7:52 a. m. con Khipu frente a 4:30 p. m. sin Khipu); pasos unidos por una cuerda que se dibuja; atajos de funciones fijos con el grupo activo. Sin sobretítulos ni rejillas de tarjetas iguales en problema y seguridad. Detalle en specs/25 · «Movimiento».
- Nuevos: `AvisosEnVivo.tsx`, `DiaEnElColegio.tsx`, `PasosKhipu.tsx`, `NavFunciones.tsx` (en `src/app/(sitio)/_componentes/`). Cambiados: `page.tsx`, `layout.tsx`, `globals.css`.
- Verificado: lint, typecheck y e2e de landing + solicitudes 6/6; capturas en 1440 y 390 px; con «reducir movimiento» la página queda completa y quieta.

### Ajustes pedidos sobre la landing

> en la seccion de "Hoy, lo que pasa en el colegio llega tarde a la casa" agregale mas cosas como , notificaciones de tareas, reuniones, cosas que tiene la seccion principal que por cierto el card que menciona las notificaciones en la seccion principal no me gusta donde esta , puedes ponerlo mas abajo porfavor que no tape la pantalla o que este un poco mas arriba, pero no me gusta que tapa gran parte de la pantalla ; en la seccion de "Todo lo que el colegio necesita para comunicarse, en un solo lugar" no me gusta como funciona ese mininavbar, no me gusta sinceramente si es posible quitalo por que incluso en modo celular se ve mal , asi que trata de solucionarlo o retiralo ; mejoremos la seccion de "Cada persona del colegio gana algo distinto" no me gusta que al pasar de tabs el card cambie de tamaño y no se logre identificar bien lo que se necesita, la seccion de "Los datos de los niños, bien cuidados" tambien lo podemos quitar, es bueno mencionarlo pero no por ahora ; la seccion de preguntas frecuentes [imagen] se ve muy apagado y triste trata de mejorar eso mismo; ademas el formulario de solicitar demo esta muy saturado y no tiene una buena organizacion, ademas el footer de la landing debe mejorarse bastante

- Día en el colegio con 4 avisos con Khipu (llegó, tarea, reunión, libreta) frente a 3 sin Khipu (cuaderno, WhatsApp, días después); tarjeta del hero bajo la laptop; mini barra de funciones eliminada (`NavFunciones.tsx` borrado); pestañas de roles de tamaño fijo y con a quién va cada una; sección de seguridad quitada (y su ancla); preguntas frecuentes con color, íconos y Nudito; formulario en 3 bloques numerados; pie nuevo (`PieSitio.tsx`). Detalle en specs/25 · «Movimiento».
- e2e: la lista de secciones de `landing-publica.test.ts` cambia «seguridad» por «roles». lint, typecheck y e2e de landing + solicitudes 6/6; capturas en 1440 y 390 px.

> [imagen] tenemos un scroll horizontal, no me gusta por que descuadra toda la pantalla

- La marca de la hora de «Un día en el colegio» se salía de la tarjeta al final del recorrido; ahora la recorta su contenedor (`overflow-x-clip`). Sin scroll horizontal en 1440, 1024, 768, 390 y 375 px.

> quitamos los botones de solicitar demo y de ingresar , que se encuentran en el footer ; y el correo par khipu es de khipuescolar@gmail.com

- Pie sin botones. `correoContactoPublico()` usa el buzón de soporte configurado o, si no hay, `CORREO_CONTACTO_KHIPU` (khipuescolar@gmail.com), ya no el remitente de los avisos. Aplica al pie y a /privacidad.

> quiero que sea mas rapido, cada 2 segundos si es posible, haces el cambio y subes los cambios

- Avisos del hero cada 2 s (antes 3,4 s): `CADA_MS` en `AvisosEnVivo.tsx`; specs/25 actualizada.

> quiero que sea mas rapido, cada 2 segundos si es posible, haces el cambio y subes los cambios

- Avisos del hero cada 2 s (antes 3,4 s): `CADA_MS` en `AvisosEnVivo.tsx`; specs/25 actualizada.

> mejor ponlo cada 1.5 segundos , y sube el cambio a produccion porfavor

- Avisos del hero cada 1,5 s. Subido a `main` (Vercel despliega desde ahí).
