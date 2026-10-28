"use client";

import { Download, EllipsisVertical, Share, Smartphone, SquarePlus, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  CLAVE_TARJETA_CERRADA, detectarPlataforma, tarjetaVisible, type PlataformaInstalacion,
} from "@/lib/app-instalable";

// App instalable (specs/24-app-instalable.md).
// `beforeinstallprompt` llega una sola vez y muy pronto: se captura al cargar este módulo (está en el layout raíz
// a través del menú de cuenta y del inicio) y se guarda para cuando la persona toque «Instalar app».

type EventoInstalacion = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let avisoGuardado: EventoInstalacion | null = null;
let instaladaAhora = false;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((f) => f());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // Sin la mini barra automática: el botón lo muestra Khipu donde corresponde.
    avisoGuardado = e as EventoInstalacion;
    avisar();
  });
  window.addEventListener("appinstalled", () => {
    avisoGuardado = null;
    instaladaAhora = true;
    avisar();
  });
}

function suscribir(f: () => void) {
  oyentes.add(f);
  return () => oyentes.delete(f);
}

function leerPlataforma(): PlataformaInstalacion {
  const modoApp =
    instaladaAhora ||
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches;
  return detectarPlataforma({
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
    modoApp,
    standaloneIOS: (navigator as Navigator & { standalone?: boolean }).standalone === true,
    avisoNativo: avisoGuardado !== null,
  });
}

/** Plataforma de instalación (null en el servidor y en el primer render, para no desajustar la hidratación). */
export function useInstalacion() {
  const plataforma = useSyncExternalStore<PlataformaInstalacion | null>(suscribir, leerPlataforma, () => null);
  const instalar = useCallback(async () => {
    const aviso = avisoGuardado;
    if (!aviso) return false;
    await aviso.prompt();
    const { outcome } = await aviso.userChoice;
    avisoGuardado = null; // El evento solo sirve una vez.
    if (outcome === "accepted") instaladaAhora = true;
    avisar();
    return outcome === "accepted";
  }, []);
  return { plataforma, instalar };
}

