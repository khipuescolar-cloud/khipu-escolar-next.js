"use client";

import { Loader2, School, UserRound } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { detectarColegio, loginAction, type EstadoLogin } from "./actions";

export function LoginForm({ emailInicial }: { emailInicial?: string }) {
  const [estado, accion, enviando] = useActionState<EstadoLogin, FormData>(loginAction, { email: emailInicial });
  const [email, setEmail] = useState(estado.email ?? "");
  const [detectado, setDetectado] = useState<Awaited<ReturnType<typeof detectarColegio>>>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      detectarColegio(email).then(setDetectado).catch(() => setDetectado(null));
    }, 350);
    return () => clearTimeout(t);
  }, [email]);

  return (
    <form action={accion} className="flex flex-col gap-4">
      <Campo
        etiqueta="Correo"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu.correo@colegio.edu.pe"
      />
      {detectado && "nombre" in detectado && (
        <p className="flex items-center gap-2 text-cuerpo-sm text-foreground" aria-live="polite">
          <School className="size-4" strokeWidth={2} aria-hidden /> Entrarás a <strong>{detectado.nombre}</strong>
        </p>
      )}
      {detectado && "personal" in detectado && (
        <p className="flex items-center gap-2 text-cuerpo-sm text-muted-foreground" aria-live="polite">
          <UserRound className="size-4" strokeWidth={2} aria-hidden /> Cuenta de familia: verás a todos tus hijos.
        </p>
      )}
      <Campo etiqueta="Contraseña" name="password" type="password" autoComplete="current-password" required />
      {estado.error && <Alerta tipo="error">{estado.error}</Alerta>}
      <Boton type="submit" tamano="lg" disabled={enviando}>
        {enviando && <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden />}
        {enviando ? "Entrando…" : "Entrar"}
      </Boton>
      <Link href="/recuperar" className="enlace inline-flex min-h-10 items-center justify-center text-cuerpo-sm">
        ¿Olvidaste tu contraseña?
      </Link>
    </form>
  );
}
