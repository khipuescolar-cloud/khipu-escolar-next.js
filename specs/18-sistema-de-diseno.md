# 18 · Sistema de diseño (tema, colores, formas y estilos)

- **Estado:** implementado (base y estructura) · páginas en migración
- **Plan:** todos
- **Fuente de verdad del código:** `src/app/globals.css` (tokens), `src/components/ui/*` (shadcn/ui), `src/components/shell/*` (estructura)
- **Herramientas:** shadcn/ui (estilo `base-nova`, primitivas Base UI), Tailwind CSS v4, `lucide-react`, `next-themes`, `sonner`. Dirección visual definida con la skill *ui-ux-pro-max* (estilo «Minimalism & Swiss»: limpio, funcional, alto contraste, cuadrícula).

## 1. Principios

1. **Claridad antes que decoración.** Es una herramienta de trabajo para dirección y profesores, y una ventana tranquila para las familias. Una idea por pantalla, una acción principal por bloque.
2. **Estado = ícono + palabra + color.** Nunca solo color (daltonismo, pantallas al sol).
3. **Celular primero.** Los profesores pasan lista y los padres consultan desde el teléfono: objetivos táctiles ≥ 40 px (botones `h-10`, recomendados 44 px en acciones frecuentes), nada de scroll horizontal salvo tablas, que se desplazan dentro de su contenedor.
4. **Marca peruana sobria.** Índigo de base, maíz como chispa, cochinilla y turquesa como acentos. Sin degradados chillones ni emojis como íconos.
5. **Accesible (WCAG 2.2 AA).** Contraste ≥ 4.5:1 en texto, foco visible, navegación con teclado, `prefers-reduced-motion` respetado.

## 2. Tema y modos

- Claro y oscuro con `next-themes` (`attribute="class"`, por defecto **sigue al dispositivo**). El usuario lo cambia en *Menú de cuenta → Tema*.
- Todo color se usa por **token**, nunca hex sueltos en componentes. El modo oscuro solo redefine variables en `.dark`.
- Variante de Tailwind: `dark:` = `&:is(.dark *)`.

## 3. Colores

### 3.1 Marca

| Token | Hex | Uso |
|---|---|---|
| `indigo` | `#1E2A78` | Color primario: botones principales, barra lateral, enlaces activos |
| `indigo-cielo` | `#3A4BB5` (oscuro `#A5B0F5`) | Anillo de foco, hover de enlaces |
| `maiz` | `#F2B84B` | Chispa: indicador de ítem activo, avatar, insignias en fondo índigo. **Nunca texto sobre blanco** (1.8:1) |
| `cochinilla` | `#A8325E` | Contador de notificaciones, acento secundario |
| `turquesa` | `#0F7C7A` | Acento informativo, gráficos |

### 3.2 Roles semánticos (tokens shadcn → marca)

| Token shadcn | Claro | Oscuro | Uso |
|---|---|---|---|
| `background` | `#FAF7F2` (papel cálido) | `#12141C` | Fondo de la app |
| `foreground` | `#1B1F2A` (tinta) | `#F1EFE9` | Texto principal |
| `card` / `popover` | `#FFFFFF` | `#1B1F2A` | Tarjetas, menús, modales |
| `primary` | `#1E2A78` | `#8F9CF0` | Acción principal |
| `secondary` / `muted` | `#F3F0EA` | `#242938` | Fondos secundarios |
| `muted-foreground` | `#5B6170` (pizarra) | `#B4B8C4` | Texto de apoyo (≥ 4.5:1) |
| `accent` | `#ECEEFA` | `#2A3052` | Hover de ítems de menú |
| `destructive` | `#B91C1C` | `#F87171` | Acciones que borran o desactivan |
| `border` | `#E4E1DA` (arena) | `#343A4C` | Bordes |
| `input` | `#D6D2C9` | `#434A60` | Borde de campos |
| `ring` | `#3A4BB5` | `#A5B0F5` | Foco |
| `sidebar` | `#1E2A78` | `#161A33` | Barra lateral (texto `#E8EAF8`, activo con barra maíz) |
| `chart-1…5` | índigo, turquesa, cochinilla, maíz, índigo cielo | versiones claras | Gráficos |

Los nombres propios anteriores (`fondo`, `superficie`, `superficie-2`, `tinta`, `pizarra`, `arena`, `acento`) siguen existiendo y apuntan a los mismos valores. En código nuevo usa los nombres shadcn (`bg-card`, `text-muted-foreground`, `border`).

### 3.3 Estados de asistencia (siempre ícono + palabra)

