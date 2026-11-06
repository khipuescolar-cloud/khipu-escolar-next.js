// Piezas compartidas de /avisos y del detalle de un envío (specs/06).
import { CifrasJuntas } from "@/components/ui/Superficies";
import { CheckCircle2, Clock, MailX, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { EstadoAviso, TipoAviso } from "@/generated/prisma/enums";

export const ESTADOS: EstadoAviso[] = ["pendiente", "enviando", "enviado", "entregado", "abierto", "rebotado", "queja", "error", "omitido"];
export const NOMBRE_TIPO: Record<TipoAviso, string> = {
  asistencia: "Asistencia",
  mensaje: "Mensajes",
  comunicado: "Comunicados",
  invitacion: "Invitaciones",
  justificacion: "Justificaciones",
  tarea: "Tareas",
  alerta_direccion: "Alertas a dirección",
  resumen_llegadas: "Resumen de llegadas",
  libreta: "Libretas",
  soporte: "Soporte",
  reunion: "Reuniones",
  documento: "Documentos",
  nudito: "Nudito+",
};
export const TIPOS = Object.keys(NOMBRE_TIPO) as TipoAviso[];

type TonoIndicador = "neutro" | "bien" | "mal" | "atencion";
const TONOS: Record<TonoIndicador, string> = {
  neutro: "text-sec-trazo",
  bien: "text-llego",
  mal: "text-falta",
  atencion: "text-tarde",
};

/** Cifras hermanas en una sola superficie dividida por líneas finas (sin una tarjeta por cifra). */
export function PanelIndicadores({ children, ...rest }: { children: React.ReactNode } & React.AriaAttributes) {
  return (
    <CifrasJuntas {...rest} className="lg:grid-cols-3">
      {children}
    </CifrasJuntas>
  );
}

export function Indicador({ icono: Icono, titulo, valor, detalle, tono = "neutro", enlace }: {
  icono: LucideIcon;
  titulo: string;
  valor: string;
  detalle: string;
  tono?: TonoIndicador;
  enlace?: { href: string; texto: string };
}) {
  return (
    <div className="flex flex-col gap-1 bg-superficie p-4">
      <p className="flex items-center gap-2 text-cuerpo-sm font-medium text-muted-foreground">
        <Icono className={`size-4 shrink-0 ${TONOS[tono]}`} strokeWidth={2} aria-hidden />
        {titulo}
      </p>
      <p className="font-heading text-titulo-1 tabular-nums">{valor}</p>
      <p className="text-cuerpo-sm text-muted-foreground">{detalle}</p>
      {enlace && <Link href={enlace.href} className="mt-auto inline-flex min-h-8 items-center text-cuerpo-sm enlace">{enlace.texto}</Link>}
    </div>
  );
}

export function EstadoEnvio({ estado }: { estado: EstadoAviso }) {
  const malo = estado === "error" || estado === "rebotado" || estado === "queja";
  const [Icono, clase] = malo ? [MailX, "text-falta"] : estado === "abierto" ? [CheckCircle2, "text-llego"] : [Clock, "text-muted-foreground"];
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold capitalize ${clase}`}>
      <Icono className="size-4 shrink-0" strokeWidth={2} aria-hidden />
      {estado}
    </span>
  );
}

export const fecha = new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short", timeZone: "America/Lima" });

export type FilaAviso = { id: string; tipo: TipoAviso; destinatario: string; asunto: string; estado: EstadoAviso; createdAt: Date };

/** Lista de avisos: tarjetas en móvil, tabla desde md. `conTipo`: muestra la columna Tipo. */
export function TablaAvisos({ avisos, conTipo = true }: { avisos: FilaAviso[]; conTipo?: boolean }) {
  return (
    <>
      <ul className="flex flex-col divide-y divide-borde-sutil border-y border-borde-sutil md:hidden">
        {avisos.map((a) => (
          <li key={a.id}>
            <div className="flex flex-col gap-1.5 py-3.5 text-cuerpo-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <EstadoEnvio estado={a.estado} />
                  <span className="text-cuerpo-sm text-muted-foreground">{fecha.format(a.createdAt)}</span>
                </div>
                <p className="font-medium">{a.asunto}</p>
                <p className="text-muted-foreground break-all">{a.destinatario}{conTipo && <> · {NOMBRE_TIPO[a.tipo]}</>}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-hidden rounded-[14px] border border-borde-sutil bg-superficie md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-11 px-4">Fecha</TableHead>
              {conTipo && <TableHead className="h-11 px-4">Tipo</TableHead>}
              <TableHead className="h-11 px-4">Para</TableHead>
              <TableHead className="h-11 px-4">Asunto</TableHead>
              <TableHead className="h-11 px-4">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {avisos.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="px-4 py-3 whitespace-nowrap">{fecha.format(a.createdAt)}</TableCell>
                {conTipo && <TableCell className="px-4 py-3">{NOMBRE_TIPO[a.tipo]}</TableCell>}
                <TableCell className="px-4 py-3">{a.destinatario}</TableCell>
                <TableCell className="px-4 py-3 whitespace-normal">{a.asunto}</TableCell>
                <TableCell className="px-4 py-3"><EstadoEnvio estado={a.estado} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
