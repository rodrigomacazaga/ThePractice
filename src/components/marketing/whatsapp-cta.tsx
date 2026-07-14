"use client";

import { useEffect, useState } from "react";
import type { VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { getCampaignParams } from "@/lib/utm";
import { whatsappUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

/**
 * CTA de WhatsApp (canal de seguimiento, siempre secundario frente a
 * "Aplicar como Founder"). Prellena el mensaje y, cuando existen, anexa la
 * referencia de campaña. Mide whatsapp_click con su placement.
 */
export function WhatsAppCta({
  message,
  placement,
  variant = "outline",
  size = "md",
  className,
  children,
}: {
  message: string;
  placement: string;
  className?: string;
  children: React.ReactNode;
} & VariantProps<typeof buttonVariants>) {
  // El href con parámetros de campaña se resuelve en cliente; el primer
  // render (SSR) lleva el link sin referencia para evitar hydration mismatch.
  const [href, setHref] = useState(() => whatsappUrl(message));

  useEffect(() => {
    setHref(whatsappUrl(message, getCampaignParams()));
  }, [message]);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(buttonVariants({ variant, size }), className)}
      onClick={() => track("whatsapp_click", { placement })}
    >
      {children}
    </a>
  );
}
