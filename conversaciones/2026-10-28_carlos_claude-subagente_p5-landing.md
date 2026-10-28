# Primera landing pública de Khipu Escolar

| Campo | Valor |
|---|---|
| Fecha | 2026-10-28 |
| Colaborador | Carlos (desarrollo) |
| Agente y modelo | Claude Code · subagente (frente landing) · claude-opus-5-5 |
| Rama y commits | `feat/p5-landing` (un commit: «Add public landing page with real product screenshots») |
| Specs afectadas | `specs/25-landing-publica.md` (nueva), `specs/00-indice.md`, `specs/01-arquitectura-multitenant.md`, `specs/16-plataforma-superadmin.md`, `specs/18-sistema-de-diseno.md` |

## Pedidos del colaborador (textual)
> okey necesito que vayas avanzando con algo mas , no se si sepas pero necesito que este sistema tambien sea descargable como si fuera un app, entonces vamos creando eso mismo y tambien quiero que crees la primera landing del proyecto, ahi mostraras todas las funcionalidades, si necesitas capturas tu mismo puedes hacerlo , si quieres ejemplo tu mismo puedes trabajarlo; despliega multiagentes para que todo esto se trabaje y lo dejo todo en tus manos, ire a descansar

(Frente asignado: la landing en la raíz del dominio. La app instalable y el panel de solicitudes los hacen otros subagentes.)

## Decisiones
- La landing vive en el grupo `src/app/(sitio)` con layout propio; `proxy.ts` deja de redirigir `/` a `/login` solo en el dominio raíz.
- Titular: «Lo que pasa en el aula, le llega a la familia al toque.» (para directores); el lema va en el título, Open Graph y pie.
- Tema claro forzado reconociendo el grupo `(sitio)` con `useSelectedLayoutSegments()` y **no** con `pathname === "/"`: con esa comparación el inicio del colegio (`<slug>.<dominio>/`) quedaba en tema claro aunque el usuario usara oscuro (probado).
- Planes leídos de `PlanCatalogo` + `PlanModulo` con un lector público de solo lectura (`src/lib/server/landing.ts`); sin precio → «Precio según tamaño del colegio».
- No se incluye el aviso «no somos la fintech Khipu»: el manual pide separarse por contexto y nombrarla nos asocia más.
- Nada inventado: sin testimonios, logos ni cifras; franja «Programa piloto 2026». Las funciones se describen según sus specs (p. ej. Nudito «funciona por intenciones», así que se presenta como asistente que responde con datos reales, no como IA generativa).
- Contacto del pie: buzón de soporte configurado o `EMAIL_FROM_ADDRESS`, nunca `SMTP_USER`.
- `metadataBase` en el layout raíz.

## Cambios realizados
- `src/app/(sitio)/`: `layout.tsx`, `page.tsx`, `actions.ts`, `opengraph-image.tsx`, `privacidad/page.tsx` y `_componentes/` (encabezado, menú móvil, marcos de dispositivo, pestañas de roles, formulario, capturas).
- `src/lib/landing-planes.ts` (puro) y `src/lib/server/landing.ts` (lectores públicos).
- `src/app/robots.ts`, `src/app/sitemap.ts`; `src/proxy.ts`, `src/components/shell/Proveedores.tsx`, `src/app/layout.tsx` (cambios mínimos).
- `public/landing/*.webp`: 9 capturas reales (colegio demo, datos ficticios, correos ocultos), ≤ 100 KB cada una.
- `scripts/capturas-landing.ts`: regenera las capturas (crea y borra un chat y una consulta de mesa de ayuda de ejemplo).
- Tests: `tests/unit/landing-planes.test.ts`, `tests/e2e/landing-publica.test.ts`.

## Validación
- `pnpm lint && pnpm typecheck && pnpm test` → verde (65 archivos, 580 pruebas).
- `E2E_PORT=3082 pnpm exec playwright test tests/e2e/landing-publica.test.ts tests/e2e/login-flow.test.ts tests/e2e/plataforma-superadmin.test.ts tests/e2e/paginas-basico-por-rol.test.ts` → 16/16.
- Sin scroll horizontal en 375, 390, 768, 1024, 1366 y 1440 px; tema claro en `/` y `/privacidad` con el sistema en oscuro; el colegio sigue en oscuro en `/` y `/inicio`.

## Pendientes y preguntas abiertas
- Revisión legal de `/privacidad` (marcada como borrador).
- `/instalar` (enlazada desde la landing y el sitemap) la entrega la rama `feat/p5-pwa`; al integrar, revisar el choque en `RUTAS_PUBLICAS` de `Proveedores.tsx` y en `proxy.ts`.
- Regenerar capturas en horario escolar (las actuales muestran horas de madrugada).
- Fuentes de marca en la imagen Open Graph.
