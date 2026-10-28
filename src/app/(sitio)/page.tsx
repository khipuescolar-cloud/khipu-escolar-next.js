/* eslint-disable @next/next/no-img-element -- SVG oficiales de la marca (public/marca), sin optimización de imagen */
import {
  BellRing,
  BookOpen,
  CalendarDays,
  Check,
  ClipboardCheck,
  Clock,
  Database,
  Download,
  Eye,
  FileText,
  FolderSearch,
  GraduationCap,
  Handshake,
  HeartHandshake,
  LifeBuoy,
  ListTodo,
  Lock,
  Megaphone,
  MessagesSquare,
  ScanLine,
  School,
  Send,
  ShieldCheck,
  Smartphone,
  Upload,
  UserCheck,
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
import { planesPublicos } from "@/lib/server/landing";
import { cn } from "@/lib/utils";
import { CAPTURAS } from "./_componentes/capturas";
import { Celular, Laptop, Ventana } from "./_componentes/Dispositivos";
import { FormularioDemo } from "./_componentes/FormularioDemo";
import { PestanasRoles } from "./_componentes/PestanasRoles";

// Landing pública de Khipu Escolar (specs/25-landing-publica.md). Server Component: solo el formulario,
// el menú móvil y las pestañas de roles llevan JS. Voz: «usted» al director (ventas) y «tú» a las familias.

const PLANES_VALIDOS: Plan[] = ["basico", "fase2", "promax"];

type Funcion = { Icono: LucideIcon; titulo: string; texto: ReactNode };

const GRUPOS: { id: string; sobretitulo: string; titulo: string; funciones: Funcion[]; captura: ReactNode }[] = [
  {
    id: "dia-a-dia",
    sobretitulo: "Día a día",
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
    sobretitulo: "Comunicación",
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
    sobretitulo: "Académico",
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
    sobretitulo: "Gestión del colegio",
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

const PROBLEMAS = [
  {
    Icono: Eye,
    titulo: "La familia no se entera a tiempo",
    texto: "Si un alumno no llega, muchas familias lo saben recién en la tarde, por el cuaderno de control o en la reunión.",
  },
  {
    Icono: Clock,
    titulo: "El profesor avisa uno por uno",
    texto: "En un salón de 30 alumnos, avisar a cada familia son 30 mensajes. Ese tiempo sale de la clase.",
  },
  {
    Icono: FolderSearch,
    titulo: "La información está dispersa",
    texto: "Grupos de WhatsApp, cuadernos, hojas de Excel y llamadas: cada dato en un lugar distinto y difícil de encontrar.",
  },
];

const PASOS = [
  { Icono: Handshake, titulo: "El colegio se registra con Khipu", texto: "Creamos su colegio, su dirección web propia y la cuenta de dirección." },
  { Icono: Upload, titulo: "Carga profesores y alumnos", texto: "Con un archivo CSV o uno por uno. Las familias reciben su invitación por correo." },
  { Icono: UserCheck, titulo: "El profesor pasa lista", texto: "Desde el celular o la computadora, con botones grandes y aunque no haya internet." },
  { Icono: BellRing, titulo: "La familia recibe el aviso", texto: "«Mateo llegó al colegio a las 7:52 a. m.» Firmado por el colegio, sin tecnicismos." },
];

const SEGURIDAD = [
  { Icono: ShieldCheck, titulo: "Ley 29733", texto: "Pedimos solo los datos necesarios y llevamos registro de quién ve o cambia los datos de un alumno." },
  { Icono: Database, titulo: "Datos separados por colegio", texto: "Cada colegio vive en su propio espacio: ningún colegio ve a otro. La base de datos tiene RLS como respaldo." },
  { Icono: HeartHandshake, titulo: "Consentimiento de las familias", texto: "Los avisos se envían con el consentimiento de la familia, que puede retirarlo desde su perfil." },
  { Icono: Users, titulo: "Cada uno ve lo suyo", texto: "La familia solo ve a sus hijos y el profesor solo sus salones." },
  { Icono: Lock, titulo: "El equipo Khipu no lee chats ni notas", texto: "Cuando damos soporte, entramos en modo de solo lectura, por tiempo limitado y con un motivo, sin acceso a mensajes, notas, libretas ni Nudito. Queda registrado y dirección lo ve." },
  { Icono: Download, titulo: "Sus datos son suyos", texto: "Dirección puede exportar los datos del colegio cuando lo necesite." },
];

const PREGUNTAS = [
  {
    p: "¿Necesitan instalar algo?",
    r: "No. Khipu Escolar funciona en el navegador del celular o de la computadora. Si lo prefieren, se instala como app desde la página «Instalar la app», sin pasar por tiendas.",
  },
  {
    p: "¿Cuánto tarda empezar?",
    r: "Lo que tome cargar a su gente. Nosotros creamos el colegio y la cuenta de dirección; ustedes cargan profesores y alumnos con un archivo CSV o uno por uno, y las familias reciben su invitación por correo. En la demo coordinamos las fechas.",
  },
  {
    p: "¿Funciona en celulares baratos?",
    r: "Sí, está pensado primero para el celular: botones grandes, pantallas livianas y textos claros. Basta un navegador actualizado, como Chrome o Safari.",
  },
  {
    p: "¿Qué pasa si no hay internet?",
    r: "Pasar lista y la portería siguen funcionando: los registros se guardan en el dispositivo y se envían solos cuando vuelve la conexión, con la hora en que se hicieron.",
  },
  {
    p: "¿Cómo se manejan los datos de los alumnos?",
    r: "Según la Ley 29733: cada colegio tiene sus datos separados, se piden solo los necesarios, las familias dan su consentimiento y cada persona ve solo lo que le corresponde. El equipo de Khipu no lee chats ni notas.",
  },
  {
    p: "¿Puedo probarlo?",
    r: "Sí. Solicite una demo con el formulario de abajo: le mostramos Khipu Escolar con un colegio de ejemplo y conversamos sobre el programa piloto 2026.",
  },
];

function Seccion({ id, className, children, etiqueta }: { id?: string; className?: string; children: ReactNode; etiqueta?: string }) {
  return (
    <section id={id} aria-labelledby={etiqueta} className={cn("scroll-mt-20 py-16 sm:py-24", className)}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">{children}</div>
    </section>
  );
}

function Encabezado({ id, sobretitulo, titulo, texto, claro }: { id: string; sobretitulo: string; titulo: string; texto?: string; claro?: boolean }) {
  return (
    <div className="flex max-w-2xl flex-col gap-3">
      <p className={cn("text-sobretitulo uppercase", claro ? "text-white/75" : "text-pizarra")}>{sobretitulo}</p>
      <h2 id={id} className="font-heading text-titulo-1 text-balance sm:text-[40px] sm:leading-[46px]">
        {titulo}
      </h2>
      {texto && <p className={cn("text-cuerpo sm:text-lg", claro ? "text-white/80" : "text-muted-foreground")}>{texto}</p>}
    </div>
  );
}

function Icono({ Icono: I, tono = "indigo" }: { Icono: LucideIcon; tono?: "indigo" | "turquesa" | "claro" }) {
  const clases = { indigo: "bg-primary/10 text-primary", turquesa: "bg-turquesa/10 text-turquesa", claro: "bg-white/10 text-white" }[tono];
  return (
    <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-md", clases)}>
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
      {/* ───────── Hero ───────── */}
      <section aria-labelledby="titulo-principal" className="overflow-hidden border-b border-arena">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-16 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:gap-10 lg:pt-20 lg:pb-24">
          <div className="flex flex-col gap-6">
            <p className="text-sobretitulo text-pizarra uppercase">Para colegios del Perú</p>
            <h1 id="titulo-principal" className="font-heading text-[36px] leading-[42px] font-bold tracking-[-0.02em] text-balance sm:text-[48px] sm:leading-[54px] lg:text-[54px] lg:leading-[60px]">
              Lo que pasa en el aula, le llega a la familia al toque.
            </h1>
            <p className="max-w-xl text-lg leading-7 text-muted-foreground">
              Lo importante del colegio llega a tiempo, claro y seguro: asistencia, notas y tareas, en el momento en que pasan. Khipu Escolar une a dirección, profesores y familias en un solo lugar.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a href="#demo" className={cn(buttonVariants({ size: "lg" }), "h-12 px-6")}>
                <Send strokeWidth={2} aria-hidden /> Solicitar demo
              </a>
              <a href="#funciones" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 px-6")}>
                Ver funciones
              </a>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-cuerpo-sm text-muted-foreground">
              {["Sin instalar nada", "Funciona en el celular", "Ley 29733"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="size-4 text-turquesa" strokeWidth={2} aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative pr-[16%] pb-[6%] sm:pr-[18%]">
            <Laptop captura={CAPTURAS.pasarLista} prioridad tamanos="(min-width: 1024px) 560px, 84vw" />
            <Celular captura={CAPTURAS.familiaAsistencia} prioridad className="absolute right-0 bottom-0 w-[30%]" tamanos="(min-width: 1024px) 190px, 30vw" />
          </div>
        </div>
      </section>

      {/* ───────── Problema y promesa ───────── */}
      <Seccion etiqueta="titulo-problema">
        <Encabezado
          id="titulo-problema"
          sobretitulo="El problema"
          titulo="Hoy, lo que pasa en el colegio llega tarde a la casa"
          texto="Khipu Escolar nace para que ningún padre se quede sin saber cómo está su hijo y para que el profesor no pierda horas avisando uno por uno."
        />
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {PROBLEMAS.map((p) => (
            <li key={p.titulo} className="flex flex-col gap-4 rounded-lg border border-arena bg-superficie p-6">
              <Icono Icono={p.Icono} tono="turquesa" />
              <h3 className="font-heading text-titulo-2 text-balance">{p.titulo}</h3>
              <p className="text-cuerpo text-muted-foreground">{p.texto}</p>
            </li>
          ))}
        </ul>
        <p className="mt-8 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-5 text-cuerpo font-medium text-foreground">
          <Check className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={2} aria-hidden />
          La promesa: lo importante del colegio llega a tiempo, claro y seguro. El profesor pasa lista una vez y cada familia recibe su aviso.
        </p>
      </Seccion>

      {/* ───────── Funciones ───────── */}
      <Seccion id="funciones" etiqueta="titulo-funciones" className="border-t border-arena bg-superficie">
        <Encabezado
          id="titulo-funciones"
          sobretitulo="Funciones"
          titulo="Todo lo que el colegio necesita para comunicarse, en un solo lugar"
          texto="Las capturas son del producto real, en un colegio de ejemplo con datos ficticios."
        />
        <div className="mt-14 flex flex-col gap-20 lg:gap-24">
          {GRUPOS.map((g, i) => (
            <article key={g.id} aria-labelledby={`grupo-${g.id}`} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
              <div className={cn("flex flex-col gap-6", i % 2 === 1 && "lg:order-2")}>
                <div className="flex flex-col gap-2">
                  <p className="text-sobretitulo text-cochinilla uppercase">{g.sobretitulo}</p>
                  <h3 id={`grupo-${g.id}`} className="font-heading text-titulo-1 text-balance">
                    {g.titulo}
                  </h3>
                </div>
                <ul className="flex flex-col gap-5">
                  {g.funciones.map((f) => (
                    <li key={f.titulo} className="flex items-start gap-4">
                      <Icono Icono={f.Icono} />
                      <div className="flex flex-col gap-1">
                        <h4 className="text-cuerpo font-semibold">{f.titulo}</h4>
                        <p className="text-cuerpo-sm text-muted-foreground">{f.texto}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={cn(i % 2 === 1 && "lg:order-1")}>{g.captura}</div>
            </article>
          ))}
        </div>
      </Seccion>

      {/* ───────── Nudito ───────── */}
      <Seccion id="nudito" etiqueta="titulo-nudito">
        <div className="grid items-center gap-10 rounded-lg border border-cochinilla/25 bg-cochinilla/5 p-6 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:gap-14">
          <div className="flex flex-col gap-5">
            <img src="/marca/nudito.svg" alt="Nudito, el asistente de Khipu Escolar: un nudo de cuerda que sonríe" width={88} height={88} loading="lazy" className="size-22" />
            <p className="text-sobretitulo text-cochinilla uppercase">Plan Pro Max</p>
            <h2 id="titulo-nudito" className="font-heading text-titulo-1 text-balance sm:text-[40px] sm:leading-[46px]">
              Nudito, el asistente que responde con los datos del colegio
            </h2>
            <p className="text-cuerpo text-muted-foreground sm:text-lg">
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
                  <Check className="mt-0.5 size-5 shrink-0 text-cochinilla" strokeWidth={2} aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="mx-auto w-[64%] max-w-[300px]">
            <Celular captura={CAPTURAS.nudito} tamanos="(min-width: 1024px) 300px, 64vw" />
          </div>
        </div>
      </Seccion>

      {/* ───────── Cómo funciona ───────── */}
      <section id="como-funciona" aria-labelledby="titulo-como" className="relative scroll-mt-20 overflow-hidden bg-indigo text-white">
        <div className="relative z-10 mx-auto max-w-6xl px-4 pt-16 pb-10 sm:px-6 sm:pt-24">
          <Encabezado id="titulo-como" sobretitulo="Cómo funciona" titulo="De la firma al primer aviso, en cuatro pasos" claro />
          <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PASOS.map((p, i) => (
              <li key={p.titulo} className="flex flex-col gap-4 rounded-lg border border-white/15 bg-white/5 p-6">
                <div className="flex items-center justify-between">
                  <Icono Icono={p.Icono} tono="claro" />
                  <span className="font-heading text-titulo-1 text-maiz" aria-hidden>
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-heading text-titulo-2 text-balance">
                  <span className="sr-only">Paso {i + 1}: </span>
                  {p.titulo}
                </h3>
                <p className="text-cuerpo text-white/80">{p.texto}</p>
              </li>
            ))}
          </ol>
        </div>
        <CuerdasKhipu className="h-40 w-full sm:h-52" />
      </section>

      {/* ───────── Para cada rol ───────── */}
      <Seccion id="roles" etiqueta="titulo-roles">
        <Encabezado id="titulo-roles" sobretitulo="Para cada rol" titulo="Cada persona del colegio gana algo distinto" />
        <div className="mt-10">
          <PestanasRoles />
        </div>
      </Seccion>

      {/* ───────── Planes ───────── */}
      <Seccion id="planes" etiqueta="titulo-planes" className="border-t border-arena bg-superficie">
        <Encabezado
          id="titulo-planes"
          sobretitulo="Planes"
          titulo="Empiece con lo esencial y crezca cuando lo necesite"
          texto="Todos los planes incluyen la mesa de ayuda con el equipo Khipu, la app instalable y el trabajo sin conexión."
        />
        <ul className="mt-12 grid gap-6 lg:grid-cols-3" data-testid="planes-landing">
          {planes.map((p) => (
            <li key={p.plan} data-plan={p.plan} className="flex flex-col gap-5 rounded-lg border border-arena bg-background p-6 sm:p-8">
              <div className="flex flex-col gap-2">
                <h3 className="font-heading text-titulo-2">{p.nombre}</h3>
                {p.descripcion && <p className="text-cuerpo-sm text-muted-foreground">{p.descripcion}</p>}
              </div>
              <div className="flex flex-col gap-1 border-y border-arena py-4">
                <p className="font-heading text-lg font-semibold">{p.precio}</p>
                {p.minimo && <p className="text-cuerpo-sm text-muted-foreground">{p.minimo}</p>}
              </div>
              <div className="flex flex-1 flex-col gap-3">
                <p className="text-cuerpo-sm font-semibold">{p.incluyeA ? `Todo lo de ${p.incluyeA}, más:` : "Incluye:"}</p>
                <ul className="flex flex-col gap-2.5">
                  {p.nuevos.map((m) => (
                    <li key={m.clave} className="flex items-start gap-2.5 text-cuerpo-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-turquesa" strokeWidth={2} aria-hidden />
                      {m.nombre}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href={`/?plan=${p.plan}#demo`}
                scroll={false}
                className={cn(buttonVariants({ variant: p.plan === "promax" ? "default" : "outline", size: "lg" }), "h-12 w-full")}
                aria-label={`Quiero el plan ${p.nombre}`}
              >
                Quiero este plan
              </Link>
            </li>
          ))}
        </ul>
      </Seccion>

      {/* ───────── Seguridad ───────── */}
      <Seccion id="seguridad" etiqueta="titulo-seguridad">
        <Encabezado
          id="titulo-seguridad"
          sobretitulo="Seguridad y privacidad"
          titulo="Los datos de los niños, bien cuidados"
          texto="Khipu Escolar se diseñó desde el inicio para cumplir la Ley 29733 de protección de datos personales."
        />
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SEGURIDAD.map((s) => (
            <li key={s.titulo} className="flex flex-col gap-3 rounded-lg border border-arena bg-superficie p-6">
              <Icono Icono={s.Icono} />
              <h3 className="text-cuerpo font-semibold">{s.titulo}</h3>
              <p className="text-cuerpo-sm text-muted-foreground">{s.texto}</p>
            </li>
          ))}
        </ul>
      </Seccion>

      {/* ───────── Programa piloto ───────── */}
      <section aria-labelledby="titulo-piloto" className="border-y border-maiz/60 bg-maiz/20">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-maiz text-sobre-maiz">
              <School className="size-5" strokeWidth={2} aria-hidden />
            </span>
            <div className="flex flex-col gap-1">
              <h2 id="titulo-piloto" className="font-heading text-titulo-2 text-balance">
                Programa piloto 2026: buscamos los primeros colegios
              </h2>
              <p className="text-cuerpo text-foreground">Estamos eligiendo a los primeros colegios del Perú que usarán Khipu Escolar. ¿Quiere que el suyo sea uno de ellos?</p>
            </div>
          </div>
          <a href="#demo" className={cn(buttonVariants({ size: "lg" }), "h-12 shrink-0 px-6")}>
            Postular a mi colegio
          </a>
        </div>
      </section>

      {/* ───────── Preguntas frecuentes ───────── */}
      <Seccion id="preguntas" etiqueta="titulo-preguntas">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <Encabezado id="titulo-preguntas" sobretitulo="Preguntas frecuentes" titulo="Respuestas rápidas" />
          <Accordion className="rounded-lg border border-arena bg-superficie px-5">
            {PREGUNTAS.map((q) => (
              <AccordionItem key={q.p} value={q.p} className="border-arena">
                <AccordionTrigger className="min-h-14 items-center py-4 text-cuerpo font-semibold hover:no-underline">{q.p}</AccordionTrigger>
                <AccordionContent className="pb-5 text-cuerpo text-muted-foreground">{q.r}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Seccion>

      {/* ───────── Solicita una demo ───────── */}
      <Seccion id="demo" etiqueta="titulo-demo" className="border-t border-arena bg-superficie">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.5fr] lg:gap-14">
          <div className="flex flex-col gap-6">
            <Encabezado
              id="titulo-demo"
              sobretitulo="Demo sin costo"
              titulo="Solicita una demo"
              texto="Déjenos sus datos y le mostramos Khipu Escolar con un colegio de ejemplo, en una videollamada o en su colegio."
            />
            <ul className="flex flex-col gap-3 text-cuerpo">
              {["Le respondemos en menos de 1 día hábil.", "Vemos juntos el plan que le conviene.", "Sin compromiso."].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <Check className="mt-0.5 size-5 shrink-0 text-turquesa" strokeWidth={2} aria-hidden /> {t}
                </li>
              ))}
            </ul>
            <div className="hidden items-center gap-3 lg:flex">
              <CalendarDays className="size-5 text-primary" strokeWidth={2} aria-hidden />
              <p className="text-cuerpo-sm text-muted-foreground">Los colegios eligen su sistema para el próximo año entre noviembre y febrero.</p>
            </div>
          </div>
          <div className="rounded-lg border border-arena bg-background p-5 sm:p-8">
            <FormularioDemo key={planInicial ?? "ninguno"} planes={planes.map((p) => ({ plan: p.plan, nombre: p.nombre }))} planInicial={planInicial} />
          </div>
        </div>
      </Seccion>
    </>
  );
}
