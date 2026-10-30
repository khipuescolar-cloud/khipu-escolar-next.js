/* eslint-disable @next/next/no-img-element -- SVG oficiales de la marca (public/marca), sin optimización de imagen */
import {
  BookOpen,
  CalendarDays,
  Check,
  ClipboardCheck,
  Clock,
  Download,
  FileText,
  GraduationCap,
  LifeBuoy,
  ListTodo,
  Megaphone,
  MonitorPlay,
  MessagesSquare,
  ScanLine,
  School,
  Send,
  ShieldCheck,
  Smartphone,
  Users,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { CuerdasKhipu } from "@/components/marca/CuerdasKhipu";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button";
import type { Plan } from "@/generated/prisma/enums";
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

const PLANES_VALIDOS: Plan[] = ["basico", "fase2", "promax"];

type Funcion = { Icono: LucideIcon; titulo: string; texto: ReactNode };

const GRUPOS: { id: string; tono: Tono; nombre: string; titulo: string; funciones: Funcion[]; captura: ReactNode }[] = [
  {
    id: "dia-a-dia",
    tono: "turquesa",
    nombre: "Día a día",
    titulo: "La asistencia llega a la casa en el momento",
    funciones: [
      {
        Icono: ClipboardCheck,
        titulo: "Asistencia con aviso al momento",
        texto: "El profesor marca Llegó, Tarde, No llegó o Aviso y la familia recibe el aviso por correo y en el celular. WhatsApp y SMS, si el colegio los activa.",
      },
      {
        Icono: ScanLine,
        titulo: "Portería con carnet QR",
        texto: "En la puerta se escanea el carnet de cada alumno y la llegada queda registrada. Los carnets se imprimen por salón, en A4 o tamaño tarjeta.",
      },
      {
        Icono: FileText,
        titulo: "Justificaciones en 15 días hábiles",
        texto: "La familia justifica una falta desde el correo o desde Khipu, dentro del plazo del reglamento (15 días hábiles por defecto), y la tutora la revisa.",
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
    nombre: "Comunicación",
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
    nombre: "Académico",
    titulo: "Notas, libreta y tareas en el mismo lugar",
    funciones: [
      {
        Icono: GraduationCap,
        titulo: "Notas por competencias",
        texto: "Escala del MINEDU literal (AD, A, B, C) o vigesimal (0 a 20), según el colegio. Cada curso cierra sus notas y dirección puede reabrirlas.",
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
    ],
    captura: <Ventana captura={CAPTURAS.notas} />,
  },
  {
    id: "colegio",
    tono: "maiz",
    nombre: "Gestión del colegio",
    titulo: "Dirección tiene todo a la vista",
    funciones: [
      {
        Icono: Users,
        titulo: "Panel de dirección y CRM",
        texto: "Profesores, personal, grados y salones, alumnos, familias y carnets. Carga a su gente con un archivo CSV y vea si los avisos llegan.",
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
    tono: "indigo",
    p: "¿Necesitan instalar algo?",
    r: "No. Khipu Escolar funciona en el navegador del celular o de la computadora. Si lo prefieren, se instala como app desde la página «Instalar la app», sin pasar por tiendas.",
  },
  {
    Icono: Clock,
    tono: "indigo",
    p: "¿Cuánto tarda empezar?",
    r: "Pocos días. Nosotros creamos el colegio y la cuenta de dirección, y le ayudamos a cargar a profesores y alumnos desde su lista en Excel. Las familias reciben su invitación por correo. En la demo coordinamos las fechas.",
  },
  {
    Icono: Smartphone,
    tono: "indigo",
    p: "¿Funciona en celulares baratos?",
    r: "Sí, está pensado primero para el celular: botones grandes, pantallas livianas y textos claros. Basta un navegador actualizado, como Chrome o Safari.",
  },
  {
    Icono: WifiOff,
    tono: "indigo",
    p: "¿Qué pasa si no hay internet?",
    r: "Pasar lista y la portería siguen funcionando: los registros se guardan en el dispositivo y se envían solos cuando vuelve la conexión, con la hora en que se hicieron.",
  },
  {
    Icono: ShieldCheck,
    tono: "indigo",
    p: "¿Cómo se manejan los datos de los alumnos?",
    r: "Según la Ley 29733: cada colegio tiene sus datos separados, se piden solo los necesarios, las familias dan su consentimiento y cada persona ve solo lo que le corresponde. El equipo de Khipu no lee chats ni notas.",
  },
  {
    Icono: MonitorPlay,
    tono: "indigo",
    p: "¿Puedo probarlo?",
    r: "Sí. Solicite una demo con el formulario de abajo: le mostramos Khipu Escolar con un colegio de ejemplo y conversamos sobre el programa piloto 2026.",
  },
];

// Clases literales (Tailwind no ve las armadas): borde del tono en la pregunta abierta.
const PREGUNTA_ABIERTA: Record<Tono, string> = {
  indigo: "data-open:border-indigo",
  cielo: "data-open:border-indigo-cielo",
  turquesa: "data-open:border-turquesa",
  cochinilla: "data-open:border-cochinilla",
  maiz: "data-open:border-maiz",
};
const TONO_PLAN: Record<string, Tono> = { basico: "turquesa", fase2: "cielo", promax: "maiz" };

// Mosaico «Un día con Khipu» (rediseño Jafet 2026-10-30): fotos referenciales en public/landing/fotos.
// Clases literales por foto: posición en la grilla (4 columnas en lg) y proporción en pantallas chicas.
const FOTOS_DIA: { src: string; alt: string; Icono: LucideIcon; texto: string; llego?: boolean; className: string; sizes: string }[] = [
  {
    src: "/landing/fotos/foto-papa-app.jpg",
    alt: "Un papá en la sala de su casa muestra en su celular la asistencia de su hijo en Khipu Escolar.",
    Icono: Smartphone,
    texto: "Ve la asistencia de su hijo desde el celular",
    className: "aspect-[3/4] sm:row-span-2 sm:aspect-auto",
    sizes: "(min-width: 1024px) 280px, (min-width: 640px) 50vw, 100vw",
  },
  {
    src: "/landing/fotos/foto-mama.jpg",
    alt: "Una mamá revisa su celular en la puerta del colegio mientras los alumnos entran.",
    Icono: Check,
    texto: "7:52 a. m. · Mateo llegó al colegio",
    llego: true,
    className: "aspect-[4/3] lg:col-span-2 lg:aspect-auto",
    sizes: "(min-width: 1024px) 560px, (min-width: 640px) 50vw, 100vw",
  },
  {
    src: "/landing/fotos/foto-directora.jpg",
    alt: "Una directora revisa en su laptop el panel del colegio en su oficina.",
    Icono: Users,
    texto: "Dirección ve qué avisos llegaron",
    className: "aspect-[4/3] lg:aspect-auto",
    sizes: "(min-width: 1024px) 280px, (min-width: 640px) 50vw, 100vw",
  },
  {
    src: "/landing/fotos/foto-profesora.jpg",
    alt: "Una profesora pasa lista en su celular frente a sus alumnos en el aula.",
    Icono: ClipboardCheck,
    texto: "Pasa lista en menos de un minuto",
    className: "aspect-[4/3] sm:col-span-2 sm:aspect-[16/9] lg:col-span-1 lg:aspect-auto",
    sizes: "(min-width: 1024px) 280px, (min-width: 640px) 50vw, 100vw",
  },
  {
    src: "/landing/fotos/foto-ninos.jpg",
    alt: "Alumnos de primaria con uniforme conversan mientras entran al colegio por la mañana.",
    Icono: ScanLine,
    texto: "La portería registra cada llegada",
    className: "aspect-[4/3] sm:col-span-2 sm:aspect-[16/9] lg:aspect-auto",
    sizes: "(min-width: 1024px) 560px, 100vw",
  },
];

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

export default async function LandingPage({ searchParams }: PageProps<"/">) {
  const { plan } = await searchParams;
  const planInicial = typeof plan === "string" && PLANES_VALIDOS.includes(plan as Plan) ? plan : undefined;
  const { planes } = await planesPublicos();

  return (
    <>
      {/* ───────── Hero (índigo): los avisos llegan y cada uno ata un nudo en la cuerda ───────── */}
      <EscenaAvisos aria-labelledby="titulo-principal" className="relative overflow-hidden bg-indigo text-white">
        {/* Textura de cuerdas del khipu (decorativa, rediseño Jafet 2026-10-30). */}
        <div className="pointer-events-none absolute inset-0 bg-[url(/landing/textura-khipu.svg)] bg-[length:144px_180px] opacity-[0.07] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" aria-hidden />
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-10 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:gap-10 lg:pt-20 lg:pb-14">
          <div className="flex flex-col gap-7">
            <h1 id="titulo-principal" className="font-heading text-[38px] leading-[44px] font-bold tracking-[-0.025em] text-balance sm:text-[50px] sm:leading-[56px] lg:text-[58px] lg:leading-[64px]">
              Lo que pasa en el aula, le llega a la familia <span className="text-maiz">al toque.</span>
            </h1>
            <p className="max-w-xl text-lg leading-7 text-pretty text-white/85">
              El profesor pasa lista en menos de un minuto y cada familia recibe su aviso, firmado por el colegio. Usted ve qué avisos llegaron, sin grupos de WhatsApp ni profesores dando su número.
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
              {["Hecho para colegios del Perú", "Sin instalar nada", "Funciona en el celular", "Datos protegidos según la Ley 29733"].map((t) => (
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

      {/* ───────── Un día con Khipu: mosaico de fotos (rediseño Jafet 2026-10-30) ───────── */}
      <Seccion etiqueta="titulo-dia-khipu" className="border-t border-arena bg-superficie-2">
        <Encabezado
          id="titulo-dia-khipu"
          titulo="Así se vive un día con Khipu"
          texto="La profesora pasa lista, la portería registra la llegada y la familia recibe su aviso en el momento, esté donde esté."
        />
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-[300px_300px]">
          {FOTOS_DIA.map((f) => (
            <li key={f.src} className={cn("group relative overflow-hidden rounded-lg bg-arena shadow-sombra-1", f.className)}>
              <Image
                src={f.src}
                alt={f.alt}
                fill
                sizes={f.sizes}
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-tinta/55 to-transparent" aria-hidden />
              <p className="absolute inset-x-3 bottom-3 flex items-center gap-2.5 rounded-md bg-superficie/95 px-3 py-2 text-cuerpo-sm font-semibold text-foreground shadow-sombra-1 backdrop-blur-sm">
                <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", f.llego ? "bg-llego-fondo text-llego" : "bg-indigo text-white")}>
                  <f.Icono className="size-4" strokeWidth={2.5} aria-hidden />
                </span>
                {f.texto}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-cuerpo-sm text-muted-foreground">Imágenes referenciales.</p>
      </Seccion>

      {/* ───────── Funciones (un tono por grupo) ───────── */}
      <Seccion id="funciones" etiqueta="titulo-funciones" className="border-t border-arena bg-superficie">
        <Encabezado
          id="titulo-funciones"
          titulo="Todo lo que el colegio necesita para comunicarse, en un solo lugar"
          texto="Las capturas son del producto real, en un colegio de ejemplo con datos ficticios."
        />
        <div className="mt-14 flex flex-col gap-20 lg:gap-28">
          {GRUPOS.map((g, i) => (
            <article key={g.id} id={g.id} aria-labelledby={`grupo-${g.id}`} className="grid scroll-mt-24 items-center gap-10 lg:grid-cols-2 lg:gap-14">
              <div className={cn("flex flex-col gap-6", i % 2 === 1 && "lg:order-2")}>
                <h3 id={`grupo-${g.id}`} className="font-heading text-titulo-1 text-balance">
                  {g.titulo}
                </h3>
                <ul className="flex flex-col gap-5">
                  {g.funciones.map((f) => (
                    <li key={f.titulo} className="flex items-start gap-4">
                      <Icono Icono={f.Icono} tono={g.tono} />
                      <div className="flex flex-col gap-1">
                        <h4 className="text-cuerpo font-semibold">{f.titulo}</h4>
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

      {/* ───────── Nudito (cochinilla) ───────── */}
      <Seccion id="nudito" etiqueta="titulo-nudito">
        <div className="relative grid items-center gap-10 overflow-hidden rounded-lg bg-cochinilla p-6 text-white sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:gap-14">
          <div className="flex flex-col gap-5">
            <span className="flex size-24 items-center justify-center rounded-full bg-white">
              <img src="/marca/nudito.svg" alt="Nudito, el asistente de Khipu Escolar: un nudo de cuerda que sonríe" width={72} height={72} loading="lazy" className="size-18" />
            </span>
            <h2 id="titulo-nudito" className="font-heading text-titulo-1 text-balance sm:text-[40px] sm:leading-[46px]">
              Nudito, el asistente que responde con los datos del colegio
            </h2>
            <p className="w-fit rounded-pildora bg-maiz px-3 py-1 text-etiqueta text-sobre-maiz">Incluido en el plan Pro Max</p>
            <p className="text-cuerpo text-white/90 sm:text-lg">
              Las familias le preguntan qué tareas hay esta semana, qué fechas vienen, el horario o el reglamento. Nudito responde solo con datos reales del colegio y de sus hijos; si no sabe algo, ofrece escribirle a una persona del colegio.
            </p>
            <ul className="flex flex-col gap-3">
              {[
                "Nunca da malas noticias: los avisos de falta los firma el colegio, en tono serio.",
                "Nunca inventa datos ni compara a un alumno con otro.",
                "Siempre deja claro que es un asistente, no una persona.",
                "Habla solo con las familias: los alumnos no lo usan.",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-cuerpo">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-white/15">
                    <Check className="size-4" strokeWidth={2.5} aria-hidden />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="mx-auto w-[64%] max-w-[300px]">
            <Celular captura={CAPTURAS.nudito} tamanos="(min-width: 1024px) 300px, 64vw" />
          </div>
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
          titulo="Empiece con lo esencial y crezca cuando lo necesite"
          texto="Todos los planes incluyen la mesa de ayuda con el equipo Khipu, la app instalable y el trabajo sin conexión."
        />
        <ul className="mt-12 grid items-stretch gap-6 lg:grid-cols-3" data-testid="planes-landing">
          {planes.map((p) => {
            const destacado = p.plan === "promax";
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
      </Seccion>

      {/* ───────── Programa piloto (maíz) ───────── */}
      <section aria-labelledby="titulo-piloto" className="bg-maiz text-sobre-maiz">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-indigo text-white">
              <School className="size-6" strokeWidth={2} aria-hidden />
            </span>
            <div className="flex flex-col gap-3">
              <h2 id="titulo-piloto" className="font-heading text-titulo-2 text-balance">
                Programa piloto 2026: buscamos los primeros colegios
              </h2>
              <p className="text-cuerpo">Pocos colegios fundadores estrenan Khipu Escolar con nosotros, en persona. Atendemos a pocos para hacerlo bien.</p>
              <ul className="flex flex-col gap-2 text-cuerpo sm:flex-row sm:flex-wrap sm:gap-x-6">
                {["8 semanas sin costo", "Le ayudamos a cargar su lista", "Precio de colegio fundador en 2027"].map((t) => (
                  <li key={t} className="flex items-center gap-2 font-semibold">
                    <Check className="size-4 shrink-0" strokeWidth={2.5} aria-hidden /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <a href="#demo" className={cn(buttonVariants({ size: "lg" }), "h-12 shrink-0 bg-indigo px-6 text-white hover:bg-indigo/90 active:not-aria-[haspopup]:translate-y-0 active:scale-[0.96]")}>
            Quiero ser colegio fundador
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
              titulo="Solicite una demo"
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
