/* eslint-disable @next/next/no-img-element -- SVG oficiales de la marca (public/marca), sin optimización de imagen */
import {
  BellRing,
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ChartColumn,
  Check,
  ClipboardCheck,
  Clock,
  Compass,
  Database,
  Download,
  Eye,
  FileCheck,
  FolderOpen,
  Gift,
  GraduationCap,
  Inbox,
  Layers,
  LifeBuoy,
  Link2,
  ListTodo,
  Megaphone,
  Minus,
  MonitorPlay,
  MessagesSquare,
  Presentation,
  ScanLine,
  School,
  ScrollText,
  Send,
  ShieldCheck,
  Smartphone,
  Users,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { CuerdasKhipu } from "@/components/marca/CuerdasKhipu";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button";
import type { Plan } from "@/generated/prisma/enums";
import type { PlanPublico } from "@/lib/landing-planes";
import { planesPublicos } from "@/lib/server/landing";
import { cn } from "@/lib/utils";
import { CuerdaAvisos, EscenaAvisos, TarjetaAviso } from "./_componentes/AvisosEnVivo";
import { CAPTURAS } from "./_componentes/capturas";
import { DiaEnElColegio } from "./_componentes/DiaEnElColegio";
import { Celular, Laptop, Ventana } from "./_componentes/Dispositivos";
import { FormularioDemo } from "./_componentes/FormularioDemo";
import { PasosKhipu } from "./_componentes/PasosKhipu";
import { PestanasRoles } from "./_componentes/PestanasRoles";
import { BOTON_MAIZ, TONOS, type Tono } from "./_componentes/tonos";

// Landing pública de Khipu Escolar (specs/25-landing-publica.md). Server Component: solo el formulario,
// el menú móvil, las pestañas de roles y el movimiento (AvisosEnVivo, DiaEnElColegio, PasosKhipu) llevan JS. Voz: «usted» al director (ventas) y «tú» a las familias.

const PLANES_VALIDOS: Plan[] = ["base", "pro"];

/** `pro`: la función va solo en Khipu Pro (se marca con la pastilla «Khipu Pro»); sin `pro`, va en los dos planes. */
type Funcion = { Icono: LucideIcon; titulo: string; texto: ReactNode; pro?: boolean };

const GRUPOS: { id: string; tono: Tono; titulo: string; pro?: boolean; funciones: Funcion[]; captura: ReactNode }[] = [
  {
    id: "dia-a-dia",
    tono: "turquesa",
    titulo: "La asistencia llega a la casa en el momento",
    funciones: [
      {
        Icono: ScanLine,
        titulo: "Asistencia al colegio con portería QR",
        texto: "En la puerta se escanea el carnet de cada alumno y la familia recibe el aviso por correo y como notificación en el celular. Si alguien olvidó el carnet, la lista del tutor sirve de respaldo.",
      },
      {
        Icono: ClipboardCheck,
        titulo: "Asistencia por curso, si la necesita",
        texto: "Dirección la activa por nivel. Si un alumno entró al colegio pero faltó o llegó tarde a una clase, la familia recibe el aviso; lo demás queda registrado sin llenar su correo.",
      },
      {
        Icono: Inbox,
        titulo: "Justificaciones con bandeja «Por revisar»",
        texto: "La familia justifica una falta desde el correo o desde Khipu, dentro del plazo del reglamento. El tutor las revisa en su bandeja y encuentra todo en el historial, con filtros.",
      },
      {
        Icono: ChartColumn,
        titulo: "Reportes de asistencia en Excel y PDF",
        texto: "Por alumno, por salón o de todo el colegio, en tabla o en calendario, para el rango de fechas que elija.",
      },
      {
        Icono: WifiOff,
        titulo: "Funciona sin conexión",
        texto: "Si se cae el internet, pasar lista y la portería se guardan en el dispositivo y se envían solos al volver la conexión, con la hora real.",
      },
    ],
    captura: (
      <div className="relative pr-[18%] pb-[10%]">
        <Ventana captura={CAPTURAS.carnets} />
        <Celular captura={CAPTURAS.porteria} className="absolute right-0 bottom-0 w-[30%]" tamanos="(min-width: 1024px) 170px, 30vw" />
      </div>
    ),
  },
  {
    id: "comunicacion",
    tono: "cochinilla",
    titulo: "Familia y colegio conversan sin grupos ni teléfonos",
    funciones: [
      {
        Icono: MessagesSquare,
        titulo: "Chat familia–tutor sin teléfonos",
        texto: "La familia escribe al tutor o a los profesores de su hijo dentro de Khipu. Nadie ve el número ni el correo del otro.",
      },
      {
        Icono: Megaphone,
        titulo: "Comunicados con adjuntos",
        texto: "Dirección y profesores publican anuncios para todo el colegio o para un salón, con archivos adjuntos. Las familias reciben el aviso.",
      },
      {
        Icono: BellRing,
        titulo: "Avisos por correo y en el celular",
        texto: "Cada familia elige si recibe los avisos por correo, como notificación en el celular o de las dos formas. Dirección ve si cada aviso llegó.",
      },
      {
        Icono: CalendarCheck,
        titulo: "Reuniones con confirmación y acta",
        texto: "Convoque reuniones de aula, del colegio o con una familia: las familias confirman, usted marca quién asistió y publica el acta.",
        pro: true,
      },
    ],
    captura: (
      <div className="mx-auto w-[62%] max-w-[300px]">
        <Celular captura={CAPTURAS.chat} tamanos="(min-width: 1024px) 300px, 60vw" />
      </div>
    ),
  },
  {
    id: "academico",
    tono: "cielo",
    titulo: "Notas, libreta y tareas en el mismo lugar",
    pro: true,
    funciones: [
      {
        Icono: GraduationCap,
        titulo: "Notas por competencias del CNEB",
        texto: "Competencias, capacidades y desempeños por grado, con escala literal (AD, A, B, C) o vigesimal (0 a 20). Cada curso cierra sus notas y dirección puede reabrirlas.",
      },
      {
        Icono: BookOpen,
        titulo: "Libreta en PDF",
        texto: "La familia ve el avance de su hijo y descarga la libreta del periodo en PDF cuando dirección la publica.",
      },
      {
        Icono: ListTodo,
        titulo: "Tareas y agenda",
        texto: "Tareas por curso con fecha de entrega y adjuntos; exámenes, reuniones y eventos del colegio ordenados por fecha.",
      },
      {
        Icono: FolderOpen,
        titulo: "Documentos del colegio",
        texto: "Reglamento, calendario y documentos oficiales en carpetas, con permisos por rol y por salón.",
      },
    ],
    captura: <Ventana captura={CAPTURAS.notas} />,
  },
  {
    id: "colegio",
    tono: "maiz",
    titulo: "Dirección tiene todo a la vista",
    funciones: [
      {
        Icono: Users,
        titulo: "Panel de dirección",
        texto: "Profesores, personal, grados y salones, alumnos, familias y carnets. Cargue a su gente con un archivo CSV.",
      },
      {
        Icono: CalendarClock,
        titulo: "Horario semanal por salón",
        texto: "Arme las horas del día por nivel y los cursos de cada salón. Profesores, alumnos y familias ven «Mi horario».",
      },
      {
        Icono: Presentation,
        titulo: "Tablero de dirección",
        texto: "Indicadores de asistencia, notas, tareas y avisos del colegio, y el consolidado de notas por salón en Excel y PDF.",
        pro: true,
      },
      {
        Icono: Smartphone,
        titulo: "App instalable",
        texto: (
          <>
            Se instala en el celular o la computadora desde el navegador, sin tiendas de apps.{" "}
            <Link href="/instalar" className="enlace">
              Ver cómo instalarla
            </Link>
            .
          </>
        ),
      },
      {
        Icono: LifeBuoy,
        titulo: "Mesa de ayuda con el equipo Khipu",
        texto: "Dirección escribe al equipo de Khipu Escolar desde el colegio, en un chat con historial y estado de cada consulta.",
      },
    ],
    captura: (
      <div className="flex flex-col gap-4">
        <Ventana captura={CAPTURAS.direccionInicio} />
        <Ventana captura={CAPTURAS.mesaAyuda} className="ml-[12%]" />
      </div>
    ),
  },
];

const PROBLEMAS: { tono: Tono; titulo: string; texto: string }[] = [
  {
    tono: "cochinilla",
    titulo: "La familia no se entera a tiempo",
    texto: "Si un alumno no llega, muchas familias lo saben recién en la tarde, por el cuaderno de control o en la reunión.",
  },
  {
    tono: "maiz",
    titulo: "El profesor avisa uno por uno",
    texto: "En un salón de 30 alumnos, avisar a cada familia son 30 mensajes. Ese tiempo sale de la clase.",
  },
  {
    tono: "turquesa",
    titulo: "La información está dispersa",
    texto: "Grupos de WhatsApp, cuadernos, hojas de Excel y llamadas: cada dato en un lugar distinto y difícil de encontrar.",
  },
];

const PREGUNTAS: { Icono: LucideIcon; tono: Tono; p: string; r: string }[] = [
  {
    Icono: Download,
    tono: "turquesa",
    p: "¿Necesitan instalar algo?",
    r: "No. Khipu Escolar funciona en el navegador del celular o de la computadora. Si lo prefieren, se instala como app desde la página «Instalar la app», sin pasar por tiendas.",
  },
  {
    Icono: Layers,
    tono: "maiz",
    p: "¿Puedo contratar solo algunos módulos?",
    r: "No. Hay dos planes y se contratan completos: Khipu Base (asistencia, avisos, mensajes, comunicados, horario y gestión) y Khipu Pro (todo Khipu Base más notas, libreta, tareas, agenda, documentos, reuniones y el tablero de dirección).",
  },
  {
    Icono: BellRing,
    tono: "cochinilla",
    p: "¿Los avisos llegan por WhatsApp?",
    r: "No. Los avisos llegan por correo y como notificación en el celular o la computadora, y cada familia elige cómo recibirlos. Así no dependen de números de teléfono ni de grupos.",
  },
  {
    Icono: Clock,
    tono: "cielo",
    p: "¿Cuánto tarda empezar?",
    r: "Lo que tome cargar a su gente. Nosotros creamos el colegio y la cuenta de dirección; ustedes cargan profesores y alumnos con un archivo CSV o uno por uno, y las familias reciben su invitación por correo. En la demo coordinamos las fechas.",
  },
  {
    Icono: Smartphone,
    tono: "turquesa",
    p: "¿Funciona en celulares baratos?",
    r: "Sí, está pensado primero para el celular: botones grandes, pantallas livianas y textos claros. Basta un navegador actualizado, como Chrome o Safari.",
  },
  {
    Icono: WifiOff,
    tono: "maiz",
    p: "¿Qué pasa si no hay internet?",
    r: "Pasar lista y la portería siguen funcionando: los registros se guardan en el dispositivo y se envían solos cuando vuelve la conexión, con la hora en que se hicieron.",
  },
  {
    Icono: ShieldCheck,
    tono: "cochinilla",
    p: "¿Cómo se manejan los datos de los alumnos?",
    r: "Según la Ley 29733: cada colegio tiene sus datos separados, se piden solo los necesarios, las familias dan su consentimiento y cada persona ve solo lo que le corresponde. El equipo de Khipu no lee chats ni notas.",
  },
  {
    Icono: MonitorPlay,
    tono: "cielo",
    p: "¿Puedo probarlo?",
    r: "Sí. Solicite una demo con el formulario de abajo: le mostramos Khipu Escolar con un colegio de ejemplo y puede probarlo gratis una semana con Khipu Pro. Los colegios del programa piloto empiezan con un mes de marcha blanca sin costo.",
  },
];

/** Nudito+ (specs/28–29): en piloto. Solo lo que hace hoy el tutor; sin nombrar al proveedor de IA. */
const NUDITO_PLUS: { Icono: LucideIcon; titulo: string; texto: string }[] = [
  { Icono: Compass, titulo: "Guía, no da respuestas", texto: "Acompaña paso a paso con preguntas. Si le piden la tarea resuelta, ayuda a pensarla." },
  { Icono: GraduationCap, titulo: "Sigue el CNEB de su grado", texto: "Conoce los cursos, las competencias y los desempeños del grado del alumno." },
  { Icono: Link2, titulo: "Materiales de sitios permitidos", texto: "Solo recomienda enlaces de una lista de sitios educativos aprobados." },
  { Icono: Eye, titulo: "La familia ve reportes, no conversaciones", texto: "Recibe resúmenes y alertas. Las conversaciones del alumno son privadas: tampoco las leen el colegio ni el equipo Khipu." },
];

/** Seguridad y privacidad: solo garantías que el código cumple hoy (specs/01, 15 y 16). */
const GARANTIAS: { Icono: LucideIcon; titulo: string; texto: string }[] = [
  { Icono: Building2, titulo: "Cada colegio, sus datos", texto: "Los datos de cada colegio están separados de los demás y cada persona ve solo lo suyo: la familia, a sus hijos; el profesor, sus salones." },
  { Icono: Database, titulo: "Base de datos cerrada", texto: "La seguridad por fila (RLS) de la base de datos está cerrada: nadie entra a los datos por fuera de Khipu Escolar." },
  { Icono: ScrollText, titulo: "Auditoría", texto: "Queda registrado quién vio o cambió datos de alumnos. Dirección consulta el registro cuando lo necesite." },
  { Icono: FileCheck, titulo: "Consentimiento de las familias", texto: "Cada familia acepta el uso de sus datos según la Ley 29733 y puede retirar su consentimiento desde su perfil." },
  { Icono: LifeBuoy, titulo: "Modo soporte transparente", texto: "Si el equipo Khipu entra para ayudar, lo hace solo para leer, con motivo y hora de vencimiento, sin ver chats ni notas, y queda en la auditoría del colegio." },
  { Icono: Download, titulo: "Sus datos son suyos", texto: "Dirección puede descargar todos los datos del colegio en un archivo cuando lo necesite." },
];

// Clases literales (Tailwind no ve las armadas): borde del tono en la pregunta abierta.
const PREGUNTA_ABIERTA: Record<Tono, string> = {
  indigo: "data-open:border-indigo",
  cielo: "data-open:border-indigo-cielo",
  turquesa: "data-open:border-turquesa",
  cochinilla: "data-open:border-cochinilla",
  maiz: "data-open:border-maiz",
};
const TONO_PLAN: Record<string, Tono> = { base: "turquesa", pro: "maiz" };

function Seccion({ id, className, children, etiqueta }: { id?: string; className?: string; children: ReactNode; etiqueta?: string }) {
  return (
    <section id={id} aria-labelledby={etiqueta} className={cn("scroll-mt-20 py-16 sm:py-24", className)}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">{children}</div>
    </section>
  );
}

// Sin sobretítulos encima de los títulos (rediseño 2026-10-29): el título se sostiene solo; el color lo ponen los nudos.
function Encabezado({ id, titulo, texto, claro, centrado }: { id: string; titulo: string; texto?: string; claro?: boolean; centrado?: boolean }) {
  return (
    <div className={cn("flex max-w-2xl flex-col gap-4", centrado && "mx-auto items-center text-center")}>
      <h2 id={id} className="font-heading text-titulo-1 text-balance sm:text-[40px] sm:leading-[46px]">
        {titulo}
      </h2>
      {texto && <p className={cn("text-cuerpo text-pretty sm:text-lg", claro ? "text-white/80" : "text-muted-foreground")}>{texto}</p>}
    </div>
  );
}

/** Ícono en una pastilla de color sólido (blanco encima; tinta sobre maíz). */
function Icono({ Icono: I, tono = "indigo" }: { Icono: LucideIcon; tono?: Tono }) {
  return (
    <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-md", TONOS[tono].solido)}>
      <I className="size-5" strokeWidth={2} aria-hidden />
    </span>
  );
}

/** Marca de las funciones que van solo en Khipu Pro (texto, no solo color). */
function PastillaPro() {
  return <span className="inline-flex w-fit items-center rounded-pildora bg-indigo px-2.5 py-0.5 text-etiqueta font-semibold text-white">Khipu Pro</span>;
}

/**
 * Tabla «Base vs Pro» armada con los mismos datos del catálogo que las tarjetas (specs/25), más las filas comunes a
 * todos los planes y Nudito+. Estado con ícono + palabra (Incluido / No incluido), nunca solo color.
 */
function ComparacionPlanes({ planes }: { planes: PlanPublico[] }) {
  if (planes.length < 2) return null;
  const vistos = new Set<string>();
  const filas: { clave: string; nombre: string; en: (p: PlanPublico) => ReactNode }[] = [];
  for (const p of planes)
    for (const m of p.modulos)
      if (!vistos.has(m.clave)) {
        vistos.add(m.clave);
        filas.push({ clave: m.clave, nombre: m.nombre, en: (x) => <Celda si={x.modulos.some((y) => y.clave === m.clave)} /> });
      }
  filas.push(
    { clave: "soporte", nombre: "Mesa de ayuda, app instalable y trabajo sin conexión", en: () => <Celda si /> },
    {
      clave: "nudito-plus",
      nombre: "Nudito+ (lo contrata cada familia, en piloto)",
      en: (x) => (x.plan === "pro" ? <span className="text-cuerpo-sm font-medium">Opcional</span> : <Celda si={false} />),
    },
  );
  return (
    <div className="mx-auto mt-12 max-w-4xl">
      <h3 className="font-heading text-titulo-2">Compare los planes</h3>
      <div className="mt-4 overflow-x-auto rounded-lg border border-arena bg-superficie">
        <table className="w-full border-collapse text-left text-cuerpo-sm" data-testid="comparacion-planes">
          <caption className="sr-only">Funciones incluidas en cada plan</caption>
          <thead>
            <tr className="border-b border-arena bg-superficie-2">
              <th scope="col" className="p-3 font-semibold sm:px-5">
                Función
              </th>
              {planes.map((p) => (
                <th key={p.plan} scope="col" className="w-24 p-3 text-center font-heading font-semibold sm:w-36 sm:px-5">
                  {p.nombre}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.clave} className="border-b border-arena last:border-b-0">
                <th scope="row" className="p-3 font-normal text-pretty sm:px-5">
                  {f.nombre}
                </th>
                {planes.map((p) => (
                  <td key={p.plan} className="p-3 text-center sm:px-5">
                    {f.en(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Celda({ si }: { si?: boolean }) {
  return si ? (
    <span className="inline-flex items-center gap-1.5 font-medium">
      <span className="flex size-5 items-center justify-center rounded-full bg-turquesa text-white">
        <Check className="size-3.5" strokeWidth={3} aria-hidden />
      </span>
      <span className="sr-only sm:not-sr-only">Incluido</span>
      <span className="sm:hidden" aria-hidden>
        Sí
      </span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <Minus className="size-4" strokeWidth={2} aria-hidden />
      <span className="sr-only sm:not-sr-only">No incluido</span>
      <span className="sm:hidden" aria-hidden>
        No
      </span>
    </span>
  );
}

export default async function LandingPage({ searchParams }: PageProps<"/">) {
  const { plan } = await searchParams;
  const planInicial = typeof plan === "string" && PLANES_VALIDOS.includes(plan as Plan) ? plan : undefined;
  const { planes } = await planesPublicos();

  return (
    <>
      {/* ───────── Hero (índigo): los avisos llegan y cada uno ata un nudo en la cuerda ───────── */}
      <EscenaAvisos aria-labelledby="titulo-principal" className="relative overflow-hidden bg-indigo text-white">
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-10 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:gap-10 lg:pt-20 lg:pb-14">
          <div className="flex flex-col gap-7">
            <h1 id="titulo-principal" className="font-heading text-[38px] leading-[44px] font-bold tracking-[-0.025em] text-balance sm:text-[50px] sm:leading-[56px] lg:text-[58px] lg:leading-[64px]">
              Lo que pasa en el aula, le llega a la familia <span className="text-maiz">al toque.</span>
            </h1>
            <p className="max-w-xl text-lg leading-7 text-pretty text-white/85">
              Lo importante del colegio llega a tiempo, claro y seguro: asistencia, notas y tareas, en el momento en que pasan. Khipu Escolar une a dirección, profesores y familias en un solo lugar.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a href="#demo" className={cn(buttonVariants({ size: "lg" }), "h-12 px-6 active:not-aria-[haspopup]:translate-y-0 active:scale-[0.96]", BOTON_MAIZ)}>
                <Send strokeWidth={2} aria-hidden /> Solicitar demo
              </a>
              <a href="#funciones" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 border-white/40 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white active:not-aria-[haspopup]:translate-y-0 active:scale-[0.96]")}>
                Ver funciones
              </a>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-cuerpo-sm text-white/85">
              {["Hecho para colegios del Perú", "Sin instalar nada", "Funciona en el celular", "Ley 29733"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="size-4 text-maiz" strokeWidth={2.5} aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative mb-16 pr-[16%] pb-[6%] sm:mb-12 sm:pr-[18%]">
            <Laptop captura={CAPTURAS.pasarLista} prioridad tamanos="(min-width: 1024px) 560px, 84vw" />
            <Celular captura={CAPTURAS.familiaAsistencia} prioridad className="absolute right-0 bottom-0 w-[30%]" tamanos="(min-width: 1024px) 190px, 30vw" />
            {/* Avisos de ejemplo que recibe la familia (datos ficticios): estado con ícono + palabra. */}
            <TarjetaAviso className="absolute top-full left-0 -mt-6 w-[min(300px,86%)] sm:left-[5%] sm:w-[300px]" />
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
          <CuerdaAvisos />
        </div>
      </EscenaAvisos>

      {/* ───────── Problema y promesa ───────── */}
      <Seccion etiqueta="titulo-problema">
        <Encabezado
          id="titulo-problema"
          titulo="Hoy, lo que pasa en el colegio llega tarde a la casa"
          texto="Khipu Escolar nace para que ningún padre se quede sin saber cómo está su hijo y para que el profesor no pierda horas avisando uno por uno."
        />
        <DiaEnElColegio className="mt-10" />
        <ul className="mt-12 grid gap-8 md:grid-cols-3 md:gap-10">
          {PROBLEMAS.map((p) => (
            <li key={p.titulo} className="flex flex-col gap-3">
              <span className="flex items-center gap-3" aria-hidden>
                <span className={cn("size-3.5 rounded-full", TONOS[p.tono].nudo)} />
                <span className="h-[3px] flex-1 rounded-full bg-arena" />
              </span>
              <h3 className="font-heading text-titulo-2 text-balance">{p.titulo}</h3>
              <p className="text-cuerpo text-pretty text-muted-foreground">{p.texto}</p>
            </li>
          ))}
        </ul>
        <div className="mt-12 flex items-start gap-4 rounded-lg bg-indigo p-6 text-white sm:items-center sm:p-8">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-maiz text-sobre-maiz">
            <Check className="size-6" strokeWidth={2.5} aria-hidden />
          </span>
          <p className="text-cuerpo font-medium sm:text-lg">
            <span className="font-heading font-semibold text-maiz">La promesa:</span> lo importante del colegio llega a tiempo, claro y seguro. El profesor pasa lista una vez y cada familia recibe su aviso.
          </p>
        </div>
      </Seccion>

      {/* ───────── Funciones (un tono por grupo) ───────── */}
      <Seccion id="funciones" etiqueta="titulo-funciones" className="border-t border-arena bg-superficie">
        <Encabezado
          id="titulo-funciones"
          titulo="Todo lo que el colegio necesita para comunicarse, en un solo lugar"
          texto="Lo marcado con «Khipu Pro» va en ese plan; todo lo demás está en los dos. Las capturas son del producto real, en un colegio de ejemplo con datos ficticios."
        />
        <div className="mt-14 flex flex-col gap-20 lg:gap-28">
          {GRUPOS.map((g, i) => (
            <article key={g.id} id={g.id} aria-labelledby={`grupo-${g.id}`} className="grid scroll-mt-24 items-center gap-10 lg:grid-cols-2 lg:gap-14">
              <div className={cn("flex flex-col gap-6", i % 2 === 1 && "lg:order-2")}>
                <div className="flex flex-col items-start gap-3">
                  {g.pro && <PastillaPro />}
                  <h3 id={`grupo-${g.id}`} className="font-heading text-titulo-1 text-balance">
                    {g.titulo}
                  </h3>
                </div>
                <ul className="flex flex-col gap-5">
                  {g.funciones.map((f) => (
                    <li key={f.titulo} className="flex items-start gap-4">
                      <Icono Icono={f.Icono} tono={g.tono} />
                      <div className="flex flex-col gap-1">
                        <h4 className="flex flex-wrap items-center gap-x-2 gap-y-1 text-cuerpo font-semibold">
                          {f.titulo}
                          {f.pro && !g.pro && <PastillaPro />}
                        </h4>
                        <p className="text-cuerpo-sm text-pretty text-muted-foreground">{f.texto}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={cn("rounded-lg p-5 sm:p-10", TONOS[g.tono].suave, i % 2 === 1 && "lg:order-1")}>{g.captura}</div>
            </article>
          ))}
        </div>
      </Seccion>

      {/* ───────── Cómo funciona (índigo) ───────── */}
      <section id="como-funciona" aria-labelledby="titulo-como" className="relative scroll-mt-20 overflow-hidden bg-indigo text-white">
        <div className="relative z-10 mx-auto max-w-6xl px-4 pt-16 pb-14 sm:px-6 sm:pt-24">
          <Encabezado id="titulo-como" titulo="De la firma al primer aviso, en cuatro pasos" claro />
          <PasosKhipu className="mt-14" />
        </div>
        <CuerdasKhipu className="h-40 w-full sm:h-52" />
      </section>

      {/* ───────── Para cada rol ───────── */}
      <Seccion id="roles" etiqueta="titulo-roles">
        <Encabezado id="titulo-roles" titulo="Cada persona del colegio gana algo distinto" />
        <div className="mt-10">
          <PestanasRoles />
        </div>
      </Seccion>

      {/* ───────── Planes ───────── */}
      <Seccion id="planes" etiqueta="titulo-planes" className="border-t border-arena bg-superficie-2">
        <Encabezado
          id="titulo-planes"
          centrado
          titulo="Dos planes completos, sin módulos sueltos"
          texto="Khipu Base cubre la asistencia y la comunicación con las familias; Khipu Pro suma lo académico y la mirada de dirección. Los dos incluyen la mesa de ayuda con el equipo Khipu, la app instalable y el trabajo sin conexión."
        />
        <ul className="mx-auto mt-12 grid max-w-4xl items-stretch gap-6 md:grid-cols-2" data-testid="planes-landing">
          {planes.map((p) => {
            const destacado = p.plan === "pro";
            const tono = TONOS[TONO_PLAN[p.plan] ?? "indigo"];
            return (
              <li
                key={p.plan}
                data-plan={p.plan}
                className={cn(
                  "relative flex flex-col gap-5 overflow-hidden rounded-lg border p-6 pt-8 transition-[box-shadow,translate] duration-300 ease-out hover:-translate-y-1 hover:shadow-sombra-1 sm:p-8 sm:pt-10",
                  destacado ? "border-indigo bg-indigo text-white" : "border-arena bg-superficie",
                )}
              >
                <span className={cn("absolute inset-x-0 top-0 h-2", tono.nudo)} aria-hidden />
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-heading text-titulo-2">{p.nombre}</h3>
                    {destacado && <span className="rounded-pildora bg-maiz px-3 py-1 text-etiqueta text-sobre-maiz">El más completo</span>}
                  </div>
                  {p.descripcion && <p className={cn("text-cuerpo-sm", destacado ? "text-white/80" : "text-muted-foreground")}>{p.descripcion}</p>}
                </div>
                <div className={cn("flex flex-col gap-1 border-y py-4", destacado ? "border-white/15" : "border-arena")}>
                  <p className="font-heading text-titulo-2 tabular-nums">{p.precio}</p>
                  {p.minimo && <p className={cn("text-cuerpo-sm", destacado ? "text-white/80" : "text-muted-foreground")}>{p.minimo}</p>}
                </div>
                <div className="flex flex-1 flex-col gap-3">
                  <p className="text-cuerpo-sm font-semibold">{p.incluyeA ? `Todo lo de ${p.incluyeA}, más:` : "Incluye:"}</p>
                  <ul className="flex flex-col gap-2.5">
                    {p.nuevos.map((m) => (
                      <li key={m.clave} className="flex items-start gap-2.5 text-cuerpo-sm">
                        <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full", destacado ? "bg-maiz text-sobre-maiz" : tono.solido)}>
                          <Check className="size-3.5" strokeWidth={3} aria-hidden />
                        </span>
                        {m.nombre}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  href={`/?plan=${p.plan}#demo`}
                  scroll={false}
                  className={cn(buttonVariants({ variant: destacado ? "default" : "outline", size: "lg" }), "h-12 w-full active:not-aria-[haspopup]:translate-y-0 active:scale-[0.96]", destacado && BOTON_MAIZ)}
                  aria-label={`Quiero el plan ${p.nombre}`}
                >
                  Quiero este plan
                </Link>
              </li>
            );
          })}
        </ul>
        <ul className="mx-auto mt-6 grid max-w-4xl gap-3 sm:grid-cols-2">
          {[
            { Icono: Gift, texto: "Pruébelo gratis una semana con Khipu Pro." },
            { Icono: School, texto: "Colegios del programa piloto: un mes de marcha blanca sin costo." },
          ].map((o) => (
            <li key={o.texto} className="flex items-center gap-3 rounded-lg border border-arena bg-superficie p-4 text-cuerpo-sm font-medium">
              <o.Icono className="size-5 shrink-0 text-turquesa" strokeWidth={2} aria-hidden />
              {o.texto}
            </li>
          ))}
        </ul>
        <ComparacionPlanes planes={planes} />
      </Seccion>

      {/* ───────── Nudito+ (cochinilla): tutor con IA por alumno, en piloto ───────── */}
      <Seccion id="nudito" etiqueta="titulo-nudito">
        <div className="grid gap-8 rounded-lg bg-cochinilla p-6 text-white sm:p-10 lg:grid-cols-[1fr_1.2fr] lg:gap-12">
          <div className="flex flex-col items-start gap-5">
            <div className="flex items-center gap-4">
              <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-white sm:size-24">
                <img src="/marca/nudito.svg" alt="Nudito, el personaje de Khipu Escolar: un nudo de cuerda que sonríe" width={72} height={72} loading="lazy" className="size-14 sm:size-18" />
              </span>
              <p className="w-fit rounded-pildora bg-maiz px-3 py-1 text-etiqueta text-sobre-maiz">Piloto · Próximamente para su colegio</p>
            </div>
            <h2 id="titulo-nudito" className="font-heading text-titulo-1 text-balance sm:text-[40px] sm:leading-[46px]">
              Nudito+, un tutor con inteligencia artificial para cada alumno
            </h2>
            <p className="max-w-prose text-cuerpo text-pretty text-white/90 sm:text-lg">
              El alumno conversa con Nudito+ cuando estudia o hace sus tareas, y la familia sigue su avance sin leer lo que conversa.
            </p>
            <p className="max-w-prose text-cuerpo-sm text-pretty text-white/85">
              Lo contrata cada familia por alumno, con una licencia mensual que se paga por Yape. Solo está disponible en colegios con Khipu Pro y no forma parte de los planes: el colegio no paga nada por él.
            </p>
          </div>
          <ul className="grid content-center gap-3 sm:grid-cols-2">
            {NUDITO_PLUS.map((n) => (
              <li key={n.titulo} className="flex flex-col gap-2 rounded-lg bg-white/10 p-4">
                <n.Icono className="size-5 text-maiz" strokeWidth={2} aria-hidden />
                <h3 className="text-cuerpo font-semibold">{n.titulo}</h3>
                <p className="text-cuerpo-sm text-pretty text-white/85">{n.texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </Seccion>

      {/* ───────── Seguridad y privacidad (turquesa suave): lista a dos columnas con filetes ───────── */}
      <Seccion id="seguridad" etiqueta="titulo-seguridad" className="bg-turquesa/10">
        <Encabezado
          id="titulo-seguridad"
          titulo="Los datos de sus alumnos, cuidados"
          texto="Khipu Escolar trata los datos según la Ley 29733 de protección de datos personales. Esto es lo que hace hoy, sin letra chica."
        />
        <ul className="mt-10 grid gap-x-12 md:grid-cols-2">
          {GARANTIAS.map((g) => (
            <li key={g.titulo} className="flex items-start gap-4 border-t border-turquesa/30 py-5">
              <Icono Icono={g.Icono} tono="turquesa" />
              <div className="flex flex-col gap-1">
                <h3 className="text-cuerpo font-semibold">{g.titulo}</h3>
                <p className="text-cuerpo-sm text-pretty text-muted-foreground">{g.texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </Seccion>

      {/* ───────── Programa piloto (maíz) ───────── */}
      <section aria-labelledby="titulo-piloto" className="bg-maiz text-sobre-maiz">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-indigo text-white">
              <School className="size-6" strokeWidth={2} aria-hidden />
            </span>
            <div className="flex flex-col gap-1">
              <h2 id="titulo-piloto" className="font-heading text-titulo-2 text-balance">
                Programa piloto 2026: buscamos los primeros colegios
              </h2>
              <p className="text-cuerpo">Estamos eligiendo a los primeros colegios del Perú que usarán Khipu Escolar. ¿Quiere que el suyo sea uno de ellos?</p>
            </div>
          </div>
          <a href="#demo" className={cn(buttonVariants({ size: "lg" }), "h-12 shrink-0 bg-indigo px-6 text-white hover:bg-indigo/90 active:not-aria-[haspopup]:translate-y-0 active:scale-[0.96]")}>
            Postular a mi colegio
          </a>
        </div>
      </section>

      {/* ───────── Preguntas frecuentes (índigo cielo suave; Nudito invita a preguntar) ───────── */}
      <Seccion id="preguntas" etiqueta="titulo-preguntas" className="bg-indigo-cielo/10">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.45fr] lg:gap-14">
          <div className="flex flex-col gap-8 lg:sticky lg:top-28 lg:self-start">
            <Encabezado id="titulo-preguntas" titulo="Respuestas rápidas" texto="Lo que más nos preguntan los colegios antes de empezar." />
            <div className="flex items-end gap-3">
              <img src="/marca/nudito.svg" alt="" width={80} height={80} loading="lazy" className="size-20 shrink-0" />
              <p className="relative rounded-lg rounded-bl-sm bg-cochinilla px-4 py-3 font-nudito text-voz-nudito text-pretty text-white">
                ¿No encuentras tu pregunta? Déjala en el formulario y una persona del equipo te responde.
              </p>
            </div>
            <a href="#demo" className={cn(buttonVariants({ size: "lg" }), "h-12 w-fit bg-indigo px-6 text-white hover:bg-indigo/90 active:not-aria-[haspopup]:translate-y-0 active:scale-[0.96]")}>
              <MessagesSquare strokeWidth={2} aria-hidden /> Hacer otra pregunta
            </a>
          </div>
          <Accordion className="flex flex-col gap-3">
            {PREGUNTAS.map((q) => (
              <AccordionItem
                key={q.p}
                value={q.p}
                className={cn("rounded-lg border-2 border-transparent bg-superficie px-4 transition-[border-color,box-shadow] duration-200 not-last:border-b-2 hover:shadow-sombra-1 data-open:shadow-sombra-1 sm:px-5", PREGUNTA_ABIERTA[q.tono])}
              >
                <AccordionTrigger className="min-h-16 items-center gap-4 py-3 text-cuerpo font-semibold hover:no-underline">
                  <span className="flex items-center gap-4">
                    <Icono Icono={q.Icono} tono={q.tono} />
                    {q.p}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-5 pl-15 text-cuerpo text-pretty text-muted-foreground">{q.r}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Seccion>

      {/* ───────── Solicita una demo (índigo) ───────── */}
      <Seccion id="demo" etiqueta="titulo-demo" className="relative overflow-hidden bg-indigo text-white">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.5fr] lg:gap-14">
          <div className="flex flex-col gap-6">
            <Encabezado
              id="titulo-demo"
              claro
              titulo="Solicita una demo"
              texto="Déjenos sus datos y le mostramos Khipu Escolar con un colegio de ejemplo, en una videollamada o en su colegio."
            />
            <ul className="flex flex-col gap-3 text-cuerpo">
              {["Le respondemos en menos de 1 día hábil.", "Vemos juntos el plan que le conviene.", "Sin compromiso."].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-maiz text-sobre-maiz">
                    <Check className="size-4" strokeWidth={2.5} aria-hidden />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <div className="hidden items-center gap-3 rounded-lg bg-white/10 p-4 lg:flex">
              <CalendarDays className="size-5 shrink-0 text-maiz" strokeWidth={2} aria-hidden />
              <p className="text-cuerpo-sm text-white/85">Los colegios eligen su sistema para el próximo año entre noviembre y febrero.</p>
            </div>
          </div>
          <div className="rounded-lg border border-arena bg-superficie p-5 text-foreground sm:p-8">
            <FormularioDemo key={planInicial ?? "ninguno"} planes={planes.map((p) => ({ plan: p.plan, nombre: p.nombre }))} planInicial={planInicial} />
          </div>
        </div>
      </Seccion>
    </>
  );
}
