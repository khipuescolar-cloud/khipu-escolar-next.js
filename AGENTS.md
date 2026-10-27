<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Khipu Escolar — guía para agentes y colaboradores

Plataforma web multitenant para colegios del Perú: asistencia con aviso a la familia, chat familia ↔ profesor, notas y libreta, tareas y agenda, y el asistente Nudito. Idioma del producto, del código de dominio y de la documentación: **español (Perú)**.

## Normas obligatorias (para personas y agentes de cualquier tipo)

1. **Specs antes o junto con el código.** Cada módulo o funcionalidad tiene un archivo en `specs/` (plantilla: `specs/_plantilla.md`, índice: `specs/00-indice.md`). Si cambias el comportamiento, actualiza la spec **en el mismo commit**.
2. **Bitácora de conversaciones.** Al terminar cada sesión de trabajo con un agente (Claude, Codex u otro), registra la conversación en `conversaciones/AAAA-MM-DD_<colaborador>_<agente>_<tema>.md` siguiendo `conversaciones/_plantilla.md`:
   - el pedido del colaborador **copiado textualmente**;
   - las decisiones, los cambios (archivos y commits) y los pendientes;
   - **nunca** claves, contraseñas, tokens ni datos reales de alumnos o familias (`[REDACTADO]`).
3. **Un PR o merge sin su spec actualizada y su archivo de conversación no se integra.**
4. No subas `.env`, credenciales ni datos personales. No agregues API keys de IA (Nudito funciona sin LLM por ahora).

## Comandos

```bash
pnpm install                 # instala y genera el cliente Prisma
pnpm db:start                # Supabase local (Docker): Postgres, Auth y Mailpit
cp .env.example .env         # completa las claves con `pnpm exec supabase status`
pnpm db:deploy && pnpm db:seed   # migraciones + datos demo (contraseña demo123)
pnpm dev                     # http://lvh.me:3000  ·  colegios: http://<slug>.lvh.me:3000
pnpm lint && pnpm typecheck && pnpm test   # checks rápidos (tests de integración usan la BD local)
pnpm e2e                     # Playwright (requiere BD con seed)
pnpm khipu:crear-superadmin --email x --nombres … --apellidos … [--documento …]   # super administrador (specs/16)
pnpm db:migrate              # nueva migración tras cambiar prisma/schema.prisma
pnpm db:generate && rm -rf .next   # tras cambiar el esquema: Prisma 7 no regenera solo y Turbopack cachea el cliente viejo
```

Mailpit (correos locales): http://127.0.0.1:54324 · Supabase Studio: http://127.0.0.1:54323

## Arquitectura (resumen; detalle en `specs/01-arquitectura-multitenant.md`)

- **Next.js 16** (App Router, `src/proxy.ts` reemplaza a middleware), TypeScript estricto, Tailwind v4 + **shadcn/ui** (Base UI) con tokens de marca en `src/app/globals.css`.
- **Diseño:** sigue `specs/18-sistema-de-diseno.md` (colores, tipografía, formas, patrones). Estructura en `src/components/shell/` (barra lateral, barra superior, `EncabezadoPagina`, `EstadoVacio`, `BotonConfirmar`). Agrega componentes con `pnpm dlx shadcn@latest add <nombre>` sin sobrescribir `button.tsx` (tiene tamaños táctiles propios).
- **Prisma 7** (`prisma/schema.prisma`, cliente en `src/generated/prisma`) sobre la Postgres de Supabase. **Supabase solo se usa para Auth.**
- **Toda lógica de negocio y acceso a datos vive en `src/lib/server/*`** (server actions y route handlers la llaman). Los componentes cliente nunca escriben en la BD ni llaman a Supabase directamente. Así migrar a Go solo toca esta capa.
- **Multitenancy:** el colegio sale del subdominio (`<slug>.<APP_BASE_DOMAIN>`); `proxy.ts` reescribe a `src/app/colegio/[slug]/…`.
  - En cada página o action del colegio: `const ctx = await requireTenantContext(slug)` y usa **`ctx.db`** (Prisma con `tenantId` inyectado). Nunca leas un `tenantId` enviado por el cliente.
  - En creates usa campos escalares (`alumnoId`, no `alumno: { connect }`). Las escrituras anidadas deben llevar `tenantId` a mano.
  - Alcance por rol: `salonIdsVisibles`, `alumnoIdsVisibles`, `requireAlumnoVisible`, `requireCursoDelProfesor` (en `src/lib/server/tenant.ts`).
  - Plan: `requireFeature(ctx, "notas")` (`src/lib/server/plan.ts`) en cada página, action y route handler de funciones de pago. La UI solo muestra el candado.
  - RLS está activado y **cerrado** para `anon`/`authenticated` en todas las tablas (respaldo si alguien usa supabase-js).
- **Auditoría:** `auditar()` al ver o cambiar datos de alumnos.
- **Correo:** Nodemailer (Mailpit local; Amazon SES en el piloto). **Push:** web-push. **Archivos:** interfaz `FileStorage` (local / Cloudinary; luego S3).

## Estilo

- Nombres de dominio en español (`asistencia`, `apoderado`); `PascalCase` para componentes y tipos, `camelCase` para funciones y variables, `kebab-case` para carpetas que no sean rutas.
- Textos a familias: «tú», una idea por mensaje, sin tecnicismos. Estados siempre con **ícono + palabra**, nunca solo color. Los avisos de falta los firma el colegio, en tono serio y sin emojis. **Nudito nunca da malas noticias.**
- Íconos: `lucide-react`, trazo 2, importados uno por uno. Fuentes: Sora (títulos), Inter (texto), Nunito (solo Nudito).
- Tests: `tests/unit` (puros), `tests/integracion` (BD local), `tests/e2e` (Playwright). Nombra los archivos por comportamiento: `pasar-lista.test.ts`.
- Commits: asunto imperativo y breve (`Add attendance roll call`).

## Cuentas demo (contraseña `demo123`)

| Correo | Rol | Colegio · plan |
|---|---|---|
| lucia.garcia@nuevohorizonte.demo | profesora (tutora 3.° B) | Nuevo Horizonte · Pro Max |
| pedro.salas@nuevohorizonte.demo | profesor | Nuevo Horizonte · Pro Max |
| direccion@nuevohorizonte.demo | dirección | Nuevo Horizonte · Pro Max |
| porteria@nuevohorizonte.demo | portería | Nuevo Horizonte · Pro Max |
| jorge.ramos@academiaeuler.demo | profesor | Academia Euler · Fase 2 (vigesimal) |
| direccion@losolivos.demo | dirección | Los Olivos · Básico |
| rosa.quispe@gmail.com | apoderada (2 colegios) | Nuevo Horizonte y Academia Euler |
| admin@khipuescolar.demo | super administrador (equipo Khipu) | Panel http://admin.lvh.me:3000 (specs/16) |
