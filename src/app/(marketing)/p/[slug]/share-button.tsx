"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareButton({ name, slug }: { name: string; slug: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/p/${slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${name} — The Practice`, url });
        return;
      } catch {
        // usuario canceló; caemos a copiar
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="outline" size="lg" onClick={share} aria-label="Compartir perfil">
      {copied ? <Check className="h-4 w-4 text-sage" /> : <Share2 className="h-4 w-4" />}
      {copied ? "Copiado" : "Compartir"}
    </Button>
  );
}