/** Pasos para iPhone/iPad (Safari): ilustración simple con los íconos que la persona verá en pantalla. */
export function PasosIOS({ compacto = false }: { compacto?: boolean }) {
  const pasos = [
    { Icono: Share, texto: <>Toca <strong>Compartir</strong> en la barra de Safari.</> },
    { Icono: SquarePlus, texto: <>Elige <strong>Agregar a inicio</strong>.</> },
    { Icono: Smartphone, texto: <>Toca <strong>Agregar</strong>. Khipu queda junto a tus apps.</> },
  ];
  return (
    <ol className={`flex flex-col ${compacto ? "gap-2" : "gap-3"}`} data-testid="pasos-ios">
      {pasos.map(({ Icono, texto }, i) => (
        <li key={i} className="flex items-center gap-3 text-cuerpo-sm">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-superficie-2 text-primary">
            <Icono className="size-5" strokeWidth={2} aria-hidden />
          </span>
          <span>
            <span className="sr-only">Paso {i + 1}: </span>
            {texto}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Pasos con el menú del navegador (Android sin aviso nativo, o computador). */
export function PasosMenuNavegador({ plataforma }: { plataforma: "android" | "escritorio" }) {
  return (
    <ol className="flex flex-col gap-3" data-testid="pasos-navegador">
      <li className="flex items-center gap-3 text-cuerpo-sm">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-superficie-2 text-primary">
          {plataforma === "android" ? <EllipsisVertical className="size-5" strokeWidth={2} aria-hidden /> : <Download className="size-5" strokeWidth={2} aria-hidden />}
        </span>
        <span>
          {plataforma === "android"
            ? <>Abre el menú <strong>⋮</strong> del navegador.</>
            : <>Busca el ícono <strong>Instalar</strong> en la barra de direcciones o abre el menú del navegador.</>}
        </span>
      </li>
      <li className="flex items-center gap-3 text-cuerpo-sm">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-superficie-2 text-primary">
          <SquarePlus className="size-5" strokeWidth={2} aria-hidden />
        </span>
        <span>Elige <strong>Instalar app</strong> o <strong>Agregar a la pantalla principal</strong>.</span>
      </li>
    </ol>
  );
}

/**
 * Botón o pasos según la plataforma; si ya está instalada, lo dice.
 * `soloBoton`: no repite los pasos (la página /instalar ya los lista por plataforma).
 */
export function InstalarAqui({ soloBoton = false }: { soloBoton?: boolean }) {
  const { plataforma, instalar } = useInstalacion();
  if (plataforma === null) return null;
  if (plataforma === "instalada") {
    return (
      <p role="status" className="flex items-center gap-2 text-cuerpo-sm font-semibold text-primary" data-testid="app-instalada">
        <Smartphone className="size-4" strokeWidth={2} aria-hidden /> Ya estás usando la app de Khipu.
      </p>
    );
  }
  if (plataforma === "nativa") {
    return (
      <Button size="lg" className="w-full sm:w-auto" onClick={() => void instalar()} data-testid="boton-instalar">
        <Download strokeWidth={2} aria-hidden /> Instalar app
      </Button>
    );
  }
  if (soloBoton) return null;
  if (plataforma === "ios") return <PasosIOS />;
  return <PasosMenuNavegador plataforma={plataforma} />;
}

/** Ítem «Instalar app» del menú de cuenta: no aparece si ya se usa como app. Lleva a /instalar. */
export function ItemMenuInstalarApp() {
  const { plataforma } = useInstalacion();
  if (plataforma === null || plataforma === "instalada") return null;
  return (
    <DropdownMenuItem render={<Link href="/instalar" />} data-testid="menu-instalar-app">
      <Smartphone strokeWidth={2} aria-hidden /> Instalar app
    </DropdownMenuItem>
  );
}

function leerCerrada(): number | null {
  try {
    const v = window.localStorage.getItem(CLAVE_TARJETA_CERRADA);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

/**
 * Tarjeta discreta del inicio: «Instala Khipu en tu celular». Solo cuando el navegador ofrece instalar o en
 * iPhone/iPad; se puede cerrar y no vuelve a salir en 30 días.
 */
export function TarjetaInstalarApp() {
  const { plataforma, instalar } = useInstalacion();
  const [cerrada, setCerrada] = useState(true);
  useEffect(() => {
    // Lectura de localStorage tras montar (no existe en el servidor).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCerrada(!tarjetaVisible(leerCerrada(), Date.now()));
  }, []);

  if (cerrada || (plataforma !== "nativa" && plataforma !== "ios")) return null;

  const cerrar = () => {
    try {
      window.localStorage.setItem(CLAVE_TARJETA_CERRADA, String(Date.now()));
    } catch {
      // Sin almacenamiento la tarjeta solo se oculta en esta visita.
    }
    setCerrada(true);
  };

  return (
    <section aria-labelledby="titulo-instalar-app" className="relative flex flex-col gap-3 rounded-lg border border-arena bg-superficie p-4 pr-12 sm:flex-row sm:items-center sm:gap-4" data-testid="tarjeta-instalar-app">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-superficie-2 text-primary">
        <Smartphone className="size-5" strokeWidth={2} aria-hidden />
      </span>
      <div className="flex flex-1 flex-col gap-1">
        <h2 id="titulo-instalar-app" className="text-cuerpo font-semibold">Instala Khipu en tu {plataforma === "ios" ? "iPhone o iPad" : "equipo"}</h2>
        {plataforma === "ios" ? (
          <p className="text-cuerpo-sm text-muted-foreground">
            Toca <Share className="inline size-4 align-text-bottom" strokeWidth={2} aria-label="Compartir" /> y luego <strong>Agregar a inicio</strong>.{" "}
            <Link href="/instalar" className="enlace">Ver los pasos</Link>
          </p>
        ) : (
          <p className="text-cuerpo-sm text-muted-foreground">Ábrelo desde tu pantalla de inicio, como cualquier app.</p>
        )}
      </div>
      {plataforma === "nativa" && (
        <Button onClick={() => void instalar()} data-testid="boton-instalar">
          <Download strokeWidth={2} aria-hidden /> Instalar app
        </Button>
      )}
      <button
        type="button"
        onClick={cerrar}
        className="absolute top-2 right-2 inline-grid size-10 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Cerrar: no mostrar en 30 días"
      >
        <X className="size-4" strokeWidth={2} aria-hidden />
      </button>
    </section>
  );
}
