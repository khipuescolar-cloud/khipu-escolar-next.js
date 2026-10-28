import { FileUp, Search, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Badge } from "@/components/ui/badge";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Flash } from "@/components/ui/Flash";
import { CLASE_CAMPO, Selector } from "@/components/ui/Selector";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { encabezadoPersonal } from "@/lib/importar-personal";
import { NOMBRE_ROL } from "@/lib/roles";
import { listarSalones } from "@/lib/server/gestion";
import { listarPersonal, ROLES_NO_DOCENTES, type RolPersonal } from "@/lib/server/personal";
import type { TenantContext } from "@/lib/server/tenant";
import { altaPersonalAction, altaProfesorAction, cambiarEstadoMembresiaAction, importarPersonalAction } from "../actions";
import { AccionesFila } from "../_componentes/AccionesFila";
import { AvatarPersona } from "../_componentes/AvatarPersona";
import { InsigniaEstado } from "../_componentes/EstadoPersona";
import { PanelFormulario } from "../_componentes/PanelFormulario";

export { InsigniaEstado };
export type Ambito = "profesores" | "personal";
type Params = Record<string, string | string[] | undefined>;
const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function CamposPersona({ valores, conEmail = true }: { valores?: Record<string, string | null | undefined>; conEmail?: boolean }) {
  const v = (k: string) => valores?.[k] ?? "";
  return (
    <>
      <Campo etiqueta="Nombres" name="nombres" required defaultValue={v("nombres")} />
      <Campo etiqueta="Apellidos" name="apellidos" required defaultValue={v("apellidos")} />
      <Selector etiqueta="Tipo de documento" name="tipoDocumento" defaultValue={v("tipoDocumento") || "dni"}>
        <option value="dni">DNI</option>
        <option value="ce">Carné de extranjería</option>
        <option value="pasaporte">Pasaporte</option>
      </Selector>
      <Campo etiqueta="Número de documento" name="numeroDocumento" required defaultValue={v("numeroDocumento")} inputMode="text" autoComplete="off" />
      {conEmail && <Campo etiqueta="Correo" name="email" type="email" required />}
      <Campo etiqueta="Teléfono" name="telefono" type="tel" defaultValue={v("telefono")} />
      <Selector etiqueta="Género" name="genero" defaultValue={v("genero")}>
        <option value="">Sin indicar</option>
        <option value="femenino">Femenino</option>
        <option value="masculino">Masculino</option>
        <option value="no_especifica">Prefiere no indicar</option>
      </Selector>
      <Campo etiqueta="Fecha de nacimiento" name="fechaNacimiento" type="date" defaultValue={v("fechaNacimiento")} />
      <Campo etiqueta="Dirección" name="direccion" defaultValue={v("direccion")} />
      <Campo etiqueta="Cargo" name="cargo" placeholder="Docente de Matemática" defaultValue={v("cargo")} />
    </>
  );
}

