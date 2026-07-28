"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { mainNav } from "@/config/site";
import { ButtonLink } from "@/components/ui/button";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-ink hover:bg-paper-deep"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        // Fondo OPACO a propósito: el header ya aplica backdrop-filter, y un
        // backdrop-filter anidado no puede desenfocar lo que hay detrás, así
        // que cualquier transparencia deja transparentar el contenido (sobre
        // el hero oscuro el menú se volvía ilegible). z-50 y el scroll propio
        // lo mantienen visible y usable en pantallas cortas.
        <div className="absolute inset-x-0 top-full z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-line bg-paper shadow-(--shadow-lift)">
          <nav className="container-page flex flex-col gap-1 py-4">
            {mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 font-display text-sm font-semibold text-ink hover:bg-paper-deep"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-line px-4 pt-4 pb-2">
              <ButtonLink href="/apply" size="lg" onClick={() => setOpen(false)}>
                Aplicar como practitioner
              </ButtonLink>
              <ButtonLink href="/login" variant="outline" size="lg" onClick={() => setOpen(false)}>
                Entrar
              </ButtonLink>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
