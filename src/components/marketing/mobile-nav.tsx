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
        <div className="absolute inset-x-0 top-full border-b border-line bg-paper/95 shadow-(--shadow-lift) backdrop-blur-xl">
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
