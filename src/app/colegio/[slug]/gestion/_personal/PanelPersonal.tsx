import { CheckCircle2, Clock, FileUp, Search, UserPlus, UserRoundX } from "lucide-react";
import Link from "next/link";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Flash } from "@/components/ui/Flash";
import { CLASE_CAMPO, Selector } from "@/components/ui/Selector";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { encabezadoPersonal } from "@/lib/importar-personal";
import { NOMBRE_ROL } from "@/lib/roles";
import { listarSalones } from "@/lib/server/gestion";
import { listarPersonal, ROLES_NO_DOCENTES, type RolPersonal } from "@/lib/server/personal";
import type { TenantContext } from "@/lib/server/tenant";
import { altaPersonalAction, altaProfesorAction, importarPersonalAction } from "../actions";

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

const ESTADO = {
  activa: { texto: "Activo", clase: "bg-llego-fondo text-llego", Icono: CheckCircle2 },
  invitada: { texto: "Invitación pendiente", clase: "bg-tarde-fondo text-tarde", Icono: Clock },
  inactiva: { texto: "Inactivo", clase: "bg-superficie-2 text-pizarra", Icono: UserRoundX },
} as const;

export function InsigniaEstado({ estado }: { estado: keyof typeof ESTADO }) {
  const { texto, clase, Icono } = ESTADO[estado];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-pildora px-2.5 py-1 text-xs font-semibold ${clase}`}>
      <Icono className="h-3.5 w-3.5" strokeWidth={2} aria-hidden /> {texto}
    </span>
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

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <h1 className="text-2xl font-bold">{titulo}</h1>
      <Flash ok={searchParams.ok} error={searchParams.error} />

      <Tarjeta>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
          <UserPlus className="h-5 w-5 text-acento" strokeWidth={2} aria-hidden /> {esProfesores ? "Registrar un profesor" : "Registrar a una persona del personal"}
        </h2>
        <p className="mb-3 text-sm text-pizarra">
          Su usuario es su correo y su contraseña inicial es su número de documento; deberá cambiarla al entrar. El correo de bienvenida no incluye el número.
        </p>
        <form action={esProfesores ? altaProfesorAction : altaPersonalAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {!esProfesores && (
            <Selector etiqueta="Rol" name="rol" defaultValue="administrativo">
              {ROLES_NO_DOCENTES.map((r) => <option key={r} value={r}>{NOMBRE_ROL[r]}</option>)}
            </Selector>
          )}
          <CamposPersona />
          <Boton type="submit" className="self-end justify-self-start">Registrar y enviar bienvenida</Boton>
        </form>
        <p className="mt-2 text-xs text-pizarra">
          {esProfesores ? "La tutoría y los cursos se asignan en «Grados y salones». " : ""}Si el correo ya tiene cuenta en Khipu, solo se agrega al colegio y conserva su contraseña.
        </p>
      </Tarjeta>

      <Tarjeta>
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold"><FileUp className="h-5 w-5 text-acento" strokeWidth={2} aria-hidden /> Importar desde un archivo CSV</h2>
        <p className="mb-3 text-sm text-pizarra">Columnas: <code>{encabezadoPersonal(ambito)}</code>. Obligatorias: nombres, apellidos, documento y correo{esProfesores ? "" : " y rol (administrativo o porteria)"}. Si alguna línea falla, no se registra ninguna.</p>
        <form action={importarPersonalAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="tipo" value={ambito} />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Archivo CSV</span>
            <input type="file" name="archivo" accept=".csv,text/csv" required className="text-sm" />
          </label>
          <Boton type="submit">Importar</Boton>
        </form>
      </Tarjeta>

      <form method="get" className="flex flex-wrap items-end gap-3" role="search">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Buscar</span>
          <span className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pizarra" aria-hidden />
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
        <Link href={base} className="py-2.5 text-sm font-semibold text-acento">Limpiar</Link>
      </form>

      <Tarjeta className="overflow-x-auto p-0">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <caption className="sr-only">{titulo} del colegio</caption>
          <thead className="border-b border-arena bg-superficie-2 text-xs uppercase text-pizarra">
            <tr>
              <th scope="col" className="px-4 py-3">Nombre</th>
              <th scope="col" className="px-4 py-3">Documento</th>
              <th scope="col" className="px-4 py-3">Correo</th>
              <th scope="col" className="px-4 py-3">Teléfono</th>
              {esProfesores ? (
                <>
                  <th scope="col" className="px-4 py-3">Cursos</th>
                  <th scope="col" className="px-4 py-3">Tutoría</th>
                </>
              ) : (
                <>
                  <th scope="col" className="px-4 py-3">Rol</th>
                  <th scope="col" className="px-4 py-3">Cargo</th>
                </>
              )}
              <th scope="col" className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {personas.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-pizarra">No hay personas con esos datos.</td></tr>
            )}
            {personas.map((p) => (
              <tr key={p.id} className="border-b border-arena last:border-0 align-top">
                <td className="px-4 py-3 font-semibold">
                  <Link href={`${base}/${p.id}`} className="text-acento hover:underline">{p.user.apellidos}, {p.user.nombres}</Link>
                </td>
                <td className="px-4 py-3">{p.user.numeroDocumento ? `${(p.user.tipoDocumento ?? "dni").toUpperCase()} ${p.user.numeroDocumento}` : "—"}</td>
                <td className="px-4 py-3">{p.user.email}</td>
                <td className="px-4 py-3">{p.user.telefono ?? "—"}</td>
                {esProfesores ? (
                  <>
                    <td className="px-4 py-3">{p.cursosDictados.length > 0 ? p.cursosDictados.map((c) => `${c.nombre} (${c.salon.nombre})`).join(", ") : "Sin cursos"}</td>
                    <td className="px-4 py-3">{p.salonesTutor.length > 0 ? p.salonesTutor.map((s) => s.nombre).join(", ") : "—"}</td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3">{NOMBRE_ROL[p.rol]}</td>
                    <td className="px-4 py-3">{p.cargo ?? "—"}</td>
                  </>
                )}
                <td className="px-4 py-3"><InsigniaEstado estado={p.estado} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Tarjeta>
      <p className="text-xs text-pizarra">El documento solo lo ve la dirección. Abrir una ficha o esta lista queda registrado en la auditoría.</p>
    </div>
  );
}
