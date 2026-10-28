import {
  Blocks,
  CircleMinus,
  CirclePlus,
  Layers,
  Lock,
  Square,
} from "lucide-react";
import { ICONOS_NAV } from "@/components/shell/iconos";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { INFO_MODULO } from "@/lib/modulos";
import type { AdminContext } from "@/lib/server/plataforma";
import {
  modulosDeColegioParaPanel,
  type EstadoModuloColegio,
} from "@/lib/server/plataforma-planes";
import { CambiarModuloColegio } from "./CambiarModuloColegio";
import { cambiarModuloDeColegioAction } from "./modulos-actions";

const ESTADO: Record<
  EstadoModuloColegio,
  { Icono: typeof Layers; palabra: string; clase: string }
> = {
  plan: {
    Icono: Layers,
    palabra: "Incluido por el plan",
    clase: "bg-llego-fondo text-llego",
  },
  extra: {
    Icono: CirclePlus,
    palabra: "Extra",
    clase: "bg-accent text-accent-foreground",
  },
  quitado: {
    Icono: CircleMinus,
    palabra: "Quitado",
    clase: "bg-falta-fondo text-falta",
  },
  no_incluido: {
    Icono: Square,
    palabra: "No incluido",
    clase: "bg-superficie-2 text-muted-foreground",
  },
};

/** Sección «Módulos del colegio» de la ficha (specs/19): estado de cada módulo y ajustes con motivo. */
export async function ModulosColegio({
  admin,
  tenantId,
}: {
  admin: AdminContext;
  tenantId: string;
}) {
  const modulos = await modulosDeColegioParaPanel(admin, tenantId);
  return (
    <section aria-labelledby="modulos-colegio" className="flex flex-col gap-3">
      <div>
        <h2
          id="modulos-colegio"
          className="flex items-center gap-2 font-heading text-titulo-2"
        >
          <Blocks
            className="size-5 text-muted-foreground"
            strokeWidth={2}
            aria-hidden
          />{" "}
          Módulos del colegio
        </h2>
        <p className="text-cuerpo-sm text-muted-foreground">
          Lo que trae su plan, más los módulos extra o quitados solo para este
          colegio.
        </p>
      </div>
      <Tarjeta className="p-0 sm:p-0">
        <ul className="flex flex-col divide-y">
          {modulos.map((m) => {
            const info = INFO_MODULO[m.modulo];
            const Icono = ICONOS_NAV[info.icono];
            const e = ESTADO[m.estado];
            return (
              <li
                key={m.modulo}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5"
                data-testid={`modulo-colegio-${m.modulo}`}
              >
                <div className="flex min-w-48 flex-1 items-start gap-3">
                  <Icono
                    className="mt-0.5 size-5 shrink-0 text-primary"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="font-semibold">{info.nombre}</p>
                    {m.motivo && (
                      <p className="text-cuerpo-sm text-muted-foreground">
                        Motivo: {m.motivo}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-pildora px-2 py-0.5 text-etiqueta ${e.clase}`}
                  >
                    <e.Icono className="size-3.5" strokeWidth={2} aria-hidden />{" "}
                    {e.palabra}
                  </span>
                  <div className="flex gap-2">
                    {m.esencial ? (
                      <span className="inline-flex items-center gap-1 text-cuerpo-sm text-muted-foreground">
                        <Lock className="size-4" strokeWidth={2} aria-hidden />{" "}
                        Esencial
                      </span>
                    ) : (
                      <>
                        {m.estado === "plan" && (
                          <CambiarModuloColegio
                            tenantId={tenantId}
                            modulo={m.modulo}
                            nombreModulo={info.nombre}
                            accion="quitar"
                            ejecutar={cambiarModuloDeColegioAction}
                          />
                        )}
                        {m.estado === "no_incluido" && (
                          <CambiarModuloColegio
                            tenantId={tenantId}
                            modulo={m.modulo}
                            nombreModulo={info.nombre}
                            accion="agregar"
                            ejecutar={cambiarModuloDeColegioAction}
                          />
                        )}
                        {(m.estado === "extra" || m.estado === "quitado") && (
                          <CambiarModuloColegio
                            tenantId={tenantId}
                            modulo={m.modulo}
                            nombreModulo={info.nombre}
                            accion="restablecer"
                            ejecutar={cambiarModuloDeColegioAction}
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Tarjeta>
    </section>
  );
}