| Estado | Texto / fondo claro | Oscuro | Ícono Lucide |
|---|---|---|---|
| Llegó | `#166534` / `#E8F5EC` | `#86EFAC` / `#14321F` | `CheckCircle2` |
| Tarde | `#9A4A07` / `#FDF2E3` | `#FCD34D` / `#3A2A0C` | `Clock` |
| Falta | `#B91C1C` / `#FBEAEA` | `#FCA5A5` / `#3D1515` | `XCircle` |
| Problema | `#6B21A8` / `#F3E8FB` | `#D8B4FE` / `#2E1A40` | `AlertTriangle` |

Clases: `text-llego bg-llego-fondo`, `text-tarde bg-tarde-fondo`, `text-falta bg-falta-fondo`, `text-problema bg-problema-fondo`. Las mismas sirven para éxito, aviso, error y especial en `Alerta`.

## 4. Tipografía

| Rol | Fuente | Tamaños |
|---|---|---|
| Títulos (`h1–h3`, `font-heading`) | **Sora** 600–700, `tracking-tight`, `text-balance` | h1 `text-2xl sm:text-3xl` · h2 `text-xl` · h3 `text-base font-semibold` |
| Texto (`font-sans`) | **Inter** 400–600 | Cuerpo `text-base` en móvil (evita el zoom de iOS en campos), `text-sm` en tablas y ayudas |
| Nudito (`font-nudito`) | **Nunito** | Solo en el asistente Nudito |

Interlineado 1.5 en cuerpo, máximo `max-w-prose` para párrafos largos. Nada de texto de cuerpo menor a 12 px.

## 5. Formas, espacio y elevación

- **Radios:** `--radius` 10 px. Campos y botones `rounded-md` (10 px); tarjetas y modales `rounded-xl` (18 px); píldoras e insignias `rounded-pildora`.
- **Espaciado:** escala de 4 px de Tailwind. Página: `px-4 sm:px-6`, `py-6 lg:py-8`, ancho máximo `max-w-6xl`. Entre secciones `gap-6`/`space-y-8`; dentro de tarjetas `p-5`.
- **Sombras:** mínimas (Swiss). Tarjetas `shadow-xs` + borde; menús y modales usan la sombra de shadcn. Sin sombras de color.
- **Bordes:** 1 px `border` (arena). Separadores con `Separator`.
- **Alturas de control:** botón `h-10` (sm `h-9`, lg `h-11`), campo `h-10`, ítem de barra lateral `h-10`, ícono `size-10`.

## 6. Iconografía

- `lucide-react`, **trazo 2**, tamaño 16 px en botones y menús, 20–24 px en tarjetas. Importar íconos uno por uno (no `import *`) en componentes cliente.
- Íconos decorativos con `aria-hidden`; botones solo-ícono con `aria-label`.
- Prohibido usar emojis como íconos.

## 7. Estructura de la app (shell)

```
┌────────────┬──────────────────────────────────────────┐
│ Barra      │ Barra superior (sticky, h-14):           │
│ lateral    │ [≡] Título de sección        [🔔 3]      │
│ índigo     ├──────────────────────────────────────────┤
│            │ EncabezadoPagina: h1 + descripción  [Acción] │
│ Inicio     │                                          │
│ Día a día  │ Contenido (max-w-6xl)                    │
│ Comunicac. │                                          │
│ Académico  │                                          │
│ Colegio    │                                          │
│ [Avatar ▾] │                                          │
└────────────┴──────────────────────────────────────────┘
```

- **Barra lateral** (`components/shell/BarraLateral.tsx`, shadcn `Sidebar`): logo e insignia del colegio arriba, módulos agrupados por rol (`lib/navegacion.ts` → `grupo`), ítem activo con barra maíz. Funciones fuera del plan aparecen con candado (`Lock`) y tooltip con el plan que las incluye. En escritorio se colapsa a íconos (`Ctrl/⌘ + B`, estado guardado en cookie `sidebar_state`); en móvil (< 768 px) es un **drawer** (`Sheet`) que se cierra al navegar.
- **Menú de cuenta** (`MenuUsuario.tsx`): nombre, correo, *Entrar como* (cambio de rol), Mi perfil, Tema y Salir.
- **Barra superior** (`BarraSuperior.tsx`): botón de menú, título de la sección actual y **campana de notificaciones** con contador (hoy: mensajes sin leer).
- El panel de **Plataforma** (super administrador) usa la misma estructura con su propio menú.
- Las páginas públicas (login, recuperar, justificar) no llevan barra lateral: tarjeta centrada sobre `background`, con el logo.

## 8. Patrones de componentes

