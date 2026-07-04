"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import type { DashNavSection } from "./shell";
import { NavLink } from "./nav-link";
import { SignOutButton } from "./sign-out-button";

export function MobileDashNav({ sections }: { sections: DashNavSection[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-ink hover:bg-paper-deep"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div
          className="fixed inset-x-0 top-14 bottom-0 z-50 overflow-y-auto border-t border-line bg-paper p-4"
          onClick={() => setOpen(false)}
        >
          <div className="space-y-6">
            {sections.map((section, i) => (
              <div key={section.title ?? i}>
                {section.title && (
                  <p className="mb-2 px-3.5 font-display text-[10px] font-semibold tracking-[0.18em] text-stone uppercase">
                    {section.title}
                  </p>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <NavLink key={item.href} {...item} />
                  ))}
                </div>
              </div>
            ))}
            <div className="border-t border-line pt-4">
              <SignOutButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
