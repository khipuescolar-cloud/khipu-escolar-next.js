import { CheckCircle2, Clock, HeartHandshake, Info, Search, UserPlus, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Badge } from "@/components/ui/badge";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Flash } from "@/components/ui/Flash";
import { Selector } from "@/components/ui/Selector";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { FAMILIAS_POR_PAGINA, listarAlumnos, listarApoderados } from "@/lib/server/gestion";
import { requireTenantContext } from "@/lib/server/tenant";
import { cambiarEstadoMembresiaAction, desvincularApoderadoAction, editarApoderadoAction, invitarApoderadoAction, reenviarInvitacionAction, vincularApoderadoAction } from "../actions";
import { AccionesFila, type ItemFila } from "../_componentes/AccionesFila";
import { AvatarPersona } from "../_componentes/AvatarPersona";
import { PanelFormulario } from "../_componentes/PanelFormulario";

export const metadata: Metadata = { title: "Familias" };

const CONSENTIMIENTO = {
  vigente: { texto: "Consentimiento aceptado", Icono: CheckCircle2, clase: "bg-llego-fondo text-llego" },
  pendiente: { texto: "Consentimiento pendiente", Icono: Clock, clase: "bg-tarde-fondo text-tarde" },
  revocado: { texto: "Consentimiento retirado", Icono: XCircle, clase: "bg-falta-fondo text-falta" },
} as const;

