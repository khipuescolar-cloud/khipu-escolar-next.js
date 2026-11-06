import { RotateCcw } from "lucide-react";
import type { Metadata } from "next";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EncabezadoPlataforma } from "@/app/plataforma/_componentes/EncabezadoPlataforma";
import { TituloBloque } from "@/components/shell/TituloBloque";
import { ICONOS_NAV } from "@/components/shell/iconos";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { INFO_MODULO, INFO_ROL, MODULOS, ROLES } from "@/lib/modulos";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { matrizRoles } from "@/lib/server/plataforma-roles";
import { cambiarModuloDeRolAction, restablecerRolesAction } from "./actions";
import { CeldaRolModulo } from "./CeldaRolModulo";

export const metadata: Metadata = { title: "Roles y permisos" };

/** Roles por defecto de cada colegio y qué módulos ve cada uno (specs/19). */
export default async function RolesPage() {
  const admin = await requireAdminPlataforma();
  const matriz = await matrizRoles(admin);
  const cambios = ROLES.reduce((n, r) => n + MODULOS.filter((m) => matriz[r][m] === "desactivado").length, 0);

  return (
    <div className="flex flex-col gap-8">
      <EncabezadoPlataforma
        titulo="Roles y permisos"
        descripcion="Los roles por defecto que tendrá cada colegio y qué módulos ve cada uno. Un cambio aquí rige para todos los colegios."
        acciones={
          <BotonConfirmar
            etiqueta={<><RotateCcw strokeWidth={2} aria-hidden /> Restablecer valores por defecto</>}
            titulo="¿Restablecer los roles?"
            descripcion={
              cambios === 0
                ? "Los roles ya están con los valores por defecto."
                : `Se volverán a habilitar ${cambios === 1 ? "1 módulo desactivado" : `${cambios} módulos desactivados`} para su rol en todos los colegios.`
            }
            confirmar="Restablecer"
            accion={restablecerRolesAction}
          />
        }
      />

      <section aria-labelledby="roles" className="flex flex-col gap-3">
        <TituloBloque id="roles">Roles de cada colegio</TituloBloque>
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {ROLES.map((r) => {
            const visibles = MODULOS.filter((m) => matriz[r][m] === "habilitado" || matriz[r][m] === "esencial").length;
            return (
              <li key={r}>
                <div className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <div><h3 className="font-semibold">{INFO_ROL[r].nombre}</h3><p className="text-cuerpo-sm text-muted-foreground">{INFO_ROL[r].descripcion}</p></div>
                  <p className="shrink-0 text-cuerpo-sm tabular-nums">{visibles === 1 ? "1 módulo habilitado" : `${visibles} módulos habilitados`}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="matriz-roles" className="flex flex-col gap-3">
        <div>
          <TituloBloque id="matriz-roles">Módulos por rol</TituloBloque>
          <p className="text-cuerpo-sm text-muted-foreground">
            «No disponible» significa que el módulo no tiene pantallas para ese rol (p. ej. el alumno no usa Mensajes). El plan de cada colegio sigue mandando: un rol solo ve los módulos que su colegio tiene.
          </p>
        </div>
        <Tarjeta className="overflow-x-auto p-0 sm:p-0">
          <Table className="min-w-[960px]">
            <TableHeader>
              <TableRow>
                <TableHead className="sobretitulo pl-4">Módulo</TableHead>
                {ROLES.map((r) => (
                  <TableHead key={r} className="sobretitulo text-center">{INFO_ROL[r].nombre}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {MODULOS.map((m) => {
                const info = INFO_MODULO[m];
                const Icono = ICONOS_NAV[info.icono];
                return (
                  <TableRow key={m} data-testid={`rol-modulo-${m}`}>
                    <TableCell className="pl-4">
                      <span className="inline-flex items-center gap-2 font-semibold">
                        <Icono className="size-4 text-sec-trazo" strokeWidth={2} aria-hidden /> {info.nombre}
                      </span>
                    </TableCell>
                    {ROLES.map((r) => (
                      <TableCell key={r} className="text-center">
                        <CeldaRolModulo
                          rol={r}
                          nombreRol={INFO_ROL[r].nombre}
                          modulo={m}
                          nombreModulo={info.nombre}
                          estado={matriz[r][m]}
                          accion={cambiarModuloDeRolAction}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Tarjeta>
      </section>
    </div>
  );
}
