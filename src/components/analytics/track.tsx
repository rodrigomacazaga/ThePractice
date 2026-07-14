"use client";

import { useEffect, useRef } from "react";
import { track, type ConversionEvent } from "@/lib/analytics";
import { captureCampaignParams } from "@/lib/utm";

type Params = Record<string, string | number | boolean | undefined>;

/**
 * Envuelve elementos server-rendered (links, cards) para medir clics sin
 * convertirlos en client components. display:contents no afecta el layout.
 */
export function TrackClick({
  event,
  params,
  children,
}: {
  event: ConversionEvent;
  params?: Params;
  children: React.ReactNode;
}) {
  return (
    <span className="contents" onClickCapture={() => track(event, params)}>
      {children}
    </span>
  );
}

/** Dispara un evento la primera vez que el marcador entra al viewport. */
export function TrackView({ event, params }: { event: ConversionEvent; params?: Params }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          track(event, params);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <span ref={ref} aria-hidden className="block h-px w-px" />;
}

/**
 * Persiste los parámetros de campaña (utm_*, fbclid, gclid) de la URL en
 * sessionStorage al montar la landing, para que lleguen al formulario
 * aunque el usuario navegue entre secciones o páginas.
 */
export function CampaignCapture() {
  useEffect(() => {
    captureCampaignParams();
  }, []);
  return null;
}
