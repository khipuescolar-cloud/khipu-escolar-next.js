import { NavGestion } from "./_componentes/NavGestion";

export default function LayoutGestion({ children }: LayoutProps<"/colegio/[slug]/gestion">) {
  return (
    <div className="flex flex-col gap-6">
      <NavGestion />
      {children}
    </div>
  );
}
