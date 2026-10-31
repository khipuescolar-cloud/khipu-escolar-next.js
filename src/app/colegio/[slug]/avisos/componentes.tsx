// Piezas compartidas de /avisos y del detalle de un envío (specs/06).
import { CheckCircle2, Clock, MailX, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
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
  neutro: "bg-primary/10 text-primary",
  bien: "bg-llego-fondo text-llego",
  mal: "bg-falta-fondo text-falta",
  atencion: "bg-tarde-fondo text-tarde",
};

export function Indicador({ icono: Icono, titulo, valor, detalle, tono = "neutro", enlace }: {
  icono: LucideIcon;
  titulo: string;
  valor: string;
  detalle: string;
  tono?: TonoIndicador;
  enlace?: { href: string; texto: string };
}) {
  return (
    <Card size="sm" className="h-full">
      <CardContent className="flex h-full flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className={`flex size-8 shrink-0 items-center justify-center rounded-md ${TONOS[tono]}`}>
            <Icono className="size-4" strokeWidth={2} aria-hidden />
          </span>
          <p className="text-sm font-medium text-muted-foreground">{titulo}</p>
        </div>
        <p className="text-titulo-1 tabular-nums">{valor}</p>
        <p className="text-cuerpo-sm text-muted-foreground">{detalle}</p>
        {enlace && <Link href={enlace.href} className="mt-auto text-cuerpo-sm enlace">{enlace.texto}</Link>}
      </CardContent>
    </Card>
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
      <ul className="flex flex-col gap-3 md:hidden">
        {avisos.map((a) => (
          <li key={a.id}>
            <Card size="sm">
              <CardContent className="flex flex-col gap-1.5 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <EstadoEnvio estado={a.estado} />
                  <span className="text-cuerpo-sm text-muted-foreground">{fecha.format(a.createdAt)}</span>
                </div>
                <p className="font-medium">{a.asunto}</p>
                <p className="text-muted-foreground break-all">{a.destinatario}{conTipo && <> · {NOMBRE_TIPO[a.tipo]}</>}</p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
      <Card className="hidden py-0 md:flex">
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
      </Card>
    </>
  );
}
