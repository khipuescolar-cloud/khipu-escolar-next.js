import { CalendarX2, Lock, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { buttonVariants } from "@/components/ui/button";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fechaLarga } from "@/lib/fechas";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { colegiosParaSelector, configSoporte, datosPlataforma, feriadosDelAnio, horarioNuditoTexto } from "@/lib/server/plataforma-configuracion";
import { agregarFeriadoAction, guardarConfigSoporteAction, guardarHorarioNuditoAction, quitarFeriadoAction } from "./actions";
import { DialogoAgregarFeriado, FormularioHorarioNudito, FormularioSoporte } from "./FormulariosConfiguracion";

export const metadata: Metadata = { title: "Configuración" };

const nf = new Intl.NumberFormat("es-PE");

export default async function Configuracion({ searchParams }: PageProps<"/plataforma/configuracion">) {
  const admin = await requireAdminPlataforma();
  const sp = await searchParams;
  const anioActual = new Date().getFullYear();
  const pedido = Number(Array.isArray(sp.anio) ? sp.anio[0] : sp.anio);
  const anio = Number.isInteger(pedido) && pedido >= 2020 && pedido <= 2100 ? pedido : anioActual;
  const [feriados, colegios, horario, soporte] = await Promise.all([feriadosDelAnio(admin, anio), colegiosParaSelector(admin), horarioNuditoTexto(), configSoporte()]);
  const datos = datosPlataforma();

  return (
    <div className="flex flex-col gap-8">
      <EncabezadoPagina titulo="Configuración" descripcion="Ajustes que valen para toda la plataforma." />

      <section aria-labelledby="feriados" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="feriados" className="font-heading text-titulo-2">Feriados y días no laborables {anio}</h2>
            <p className="max-w-prose text-cuerpo-sm text-muted-foreground">
              Los feriados nacionales fijos ya están incluidos. Los días que agregues corren los plazos para justificar faltas.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/configuracion?anio=${anio - 1}`} className={buttonVariants({ variant: "outline", size: "sm" })}>← {anio - 1}</Link>
            <Link href={`/configuracion?anio=${anio + 1}`} className={buttonVariants({ variant: "outline", size: "sm" })}>{anio + 1} →</Link>
            <DialogoAgregarFeriado accion={agregarFeriadoAction} colegios={colegios} anio={anio} />
          </div>
        </div>
        <Tarjeta className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sobretitulo pl-4">Fecha</TableHead>
                <TableHead className="sobretitulo">Nombre</TableHead>
                <TableHead className="sobretitulo">Alcance</TableHead>
                <TableHead className="sobretitulo pr-4 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feriados.map((f) => (
                <TableRow key={f.id ?? f.fecha + f.nombre} data-testid={f.fijo ? "feriado-fijo" : "feriado-extra"}>
                  <TableCell className="pl-4 first-letter:uppercase">{fechaLarga(f.fecha)}</TableCell>
                  <TableCell className="font-medium">{f.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {f.fijo ? (
                      <span className="inline-flex items-center gap-1"><Lock className="size-3.5" strokeWidth={2} aria-hidden /> Nacional fijo (solo lectura)</span>
                    ) : f.ambito === "colegio" ? (
                      `Colegio: ${f.colegio ?? "—"}`
                    ) : f.ambito === "regional" ? (
                      `Región: ${f.region}`
                    ) : (
                      "Todo el país (decretado)"
                    )}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    {f.id && (
                      <BotonConfirmar
                        tamano="sm"
                        etiqueta={<><Trash2 strokeWidth={2} aria-hidden /> Quitar</>}
                        titulo={`¿Quitar «${f.nombre}»?`}
                        descripcion="Ese día volverá a contar como hábil en los plazos de justificación."
                        confirmar="Quitar"
                        peligro
                        accion={quitarFeriadoAction}
                        campos={{ id: f.id }}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Tarjeta>
        {feriados.every((f) => f.fijo) && (
          <p className="inline-flex items-center gap-2 text-cuerpo-sm text-muted-foreground">
            <CalendarX2 className="size-4" strokeWidth={2} aria-hidden /> Aún no hay días extra en {anio}.
          </p>
        )}
      </section>

      <section aria-labelledby="nudito" className="flex flex-col gap-3">
        <div>
          <h2 id="nudito" className="font-heading text-titulo-2">Horario de Nudito</h2>
          <p className="max-w-prose text-cuerpo-sm text-muted-foreground">Fuera de este horario (hora de Lima), Nudito aparece durmiendo en el panel de las familias.</p>
        </div>
        <Tarjeta>
          <FormularioHorarioNudito accion={guardarHorarioNuditoAction} inicio={horario.inicio} fin={horario.fin} />
        </Tarjeta>
      </section>

      <section aria-labelledby="soporte" className="flex flex-col gap-3">
        <div>
          <h2 id="soporte" className="font-heading text-titulo-2">Mesa de ayuda</h2>
          <p className="max-w-prose text-cuerpo-sm text-muted-foreground">Dónde le llegan al equipo los avisos de conversaciones nuevas y qué horario de atención ven los colegios.</p>
        </div>
        <Tarjeta>
          <FormularioSoporte accion={guardarConfigSoporteAction} correo={soporte.correoGuardado} correoEfectivo={soporte.correoEfectivo} horario={soporte.horario} />
        </Tarjeta>
      </section>

      <section aria-labelledby="datos" className="flex flex-col gap-3">
        <div>
          <h2 id="datos" className="font-heading text-titulo-2">Datos de la plataforma</h2>
          <p className="max-w-prose text-cuerpo-sm text-muted-foreground">Solo lectura. Se cambian en la configuración del servidor; aquí nunca se muestran claves.</p>
        </div>
        <Tarjeta className="p-0">
          <dl className="grid divide-y sm:grid-cols-2 sm:divide-y-0" data-testid="datos-plataforma">
            {[
              ["Dominio base", datos.dominioBase],
              ["Almacenamiento de archivos", datos.almacenamiento],
              ["Tope diario de correos", `${nf.format(datos.topeCorreo)} por 24 h`],
              ["Tope diario de WhatsApp", `${nf.format(datos.topeWhatsapp)} por 24 h · ${datos.whatsappActivo ? "Activo" : "Apagado"}`],
              ["Tope diario de SMS", `${nf.format(datos.topeSms)} por 24 h · ${datos.smsActivo ? "Activo" : "Apagado"}`],
            ].map(([t, v]) => (
              <div key={t} className="flex flex-col gap-0.5 p-4">
                <dt className="text-cuerpo-sm font-medium text-muted-foreground">{t}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </Tarjeta>
      </section>
    </div>
  );
}
