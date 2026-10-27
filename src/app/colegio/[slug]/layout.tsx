import { LogOut } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/marca/Logo";
import { NuditoWidget } from "@/components/nudito/NuditoWidget";
import { planIncluye } from "@/lib/planes";
import { NOMBRE_ROL } from "@/lib/roles";
import { requireTenantContext } from "@/lib/server/tenant";
import { cambiarRolAction, salirAction } from "./actions";

export default async function LayoutColegio({ children, params }: LayoutProps<"/colegio/[slug]">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-arena bg-superficie">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link href="/inicio" aria-label="Ir al inicio">
            <Logo compacto />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-titulo font-semibold">{ctx.tenant.nombre}</p>
            <p className="truncate text-xs text-pizarra">
              {ctx.user.nombres} {ctx.user.apellidos} · {NOMBRE_ROL[ctx.rol]}
            </p>
          </div>
          {ctx.roles.length > 1 && (
            <form action={cambiarRolAction} className="flex items-center gap-2">
              <label htmlFor="rol" className="sr-only">Cambiar de rol</label>
              <select id="rol" name="rol" defaultValue={ctx.rol} className="rounded-md border border-arena bg-superficie px-2 py-1.5 text-sm">
                {ctx.roles.map((r) => (
                  <option key={r} value={r}>{NOMBRE_ROL[r]}</option>
                ))}
              </select>
              <button className="text-sm font-semibold text-acento">Cambiar</button>
            </form>
          )}
          <form action={salirAction}>
            <button className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-pizarra hover:bg-superficie-2">
              <LogOut className="h-4 w-4" aria-hidden /> Salir
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      {ctx.rol === "apoderado" && planIncluye(ctx.tenant.plan, "nudito") && <NuditoWidget slug={slug} />}
    </div>
  );
}
