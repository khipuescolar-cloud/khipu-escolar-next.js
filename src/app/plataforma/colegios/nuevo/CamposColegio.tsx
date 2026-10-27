"use client";

import { Globe, ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Campo } from "@/components/ui/Campo";
import { errorDeSlug, sugerirSlug } from "@/lib/slug-colegio";

/** Insignia con vista previa, nombre, eslogan y subdominio sugerido en vivo (specs/16). */
export function CamposColegio({ baseDomain }: { baseDomain: string }) {
  const [nombre, setNombre] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEditado, setSlugEditado] = useState(false);
  const [vista, setVista] = useState<string | null>(null);
  const [errorInsignia, setErrorInsignia] = useState<string | null>(null);

  useEffect(() => () => { if (vista) URL.revokeObjectURL(vista); }, [vista]);

  const slugMostrado = slugEditado ? slug : sugerirSlug(nombre);
  const errorSlug = slugMostrado ? errorDeSlug(slugMostrado) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border bg-card">
          {vista ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={vista} alt="Vista previa de la insignia" className="h-full w-full object-contain" />
          ) : (
            <ImageIcon className="size-8 text-muted-foreground" strokeWidth={2} aria-hidden />
          )}
        </div>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Insignia o escudo</span>
          <input
            type="file"
            name="insignia"
            accept="image/png,image/jpeg,image/webp"
            required
            className="text-sm file:mr-3 file:rounded-md file:border file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setErrorInsignia(f && f.size > 1024 * 1024 ? "La insignia pesa más de 1 MB." : null);
              setVista(f ? URL.createObjectURL(f) : null);
            }}
          />
          <span className="text-muted-foreground">PNG, JPG o WEBP, hasta 1 MB.</span>
          {errorInsignia && <span className="text-destructive">{errorInsignia}</span>}
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Nombre del colegio" name="nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="I.E.P. San Martín" />
        <Campo etiqueta="Eslogan (opcional)" name="eslogan" maxLength={140} placeholder="Educamos con valores" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Campo
          etiqueta="Dirección (subdominio)"
          name="slug"
          required
          value={slugMostrado}
          onChange={(e) => {
            setSlugEditado(true);
            setSlug(e.target.value.toLowerCase());
          }}
          error={errorSlug ?? undefined}
          ayuda="Minúsculas, números y guiones. Se sugiere a partir del nombre."
          className="font-mono"
        />
        <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground" aria-live="polite">
          <Globe className="size-4" strokeWidth={2} aria-hidden />
          <span>El colegio estará en</span>
          <strong className="font-mono text-foreground" data-testid="subdominio">{slugMostrado || "…"}.{baseDomain}</strong>
        </p>
      </div>
    </div>
  );
}
