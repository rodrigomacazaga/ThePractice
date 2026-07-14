import Script from "next/script";
import { RouteTracker } from "./route-tracker";

/**
 * Carga condicional de los scripts de medición. Cada script se inyecta
 * ÚNICAMENTE si su ID está configurado en variables de entorno — sin IDs
 * inventados ni placeholders. Sin variables configuradas, no se carga nada
 * y los track() de src/lib/analytics.ts son no-ops.
 */

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export function AnalyticsScripts() {
  const gtagId = GA_ID ?? ADS_ID;

  return (
    <>
      {gtagId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gtagId}`}
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              ${GA_ID ? `gtag('config', '${GA_ID}');` : ""}
              ${ADS_ID ? `gtag('config', '${ADS_ID}');` : ""}
            `}
          </Script>
        </>
      )}

      {PIXEL_ID && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${PIXEL_ID}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}

      {(gtagId || PIXEL_ID) && <RouteTracker />}
    </>
  );
}
