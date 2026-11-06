import type { Metadata } from "next";
import { requireConsentimiento } from "@/lib/server/consentimiento";
import { listarContenido, opcionesDeCarpeta, salonesParaDocumentos } from "@/lib/server/documentos";
import { contextoPermisosDocumento, nivelCarpeta, puedeEditarNivel } from "@/lib/server/documentos-permisos";
import { personasParaCompartir } from "@/lib/server/documentos-drive";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { ROLES_BIBLIOTECA, esOrdenDocumento } from "@/lib/documentos";
import { ExploradorDocumentos } from "./ExploradorDocumentos";

export const metadata: Metadata = { title: "Documentos" };
const uno = (v: string | string[] | undefined) => Array.isArray(v) ? v[0] : v;
const UUID = /^[0-9a-f-]{36}$/i;
const VISTAS = ["unidad", "compartido", "biblioteca", "recientes", "destacados", "papelera"] as const;

export default async function DocumentosPage({ params, searchParams }: PageProps<"/colegio/[slug]/documentos">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, ROLES_BIBLIOTECA);
  requireFeature(ctx, "documentos");
  await requireConsentimiento(ctx);
  const vistaParam = uno(sp.vista);
  const vista = VISTAS.find((v) => v === vistaParam) ?? "biblioteca";
  const carpetaParam = uno(sp.carpeta);
  const carpetaId = carpetaParam && UUID.test(carpetaParam) ? carpetaParam : null;
  const q = (uno(sp.q) ?? "").slice(0, 100);
  const ordenParam = uno(sp.orden);
  const orden = esOrdenDocumento(ordenParam) ? ordenParam : "recientes";
  const [contenido, opciones, salones, destinos, permisos] = await Promise.all([
    listarContenido(ctx, { carpetaId, q, orden, vista }), opcionesDeCarpeta(ctx), salonesParaDocumentos(ctx), personasParaCompartir(ctx), contextoPermisosDocumento(ctx),
  ]);
  const puedeCrear = (ctx.rol === "direccion" || ctx.rol === "administrativo" || ctx.rol === "profesor") && vista !== "papelera" && vista !== "recientes" && vista !== "destacados" && (carpetaId ? puedeEditarNivel(nivelCarpeta(permisos, carpetaId)) : vista === "unidad" || (vista === "biblioteca" && ctx.rol !== "profesor"));
  const archivoParam = uno(sp.archivo);
  const archivoInicial = archivoParam && UUID.test(archivoParam) ? archivoParam : null;
  return <ExploradorDocumentos archivoInicial={archivoInicial} contenido={contenido} vista={vista} carpetaId={carpetaId} q={q} orden={orden} opciones={opciones} salones={salones} personas={destinos.personas} esProfesor={ctx.rol === "profesor"} puedeCrear={puedeCrear} ok={uno(sp.ok)} error={uno(sp.error)} />;
}
