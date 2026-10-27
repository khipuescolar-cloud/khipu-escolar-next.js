/** Logotipo: isotipo de cuerda + «khipu escolar». El punto de la i es un nudo amarillo. */
export function Logo({ compacto = false }: { compacto?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2" aria-label="Khipu Escolar">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/marca/isotipo.svg" alt="" width={32} height={32} className="rounded-md" />
      {!compacto && (
        <span className="font-titulo text-lg font-bold tracking-tight text-indigo dark:text-tinta">
          khıpu<span className="relative -top-2 -ml-[0.42em] mr-[0.1em] inline-block h-1.5 w-1.5 rounded-full bg-maiz" aria-hidden />
          <span className="ml-1 font-semibold text-pizarra">escolar</span>
        </span>
      )}
    </span>
  );
}
