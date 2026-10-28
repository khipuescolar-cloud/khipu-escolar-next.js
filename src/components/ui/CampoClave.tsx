"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

/** Campo de contraseña con etiqueta visible y botón para ver lo escrito (pauta UX: visibilidad de la contraseña).
 *  El botón no dice «contraseña» para no confundirse con la etiqueta del campo (lectores de pantalla y tests). */
export function CampoClave({
  etiqueta,
  ayuda,
  error,
  id,
  className = "",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { etiqueta: string; ayuda?: string; error?: string }) {
  const [visible, setVisible] = useState(false);
  const campoId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5 text-cuerpo-sm">
      <label htmlFor={campoId} className="font-medium text-foreground">
        {etiqueta}
      </label>
      <div className="relative">
        <Input
          id={campoId}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          className={cn("h-11 pr-12", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? "Ocultar lo escrito" : "Mostrar lo escrito"}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground"
        >
          {visible ? <EyeOff className="size-5" strokeWidth={2} aria-hidden /> : <Eye className="size-5" strokeWidth={2} aria-hidden />}
        </button>
      </div>
      {ayuda && !error && <span className="text-muted-foreground">{ayuda}</span>}
      {error && <span className="text-destructive">{error}</span>}
    </div>
  );
}
