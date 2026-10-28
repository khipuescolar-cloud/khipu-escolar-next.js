"use client";

import { LogIn, Menu, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/** Menú de la landing en celular y tableta (< lg): anclas, «Ingresar» y «Solicitar demo». */
export function MenuMovil({ anclas }: { anclas: { href: string; texto: string }[] }) {
  const [abierto, setAbierto] = useState(false);
  const cerrar = () => setAbierto(false);
  return (
    <Sheet open={abierto} onOpenChange={setAbierto}>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="size-11 lg:hidden" aria-label="Abrir menú" />}>
        <Menu className="size-6" strokeWidth={2} aria-hidden />
      </SheetTrigger>
      <SheetContent side="right" className="w-[86vw] max-w-sm gap-0 bg-background p-0">
        <SheetHeader className="border-b border-arena px-5 py-4">
          <SheetTitle className="font-heading text-titulo-2">Menú</SheetTitle>
          <SheetDescription className="sr-only">Secciones de la página de Khipu Escolar</SheetDescription>
        </SheetHeader>
        <nav aria-label="Secciones" className="flex flex-col px-3 py-3">
          {anclas.map((a) => (
            <a key={a.href} href={a.href} onClick={cerrar} className="flex min-h-12 items-center rounded-md px-3 text-cuerpo font-medium text-foreground hover:bg-muted">
              {a.texto}
            </a>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3 border-t border-arena p-5">
          <Link href="/#demo" onClick={cerrar} className={cn(buttonVariants({ size: "lg" }), "h-12 w-full")}>
            <Send strokeWidth={2} aria-hidden /> Solicitar demo
          </Link>
          <Link href="/login" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 w-full")}>
            <LogIn strokeWidth={2} aria-hidden /> Ingresar
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
