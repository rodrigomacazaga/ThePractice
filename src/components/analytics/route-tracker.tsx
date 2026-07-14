"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics";

/**
 * Page views en navegación cliente (SPA). El page view inicial ya lo envían
 * los scripts al cargar (gtag config / fbq PageView), así que se omite el
 * primer render para no duplicarlo.
 */
export function RouteTracker() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    track("page_view", { path: pathname });
  }, [pathname]);

  return null;
}
