"use client";

import { Printer } from "lucide-react";

/** Botón para exportar el documento a PDF desde el navegador (oculto al imprimir). */
export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong px-5 font-display text-sm font-semibold text-ink transition-colors hover:border-ink"
    >
      <Printer className="h-4 w-4" strokeWidth={1.75} />
      Imprimir / Guardar PDF
    </button>
  );
}
