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