| Necesidad | Usa | Notas |
|---|---|---|
| Título de página | `EncabezadoPagina` (`components/shell`) | Un solo `h1` por página; acciones principales a la derecha |
| Acción principal / secundaria | `Boton` (`primario`, `secundario`, `fantasma`, `peligro`) o shadcn `Button` | Un solo botón primario por bloque. Verbos concretos («Guardar y avisar», no «Aceptar») |
| Formulario con server action | `FormAccion` | Éxito → **toast**; error → `Alerta` junto al formulario |
| Campo | `Campo`, `Selector`, shadcn `Input`/`Textarea`/`Field` | **Etiqueta visible siempre** (nunca solo placeholder); error debajo del campo |
| Contenedor | `Tarjeta` o shadcn `Card` (`CardHeader/Title/Description/Content/Footer`) | |
| Lista de registros | shadcn `Table` dentro de `Card`, con `overflow-x-auto` | En móvil, si hay más de 4 columnas, preferir lista de tarjetas |
| Sin datos | `EstadoVacio` | Ícono + frase en positivo + siguiente acción |
| Crear / editar algo corto (≤ 6 campos) | `Dialog` (modal) | Título, descripción, formulario, botones al pie |
| Crear / editar algo largo o detalle de un registro | `Sheet` (panel lateral; desde abajo en móvil) | Mantiene el contexto de la lista |
| Acción destructiva o que avisa a familias | `BotonConfirmar` (shadcn `AlertDialog`) | Explica la consecuencia; botón con verbo concreto |
| Resultado de una acción | `toast` de `sonner` (`toast.success/error`) o `Notificar` para `?ok=`/`?error=` | Arriba al centro, 4 s, con ícono |
| Aviso persistente en la página | `Alerta` (`info`, `exito`, `aviso`, `error`) | Ícono + palabra para lectores de pantalla |
| Estado / plan / rol | shadcn `Badge` o `EstadoAsistencia` | |
| Secciones dentro de una página | shadcn `Tabs` | Si el contenido es independiente |
| Filtros rápidos | `ToggleGroup` o `Selector` | |
| Cargando | `Skeleton` con la forma del contenido; `Loader2` girando en botones | Nunca pantallas en blanco |
| Métrica | `StatTile` + `Semaforo` (`plataforma/_componentes`) | Ícono en recuadro `bg-accent`, valor `font-heading text-3xl`, nota con ícono + palabra |
| Páginas públicas | `(publico)/layout.tsx` | Escritorio: panel índigo de marca (`bg-sidebar`) con el lema + tarjeta centrada; móvil: logo arriba y tarjeta |
| Cambio de estado crítico (suspender) | `CambiarEstado` (`BotonConfirmar` con `peligro`) | Explica la consecuencia antes de aplicar |
| Plan del colegio | `PlanColegio` (`plataforma/EstadoColegio.tsx`) | Insignia con contorno, junto a `EstadoColegio` |
| Menú de acciones por fila | `DropdownMenu` con botón `MoreHorizontal` (`aria-label`) | |

## 9. Movimiento

- Transiciones de 150–250 ms en hover y foco; modales y drawers usan las animaciones de shadcn (`tw-animate-css`).
- Sin animaciones de entrada en scroll ni efectos «parallax». Nudito tiene su propia animación suave.
- `prefers-reduced-motion: reduce` desactiva todas las animaciones (regla global en `globals.css`).

## 10. Responsive

- Puntos de quiebre de Tailwind: `sm` 640, `md` 768 (cambio barra lateral ↔ drawer), `lg` 1024, `xl` 1280.
- Rejillas de tarjetas: `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`.
- Probar siempre en 375 px, 768 px y 1366 px.

## 11. Textos y tono

- Español de Perú, trato de «tú», una idea por mensaje, sin tecnicismos.
- Avisos de falta: los firma el colegio, tono serio, sin emojis. Nudito nunca da malas noticias.
- Estados vacíos y errores dicen qué pasó y qué hacer después.

## 12. Lista de verificación antes de entregar una pantalla

- [ ] Usa tokens (sin hex sueltos) y se ve bien en claro y oscuro.
- [ ] Un `h1` con `EncabezadoPagina`; una acción primaria por bloque.
- [ ] Controles ≥ 40 px; nada de scroll horizontal de página en 375 px.
- [ ] Todo estado con ícono + palabra; contraste ≥ 4.5:1.
- [ ] Campos con etiqueta visible; errores junto al campo.
- [ ] Acciones destructivas con confirmación; éxito con toast.
- [ ] Estado vacío y estado de carga definidos.
- [ ] Foco visible y navegable con teclado; íconos solo-decorativos con `aria-hidden`.

## Pendientes

- Gráficos del panel con `chart-1…5` (métricas de 30 días de la plataforma).
- SVG oficiales de la marca (isotipo y logotipo) cuando lleguen los archivos del equipo de diseño.
