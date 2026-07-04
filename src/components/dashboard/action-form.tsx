"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ActionResult = { ok?: boolean; error?: string } | void;

/**
 * Form genérico para server actions con estado pending + feedback inline.
 * El submit va al server action; el resultado se muestra sin recargar.
 */
export function ActionForm({
  action,
  submitLabel = "Guardar cambios",
  children,
  className,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  submitLabel?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok?: boolean; error?: string } | undefined>(undefined);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setResult(undefined);
    startTransition(async () => {
      const res = await action(formData);
      setResult(res ?? { ok: true });
    });
  }

  return (
    <form onSubmit={onSubmit} className={className}>
      {children}
      <div className="mt-6 flex items-center gap-4">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
        {result?.ok && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-sage">
            <CheckCircle2 className="h-4 w-4" /> Guardado
          </span>
        )}
        {result?.error && (
          <span className="text-sm font-medium text-rust">{result.error}</span>
        )}
      </div>
    </form>
  );
}

/** Botón que ejecuta una server action simple (toggle/delete) con confirm opcional. */
export function ActionButton({
  action,
  label,
  variant = "ghost",
  confirmText,
}: {
  action: () => Promise<ActionResult>;
  label: string;
  variant?: "ghost" | "outline" | "danger";
  confirmText?: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant={variant}
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (confirmText && !window.confirm(confirmText)) return;
        startTransition(async () => {
          await action();
        });
      }}
    >
      {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {label}
    </Button>
  );
}
