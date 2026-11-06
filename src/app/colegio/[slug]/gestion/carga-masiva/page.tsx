import { Download, FileSpreadsheet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { buttonVariants } from "@/components/ui/button";
import { plantillaCarga, type TipoCarga } from "@/lib/carga-masiva/plantillas";
import { exigirAlumnosFamilias } from "@/lib/server/gestion";
import { requireTenantContext } from "@/lib/server/tenant";
import { cn } from "@/lib/utils";
import { CargaMasiva } from "./CargaMasiva";

export const metadata: Metadata = { title: "Carga masiva" };
/** Cargar ~2 000 familias crea cientos de cuentas: las acciones de esta página pueden tardar (specs/36). */
export const maxDuration = 300;

export default async function CargaMasivaPage({ params, searchParams }: PageProps<"/colegio/[slug]/gestion/carga-masiva">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, ["direccion", "administrativo"]);
  exigirAlumnosFamilias(ctx);
  const esDireccion = ctx.rol === "direccion";
  const tipos: TipoCarga[] = esDireccion ? ["salones", "familias"] : ["familias"];
  const tipo: TipoCarga = sp.tipo === "salones" && esDireccion ? "salones" : sp.tipo === "familias" || !esDireccion ? "familias" : "salones";
  const anio = Number(new Intl.DateTimeFormat("en-CA", { timeZone: ctx.tenant.zonaHoraria, year: "numeric" }).format(new Date()));
  const plantilla = plantillaCarga(tipo, anio);

  const paso = "relative flex flex-col gap-4 pb-10 pl-12 last:pb-0 before:absolute before:top-9 before:bottom-1 before:left-[15px] before:w-px before:bg-borde-sutil last:before:hidden";
  const numero = "absolute top-0 left-0 flex size-8 items-center justify-center rounded-full bg-sec-suave font-heading text-sm font-semibold text-sec-tinta tabular-nums";

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        seccion="colegio"
        titulo="Carga masiva"
        descripcion={esDireccion ? "Carga de una vez los salones con sus cursos y las familias del colegio desde un CSV o un Excel." : "Carga de una vez a las familias del colegio desde un CSV o un Excel."}
      />
      {tipos.length > 1 && (
        <nav aria-label="Qué cargar" className="inline-flex w-fit gap-1 rounded-[10px] bg-superficie-2 p-1">
          {tipos.map((t) => (
            <Link key={t} href={`/gestion/carga-masiva?tipo=${t}`} aria-current={t === tipo ? "page" : undefined}
              className={cn(
                "inline-flex min-h-10 items-center rounded-md px-4 text-sm font-medium transition-colors duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                t === tipo ? "bg-card font-semibold text-sec-tinta shadow-xs" : "text-muted-foreground",
              )}>
              {t === "salones" ? "Salones y cursos" : "Familias"}
            </Link>
          ))}
        </nav>
      )}

      <ol className="max-w-3xl">
        <li className={paso}>
          <span aria-hidden className={numero}>1</span>
          <div className="flex flex-col gap-1">
            <h2 className="font-heading text-[18px] leading-8 font-semibold">Descarga la plantilla</h2>
            <p className="text-cuerpo-sm text-pretty text-muted-foreground">
              {tipo === "salones"
                ? "Antes, registra a los profesores (Gestión → Profesores): el tutor y el profesor de cada curso se buscan por su DNI o correo."
                : "Antes, importa a los alumnos (Gestión → Alumnos): cada familia se enlaza con su hijo por el código o el DNI del alumno."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`/api/carga-masiva/plantilla?tipo=${tipo}&formato=xlsx`} className={buttonVariants({ variant: "outline" })} download>
              <FileSpreadsheet strokeWidth={2} aria-hidden /> Plantilla Excel
            </a>
            <a href={`/api/carga-masiva/plantilla?tipo=${tipo}&formato=csv`} className={buttonVariants({ variant: "outline" })} download>
              <Download strokeWidth={2} aria-hidden /> Plantilla CSV
            </a>
          </div>
          <details className="group text-sm">
            <summary className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              Cómo llenarla
            </summary>
            <p className="mt-2">Columnas: <code>{plantilla.encabezados.join(", ")}</code></p>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
              {plantilla.instrucciones.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </details>
        </li>

        <li className={paso}>
          <span aria-hidden className={numero}>2</span>
          <div className="flex flex-col gap-1">
            <h2 className="font-heading text-[18px] leading-8 font-semibold">Sube el archivo, revisa y confirma</h2>
            <p className="text-cuerpo-sm text-pretty text-muted-foreground">Nada se guarda hasta que confirmes. Las filas con errores se omiten; corrige y vuelve a subir el archivo: lo ya cargado no se duplica.</p>
          </div>
          <CargaMasiva key={tipo} tipo={tipo} />
        </li>
      </ol>
    </div>
  );
}
