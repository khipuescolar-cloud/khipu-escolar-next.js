import { CalendarClock, CheckCircle2, Megaphone, Trash2, History } from "lucide-react";
import type { Metadata } from "next";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { estadoAnuncio, localDeLima, NOMBRE_AUDIENCIA, NOMBRE_ESTADO_ANUNCIO, NOMBRE_NIVEL, type EstadoAnuncio } from "@/lib/anuncios-plataforma";
import { nombresDePlanes } from "@/lib/server/modulos";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { listarAnuncios } from "@/lib/server/plataforma-anuncios";
import { eliminarAnuncioAction, guardarAnuncioAction } from "./actions";
import { FormularioAnuncio } from "./FormularioAnuncio";

export const metadata: Metadata = { title: "Anuncios" };

const ESTADO = {
  programado: { Icono: CalendarClock, clase: "bg-muted text-muted-foreground" },
  vigente: { Icono: CheckCircle2, clase: "bg-llego-fondo text-llego" },
  terminado: { Icono: History, clase: "bg-muted text-muted-foreground" },
} satisfies Record<EstadoAnuncio, unknown>;

const fecha = (d: Date) => new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", dateStyle: "medium", timeStyle: "short" }).format(d);

export default async function Anuncios() {
  const admin = await requireAdminPlataforma();
  const [anuncios, nombres] = await Promise.all([listarAnuncios(admin), nombresDePlanes()]);
  const ahora = new Date();
  const desdePorDefecto = localDeLima(ahora).slice(0, 16);
  const hastaPorDefecto = localDeLima(new Date(ahora.getTime() + 7 * 86_400_000));
  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Anuncios"
        descripcion="Mensajes del equipo Khipu para los colegios: novedades, mantenimientos y avisos urgentes."
        acciones={<FormularioAnuncio accion={guardarAnuncioAction} nombresPlanes={nombres} desdePorDefecto={desdePorDefecto} hastaPorDefecto={hastaPorDefecto} />}
      />
      {anuncios.length === 0 ? (
        <EstadoVacio icono={Megaphone} titulo="Aún no hay anuncios." descripcion="Crea el primero para avisar de una novedad o de un mantenimiento." />
      ) : (
        <Tarjeta className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sobretitulo pl-4">Anuncio</TableHead>
                <TableHead className="sobretitulo">Nivel</TableHead>
                <TableHead className="sobretitulo">Quién lo ve</TableHead>
                <TableHead className="sobretitulo">Vigencia (Lima)</TableHead>
                <TableHead className="sobretitulo">Estado</TableHead>
                <TableHead className="sobretitulo pr-4 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {anuncios.map((a) => {
                const estado = estadoAnuncio(a, ahora);
                const { Icono, clase } = ESTADO[estado];
                return (
                  <TableRow key={a.id} data-testid="fila-anuncio">
                    <TableCell className="max-w-xs pl-4">
                      <p className="truncate font-medium">{a.titulo}</p>
                      <p className="truncate text-cuerpo-sm text-muted-foreground">{a.cuerpo}</p>
                    </TableCell>
                    <TableCell>{NOMBRE_NIVEL[a.nivel]}</TableCell>
                    <TableCell>
                      {NOMBRE_AUDIENCIA[a.audiencia]}
                      <p className="text-cuerpo-sm text-muted-foreground">{a.planes.length ? a.planes.map((p) => nombres[p]).join(", ") : "Todos los planes"}</p>
                    </TableCell>
                    <TableCell className="text-cuerpo-sm text-muted-foreground">
                      {fecha(a.desde)}
                      <br />
                      {fecha(a.hasta)}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 rounded-pildora px-2 py-0.5 text-etiqueta ${clase}`}>
                        <Icono className="size-3.5" strokeWidth={2} aria-hidden /> {NOMBRE_ESTADO_ANUNCIO[estado]}
                      </span>
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex justify-end gap-2">
                        <FormularioAnuncio
                          accion={guardarAnuncioAction}
                          nombresPlanes={nombres}
                          desdePorDefecto={desdePorDefecto}
                          hastaPorDefecto={hastaPorDefecto}
                          anuncio={{ id: a.id, titulo: a.titulo, cuerpo: a.cuerpo, nivel: a.nivel, audiencia: a.audiencia, planes: a.planes, desde: localDeLima(a.desde), hasta: localDeLima(a.hasta) }}
                        />
                        <BotonConfirmar
                          tamano="sm"
                          etiqueta={<><Trash2 strokeWidth={2} aria-hidden /> Eliminar</>}
                          titulo="¿Eliminar este anuncio?"
                          descripcion="Dejará de mostrarse en los colegios. Esto no se puede deshacer."
                          confirmar="Eliminar"
                          peligro
                          accion={eliminarAnuncioAction}
                          campos={{ id: a.id }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Tarjeta>
      )}
    </div>
  );
}
