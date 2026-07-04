"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

/** Inicia un checkout de membresía o paquete y redirige al proveedor. */
export function CheckoutButton({
  kind,
  code,
  founder,
  children,
  ...props
}: {
  kind: "MEMBERSHIP" | "PACKAGE";
  code: string;
  founder?: boolean;
} & ButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, code, founder }),
      });
      const data = await res.json();
      if (!res.ok || !data.redirectUrl) {
        setError(data.error ?? "No se pudo iniciar el pago.");
        setLoading(false);
        return;
      }
      window.location.href = data.redirectUrl;
    } catch {
      setError("Error de red.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <Button onClick={start} disabled={loading} {...props}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </Button>
      {error && <p className="mt-2 text-xs font-medium text-rust">{error}</p>}
    </div>
  );
}
