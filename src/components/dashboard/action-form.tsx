"use client";

import { useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useModalClose } from "@/components/ui/modal";

type ActionResult = { ok?: boolean; error?: string; message?: string } | void;

/**
 * Form genérico para server actions con estado pending + feedback inline.
 * El resultado se anuncia a lectores de pantalla (WCAG 4.1.3): éxito en una
 * región `role="status"` (polite) y error en `role="alert"` (assertive). Si el
 * form vive dentro de un Modal, se cierra solo tras guardar y devuelve el foco.
 */
export function ActionForm({
  action,
  submitLabel = "Guardar cambios",
  children,
  className,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  submitLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok?: boolean; error?: string; message?: string } | undefined>(
    undefined
  );
  const statusRef = useRef<HTMLDivElement>(null);
  const closeModal = useModalClose();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setResult(undefined);
    startTransition(async () => {
      const res = (await action(formData)) ?? { ok: true };
      setResult(res);
      // Asegura que el feedback sea visible aunque el form tenga scroll.
      statusRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      // Dentro de un modal, cerrar tras un momento para que se vea "Guardado".
      if (res.ok && closeModal) setTimeout(() => closeModal(), 1000);
    });
  }

  return (
    <form onSubmit={onSubmit} className={className}>
      {children}
      <div ref={statusRef} className="mt-6 flex items-center gap-4">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
        <div role="status" aria-live="polite" aria-atomic="true">
          {result?.ok && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-sage">
              <CheckCircle2 className="h-4 w-4" /> {result.message ?? "Guardado"}
            </span>
          )}
        </div>
        <div role="alert" aria-live="assertive" aria-atomic="true">
          {result?.error && (
            <span className="text-sm font-medium text-rust">{result.error}</span>
          )}
        </div>
      </div>
    </form>
  );
}

/** Botón que ejecuta una server action simple (toggle/delete) con confirm
 *  opcional. Si la acción devuelve `message`, se muestra brevemente y se
 *  anuncia vía `role="status"`. */
export function ActionButton({
  action,
  label,
  variant = "ghost",
  confirmText,
}: {
  action: () => Promise<ActionResult>;
  label: ReactNode;
  variant?: "ghost" | "outline" | "danger";
  confirmText?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | undefined>(undefined);

  return (
    <span className="inline-flex items-center gap-2">
      <Button
        variant={variant}
        size="sm"
        disabled={isPending}
        onClick={() => {
          if (confirmText && !window.confirm(confirmText)) return;
          setMessage(undefined);
          startTransition(async () => {
            const res = await action();
            if (res && res.message) setMessage(res.message);
          });
        }}
      >
        {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {label}
      </Button>
      <span role="status" aria-live="polite" className="text-xs text-stone-deep">
        {message}
      </span>
    </span>
  );
}
