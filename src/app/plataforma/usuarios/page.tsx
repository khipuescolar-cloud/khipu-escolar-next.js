import { ChevronLeft, ChevronRight, KeyRound, Search, ShieldCheck, UserSearch, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { buttonVariants } from "@/components/ui/button";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { nombreRol } from "@/lib/roles";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { buscarUsuarios, esquemaBusquedaUsuarios } from "@/lib/server/plataforma-usuarios";
import { fechaHora } from "../EstadoColegio";
import { EstadoMembresia } from "./EstadoMembresia";

export const metadata: Metadata = { title: "Usuarios" };

export default async function Usuarios({ searchParams }: PageProps<"/plataforma/usuarios">) {
  const admin = await requireAdminPlataforma();
  const sp = await searchParams;
  const { q, pagina } = esquemaBusquedaUsuarios.parse({ q: sp.q, pagina: sp.pagina });
  const r = await buscarUsuarios(admin, { q, pagina });
  const enlace = (p: number) => `/usuarios?${new URLSearchParams({ ...(q ? { q } : {}), pagina: String(p) })}`;

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Usuarios"
        descripcion="Busca a cualquier persona por correo, nombre o documento para darle soporte. No se muestran alumnos, notas ni chats."
      />

      <Tarjeta className="-mt-2 p-4">
        <form role="search" className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 sm:max-w-md">
            <Campo etiqueta="Buscar persona" name="q" defaultValue={q ?? ""} placeholder="Correo, nombres o documento" />
          </div>
          <Boton type="submit"><Search strokeWidth={2} aria-hidden /> Buscar</Boton>
          {q && (
            <Link href="/usuarios" className={buttonVariants({ variant: "ghost" })}><X strokeWidth={2} aria-hidden /> Quitar búsqueda</Link>
          )}
        </form>
      </Tarjeta>

      {r.filas.length === 0 ? (
        <EstadoVacio icono={UserSearch} titulo="No encontramos a nadie con esa búsqueda." descripcion="Revisa el correo o prueba con parte del nombre o del documento." />
      ) : (
        <>
          <p className="text-cuerpo-sm text-muted-foreground" aria-live="polite">
            {r.total.toLocaleString("es-PE")} {r.total === 1 ? "persona" : "personas"} · página {r.pagina} de {r.paginas}
          </p>
          <Tarjeta className="-mt-3 overflow-hidden p-0">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="sobretitulo pl-4">Persona</TableHead>
                  <TableHead className="sobretitulo">Colegios y roles</TableHead>
                  <TableHead className="sobretitulo">Último ingreso</TableHead>
                  <TableHead className="sobretitulo pr-4">Cuenta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.filas.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="pl-4">
                      <Link href={`/usuarios/${u.id}`} className="enlace font-semibold">{`${u.nombres} ${u.apellidos}`.trim()}</Link>
                      <p className="text-cuerpo-sm text-muted-foreground">{u.email}</p>
                    </TableCell>
                    <TableCell>
                      <ul className="flex flex-col gap-1">
                        {u.memberships.length === 0 && <li className="text-cuerpo-sm text-muted-foreground">Sin colegio</li>}
                        {u.memberships.map((m) => (
                          <li key={m.id} className="flex flex-wrap items-center gap-2 text-cuerpo-sm">
                            <span>{m.tenant.nombre}</span>
                            <span className="rounded-pildora border px-2 py-0.5 text-etiqueta">{nombreRol(m.rol, null)}</span>
                            <EstadoMembresia estado={m.estado} />
                          </li>
                        ))}
                      </ul>
                    </TableCell>
                    <TableCell>{fechaHora(u.ultimoIngresoAt)}</TableCell>
                    <TableCell className="pr-4">
                      <div className="flex flex-col items-start gap-1 text-cuerpo-sm">
                        {u.esSuperAdmin && <span className="inline-flex items-center gap-1 font-medium"><ShieldCheck className="size-4" strokeWidth={2} aria-hidden /> Super administrador</span>}
                        {u.debeCambiarPassword && <span className="inline-flex items-center gap-1 text-tarde"><KeyRound className="size-4" strokeWidth={2} aria-hidden /> Debe cambiar su contraseña</span>}
                        {!u.esSuperAdmin && !u.debeCambiarPassword && <span className="text-muted-foreground">Sin pendientes</span>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Tarjeta>
          {r.paginas > 1 && (
            <nav aria-label="Paginación" className="flex items-center justify-between gap-2">
              {r.pagina > 1 ? (
                <Link href={enlace(r.pagina - 1)} className={buttonVariants({ variant: "outline" })}><ChevronLeft strokeWidth={2} aria-hidden /> Anterior</Link>
              ) : <span />}
              {r.pagina < r.paginas && (
                <Link href={enlace(r.pagina + 1)} className={buttonVariants({ variant: "outline" })}>Siguiente <ChevronRight strokeWidth={2} aria-hidden /></Link>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
