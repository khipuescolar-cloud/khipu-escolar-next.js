"use client";

import { Bell, BellOff, Save } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { guardarPreferenciasAction, guardarSuscripcionPushAction, quitarSuscripcionPushAction, type EstadoFormulario } from "./actions";

function claveABytes(base64: string): Uint8Array<ArrayBuffer> {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const crudo = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(crudo.length));
  for (let i = 0; i < crudo.length; i++) bytes[i] = crudo.charCodeAt(i);
  return bytes;
}

type EstadoPush = "cargando" | "no-soportado" | "bloqueado" | "activo" | "inactivo";

/** Preferencias de aviso (correo / push) y activación de notificaciones en este dispositivo. */
export function PreferenciasAvisos({ slug, correo, push, vapidPublica }: { slug: string; correo: boolean; push: boolean; vapidPublica: string }) {
  const [estado, accion, guardando] = useActionState<EstadoFormulario, FormData>(guardarPreferenciasAction.bind(null, slug), {});
  const [estadoPush, setEstadoPush] = useState<EstadoPush>("cargando");
  const [mensajePush, setMensajePush] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      let siguiente: EstadoPush;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !vapidPublica) siguiente = "no-soportado";
      else if (Notification.permission === "denied") siguiente = "bloqueado";
      else {
        const registro = await navigator.serviceWorker.getRegistration("/sw.js");
        siguiente = (await registro?.pushManager.getSubscription()) ? "activo" : "inactivo";
      }
      if (!cancelado) setEstadoPush(siguiente);
    })().catch(() => !cancelado && setEstadoPush("no-soportado"));
    return () => {
      cancelado = true;
    };
  }, [vapidPublica]);

  async function activar() {
    setMensajePush(null);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setEstadoPush("bloqueado");
        return;
      }
      const registro = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const suscripcion = await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveABytes(vapidPublica) });
      const r = await guardarSuscripcionPushAction(slug, suscripcion.toJSON());
      if (r.error) setMensajePush(r.error);
      else setEstadoPush("activo");
    } catch {
      setMensajePush("No se pudo activar los avisos en este dispositivo.");
    }
  }

  async function desactivar() {
    const registro = await navigator.serviceWorker.getRegistration("/sw.js");
    const suscripcion = await registro?.pushManager.getSubscription();
    if (suscripcion) {
      await quitarSuscripcionPushAction(slug, suscripcion.endpoint);
      await suscripcion.unsubscribe();
    }
    setEstadoPush("inactivo");
  }

  return (
    <section id="avisos" className="flex flex-col gap-3 rounded-lg border border-arena bg-superficie p-5" aria-labelledby="titulo-avisos">
      <h2 id="titulo-avisos" className="font-titulo text-lg font-semibold">Tus avisos</h2>
      <form action={accion} className="flex flex-col gap-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="correo" defaultChecked={correo} className="h-5 w-5" /> Recibir avisos por correo
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="push" defaultChecked={push} className="h-5 w-5" /> Recibir notificaciones en el celular o la computadora
        </label>
        <div>
          <Boton type="submit" variante="secundario" disabled={guardando}>
            <Save className="h-4 w-4" strokeWidth={2} aria-hidden /> Guardar
          </Boton>
        </div>
        {estado.ok && <Alerta tipo="exito">Guardamos tus preferencias.</Alerta>}
      </form>

      <div className="flex flex-col gap-2 border-t border-arena pt-3">
        {estadoPush === "activo" && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-llego">
              <Bell className="h-4 w-4" strokeWidth={2} aria-hidden /> Notificaciones activas en este dispositivo
            </span>
            <button type="button" onClick={desactivar} className="text-sm font-semibold text-acento hover:underline">
              Desactivar
            </button>
          </div>
        )}
        {estadoPush === "inactivo" && (
          <div>
            <Boton type="button" onClick={activar}>
              <Bell className="h-4 w-4" strokeWidth={2} aria-hidden /> Activar notificaciones en este dispositivo
            </Boton>
          </div>
        )}
        {estadoPush === "bloqueado" && (
          <p className="inline-flex items-center gap-1.5 text-sm text-pizarra">
            <BellOff className="h-4 w-4" strokeWidth={2} aria-hidden /> Las notificaciones están bloqueadas en este navegador. Puedes permitirlas en su configuración.
          </p>
        )}
        {estadoPush === "no-soportado" && (
          <p className="inline-flex items-center gap-1.5 text-sm text-pizarra">
            <BellOff className="h-4 w-4" strokeWidth={2} aria-hidden /> Este navegador no permite notificaciones. Seguirás recibiendo los correos.
          </p>
        )}
        {mensajePush && <Alerta tipo="error">{mensajePush}</Alerta>}
      </div>
    </section>
  );
}
