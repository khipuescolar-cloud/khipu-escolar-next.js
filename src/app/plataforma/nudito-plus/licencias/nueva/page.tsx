import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { licenciasFamiliaresNudito } from "@/lib/planes";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Flash } from "@/components/ui/Flash";
import { Selector } from "@/components/ui/Selector";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { fechaLima, sumarDias } from "@/lib/fechas";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { alumnosDelColegio, colegiosPro } from "@/lib/server/plataforma-nudito-plus";
import { crearLicenciaManualAction } from "../../actions";
import { CampoMotivo } from "../../CampoMotivo";

export const metadata: Metadata = { title: "Licencia de cortesía o prueba" };

/** Licencia sin pago (cortesía o prueba): 1) colegio Khipu Pro, 2) alumno, fecha final y motivo. */
export default async function NuevaLicencia({ searchParams }: PageProps<"/plataforma/nudito-plus/licencias/nueva">) {
  const admin = await requireAdminPlataforma();
  if (!licenciasFamiliaresNudito()) notFound();
  const sp = await searchParams;
  const colegios = await colegiosPro(admin);
  const colegio = typeof sp.colegio === "string" ? colegios.find((c) => c.id === sp.colegio) : undefined;
  const alumnos = colegio ? await alumnosDelColegio(admin, colegio.id) : [];
  const hoy = fechaLima(new Date());

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Link href="/nudito-plus/licencias" className="enlace inline-flex w-fit items-center gap-1 text-cuerpo-sm">
        <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> Licencias
      </Link>
      <EncabezadoPagina titulo="Licencia de cortesía o prueba" descripcion="Sin pago. Solo para alumnos activos de colegios con Khipu Pro. El motivo queda en la auditoría." />
      <Flash ok={sp.ok} error={sp.error} />

      <Tarjeta>
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Selector etiqueta="1. Colegio" name="colegio" defaultValue={colegio?.id ?? ""} required>
              <option value="" disabled>Elige un colegio</option>
              {colegios.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Selector>
          </div>
          <Boton type="submit" variante="secundario">Ver alumnos <ArrowRight strokeWidth={2} aria-hidden /></Boton>
        </form>
      </Tarjeta>

      {colegio && (alumnos.length === 0 ? (
        <Alerta tipo="info">Este colegio no tiene alumnos activos.</Alerta>
      ) : (
        <Tarjeta>
          <form action={crearLicenciaManualAction} className="flex flex-col gap-4">
            <input type="hidden" name="tenantId" value={colegio.id} />
            <Selector etiqueta="2. Alumno" name="alumnoId" defaultValue="" required>
              <option value="" disabled>Elige un alumno</option>
              {alumnos.map((a) => <option key={a.id} value={a.id}>{a.salon.nombre} · {a.apellidos}, {a.nombres}</option>)}
            </Selector>
            <div className="grid gap-4 sm:grid-cols-2">
              <Selector etiqueta="Tipo" name="origen" defaultValue="prueba">
                <option value="prueba">Prueba</option>
                <option value="cortesia">Cortesía</option>
              </Selector>
              <Campo etiqueta="Hasta (incluido)" name="hasta" type="date" required min={hoy} max={sumarDias(hoy, 366)} defaultValue={sumarDias(hoy, 13)} />
            </div>
            <CampoMotivo id="motivo-nueva" ayuda="P. ej. «Prueba de 14 días para la familia piloto»." />
            <Boton type="submit" className="w-full sm:w-fit">Crear licencia</Boton>
          </form>
        </Tarjeta>
      ))}
    </div>
  );
}
