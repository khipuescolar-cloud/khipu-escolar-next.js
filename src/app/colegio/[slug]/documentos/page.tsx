import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { NavegacionDocumentos } from "./NavegacionDocumentos";
import { PanelMateriales } from "./materiales/PanelMateriales";
import { PanelSolicitudes } from "./solicitudes/PanelSolicitudes";
import { listarMateriales, opcionesParaCompartir } from "@/lib/server/materiales";
import { limitesDe, resumenAlmacenamiento } from "@/lib/server/almacenamiento";
import { listarSolicitudes } from "@/lib/server/solicitudes/index";
import { requireConsentimiento } from "@/lib/server/consentimiento";
import { listarContenido, opcionesDeCarpeta, salonesParaDocumentos, usoBorradores } from "@/lib/server/documentos";
import { contextoPermisosDocumento, nivelCarpeta, puedeEditarNivel } from "@/lib/server/documentos-permisos";
import { personasParaCompartir } from "@/lib/server/documentos-drive";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { ROLES_BIBLIOTECA, esOrdenDocumento, puedeEntrarSeccion, seccionDocumento } from "@/lib/documentos";
import { ExploradorDocumentos } from "./ExploradorDocumentos";

export const metadata: Metadata = { title: "Documentos" };
const uno = (v: string | string[] | undefined) => Array.isArray(v) ? v[0] : v;
const UUID = /^[0-9a-f-]{36}$/i;

export default async function DocumentosPage({ params, searchParams }: PageProps<"/colegio/[slug]/documentos">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, ROLES_BIBLIOTECA);
  requireFeature(ctx, "documentos");
  await requireConsentimiento(ctx);
  const seccion = seccionDocumento(uno(sp.seccion) ?? uno(sp.vista)) ?? "biblioteca";
  if (!puedeEntrarSeccion(ctx.rol, seccion)) forbidden();
  if (seccion === "materiales" || seccion === "gestion") {
    const contenido = seccion === "materiales" ? <PanelMateriales arbol={await listarMateriales(ctx)} slug={slug} opciones={ctx.rol === "profesor" ? await opcionesParaCompartir(ctx) : []} /> : <PanelSolicitudes solicitudes={await listarSolicitudes(ctx)} ok={uno(sp.ok)} error={uno(sp.error)} direccion={ctx.rol === "direccion"} docentes={ctx.rol === "direccion" ? (await ctx.db.membership.findMany({ where: { rol: "profesor", estado: "activa" }, include: { user: true } })).map(m => ({ id: m.id, nombre: `${m.user.nombres} ${m.user.apellidos}` })) : []} />;
    return <div className="min-w-0"><EncabezadoPagina titulo="Documentos" seccion="comunicacion" descripcion="Materiales, gestión académica y biblioteca del colegio." /><div className="grid min-w-0 gap-4 md:grid-cols-[13.5rem_minmax(0,1fr)] md:gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]"><aside className="min-w-0 overflow-hidden"><NavegacionDocumentos rol={ctx.rol} activa={seccion} /></aside><section className="min-w-0"><h2 className="mb-5 text-xl font-semibold">{seccion === "materiales" ? "Materiales de clase" : "Gestión académica"}</h2>{contenido}</section></div></div>;
  }
  const vista = seccion === "borradores" ? "unidad" : seccion;
  const carpetaParam = uno(sp.carpeta);
  const carpetaId = carpetaParam && UUID.test(carpetaParam) ? carpetaParam : null;
  const q = (uno(sp.q) ?? "").slice(0, 100);
  const ordenParam = uno(sp.orden);
  const orden = esOrdenDocumento(ordenParam) ? ordenParam : "recientes";
  const categoriaParam = uno(sp.categoria);
  const categorias = ["reglamento", "convivencia", "protocolo", "calendario", "formato", "oficial", "otro"] as const;
  const categoria = categorias.find((c) => c === categoriaParam);
  const archivados = uno(sp.archivados) === "1";
  const [contenido, opciones, salones, destinos, permisos] = await Promise.all([
    listarContenido(ctx, { carpetaId, q, orden, vista, categoria, archivados }), opcionesDeCarpeta(ctx), salonesParaDocumentos(ctx), personasParaCompartir(ctx), contextoPermisosDocumento(ctx),
  ]);
  const usadoBorradores = seccion === "borradores" ? Number(await usoBorradores(ctx)) : null;
  const limiteBorradores = seccion === "borradores" ? Number((await limitesDe(ctx)).cuotaBorradorBytes) : null;
  const almacenamientoColegio = ctx.rol === "direccion" ? await resumenAlmacenamiento(ctx) : null;
  const puedeCrear = ctx.rol === "direccion" || ctx.rol === "administrativo" || ctx.rol === "profesor";
  const carpetaActual = carpetaId ? permisos.mapa.get(carpetaId) : null;
  const carpetaDeCreacion = carpetaActual?.ambito === "unidad" && puedeEditarNivel(nivelCarpeta(permisos, carpetaActual.id)) ? carpetaActual.id : null;
  const carpetaCompartida = !!carpetaDeCreacion && carpetaActual?.creadoPorId !== ctx.membership.id;
  const archivoParam = uno(sp.archivo);
  const archivoInicial = archivoParam && UUID.test(archivoParam) ? archivoParam : null;
  return <ExploradorDocumentos archivoInicial={archivoInicial} nuevos={uno(sp.nuevo) ?? ""} contenido={contenido} vista={vista} carpetaId={carpetaId} carpetaDeCreacion={carpetaDeCreacion} carpetaCompartida={carpetaCompartida} q={q} orden={orden} opciones={opciones} salones={salones} personas={destinos.personas} esProfesor={ctx.rol === "profesor"} rol={ctx.rol} puedeCrear={puedeCrear} categoria={categoria} archivados={archivados} usadoBorradores={usadoBorradores} limiteBorradores={limiteBorradores} almacenamientoColegio={almacenamientoColegio ? { usado: Number(almacenamientoColegio.usadoBytes), limite: Number(almacenamientoColegio.limiteBytes ?? 0) } : null} ok={uno(sp.ok)} error={uno(sp.error)} />;
}
