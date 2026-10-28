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
