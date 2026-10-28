import { CheckCircle2, PauseCircle, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { listarEquipo } from "@/lib/server/plataforma-equipo";
import { fechaHora, fechaSimple } from "../EstadoColegio";
import { agregarMiembroAction, desactivarMiembroAction, reactivarMiembroAction } from "./actions";
import { DialogoAgregarMiembro } from "./DialogoAgregarMiembro";

export const metadata: Metadata = { title: "Equipo Khipu" };

export default async function EquipoKhipu() {
  const admin = await requireAdminPlataforma();
  const equipo = await listarEquipo(admin);
  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Equipo Khipu"
        descripcion="Las personas con acceso de super administrador. Nunca ven chats, notas ni datos personales de alumnos."
        acciones={<DialogoAgregarMiembro accion={agregarMiembroAction} />}
      />
      {equipo.length === 0 ? (
        <EstadoVacio icono={UsersRound} titulo="Todavía no hay miembros." descripcion="Agrega a la primera persona del equipo." />
      ) : (
        <Tarjeta className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sobretitulo pl-4">Nombre</TableHead>
                <TableHead className="sobretitulo">Correo</TableHead>
                <TableHead className="sobretitulo">Estado</TableHead>
                <TableHead className="sobretitulo">Último ingreso</TableHead>
                <TableHead className="sobretitulo">Alta</TableHead>
                <TableHead className="sobretitulo pr-4 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipo.map((m) => {
                const yo = m.userId === admin.user.id;
                return (
                  <TableRow key={m.adminId} data-testid="miembro-equipo">
                    <TableCell className="pl-4 font-medium">
                      {m.nombre}
                      {yo && <span className="ml-2 text-etiqueta text-muted-foreground">(tú)</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.email}</TableCell>
                    <TableCell>
                      {m.activo ? (
                        <span className="inline-flex items-center gap-1 rounded-pildora bg-llego-fondo px-2 py-0.5 text-etiqueta text-llego">
                          <CheckCircle2 className="size-3.5" strokeWidth={2} aria-hidden /> Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-pildora bg-muted px-2 py-0.5 text-etiqueta text-muted-foreground">
                          <PauseCircle className="size-3.5" strokeWidth={2} aria-hidden /> Desactivado
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{fechaHora(m.ultimoIngresoAt)}</TableCell>
                    <TableCell className="text-muted-foreground">{fechaSimple(m.altaAt)}</TableCell>
                    <TableCell className="pr-4 text-right">
                      {m.activo ? (
                        !yo && (
                          <BotonConfirmar
                            tamano="sm"
                            etiqueta="Desactivar"
                            titulo={`¿Desactivar a ${m.nombre}?`}
                            descripcion="Dejará de poder entrar al panel de plataforma. Puedes reactivarlo cuando quieras."
                            confirmar="Desactivar"
                            peligro
                            accion={desactivarMiembroAction}
                            campos={{ adminId: m.adminId }}
                          />
                        )
                      ) : (
                        <BotonConfirmar
                          tamano="sm"
                          etiqueta="Reactivar"
                          titulo={`¿Reactivar a ${m.nombre}?`}
                          descripcion="Volverá a tener acceso a todo el panel de plataforma."
                          confirmar="Reactivar"
                          accion={reactivarMiembroAction}
                          campos={{ adminId: m.adminId }}
                        />
                      )}
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
