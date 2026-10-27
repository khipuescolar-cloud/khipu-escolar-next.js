# Pendientes v2 · frente día a día (calendario, sin conexión, carnets PDF, plazo, avisos)

| Campo | Valor |
|---|---|
| Fecha | 2026-10-27 |
| Colaborador | Carlos (desarrollo) |
| Agente y modelo | Claude Code (subagente) · Claude Sonnet 5.5 |
| Rama y commits | `feat/p2-dia-a-dia` · ver `git log` de la rama |
| Specs afectadas | `specs/04-asistencia.md`, `specs/05-porteria-qr.md`, `specs/07-justificaciones.md`, `specs/10-panel-direccion-gestion.md` |

## Pedidos del colaborador (textual)
> Si borralos , si ya no lo estamos usando y ya no lo necesitamos , no hay problema con borrarlos no? y porfavor ve resolviendo todos los pendientes que tengamos , quiero que por a hora trabajes de manera autonoma resolviendo cada problema que tengas y que lances multiagentes para que solucioones todos, si necesitas lazar 50 miltiagentes no hay problema pr que la finalidad es que termines con todo lo pendiente que tuvimos

## Decisiones
- Calendario mensual por hijo con navegación `?mes=AAAA-MM` (acotado al mes actual y 24 meses atrás); lógica pura en `src/lib/calendario-asistencia.ts`.
- Cola sin conexión en IndexedDB nativo (sin paquetes) para listas y escaneos; el servidor es idempotente y solo respeta la hora del dispositivo si es razonable (máx. 5 min futuro, 48 h pasado). Un registro que el servidor ya cambió después de esa hora no se pisa (`omitidos`).
- Service worker: solo se cachean archivos estáticos y el cascarón de `/porteria`; las páginas con datos de alumnos no, por privacidad en equipos compartidos. El SW solo corre en HTTPS/localhost, por eso no hay e2e del SW en `lvh.me`.
- Portería offline guarda solo el token opaco del QR y la hora; ningún dato del alumno.
- PDF de carnets con `@react-pdf/renderer` (A4 de 8 por hoja y CR80); `logoParaPdf` convierte WEBP/SVG a PNG con `sharp` (beneficia también a la libreta).
- Plazo del enlace de justificar = `Tenant.plazoJustificacionHoras` al crear el enlace; mensaje propio para enlace vencido.

## Cambios realizados
- `src/lib/calendario-asistencia.ts`, `registro-offline.ts`, `token-qr.ts`, `plazo-justificacion.ts`, `cliente/cola-offline.ts`; `components/IndicadorSinConexion.tsx`, `RegistrarServiceWorker.tsx`.
- `asistencia/` (calendario, sincronizador, cola), `porteria/` (cola, escáner), `public/sw.js`.
- `lib/server/asistencia.ts` (mes, `registradoAt`, `omitidos`), `porteria.ts` (`leidoAt`), `justificaciones.ts`, `notificaciones/encolar.ts` (plazo), `configuracion.ts`, `resumen-direccion.ts` (`resumenAvisosHoy`), `carnets-pdf.tsx`, `logo.ts`.
- Ruta `api/carnets/[salonId]`, botones de PDF en `gestion/carnets`, campo de plazo en `/configuracion`, tarjeta «Avisos de hoy» en el inicio.
- Tests: unit (calendario, registro offline, plazo, carnets PDF), integración (`dia-a-dia-offline-plazo`, ajustes en `justificar-token` y `pasar-lista`), e2e (`dia-a-dia-offline-calendario`).

## Validación
- `pnpm lint`, `pnpm typecheck`, `pnpm test` en verde; e2e `pasar-lista-aviso-justificar`, `direccion-panel`, `paginas-basico-por-rol`, `dia-a-dia-offline-calendario` en verde (puerto 3025).

## Pendientes y preguntas abiertas
- Aplicar el plazo también a la justificación con sesión (decisión de reglamento).
- E2E del service worker y del escaneo offline con cámara: requieren HTTPS y cámara simulada.
- Lista offline rechazada por un error que no es de red se reintenta en cada apertura (sin tope de intentos).
