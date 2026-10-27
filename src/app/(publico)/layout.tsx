import { Logo } from "@/components/marca/Logo";

export default function LayoutPublico({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="mb-8">
        <Logo />
      </div>
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-10 text-sm text-pizarra">Cada día de tu hijo, bien anudado.</p>
    </main>
  );
}