export async function PanelPersonal({ ctx, ambito, searchParams }: { ctx: TenantContext; ambito: Ambito; searchParams: Params }) {
  const esProfesores = ambito === "profesores";
  const roles: RolPersonal[] = esProfesores ? ["profesor"] : ROLES_NO_DOCENTES;
  const q = uno(searchParams.q);
  const estadoParam = uno(searchParams.estado);
  const estado = estadoParam === "activa" || estadoParam === "inactiva" || estadoParam === "invitada" ? estadoParam : undefined;
  const salonId = uno(searchParams.salon) || undefined;
  const cursoId = uno(searchParams.curso) || undefined;
  const [personas, salones] = await Promise.all([
    listarPersonal(ctx, roles, { q, estado, salonId: esProfesores ? salonId : undefined, cursoId: esProfesores ? cursoId : undefined }),
    esProfesores ? listarSalones(ctx) : Promise.resolve([]),
  ]);
  const base = `/gestion/${ambito}`;
  const titulo = esProfesores ? "Profesores" : "Personal";
  const hayFiltros = Boolean(q || estado || salonId || cursoId);

  const acciones = (
    <>
      <PanelFormulario
        tipo="dialog"
        variante="outline"
        boton={<><FileUp strokeWidth={2} aria-hidden /> Importar CSV</>}
        titulo="Importar desde un archivo CSV"
        descripcion={
          <>
            Columnas: <code>{encabezadoPersonal(ambito)}</code>. Obligatorias: nombres, apellidos, documento y correo{esProfesores ? "" : " y rol (administrativo o porteria)"}. Si alguna línea falla, no se registra ninguna.
          </>
        }
      >
        <form action={importarPersonalAction} className="flex flex-col gap-4">
          <input type="hidden" name="tipo" value={ambito} />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Archivo CSV</span>
            <input type="file" name="archivo" accept=".csv,text/csv" required className="min-h-10 text-sm file:mr-3 file:h-10 file:rounded-md file:border file:border-input file:bg-card file:px-3 file:text-sm file:font-semibold" />
          </label>
          <Boton type="submit" className="self-start">Importar</Boton>
        </form>
      </PanelFormulario>
      <PanelFormulario
        tipo="sheet"
        boton={<><UserPlus strokeWidth={2} aria-hidden /> {esProfesores ? "Agregar profesor" : "Agregar personal"}</>}
        titulo={esProfesores ? "Registrar un profesor" : "Registrar a una persona del personal"}
        descripcion="Su usuario es su correo y su contraseña inicial es su número de documento; deberá cambiarla al entrar. El correo de bienvenida no incluye el número."
      >
        <form action={esProfesores ? altaProfesorAction : altaPersonalAction} className="grid gap-4 sm:grid-cols-2">
          {!esProfesores && (
            <Selector etiqueta="Rol" name="rol" defaultValue="administrativo">
              {ROLES_NO_DOCENTES.map((r) => <option key={r} value={r}>{NOMBRE_ROL[r]}</option>)}
            </Selector>
          )}
          <CamposPersona />
          <Boton type="submit" className="self-end justify-self-start sm:col-span-2">Registrar y enviar bienvenida</Boton>
          <p className="text-cuerpo-sm text-muted-foreground sm:col-span-2">
            {esProfesores ? "La tutoría y los cursos se asignan en «Grados y salones». " : ""}Si el correo ya tiene cuenta en Khipu, solo se agrega al colegio y conserva su contraseña.
          </p>
        </form>
      </PanelFormulario>
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <EncabezadoPagina
          titulo={titulo}
          descripcion={esProfesores ? "Docentes del colegio, sus cursos y su tutoría." : "Personal administrativo y de portería."}
          acciones={acciones}
        />
        <Flash ok={searchParams.ok} error={searchParams.error} />
      </div>

      <Tarjeta className="p-4">
        <form method="get" className="flex flex-wrap items-end gap-3" role="search">
          <label className="flex min-w-56 flex-1 flex-col gap-1.5 text-sm">
            <span className="font-medium">Buscar</span>
            <span className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} aria-hidden />
              <input name="q" defaultValue={q} placeholder="Nombre, correo o documento" className={`${CLASE_CAMPO} pl-9`} />
            </span>
          </label>
          <Selector etiqueta="Estado" name="estado" defaultValue={estado ?? ""}>
            <option value="">Todos</option>
            <option value="activa">Activos</option>
            <option value="inactiva">Inactivos</option>
            <option value="invitada">Invitación pendiente</option>
          </Selector>
          {esProfesores && (
            <>
              <Selector etiqueta="Salón" name="salon" defaultValue={salonId ?? ""}>
                <option value="">Todos</option>
                {salones.map((s) => <option key={s.id} value={s.id}>{s.nombre} ({s.anio})</option>)}
              </Selector>
              <Selector etiqueta="Curso" name="curso" defaultValue={cursoId ?? ""}>
                <option value="">Todos</option>
                {salones.flatMap((s) => s.cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre} · {s.nombre}</option>))}
              </Selector>
            </>
          )}
          <Boton type="submit" variante="secundario">Filtrar</Boton>
          <Link href={base} className="inline-flex h-10 items-center px-2 enlace">Limpiar</Link>
        </form>
      </Tarjeta>

      {personas.length === 0 ? (
        <EstadoVacio
          icono={Users}
          titulo={hayFiltros ? "No encontramos personas con esos datos" : `Aún no hay ${esProfesores ? "profesores" : "personal"} registrado`}
          descripcion={hayFiltros ? "Prueba con otra búsqueda o limpia los filtros." : `Usa el botón «${esProfesores ? "Agregar profesor" : "Agregar personal"}» para registrar a la primera persona.`}
        />
      ) : (
        <Tarjeta className="overflow-hidden p-0">
          <Table>
            <caption className="sr-only">{titulo} del colegio</caption>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="h-11 px-4">Nombre</TableHead>
                <TableHead className="h-11 px-4">Documento</TableHead>
                <TableHead className="h-11 px-4">Teléfono</TableHead>
                {esProfesores ? (
                  <>
                    <TableHead className="h-11 px-4">Cursos</TableHead>
                    <TableHead className="h-11 px-4">Tutoría</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="h-11 px-4">Rol</TableHead>
                    <TableHead className="h-11 px-4">Cargo</TableHead>
                  </>
                )}
                <TableHead className="h-11 px-4">Estado</TableHead>
                <TableHead className="h-11 w-14 px-4"><span className="sr-only">Acciones</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {personas.map((p) => {
                const nombreCompleto = `${p.user.apellidos}, ${p.user.nombres}`;
                return (
                  <TableRow key={p.id} className="align-top">
                    <TableCell className="px-4 py-3 whitespace-normal">
                      <div className="flex items-center gap-3">
                        <AvatarPersona nombres={p.user.nombres} apellidos={p.user.apellidos} />
                        <div className="min-w-0">
                          <Link href={`${base}/${p.id}`} className="enlace">{nombreCompleto}</Link>
                          <p className="truncate text-cuerpo-sm text-muted-foreground">{p.user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">{p.user.numeroDocumento ? `${(p.user.tipoDocumento ?? "dni").toUpperCase()} ${p.user.numeroDocumento}` : "—"}</TableCell>
                    <TableCell className="px-4 py-3">{p.user.telefono ?? "—"}</TableCell>
                    {esProfesores ? (
                      <>
                        <TableCell className="max-w-64 px-4 py-3 whitespace-normal">{p.cursosDictados.length > 0 ? p.cursosDictados.map((c) => `${c.nombre} (${c.salon.nombre})`).join(", ") : <span className="text-muted-foreground">Sin cursos</span>}</TableCell>
                        <TableCell className="px-4 py-3">{p.salonesTutor.length > 0 ? p.salonesTutor.map((s) => s.nombre).join(", ") : "—"}</TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="px-4 py-3"><Badge variant="outline" className="h-6 px-2.5">{NOMBRE_ROL[p.rol]}</Badge></TableCell>
                        <TableCell className="px-4 py-3">{p.cargo ?? "—"}</TableCell>
                      </>
                    )}
                    <TableCell className="px-4 py-3"><InsigniaEstado estado={p.estado} /></TableCell>
                    <TableCell className="px-2 py-2">
                      <AccionesFila
                        etiqueta={`Acciones para ${nombreCompleto}`}
                        items={[
                          { tipo: "enlace", texto: "Ver ficha", href: `${base}/${p.id}`, icono: "ver" },
                          p.estado === "inactiva"
                            ? {
                                tipo: "confirmar", texto: "Reactivar", icono: "reactivar", titulo: `¿Reactivar a ${p.user.nombres}?`,
                                descripcion: "Podrá volver a entrar a Khipu con su cuenta.", confirmar: "Reactivar",
                                accion: cambiarEstadoMembresiaAction, campos: { id: p.id, volver: base, estado: "activa" },
                              }
                            : {
                                tipo: "confirmar", texto: "Desactivar", icono: "retirar", peligro: true, titulo: `¿Desactivar a ${p.user.nombres}?`,
                                descripcion: `Dejará de entrar a Khipu${esProfesores ? " y se liberarán sus tutorías y cursos" : ""}. Nunca se borra a una persona: puedes reactivarla cuando quieras.`,
                                confirmar: "Desactivar", accion: cambiarEstadoMembresiaAction, campos: { id: p.id, volver: base, estado: "inactiva" },
                              },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Tarjeta>
      )}
      <p className="text-cuerpo-sm text-muted-foreground">
        {personas.length} {personas.length === 1 ? "persona" : "personas"}. El documento solo lo ve la dirección. Abrir una ficha o esta lista queda registrado en la auditoría.
      </p>
    </div>
  );
}
