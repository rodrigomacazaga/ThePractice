"use client";

import { useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Modal ligero sobre <dialog> nativo: focus trap, Escape y backdrop vienen
 * del navegador, sin estado ni portales. El contenido (incluidos server
 * components) se pasa como children a través del boundary de cliente.
 */
export function Modal({
  trigger,
  title,
  children,
}: {
  trigger: string;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => ref.current?.showModal()}>
        {trigger}
      </Button>
      <dialog
        ref={ref}
        aria-label={title}
        className="m-auto w-[calc(100vw-2rem)] max-w-xl rounded-2xl border border-line bg-surface p-0 shadow-2xl backdrop:bg-ink/50"
        onClick={(e) => {
          // Clic en el backdrop (el propio dialog) cierra; clics internos no.
          if (e.target === ref.current) ref.current?.close();
        }}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h3 className="font-display text-lg font-bold">{title}</h3>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => ref.current?.close()}
            className="rounded-lg p-1.5 text-stone hover:bg-paper hover:text-ink"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">{children}</div>
      </dialog>
    </>
  );
}