export default async function ApoderadosPage({ params, searchParams }: PageProps<"/colegio/[slug]/gestion/apoderados">) {
  const { slug } = await params;
  const sp = await searchParams;
  const { ok, error } = sp;
  const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const q = uno(sp.q)?.trim().slice(0, 80) || undefined;
  const ctx = await requireTenantContext(slug, ["direccion", "administrativo"]);
  const [{ familias: apoderados, total, pagina, paginas }, alumnos] = await Promise.all([
    listarApoderados(ctx, { q, pagina: Number(uno(sp.pagina)) || 1 }),
    listarAlumnos(ctx),
  ]);
  const hrefPagina = (n: number) => `/gestion/apoderados?${new URLSearchParams({ ...(q ? { q } : {}), ...(n > 1 ? { pagina: String(n) } : {}) }).toString()}`.replace(/\?$/, "");
  const numeros = Array.from({ length: paginas }, (_, i) => i + 1).filter((n) => n === 1 || n === paginas || Math.abs(n - pagina) <= 1);
  const opcionesAlumno = alumnos.map((a) => <option key={a.id} value={a.id}>{a.apellidos}, {a.nombres} ({a.salon.nombre})</option>);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <EncabezadoPagina
          titulo="Familias"
          descripcion="Apoderados, sus alumnos y el consentimiento para recibir avisos."
          acciones={
            <PanelFormulario
              boton={<><UserPlus strokeWidth={2} aria-hidden /> Invitar apoderado</>}
              titulo="Invitar a un apoderado"
              descripcion="Usa su correo personal. Al entrar por primera vez aceptará el consentimiento; sin él no recibe avisos."
            >
              <form action={invitarApoderadoAction} className="grid gap-4 sm:grid-cols-2">
                <Campo etiqueta="Nombres" name="nombres" required />
                <Campo etiqueta="Apellidos" name="apellidos" required />
                <Campo etiqueta="Correo personal" name="email" type="email" required />
                <Campo etiqueta="Parentesco" name="parentesco" placeholder="madre, padre, tutor legal…" required />
                <Selector etiqueta="Alumno" name="alumnoId" required className="sm:col-span-2">{opcionesAlumno}</Selector>
                <Boton type="submit" className="justify-self-start sm:col-span-2">Enviar invitación</Boton>
              </form>
            </PanelFormulario>
          }
        />
        <Flash ok={ok} error={error} />
      </div>

      <Tarjeta className="p-4">
        <form method="get" className="flex flex-wrap items-end gap-3" role="search">
          <Campo etiqueta="Buscar familia" name="q" type="search" defaultValue={q ?? ""} placeholder={ctx.rol === "direccion" ? "Nombre, correo, documento o alumno" : "Nombre, correo o alumno"} />
          <Boton type="submit" variante="secundario"><Search strokeWidth={2} aria-hidden /> Buscar</Boton>
          {q && <Link href="/gestion/apoderados" className="inline-flex h-10 items-center px-2 text-sm font-semibold text-primary hover:underline">Limpiar</Link>}
        </form>
      </Tarjeta>

      {apoderados.length === 0 ? (
        q ? (
          <EstadoVacio icono={Search} titulo="No encontramos familias con esa búsqueda" descripcion="Prueba con otro nombre, correo o con el nombre del alumno." />
        ) : (
          <EstadoVacio icono={HeartHandshake} titulo="Aún no hay familias registradas" descripcion="Invita al primer apoderado con el botón «Invitar apoderado»." />
        )
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {apoderados.map((a) => {
            const c = CONSENTIMIENTO[a.consentimiento];
            const nombre = `${a.user.nombres} ${a.user.apellidos}`;
            const items: ItemFila[] = [
              {
                tipo: "panel", texto: "Editar datos", icono: "editar", titulo: `Datos de ${nombre}`,
                descripcion: "Nombres, apellidos y teléfono de contacto.",
                contenido: (
                  <form action={editarApoderadoAction} className="grid gap-4 sm:grid-cols-2">
                    <input type="hidden" name="id" value={a.id} />
                    <Campo etiqueta="Nombres" name="nombres" defaultValue={a.user.nombres} required />
                    <Campo etiqueta="Apellidos" name="apellidos" defaultValue={a.user.apellidos} required />
                    <Campo etiqueta="Teléfono" name="telefono" defaultValue={a.user.telefono ?? ""} />
                    {a.otrosColegios && (
                      <p role="note" className="flex items-start gap-2 rounded-lg border border-tarde/40 bg-tarde-fondo p-3 text-sm text-tarde sm:col-span-2">
                        <Info className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />
                        Estos datos también se ven en los otros colegios de esta persona.
                      </p>
                    )}
                    <Boton type="submit" className="justify-self-start sm:col-span-2">Guardar datos</Boton>
                  </form>
                ),
              },
              {
                tipo: "panel", texto: "Vincular otro alumno", icono: "vincular", titulo: `Vincular un alumno a ${nombre}`,
                contenido: (
                  <form action={vincularApoderadoAction} className="grid gap-4">
                    <input type="hidden" name="apoderadoId" value={a.id} />
                    <Selector etiqueta="Vincular otro alumno" name="alumnoId">{opcionesAlumno}</Selector>
                    <Campo etiqueta="Parentesco" name="parentesco" required />
                    <Boton type="submit" className="justify-self-start">Vincular</Boton>
                  </form>
                ),
              },
              ...(a.estado === "invitada"
                ? [{
                    tipo: "confirmar" as const, texto: "Reenviar invitación", icono: "enviar" as const, titulo: "¿Reenviar la invitación?",
                    descripcion: `Enviaremos de nuevo el enlace de invitación a ${a.user.email}.`, confirmar: "Reenviar invitación",
                    accion: reenviarInvitacionAction, campos: { id: a.id, volver: "apoderados" },
                  }]
                : []),
              a.estado === "inactiva"
                ? {
                    tipo: "confirmar" as const, texto: "Reactivar cuenta", icono: "reactivar" as const, titulo: `¿Reactivar la cuenta de ${nombre}?`,
                    descripcion: "Volverá a entrar y a recibir avisos si tiene el consentimiento vigente.", confirmar: "Reactivar cuenta",
                    accion: cambiarEstadoMembresiaAction, campos: { id: a.id, volver: "apoderados", estado: "activa" },
                  }
                : {
                    tipo: "confirmar" as const, texto: "Desactivar cuenta", icono: "retirar" as const, peligro: true, titulo: `¿Desactivar la cuenta de ${nombre}?`,
                    descripcion: "Dejará de entrar y de recibir avisos. Puedes reactivarla cuando quieras.", confirmar: "Desactivar cuenta",
                    accion: cambiarEstadoMembresiaAction, campos: { id: a.id, volver: "apoderados", estado: "inactiva" },
                  },
            ];
            return (
              <li key={a.id}>
                <Tarjeta className="flex h-full flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <AvatarPersona nombres={a.user.nombres} apellidos={a.user.apellidos} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{nombre}</p>
                      <p className="truncate text-sm text-muted-foreground">{a.user.email}</p>
                    </div>
                    <AccionesFila etiqueta={`Acciones para ${nombre}`} items={items} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {a.estado === "invitada" && (
                      <Badge className="h-6 bg-tarde-fondo px-2.5 text-xs font-semibold text-tarde"><Clock strokeWidth={2} aria-hidden /> Invitación pendiente</Badge>
                    )}
                    {a.estado === "inactiva" && <Badge className="h-6 bg-muted px-2.5 text-xs font-semibold text-muted-foreground">Cuenta inactiva</Badge>}
                    <Badge className={`h-6 px-2.5 text-xs font-semibold ${c.clase}`}><c.Icono strokeWidth={2} aria-hidden /> {c.texto}</Badge>
                  </div>
                  <ul className="flex flex-col divide-y border-t text-sm">
                    {a.hijos.map((h) => (
                      <li key={h.id} className="flex items-center justify-between gap-2 py-2">
                        <span>{h.parentesco} de {h.alumno.nombres} {h.alumno.apellidos} <span className="text-muted-foreground">({h.alumno.salon.nombre})</span></span>
                        <BotonConfirmar
                          etiqueta="Quitar"
                          titulo="¿Quitar este vínculo?"
                          descripcion={`${a.user.nombres} dejará de ver a ${h.alumno.nombres} y de recibir sus avisos.`}
                          confirmar="Quitar vínculo"
                          accion={desvincularApoderadoAction}
                          campos={{ id: h.id }}
                          peligro
                          variante="ghost"
                          tamano="sm"
                        />
                      </li>
                    ))}
                    {a.hijos.length === 0 && <li className="py-2 text-muted-foreground">Sin alumnos vinculados.</li>}
                  </ul>
                </Tarjeta>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-col items-center gap-3">
        <p className="text-xs text-muted-foreground">
          {total} {total === 1 ? "familia" : "familias"}{paginas > 1 ? ` · página ${pagina} de ${paginas} (${FAMILIAS_POR_PAGINA} por página)` : ""}.
        </p>
        {paginas > 1 && (
          <Pagination aria-label="Paginación de familias">
            <PaginationContent>
              {pagina > 1 && <PaginationItem><PaginationPrevious href={hrefPagina(pagina - 1)} text="Anterior" /></PaginationItem>}
              {numeros.map((n) => (
                <PaginationItem key={n}><PaginationLink href={hrefPagina(n)} isActive={n === pagina}>{n}</PaginationLink></PaginationItem>
              ))}
              {pagina < paginas && <PaginationItem><PaginationNext href={hrefPagina(pagina + 1)} text="Siguiente" /></PaginationItem>}
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}
