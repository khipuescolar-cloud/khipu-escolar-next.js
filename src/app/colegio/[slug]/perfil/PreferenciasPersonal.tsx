"use client";

import { Bell, BellOff, Loader2, Save } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { guardarPreferenciasPersonalAction, guardarSuscripcionPushPersonalAction, quitarSuscripcionPushPersonalAction, type EstadoFormulario } from "./actions";

function claveABytes(base64: string): Uint8Array<ArrayBuffer> {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const crudo = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(crudo.length));
  for (let i = 0; i < crudo.length; i++) bytes[i] = crudo.charCodeAt(i);
  return bytes;
}

type EstadoPush = "cargando" | "no-soportado" | "bloqueado" | "activo" | "inactivo";

/** Preferencias de aviso del personal (correo / push) y activación de notificaciones en este dispositivo. */
export function PreferenciasPersonal({ slug, correo, push, vapidPublica, descripcion }: { slug: string; correo: boolean; push: boolean; vapidPublica: string; descripcion: string }) {
  const [estado, accion, guardando] = useActionState<EstadoFormulario, FormData>(guardarPreferenciasPersonalAction.bind(null, slug), {});
  const [estadoPush, setEstadoPush] = useState<EstadoPush>("cargando");
  const [mensajePush, setMensajePush] = useState<string | null>(null);

  useEffect(() => {
    if (estado.ok) toast.success("Preferencias guardadas");
  }, [estado]);

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
      const r = await guardarSuscripcionPushPersonalAction(slug, suscripcion.toJSON());
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
      await quitarSuscripcionPushPersonalAction(slug, suscripcion.endpoint);
      await suscripcion.unsubscribe();
    }
    setEstadoPush("inactivo");
  }

  const fila = "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm transition-colors hover:bg-accent/40 has-[:checked]:border-primary/40";
  const casilla = "size-5 shrink-0 accent-primary";
  return (
    <section id="avisos" aria-labelledby="titulo-avisos-personal">
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <h2 id="titulo-avisos-personal" className="text-xl font-semibold">Tus avisos</h2>
          <p className="text-sm text-muted-foreground">{descripcion}</p>
        </div>
        <form action={accion} className="flex flex-col gap-3">
          <label className={fila}>
            <input type="checkbox" name="correo" defaultChecked={correo} className={casilla} /> Recibir avisos por correo
          </label>
          <label className={fila}>
            <input type="checkbox" name="push" defaultChecked={push} className={casilla} /> Recibir notificaciones en el celular o la computadora
          </label>
          <div>
            <Boton type="submit" variante="secundario" disabled={guardando}>
              {guardando ? <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden /> : <Save className="size-4" strokeWidth={2} aria-hidden />} Guardar
            </Boton>
          </div>
          {estado.ok && <Alerta tipo="exito">Guardamos tus preferencias.</Alerta>}
        </form>

        <Separator />

        <div className="flex flex-col gap-2">
          {estadoPush === "activo" && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-llego">
                <Bell className="size-4" strokeWidth={2} aria-hidden /> Notificaciones activas en este dispositivo
              </span>
              <Boton type="button" variante="fantasma" tamano="sm" onClick={desactivar}>
                Desactivar
              </Boton>
            </div>
          )}
          {estadoPush === "inactivo" && (
            <div>
              <Boton type="button" onClick={activar}>
                <Bell className="size-4" strokeWidth={2} aria-hidden /> Activar notificaciones en este dispositivo
              </Boton>
            </div>
          )}
          {estadoPush === "bloqueado" && (
            <p className="inline-flex items-start gap-1.5 text-sm text-muted-foreground">
              <BellOff className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden /> Las notificaciones están bloqueadas en este navegador. Puedes permitirlas en su configuración.
            </p>
          )}
          {estadoPush === "no-soportado" && (
            <p className="inline-flex items-start gap-1.5 text-sm text-muted-foreground">
              <BellOff className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden /> Este navegador no permite notificaciones. Puedes seguir recibiendo los correos.
            </p>
          )}
          {mensajePush && <Alerta tipo="error">{mensajePush}</Alerta>}
        </div>
      </CardContent>
    </Card>
    </section>
  );
}
