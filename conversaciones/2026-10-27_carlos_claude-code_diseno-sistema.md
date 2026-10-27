# 2026-10-27 · carlos · Claude Code · Rediseño del sistema (shadcn/ui) y sistema de diseño

- **Colaborador:** carlos
- **Agente:** Claude Code (Opus 5.5) como orquestador + 5 subagentes Claude (Sonnet) en worktrees
- **Ramas:** `feat/diseno-base`, `feat/diseno-publico-plataforma`, `feat/diseno-dia-a-dia`, `feat/diseno-comunicacion`, `feat/diseno-academico`, `feat/diseno-gestion` → integradas en `main`
- **Specs afectadas:** 18 (nueva), 04, 07, 08, 09, 10, 11, 12, 13, 15, 17

## Pedidos del colaborador (textuales)

> a que se debe la carpeta khipu-wt ?

> como puedo darle uso de una vez

> aqui tengo el usuario y contraseña del gmail de donde saldran los correos: khipuescolar@gmail.com
> [REDACTADO] ; ademas queria mencionarte que mejores la intetrfaz que uses sidebar, drawer, modales, notificaciones , usa la libreria de shadCN para mejorar el diseño y tambien installa skill de diseño como UI UX Pro Max para mejorar el diseño , tambien estoy viendo que no usas Caveman para reducir los tokkens de salida, usalos ; tambien queria consultarte tu haz levantado un supabase de manera local no? por que no veo que uses el que yo tengo creado para este sistema, y dime que necesitas del claudinary ; te mencione que por el momento usaremos nodemon creo que se llama la libreria para enviar correos

> installa las skills porque nopuedes ??

> /ui-ux-pro-max mejora el diseño de todo el sistema y deja un archivo donde se especifique el diseño, tema, colores, formas, stilos etc

> terminaste con los pendintes que te mande ?

## Respuestas y decisiones

- `khipu-wt/` = git worktrees para subagentes en paralelo; todas las ramas antiguas ya estaban integradas. No se borraron (pendiente de confirmación del colaborador).
- **Correo:** se sigue con **Nodemailer** (no «nodemon»). Gmail exige **contraseña de aplicación** (verificación en 2 pasos); la contraseña normal de la cuenta no sirve para SMTP y **no se guardó en ningún archivo**. Se recomendó cambiarla por haber quedado escrita en el chat. Configuración sugerida: `smtp.gmail.com:465`, `EMAIL_DAILY_LIMIT=450`. En local se mantiene Mailpit para no enviar correos a las direcciones demo.
- **Supabase:** el desarrollo usa Supabase local (Docker). Para el proyecto del colaborador se piden URL, anon key, service role y cadenas de conexión pooler, que él mismo pega en `.env`/Vercel.
- **Cloudinary:** se necesitan `Cloud name`, `API Key`, `API Secret` + `STORAGE_PROVIDER=cloudinary`.
- **Skills instaladas** en `~/.claude/skills/`: `ui-ux-pro-max` y `ui-styling` (repo nextlevelbuilder/ui-ux-pro-max-skill) y `caveman` (JuliusBrussee/caveman), revisadas antes de copiar.
- **Dirección visual:** la recomendación automática de la skill apuntaba a público infantil (Comic Neue); se descartó y se tomó el estilo «Minimalism & Swiss» manteniendo la paleta de marca (índigo, maíz, cochinilla, turquesa) y las fuentes Sora/Inter/Nunito.
- **shadcn/ui** (`base-nova`, Base UI) + `next-themes` (claro/oscuro/sistema) + `sonner` (toasts). Botones y campos de 40 px para uso táctil.
- **Estructura:** barra lateral índigo por rol con grupos y candados de plan (drawer en móvil), barra superior con campana de notificaciones, menú de cuenta (rol, perfil, tema, salir). Mismo shell en la plataforma del super administrador.
- **Archivo de diseño:** `specs/18-sistema-de-diseno.md`.
- Decisión abierta: pasar lista no pide confirmación adicional antes de avisar a las familias (el botón ya lo dice).

## Cambios

- `0b24982` base: tokens en `globals.css`, componentes `src/components/ui/*`, `src/components/shell/*` (BarraLateral, BarraSuperior, MenuUsuario, EncabezadoPagina, EstadoVacio, BotonConfirmar, Notificar), wrappers `Boton/Campo/Selector/Tarjeta/Alerta` sobre shadcn, `FormAccion` con toast, `lib/navegacion.ts` con grupos, `hooks/use-mobile.ts`, spec 18, AGENTS.md.
- Merges: público + plataforma (`7e8f2aa`), gestión, académico (`630189f`), comunicación (`f3fd7d6`), día a día.
- Tests e2e ajustados a la nueva estructura (selectores acotados a `main`, formularios dentro de Sheet/Dialog, confirmaciones en `alertdialog`).

## Validación

- `pnpm lint`, `pnpm typecheck`: limpios.
- `pnpm test`: 31 archivos, 275 tests OK.
- `pnpm e2e`: 29/29 OK sobre `main` integrado.

## Pendientes

- Colaborador: contraseña de aplicación de Gmail, credenciales del Supabase propio y de Cloudinary (en `.env`, no en el chat).
- Estados de carga con `Skeleton`; buscador y paginación en Familias; gráficos de 30 días en la plataforma.
- Confirmar si se borran los worktrees de `khipu-wt/`.
